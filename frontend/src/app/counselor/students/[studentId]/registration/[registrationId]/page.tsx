'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, serviceAPI, adminStudentAPI } from '@/lib/api';
import { User, USER_ROLE, FormStructure, FormSection, FormSubSection } from '@/types';
import CounselorLayout from '@/components/CounselorLayout';
import FormSectionRenderer from '@/components/FormSectionRenderer';
import FormPartsNavigation from '@/components/FormPartsNavigation';
import FormSectionsNavigation from '@/components/FormSectionsNavigation';
import StudentFormHeader from '@/components/StudentFormHeader';
import ProgramSection from '@/components/ProgramSection';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName } from '@/utils/nameHelpers';
import axios from 'axios';
import BrainographyDataDisplay, { BrainographyDataType } from '@/components/BrainographyDataDisplay';
import PortfolioSection, { PortfolioItem, PortfolioRow, usePortfolioDownload } from '@/components/PortfolioSection';
import ActivityAnalyticsDashboard from '@/components/ActivityAnalyticsDashboard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface BrainographyDoc {
  _id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy?: { firstName?: string; middleName?: string; lastName?: string; email: string };
  version: number;
}

type ActiveView = 'analytics' | 'brainography' | 'portfolio' | 'form';

export default function CounselorStudentFormViewPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params?.studentId as string;
  const registrationId = params?.registrationId as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [formStructure, setFormStructure] = useState<FormStructure[]>([]);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  const [formValues, setFormValues] = useState<any>({});
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [serviceInfo, setServiceInfo] = useState<any>(null);

  // Education Planning state
  const [brainographyDoc, setBrainographyDoc] = useState<BrainographyDoc | null>(null);
  const [brainographyData, setBrainographyData] = useState<BrainographyDataType | null>(null);
  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([]);
  const handlePortfolioDownload = usePortfolioDownload();
  const [activeView, setActiveView] = useState<ActiveView>('analytics');
  const [isEducationPlanning, setIsEducationPlanning] = useState(false);

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;
      if (userData.role !== USER_ROLE.COUNSELOR) {
        toast.error('Access denied.');
        router.push('/');
        return;
      }
      setUser(userData);
      await fetchAllData();
    } catch {
      toast.error('Please login to continue');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchBrainography = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/brainography/${registrationId}`, { headers: { Authorization: `Bearer ${token}` } });
      setBrainographyDoc(response.data.data.document || null);
    } catch { /* silently fail */ }
  };

  const fetchBrainographyData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/portfolio/${registrationId}/data`, { headers: { Authorization: `Bearer ${token}` } });
      setBrainographyData(response.data.data.brainographyData || null);
    } catch { /* silently fail */ }
  };

  const fetchPortfolios = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/portfolio/${registrationId}/portfolios`, { headers: { Authorization: `Bearer ${token}` } });
      setPortfolios(response.data.data.portfolios || []);
    } catch { /* silently fail */ }
  };

  const handleBrainographyView = () => {
    if (!brainographyDoc) return;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    window.open(`${baseUrl}/${brainographyDoc.filePath}`, '_blank');
  };

  const handleBrainographyDownload = async () => {
    if (!brainographyDoc) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/brainography/${registrationId}/download`, { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', brainographyDoc.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download brainography report');
    }
  };

  const fetchAllData = async () => {
    try {
      const studentResponse = await adminStudentAPI.getStudentDetails(studentId);
      const studentData = studentResponse.data.data.student;
      setStudentInfo(studentData);

      const registrationResponse = await adminStudentAPI.getStudentFormAnswers(studentId, registrationId);
      const registrationData = registrationResponse.data.data;
      const regServiceId = registrationData.registration.serviceId;
      const extractedServiceId = typeof regServiceId === 'object' ? regServiceId._id : regServiceId;

      setServiceInfo(regServiceId);

      const svcName = typeof regServiceId === 'object' ? regServiceId.name : '';
      const svcSlug = typeof regServiceId === 'object' ? regServiceId.slug : '';
      const isEduPlan = svcSlug === 'education-planning' || svcName === 'Education Planning';
      setIsEducationPlanning(isEduPlan);
      if (!isEduPlan) setActiveView('form');

      if (isEduPlan) {
        await fetchBrainography();
        await fetchBrainographyData();
        await fetchPortfolios();
      }

      if (!extractedServiceId) throw new Error('Service ID not found');

      const formResponse = await serviceAPI.getServiceForm(extractedServiceId);
      const structure = formResponse.data.data.formStructure || [];
      setFormStructure(structure);

      const answers = registrationData.answers || [];
      const formattedAnswers: any = {};
      answers.forEach((answer: any) => {
        if (answer && answer.partKey) formattedAnswers[answer.partKey] = answer.answers || {};
      });

      if (structure.length > 0) {
        structure.forEach((part: FormStructure) => {
          const partKey = part.part.key;
          if (!formattedAnswers[partKey]) formattedAnswers[partKey] = {};
          part.sections?.forEach((section: FormSection) => {
            if (!formattedAnswers[partKey][section._id]) formattedAnswers[partKey][section._id] = {};
            section.subSections?.forEach((subSection: FormSubSection) => {
              if (!formattedAnswers[partKey][section._id][subSection._id]) {
                formattedAnswers[partKey][section._id][subSection._id] = [{}];
              }
            });
          });
        });
      }
      setFormValues(formattedAnswers);
    } catch (error: any) {
      console.error('Fetch data error:', error);
      toast.error('Failed to load form data');
    }
  };

  // Read-only no-op handlers
  const handleFieldChange = () => {};
  const handleAddInstance = () => {};
  const handleRemoveInstance = () => {};

  const currentFormStruct = formStructure[currentPartIndex];
  const currentPart = currentFormStruct?.part;
  const currentSection = currentFormStruct?.sections?.[currentSectionIndex];

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center"><div className="spinner mx-auto mb-4"></div><p className="text-gray-600">Loading...</p></div>
      </div>
    );
  }

  const navButtons: { key: ActiveView; label: string; icon: string }[] = isEducationPlanning
    ? [
        { key: 'analytics', label: 'Activity Analysis', icon: '📊' },
        { key: 'brainography', label: 'Brainography Analysis', icon: '🧠' },
        { key: 'portfolio', label: 'Education Portfolio Generator', icon: '📁' },
      ]
    : [];

  return (
    <>
      <Toaster position="top-right" />
      <CounselorLayout user={user}>
        <div className="p-8">
          <button onClick={() => router.back()} className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Student Details
          </button>

          {studentInfo && serviceInfo && (
            <StudentFormHeader
              studentName={getFullName(studentInfo.userId) || 'Student'}
              serviceName={serviceInfo.name}
              editMode="VIEW"
            />
          )}

          {/* Read Only Badge */}
          {!isEducationPlanning && (
            <div className="mb-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              Read Only Access
            </div>
          )}

          {/* Education Planning Navigation */}
          {isEducationPlanning && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
              <div className="px-4 py-3 flex flex-wrap items-center gap-2">
                {navButtons.map((btn) => (
                  <button key={btn.key} onClick={() => setActiveView(btn.key)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${activeView === btn.key ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'}`}>
                    <span>{btn.icon}</span> {btn.label}
                  </button>
                ))}
                {formStructure.length > 0 && (
                  <button onClick={() => setActiveView('form')}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${activeView === 'form' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'}`}>
                    <span>📋</span> Form
                  </button>
                )}
                <button onClick={() => router.push(`/counselor/students/${studentId}/registration/${registrationId}/activity`)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all duration-200 ml-auto">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                  Student Activity
                </button>
              </div>
            </div>
          )}

          {/* Activity Analytics */}
          {isEducationPlanning && activeView === 'analytics' && (
            <div className="mb-6"><ActivityAnalyticsDashboard registrationId={registrationId} /></div>
          )}

          {/* Brainography (read-only) */}
          {isEducationPlanning && activeView === 'brainography' && (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Brainography Report</h3>
                    <p className="text-sm text-gray-500">View the brainography report for this student</p>
                  </div>
                  <span className="ml-auto inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    Read Only
                  </span>
                </div>
                {brainographyDoc ? (
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{brainographyDoc.fileName}</p>
                          <p className="text-xs text-gray-500">{(brainographyDoc.fileSize / 1024).toFixed(1)} KB | Uploaded: {new Date(brainographyDoc.uploadedAt).toLocaleDateString('en-GB')} | Version: {brainographyDoc.version}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={handleBrainographyView} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium">View</button>
                        <button onClick={handleBrainographyDownload} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium">Download</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <p className="text-gray-500">No brainography report uploaded yet</p>
                  </div>
                )}
              </div>
              {brainographyData && <div className="mb-6"><BrainographyDataDisplay data={brainographyData} /></div>}
            </>
          )}

          {/* Portfolio (read-only) */}
          {isEducationPlanning && activeView === 'portfolio' && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Education Portfolio</h3>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  Read Only
                </span>
              </div>
              {brainographyData ? (
                <PortfolioSection registrationId={registrationId} brainographyData={brainographyData} portfolios={portfolios} onPortfoliosChange={fetchPortfolios} allowGenerate={false} />
              ) : (
                <div className="text-center py-16"><p className="text-sm text-gray-500">Brainography data not yet available.</p></div>
              )}
              {portfolios.length > 0 && (
                <div className="mt-4 border border-blue-200 rounded-xl p-5 bg-blue-50/50">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Generated Reports</h3>
                  <div className="flex flex-wrap gap-3">
                    {portfolios.map((p) => (<div key={p._id} className="flex-1 min-w-[260px]"><PortfolioRow portfolio={p} onDownload={handlePortfolioDownload} /></div>))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Form View (read-only) */}
          {activeView === 'form' && (
            <>
              <FormPartsNavigation formStructure={formStructure} currentPartIndex={currentPartIndex} onPartChange={(index) => { setCurrentPartIndex(index); setCurrentSectionIndex(0); }} />
              {currentFormStruct && (
                <FormSectionsNavigation sections={currentFormStruct.sections} currentSectionIndex={currentSectionIndex} onSectionChange={setCurrentSectionIndex} />
              )}
              {currentSection && currentPart && (
                <div className="mb-6">
                  {currentPart.key === 'APPLICATION' && (currentSection.title === 'Apply to Program' || currentSection.title === 'Applied Program') ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="bg-blue-600 px-6 py-4 -mx-6 -mt-6 mb-6 border-b border-blue-700">
                        <h3 className="text-xl font-semibold text-white">{currentSection.title}</h3>
                        {currentSection.description && <p className="text-blue-100 text-sm mt-1">{currentSection.description}</p>}
                      </div>
                      <ProgramSection studentId={studentId} sectionType={currentSection.title === 'Apply to Program' ? 'available' : 'applied'} registrationId={registrationId} userRole="COUNSELOR" isReadOnly={true} />
                    </div>
                  ) : (
                    <FormSectionRenderer
                      section={currentSection}
                      values={formValues[currentPart.key]?.[currentSection._id] || {}}
                      onChange={handleFieldChange}
                      onAddInstance={handleAddInstance}
                      onRemoveInstance={handleRemoveInstance}
                      readOnly={true}
                      registrationId={registrationId}
                      studentId={studentId}
                      userRole="COUNSELOR"
                    />
                  )}
                </div>
              )}
            </>
          )}

          {isEducationPlanning && formStructure.length === 0 && activeView === 'form' && (
            <div className="text-center py-16">
              <p className="text-sm text-gray-500">No form data available. Use the tabs above to access Activity Analysis, Brainography, and Portfolio features.</p>
            </div>
          )}
        </div>
      </CounselorLayout>
    </>
  );
}