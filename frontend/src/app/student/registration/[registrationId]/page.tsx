'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { serviceAPI, formAnswerAPI } from '@/lib/api';
import { FormStructure, StudentServiceRegistration, Service } from '@/types';
import toast, { Toaster } from 'react-hot-toast';
import FormSectionRenderer from '@/components/FormSectionRenderer';
import StudentLayout from '@/components/StudentLayout';
import ProgramSection from '@/components/ProgramSection';
import { getFullName } from '@/utils/nameHelpers';
import axios from 'axios';
import BrainographyDataDisplay, { BrainographyDataType } from '@/components/BrainographyDataDisplay';
import PortfolioSection, { PortfolioItem, PortfolioRow, usePortfolioDownload } from '@/components/PortfolioSection';
import ActivityAnalyticsDashboard from '@/components/ActivityAnalyticsDashboard';

const BRAINOGRAPHY_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface BrainographyDoc {
  _id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  version: number;
}

// Extended interface for registration with populated fields
interface ExtendedRegistration extends Omit<StudentServiceRegistration, 'studentId' | 'primaryOpsId' | 'secondaryOpsId' | 'activeOpsId'> {
  studentId?: {
    _id: string;
    mobileNumber?: string;
    intake?: string;
    year?: string;
    adminId?: {
      _id: string;
      companyName?: string;
      mobileNumber?: string;
      userId: {
        _id: string;
        firstName: string;
        middleName?: string;
        lastName: string;
        email: string;
      };
    };
    counselorId?: {
      _id: string;
      mobileNumber?: string;
      userId: {
        _id: string;
        firstName: string;
        middleName?: string;
        lastName: string;
        email: string;
      };
    };
  };
  primaryOpsId?: PopulatedRoleUser;
  secondaryOpsId?: PopulatedRoleUser;
  activeOpsId?: PopulatedRoleUser;
  primaryEduplanCoachId?: PopulatedRoleUser;
  secondaryEduplanCoachId?: PopulatedRoleUser;
  activeEduplanCoachId?: PopulatedRoleUser;
}

interface PopulatedRoleUser {
  _id: string;
  mobileNumber?: string;
  email?: string;
  userId: {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
  };
}

type ActiveView = 'analytics' | 'brainography' | 'portfolio' | 'form';

function MyDetailsContent() {
  const router = useRouter();
  const params = useParams();
  const registrationId = params.registrationId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [registration, setRegistration] = useState<ExtendedRegistration | null>(null);
  const [formStructure, setFormStructure] = useState<FormStructure[]>([]);
  const [selectedPartIndex, setSelectedPartIndex] = useState(0);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);
  const [formValues, setFormValues] = useState<any>({});
  const [errors, setErrors] = useState<any>({});
  const [brainographyDoc, setBrainographyDoc] = useState<BrainographyDoc | null>(null);

  // Extracted data & Portfolio
  const [brainographyData, setBrainographyData] = useState<BrainographyDataType | null>(null);
  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([]);
  const handlePortfolioDownload = usePortfolioDownload();

  // Active view: analytics (default) | brainography | portfolio | form
  const [activeView, setActiveView] = useState<ActiveView>('analytics');

  useEffect(() => {
    if (!registrationId) {
      toast.error('No registration selected');
      router.push('/dashboard');
      return;
    }
    fetchData();
  }, [registrationId]);

  // Fetch Education Planning specific data & set correct default view after registration loads
  useEffect(() => {
    if (!registration) return;
    const svc = typeof registration.serviceId === 'object' ? registration.serviceId : null;
    const isEduPlan = svc?.slug === 'education-planning' || svc?.name === 'Education Planning';
    if (isEduPlan) {
      fetchBrainography();
      fetchBrainographyData();
      fetchPortfolios();
    } else {
      // Non-EduPlan services (e.g. Study Abroad) should default to form view
      setActiveView('form');
    }
  }, [registration]);

  const fetchBrainography = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BRAINOGRAPHY_API_URL}/brainography/${registrationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBrainographyDoc(response.data.data.document || null);
    } catch (error) {
      // Silently fail - brainography may not exist for this service
    }
  };

  const handleBrainographyView = () => {
    if (!brainographyDoc) return;
    const baseUrl = BRAINOGRAPHY_API_URL.replace('/api', '') || 'http://localhost:5000';
    window.open(`${baseUrl}/${brainographyDoc.filePath}`, '_blank');
  };

  const handleBrainographyDownload = async () => {
    if (!brainographyDoc) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BRAINOGRAPHY_API_URL}/brainography/${registrationId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', brainographyDoc.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download brainography report');
    }
  };

  const fetchBrainographyData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BRAINOGRAPHY_API_URL}/portfolio/${registrationId}/data`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBrainographyData(response.data.data.brainographyData || null);
    } catch (error) {
      // Silently fail
    }
  };

  const fetchPortfolios = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BRAINOGRAPHY_API_URL}/portfolio/${registrationId}/portfolios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPortfolios(response.data.data.portfolios || []);
    } catch (error) {
      // Silently fail
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch registration details
      const regResponse = await serviceAPI.getRegistrationDetails(registrationId!);
      const reg = regResponse.data.data.registration;
      setRegistration(reg);

      // Fetch form structure
      const serviceId = typeof reg.serviceId === 'object' ? reg.serviceId._id : reg.serviceId;
      const formResponse = await serviceAPI.getServiceForm(serviceId);
      setFormStructure(formResponse.data.data.formStructure);

      // Fetch existing answers from database (for auto-fill)
      const answersResponse = await formAnswerAPI.getFormAnswers(registrationId!);
      const answers = answersResponse.data.data.answers || [];
      const studentData = answersResponse.data.data.student || {};
      
      // Convert answers to form values structure
      const values: any = {};
      answers.forEach((answer: any) => {
        const partKey = answer.partKey;
        if (!values[partKey]) {
          values[partKey] = {};
        }
        // The answers object contains section-wise data
        values[partKey] = answer.answers;
      });
      
      // Initialize form structure and pre-fill phone and country defaults
      if (formStructure.length > 0) {
        formStructure.forEach((part) => {
          const partKey = part.part.key;
          if (!values[partKey]) values[partKey] = {};
          
          part.sections?.forEach((section) => {
            if (!values[partKey][section._id]) values[partKey][section._id] = {};
            
            section.subSections?.forEach((subSection) => {
              if (!values[partKey][section._id][subSection._id]) {
                values[partKey][section._id][subSection._id] = [{}];
              }
              
              const instances = values[partKey][section._id][subSection._id];
              if (Array.isArray(instances) && instances.length > 0) {
                const instance = instances[0];
                
                // Pre-fill phone number from student table
                const phoneField = subSection.fields?.find(f => f.key === 'phone' || f.key === 'phoneNumber' || f.key === 'mobileNumber');
                if (phoneField && studentData.mobileNumber) {
                  if (!instance[phoneField.key]) {
                    instance[phoneField.key] = studentData.mobileNumber;
                  }
                }
                
                // Set India as default for country fields (always set if not present)
                subSection.fields?.forEach((field) => {
                  if (field.key === 'mailingCountry' || field.key === 'permanentCountry') {
                    // Always set default if field is empty or undefined
                    if (!instance[field.key] || instance[field.key] === '') {
                      instance[field.key] = field.defaultValue || 'IN';
                    }
                  }
                });
              }
            });
          });
        });
      }
      
      setFormValues(values);

    } catch (error: any) {
      console.error('Failed to fetch data:', error);
      const msg = error.response?.data?.message || error.message || 'Failed to load form data';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (
    partKey: string,
    sectionId: string,
    subSectionId: string,
    index: number,
    key: string,
    value: any
  ) => {
    setFormValues((prev: any) => {
      // Deep clone to avoid mutation issues
      const newValues = JSON.parse(JSON.stringify(prev));
      if (!newValues[partKey]) newValues[partKey] = {};
      if (!newValues[partKey][sectionId]) newValues[partKey][sectionId] = {};
      if (!newValues[partKey][sectionId][subSectionId]) {
        newValues[partKey][sectionId][subSectionId] = [{}];
      }
      
      // Ensure the instance exists at the index
      if (!newValues[partKey][sectionId][subSectionId][index]) {
        newValues[partKey][sectionId][subSectionId][index] = {};
      }
      
      // Update the specific field
      newValues[partKey][sectionId][subSectionId][index][key] = value;
      
      // Handle cascading dropdowns - clear dependent fields
      if (key.includes('Country')) {
        // Clear state and city when country changes
        const stateKey = key.replace('Country', 'State');
        const cityKey = key.replace('Country', 'City');
        newValues[partKey][sectionId][subSectionId][index][stateKey] = '';
        newValues[partKey][sectionId][subSectionId][index][cityKey] = '';
      } else if (key.includes('State')) {
        // Clear city when state changes
        const cityKey = key.replace('State', 'City');
        newValues[partKey][sectionId][subSectionId][index][cityKey] = '';
      }
      
      // Handle "Same as Mailing Address" checkbox
      if (key === 'sameAsMailingAddress' && value === true) {
        // Find mailing address subsection
        const mailingSubSection = Object.keys(newValues[partKey][sectionId] || {}).find(
          subSecId => {
            const data = newValues[partKey][sectionId][subSecId]?.[0];
            return data && 'mailingAddress1' in data;
          }
        );
        
        if (mailingSubSection) {
          const mailingData = newValues[partKey][sectionId][mailingSubSection][0];
          // Copy all mailing address fields to permanent address
          newValues[partKey][sectionId][subSectionId][index] = {
            ...newValues[partKey][sectionId][subSectionId][index],
            sameAsMailingAddress: true,
            permanentAddress1: mailingData.mailingAddress1 || '',
            permanentAddress2: mailingData.mailingAddress2 || '',
            permanentCountry: mailingData.mailingCountry || '',
            permanentState: mailingData.mailingState || '',
            permanentCity: mailingData.mailingCity || '',
            permanentPostalCode: mailingData.mailingPostalCode || '',
          };
        }
      }
      
      // Clear permanent address if checkbox is unchecked
      if (key === 'sameAsMailingAddress' && value === false) {
        newValues[partKey][sectionId][subSectionId][index] = {
          ...newValues[partKey][sectionId][subSectionId][index],
          sameAsMailingAddress: false,
        };
      }
      
      return newValues;
    });
  };

  const handleAddInstance = (partKey: string, sectionId: string, subSectionId: string) => {
    setFormValues((prev: any) => {
      // Deep clone to avoid mutation issues
      const newValues = JSON.parse(JSON.stringify(prev));
      if (!newValues[partKey]) newValues[partKey] = {};
      if (!newValues[partKey][sectionId]) newValues[partKey][sectionId] = {};
      if (!newValues[partKey][sectionId][subSectionId]) {
        newValues[partKey][sectionId][subSectionId] = [];
      }
      
      // Create new instance with default values for country fields
      const newInstance: any = {};
      
      // Find the subsection to get field defaults
      const currentPart = formStructure.find(p => p.part.key === partKey);
      const section = currentPart?.sections?.find(s => s._id === sectionId);
      const subSection = section?.subSections?.find(ss => ss._id === subSectionId);
      
      if (subSection) {
        subSection.fields?.forEach((field) => {
          // Set default for country fields
          if ((field.key === 'mailingCountry' || field.key === 'permanentCountry') && field.defaultValue) {
            newInstance[field.key] = field.defaultValue;
          }
        });
      }
      
      // Add the new instance before the last one (if there are existing instances)
      const instances = newValues[partKey][sectionId][subSectionId];
      if (instances.length > 0) {
        // Insert before the last element
        instances.splice(instances.length - 1, 0, newInstance);
      } else {
        // No existing instances, just add it
        instances.push(newInstance);
      }
      return newValues;
    });
  };

  const handleRemoveInstance = (
    partKey: string,
    sectionId: string,
    subSectionId: string,
    index: number
  ) => {
    setFormValues((prev: any) => {
      // Deep clone to avoid mutation issues
      const newValues = JSON.parse(JSON.stringify(prev));
      if (newValues[partKey]?.[sectionId]?.[subSectionId]) {
        // Remove only the specified index
        const instances = newValues[partKey][sectionId][subSectionId];
        newValues[partKey][sectionId][subSectionId] = instances.filter((_: any, i: number) => i !== index);
      }
      return newValues;
    });
  };

  const validateSection = (partKey: string, sectionId: string): boolean => {
    const currentPart = formStructure[selectedPartIndex];
    const section = currentPart.sections[selectedSectionIndex];
    const sectionValues = formValues[partKey]?.[sectionId] || {};
    
    const newErrors: any = {};
    let hasErrors = false;

    // Validate each subsection
    section.subSections.forEach((subSection) => {
      const subSectionValues = sectionValues[subSection._id] || [{}];
      
      subSectionValues.forEach((instanceValues: any, index: number) => {
        subSection.fields.forEach((field) => {
          if (field.required) {
            let value = instanceValues?.[field.key];
            
            // If value is empty and field has defaultValue, use defaultValue
            if ((!value || (typeof value === 'string' && value.trim() === '')) && field.defaultValue) {
              value = field.defaultValue;
              // Update the instance value with default to ensure it's saved
              if (instanceValues) {
                instanceValues[field.key] = field.defaultValue;
              }
              // Also update formValues state to persist the default
              setFormValues((prev: any) => {
                const newValues = JSON.parse(JSON.stringify(prev));
                if (newValues[partKey]?.[sectionId]?.[subSection._id]?.[index]) {
                  newValues[partKey][sectionId][subSection._id][index][field.key] = field.defaultValue;
                }
                return newValues;
              });
            }
            
            // Now validate
            if (!value || (typeof value === 'string' && value.trim() === '')) {
              if (!newErrors[subSection._id]) newErrors[subSection._id] = [];
              if (!newErrors[subSection._id][index]) newErrors[subSection._id][index] = {};
              newErrors[subSection._id][index][field.key] = `${field.label} is required`;
              hasErrors = true;
            }
          }
        });
      });
    });

    setErrors(newErrors);
    return !hasErrors;
  };

  const handleSaveSection = async () => {
    try {
      const currentPart = formStructure[selectedPartIndex];
      const section = currentPart.sections[selectedSectionIndex];
      const partKey = currentPart.part.key;
      const sectionId = section._id;

      // Validate before saving
      if (!validateSection(partKey, sectionId)) {
        toast.error('Please fill all required fields');
        return;
      }

      setSaving(true);
      
      // Get ONLY current section answers
      const sectionAnswers = formValues[partKey]?.[sectionId] || {};
      
      // Get existing part answers from database to merge with
      const existingAnswersResponse = await formAnswerAPI.getFormAnswers(registrationId!, partKey);
      const existingAnswers = existingAnswersResponse.data.data.answers;
      
      // Merge: keep all existing answers and update only current section
      let allPartAnswers = {};
      if (existingAnswers && existingAnswers.length > 0) {
        allPartAnswers = { ...existingAnswers[0].answers };
      }
      allPartAnswers = { ...allPartAnswers, [sectionId]: sectionAnswers };
      
      await formAnswerAPI.saveFormAnswers({
        registrationId: registrationId!,
        partKey,
        answers: allPartAnswers,
        completed: false,
      });

      toast.success('Saved successfully!');
      setErrors({});
      
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to save';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading form...</p>
        </div>
      </div>
    );
  }

  if (!registration) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">No registration data available</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const service = typeof registration.serviceId === 'object' 
    ? registration.serviceId 
    : null;
  const isEducationPlanning = service?.slug === 'education-planning' || service?.name === 'Education Planning';

  /* ─── Navigation Buttons (Education Planning only) ─── */
  const navButtons = isEducationPlanning ? [
    { key: 'analytics' as ActiveView, label: 'Activity Analysis', icon: '📊' },
    { key: 'brainography' as ActiveView, label: 'Brainography Analysis', icon: '🧠' },
    { key: 'portfolio' as ActiveView, label: 'Education Portfolio Generator', icon: '📁' },
  ] : [];

    /* ─── Shared: Support Team Section ─── */
    const eduplanCoach = registration.activeEduplanCoachId || registration.primaryEduplanCoachId;
    const opsLabel = service?.name === 'Ivy League Preparation' ? 'Ivy Expert' : service?.name === 'Education Planning' ? 'Eduplan Coach' : 'OPS';
    const opsUser = registration.activeOpsId || registration.primaryOpsId;

    const renderSupportTeam = () => {
      if (!registration.studentId) return null;
      const hasTeam = registration.studentId.adminId || registration.studentId.counselorId || opsUser || (isEducationPlanning && eduplanCoach);
      if (!hasTeam) return null;
      return (
        <div className="bg-white border-b border-gray-200 mb-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Your Support Team</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {registration.studentId.adminId && (
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <p className="text-xs font-medium text-gray-700 mb-1">Admin</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {registration.studentId.adminId.companyName || getFullName(registration.studentId.adminId.userId)}
                  </p>
                  {registration.studentId.adminId.userId?.email && (
                    <p className="text-xs text-gray-600">{registration.studentId.adminId.userId.email}</p>
                  )}
                  {registration.studentId.adminId.mobileNumber && (
                    <p className="text-xs text-gray-600">{registration.studentId.adminId.mobileNumber}</p>
                  )}
                </div>
              )}
              {registration.studentId.counselorId && (
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <p className="text-xs font-medium text-gray-700 mb-1">Counselor</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {getFullName(registration.studentId.counselorId.userId)}
                  </p>
                  {registration.studentId.counselorId.userId?.email && (
                    <p className="text-xs text-gray-600">{registration.studentId.counselorId.userId.email}</p>
                  )}
                  {registration.studentId.counselorId.mobileNumber && (
                    <p className="text-xs text-gray-600">{registration.studentId.counselorId.mobileNumber}</p>
                  )}
                </div>
              )}
              {opsUser && (
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <p className="text-xs font-medium text-gray-700 mb-1">{opsLabel}</p>
                  <p className="text-sm font-semibold text-gray-900">{getFullName(opsUser.userId)}</p>
                  {opsUser.userId?.email && <p className="text-xs text-gray-600">{opsUser.userId.email}</p>}
                  {opsUser.mobileNumber && <p className="text-xs text-gray-600">{opsUser.mobileNumber}</p>}
                </div>
              )}
              {isEducationPlanning && eduplanCoach && (
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <p className="text-xs font-medium text-gray-700 mb-1">Eduplan Coach</p>
                  <p className="text-sm font-semibold text-gray-900">{getFullName(eduplanCoach.userId)}</p>
                  {eduplanCoach.userId?.email && <p className="text-xs text-gray-600">{eduplanCoach.userId.email}</p>}
                  {(eduplanCoach.mobileNumber || eduplanCoach.email) && (
                    <p className="text-xs text-gray-600">{eduplanCoach.mobileNumber || eduplanCoach.email}</p>
                  )}
                </div>
              )}
              {(registration.studentId.intake || registration.studentId.year) && (
                <div className="border border-blue-200 rounded-lg p-3 bg-blue-50">
                  {registration.studentId.intake && (
                    <div className="mb-2">
                      <p className="text-xs font-medium text-gray-700 mb-1">Intake</p>
                      <p className="text-sm font-semibold text-blue-700">{registration.studentId.intake}</p>
                    </div>
                  )}
                  {registration.studentId.year && (
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">Year</p>
                      <p className="text-sm font-semibold text-blue-700">{registration.studentId.year}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    };

    /* ─── Shared: Navigation Bar ─── */
    const renderNavBar = (showFormTab: boolean) => (
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {navButtons.map(btn => (
              <button
                key={btn.key}
                onClick={() => setActiveView(btn.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  activeView === btn.key
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                }`}
              >
                <span>{btn.icon}</span> {btn.label}
              </button>
            ))}
            {showFormTab && (
              <button
                onClick={() => setActiveView('form')}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  activeView === 'form'
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                }`}
              >
                <span>📋</span> My Form
              </button>
            )}
            {isEducationPlanning && (
              <button
                onClick={() => router.push(`/student/registration/${registrationId}/activity`)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all duration-200 ml-auto"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                My Activity
              </button>
            )}
          </div>
        </div>
      </div>
    );

    /* ─── Shared: Brainography / Portfolio Content ─── */
    const renderBrainographyContent = () => (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Reports section */}
        <div className="border border-teal-200 rounded-xl p-5 bg-teal-50/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Brainography Report</h3>
              <p className="text-xs text-gray-500">Your personalized brainography analysis</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {brainographyDoc ? (
              <div className="border border-gray-200 rounded-lg p-4 bg-white flex-1 min-w-[220px]">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{brainographyDoc.fileName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {(brainographyDoc.fileSize / 1024).toFixed(1)} KB &middot; Uploaded: {new Date(brainographyDoc.uploadedAt).toLocaleDateString('en-GB')}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={handleBrainographyView} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium">View</button>
                      <button onClick={handleBrainographyDownload} className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium">Download</button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-white flex-1 min-w-[260px]">
                <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm text-gray-500">No brainography report uploaded yet</p>
                <p className="text-xs text-gray-400 mt-1">Your Eduplan Coach will upload this report</p>
              </div>
            )}
          </div>
        </div>
        {/* Extracted Brainography Data */}
        {brainographyData && <BrainographyDataDisplay data={brainographyData} />}
      </div>
    );

    const renderPortfolioContent = () => (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Generated Reports */}
        {portfolios.length > 0 && (
          <div className="border border-teal-200 rounded-xl p-5 bg-teal-50/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Generated Reports</h3>
                <p className="text-xs text-gray-500">Download your portfolio reports</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {portfolios.map(p => (
                <div key={p._id} className="flex-1 min-w-[260px]">
                  <PortfolioRow portfolio={p} onDownload={handlePortfolioDownload} />
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Portfolio Section (Career Goal Selection + Reports) */}
        {brainographyData && (
          <PortfolioSection
            registrationId={registrationId}
            brainographyData={brainographyData}
            portfolios={portfolios}
            onPortfoliosChange={fetchPortfolios}
            allowGenerate={true}
          />
        )}
        {!brainographyData && portfolios.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm text-gray-500">Brainography data is required to generate portfolios. Upload it via Brainography Analysis first.</p>
          </div>
        )}
      </div>
    );

    // Education Planning has no form parts — render a dedicated view showing only the Brainography Report
    if (formStructure.length === 0) {
      const isEducationPlanning = service?.slug === 'education-planning' || service?.name === 'Education Planning';
      if (!isEducationPlanning) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <p className="text-gray-600">No form data available</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        );
      }

    // ═══ Education Planning — dedicated view (no form) ═══
    return (
      <div className="min-h-screen bg-gray-50">
        <Toaster position="top-right" />
        <StudentLayout
          formStructure={[]}
          currentPartIndex={0}
          currentSectionIndex={0}
          onPartChange={() => {}}
          onSectionChange={() => {}}
          serviceName={service?.name || 'Education Planning'}
        >
          {renderSupportTeam()}
          {renderNavBar(false)}

          {/* Dynamic Content Area */}
          {activeView === 'analytics' && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <ActivityAnalyticsDashboard registrationId={registrationId} />
            </div>
          )}
          {activeView === 'brainography' && renderBrainographyContent()}
          {activeView === 'portfolio' && renderPortfolioContent()}
        </StudentLayout>
      </div>
    );
  } // end if (formStructure.length === 0)

  const currentPart = formStructure[selectedPartIndex];
  const currentSection = currentPart.sections.sort((a, b) => a.order - b.order)[selectedSectionIndex];

  // ═══ Regular Form View ═══
  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      <StudentLayout
        formStructure={formStructure}
        currentPartIndex={selectedPartIndex}
        currentSectionIndex={selectedSectionIndex}
        onPartChange={(index) => {
          setSelectedPartIndex(index);
          setSelectedSectionIndex(0);
          setActiveView('form');
        }}
        onSectionChange={(index) => {
          setSelectedSectionIndex(index);
          setActiveView('form');
        }}
        serviceName={service?.name || 'Service'}
      >
        {renderSupportTeam()}
        {isEducationPlanning && renderNavBar(true)}

        {/* Dynamic Content Area */}
        {isEducationPlanning && activeView === 'analytics' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <ActivityAnalyticsDashboard registrationId={registrationId} />
          </div>
        )}
        {isEducationPlanning && activeView === 'brainography' && renderBrainographyContent()}
        {isEducationPlanning && activeView === 'portfolio' && renderPortfolioContent()}

        {activeView === 'form' && (
          <>
            {/* Section Navigation (Horizontal Tabs) */}
            {currentPart && currentPart.sections && currentPart.sections.length > 0 && (
              <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                  <div className="inline-flex bg-gray-100 rounded-lg p-1 border border-gray-200 overflow-x-auto">
                    {[...currentPart.sections]
                      .sort((a, b) => a.order - b.order)
                      .map((section, index) => (
                        <button
                          key={section._id}
                          onClick={() => setSelectedSectionIndex(index)}
                          className={`px-4 py-2 rounded-md font-medium transition-all whitespace-nowrap text-sm ${
                            selectedSectionIndex === index
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-gray-700 hover:text-gray-900'
                          }`}
                        >
                          {section.title}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* Form Content - Single Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-8">
              <div className="space-y-5">
                {currentSection && (
                  <div>
                    {currentPart.part.key === 'APPLICATION' && 
                     (currentSection.title === 'Apply to Program' || currentSection.title === 'Applied Program') ? (
                      <ProgramSection
                        sectionType={currentSection.title === 'Apply to Program' ? 'available' : 'applied'}
                        studentId={registration?.studentId?._id || ''}
                        registrationId={registrationId}
                        userRole="STUDENT"
                      />
                    ) : currentPart.part.key === 'DOCUMENT' ? (
                      <FormSectionRenderer
                        section={currentSection}
                        values={formValues[currentPart.part.key]?.[currentSection._id] || {}}
                        onChange={(subSectionId, index, key, value) =>
                          handleFieldChange(currentPart.part.key, currentSection._id, subSectionId, index, key, value)
                        }
                        onAddInstance={(subSectionId) =>
                          handleAddInstance(currentPart.part.key, currentSection._id, subSectionId)
                        }
                        onRemoveInstance={(subSectionId, index) =>
                          handleRemoveInstance(currentPart.part.key, currentSection._id, subSectionId, index)
                        }
                        errors={errors}
                        registrationId={registrationId!}
                        studentId={registration?.studentId?.toString()}
                        userRole="STUDENT"
                      />
                    ) : (
                      <>
                        <FormSectionRenderer
                          section={currentSection}
                          values={formValues[currentPart.part.key]?.[currentSection._id] || {}}
                          onChange={(subSectionId, index, key, value) =>
                            handleFieldChange(currentPart.part.key, currentSection._id, subSectionId, index, key, value)
                          }
                          onAddInstance={(subSectionId) =>
                            handleAddInstance(currentPart.part.key, currentSection._id, subSectionId)
                          }
                          onRemoveInstance={(subSectionId, index) =>
                            handleRemoveInstance(currentPart.part.key, currentSection._id, subSectionId, index)
                          }
                          errors={errors}
                        />
                        <div className="flex justify-end gap-3 mt-5">
                          <button
                            onClick={handleSaveSection}
                            disabled={saving}
                            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </StudentLayout>
    </div>
  );
}

export default function MyDetailsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    }>
      <MyDetailsContent />
    </Suspense>
  );
}
