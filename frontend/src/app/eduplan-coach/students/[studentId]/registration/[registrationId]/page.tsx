'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, serviceAPI } from '@/lib/api';
import { User, USER_ROLE, FormStructure, FormSection, FormSubSection, FormField } from '@/types';
import EduplanCoachLayout from '@/components/EduplanCoachLayout';
import FormSectionRenderer from '@/components/FormSectionRenderer';
import FormPartsNavigation from '@/components/FormPartsNavigation';
import FormSectionsNavigation from '@/components/FormSectionsNavigation';
import FormSaveButtons from '@/components/FormSaveButtons';
import StudentFormHeader from '@/components/StudentFormHeader';
import ProgramSection from '@/components/ProgramSection';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName } from '@/utils/nameHelpers';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface BrainographyDoc {
  _id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    email: string;
  };
  version: number;
}

export default function EduplanCoachStudentFormEditPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params?.studentId as string;
  const registrationId = params?.registrationId as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form structure
  const [formStructure, setFormStructure] = useState<FormStructure[]>([]);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  
  // Form data
  const [formValues, setFormValues] = useState<any>({});
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [serviceInfo, setServiceInfo] = useState<any>(null);

  // Brainography
  const [brainographyDoc, setBrainographyDoc] = useState<BrainographyDoc | null>(null);
  const [brainographyLoading, setBrainographyLoading] = useState(false);
  const [uploadingBrainography, setUploadingBrainography] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prevent double fetch in React StrictMode
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

      if (userData.role !== USER_ROLE.EDUPLAN_COACH) {
        toast.error('Access denied.');
        router.push('/');
        return;
      }

      setUser(userData);
      
      try {
        await fetchAllData();
        await fetchBrainography();
      } catch (fetchError) {
        console.error('fetchAllData failed:', fetchError);
      }
    } catch (error) {
      toast.error('Please login to continue');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchBrainography = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/brainography/${registrationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBrainographyDoc(response.data.data.document || null);
    } catch (error) {
      console.error('Error fetching brainography:', error);
    }
  };

  const handleBrainographyUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBrainography(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      await axios.post(`${API_URL}/brainography/${registrationId}/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Brainography report uploaded successfully!');
      await fetchBrainography();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload brainography report');
    } finally {
      setUploadingBrainography(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleBrainographyDelete = async () => {
    if (!confirm('Are you sure you want to delete this brainography report?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/brainography/${registrationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Brainography report deleted');
      setBrainographyDoc(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete brainography report');
    }
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
      const response = await axios.get(`${API_URL}/brainography/${registrationId}/download`, {
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

  const fetchAllData = async () => {
    const token = localStorage.getItem('token');
    
    try {
      const [studentResponse, registrationResponse] = await Promise.all([
        axios.get(`${API_URL}/super-admin/students/${studentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/super-admin/students/${studentId}/registrations/${registrationId}/answers`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      const studentData = studentResponse.data.data.student;
      const registrationData = registrationResponse.data.data;
      const regServiceId = registrationData.registration.serviceId;
      const extractedServiceId = typeof regServiceId === 'object' ? regServiceId._id : regServiceId;
      
      setStudentInfo(studentData);
      setServiceInfo(regServiceId);
      
      if (!extractedServiceId) {
        throw new Error('Service ID not found');
      }
      
      const formResponse = await serviceAPI.getServiceForm(extractedServiceId);
      const structure = formResponse.data.data.formStructure || [];
      setFormStructure(structure);
      
      const answers = registrationData.answers || [];
      const formattedAnswers: any = {};
      
      answers.forEach((answer: any) => {
        if (answer && answer.partKey) {
          formattedAnswers[answer.partKey] = answer.answers || {};
        }
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
              
              const instances = formattedAnswers[partKey][section._id][subSection._id];
              if (Array.isArray(instances)) {
                instances.forEach((instance: any) => {
                  const phoneField = subSection.fields?.find(f => f.key === 'phone' || f.key === 'phoneNumber' || f.key === 'mobileNumber');
                  if (phoneField && studentData.mobileNumber && !instance[phoneField.key]) {
                    instance[phoneField.key] = studentData.mobileNumber;
                  }
                  
                  subSection.fields?.forEach((field) => {
                    if ((field.key === 'mailingCountry' || field.key === 'permanentCountry') && !instance[field.key]) {
                      instance[field.key] = field.defaultValue || 'IN';
                    }
                  });
                });
              }
            });
          });
        });
      }
      
      setFormValues(formattedAnswers);
    } catch (error: any) {
      console.error('Fetch data error:', error);
      
      if (error.response?.status === 403) {
        toast.error('Access denied. You are not assigned as the active Eduplan Coach for this student.');
        router.push('/eduplan-coach/students');
        return;
      }
      toast.error('Failed to load form data');
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
      const newValues = JSON.parse(JSON.stringify(prev));
      
      if (!newValues[partKey]) newValues[partKey] = {};
      if (!newValues[partKey][sectionId]) newValues[partKey][sectionId] = {};
      if (!newValues[partKey][sectionId][subSectionId]) newValues[partKey][sectionId][subSectionId] = [];
      if (!newValues[partKey][sectionId][subSectionId][index]) newValues[partKey][sectionId][subSectionId][index] = {};

      newValues[partKey][sectionId][subSectionId][index][key] = value;

      // Handle "Same as Mailing Address" checkbox
      if (key === 'sameAsMailingAddress') {
        const currentFormStruct = formStructure[currentPartIndex];
        const personalSections = currentFormStruct?.sections?.filter(s => s.title === 'Personal Details') || [];
        if (personalSections.length > 0) {
          const mailingSubSection = personalSections[0].subSections.find((s: any) => s.title === 'Mailing Address');
          const permanentSubSection = personalSections[0].subSections.find((s: any) => s.title === 'Permanent Address');
          
          if (value && mailingSubSection && permanentSubSection) {
            const mailingValues = newValues[partKey][sectionId][mailingSubSection._id]?.[0] || {};
            newValues[partKey][sectionId][subSectionId][index]['permanentAddress1'] = mailingValues['mailingAddress1'] || '';
            newValues[partKey][sectionId][subSectionId][index]['permanentAddress2'] = mailingValues['mailingAddress2'] || '';
            newValues[partKey][sectionId][subSectionId][index]['permanentCountry'] = mailingValues['mailingCountry'] || '';
            newValues[partKey][sectionId][subSectionId][index]['permanentState'] = mailingValues['mailingState'] || '';
            newValues[partKey][sectionId][subSectionId][index]['permanentCity'] = mailingValues['mailingCity'] || '';
            newValues[partKey][sectionId][subSectionId][index]['permanentPostalCode'] = mailingValues['mailingPostalCode'] || '';
          }
        }
      }

      // Cascading dropdown logic
      if (key.includes('Country')) {
        const stateKey = key.replace('Country', 'State');
        const cityKey = key.replace('Country', 'City');
        newValues[partKey][sectionId][subSectionId][index][stateKey] = '';
        newValues[partKey][sectionId][subSectionId][index][cityKey] = '';
      } else if (key.includes('State')) {
        const cityKey = key.replace('State', 'City');
        newValues[partKey][sectionId][subSectionId][index][cityKey] = '';
      }

      return newValues;
    });
  };

  const handleAddInstance = (partKey: string, sectionId: string, subSectionId: string) => {
    setFormValues((prev: any) => {
      const newValues = JSON.parse(JSON.stringify(prev));
      
      if (!newValues[partKey]) newValues[partKey] = {};
      if (!newValues[partKey][sectionId]) newValues[partKey][sectionId] = {};
      if (!newValues[partKey][sectionId][subSectionId]) newValues[partKey][sectionId][subSectionId] = [];

      const instances = newValues[partKey][sectionId][subSectionId];
      if (instances.length > 0) {
        instances.splice(instances.length - 1, 0, {});
      } else {
        instances.push({});
      }
      return newValues;
    });
  };

  const handleRemoveInstance = (partKey: string, sectionId: string, subSectionId: string, index: number) => {
    setFormValues((prev: any) => {
      const newValues = JSON.parse(JSON.stringify(prev));
      
      if (newValues[partKey]?.[sectionId]?.[subSectionId]) {
        newValues[partKey][sectionId][subSectionId].splice(index, 1);
      }
      
      return newValues;
    });
  };

  const handleSaveSection = async () => {
    const currentFormStructure = formStructure[currentPartIndex];
    if (!currentFormStructure) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const partKey = currentFormStructure.part.key;
      const answers = formValues[partKey] || {};

      await axios.put(
        `${API_URL}/super-admin/students/${studentId}/answers/${partKey}`,
        { answers },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Changes saved successfully!');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.response?.data?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const currentFormStructure = formStructure[currentPartIndex];
  const currentPart = currentFormStructure?.part;
  const currentSection = currentFormStructure?.sections?.[currentSectionIndex];

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <EduplanCoachLayout user={user}>
        <div className="p-8">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Student Details
          </button>

          {/* Student & Service Info */}
          {studentInfo && serviceInfo && (
            <StudentFormHeader
              studentName={getFullName(studentInfo.userId) || 'Student'}
              serviceName={serviceInfo.name}
              editMode="OPS"
            />
          )}

          {/* Brainography Report Section */}
          <div className="bg-white rounded-xl shadow-sm border border-teal-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Brainography Report</h3>
                  <p className="text-sm text-gray-500">Upload the brainography report for this student</p>
                </div>
              </div>
            </div>

            {brainographyDoc ? (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{brainographyDoc.fileName}</p>
                      <p className="text-xs text-gray-500">
                        {(brainographyDoc.fileSize / 1024).toFixed(1)} KB | 
                        Uploaded: {new Date(brainographyDoc.uploadedAt).toLocaleDateString('en-GB')} | 
                        Version: {brainographyDoc.version}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBrainographyView}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                    >
                      View
                    </button>
                    <button
                      onClick={handleBrainographyDownload}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
                    >
                      Download
                    </button>
                    <button
                      onClick={handleBrainographyDelete}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium"
                    >
                      Delete
                    </button>
                    <label className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-xs font-medium cursor-pointer">
                      Re-upload
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleBrainographyUpload}
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      />
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-gray-600 mb-3">No brainography report uploaded yet</p>
                <label className={`inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium cursor-pointer ${uploadingBrainography ? 'opacity-50 pointer-events-none' : ''}`}>
                  {uploadingBrainography ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Upload Brainography Report
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleBrainographyUpload}
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    disabled={uploadingBrainography}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Form Parts Navigation */}
          <FormPartsNavigation
            formStructure={formStructure}
            currentPartIndex={currentPartIndex}
            onPartChange={(index) => {
              setCurrentPartIndex(index);
              setCurrentSectionIndex(0);
            }}
          />

          {/* Sections Navigation */}
          {currentFormStructure && (
            <FormSectionsNavigation
              sections={currentFormStructure.sections}
              currentSectionIndex={currentSectionIndex}
              onSectionChange={setCurrentSectionIndex}
            />
          )}

          {/* Current Section Form */}
          {currentSection && currentPart && (
            <div className="mb-6">
              {currentPart.key === 'APPLICATION' && 
               (currentSection.title === 'Apply to Program' || currentSection.title === 'Applied Program') ? (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="bg-teal-600 px-6 py-4 -mx-6 -mt-6 mb-6 border-b border-teal-700">
                    <h3 className="text-xl font-semibold text-white">{currentSection.title}</h3>
                    {currentSection.description && (
                      <p className="text-teal-100 text-sm mt-1">{currentSection.description}</p>
                    )}
                  </div>
                  <ProgramSection
                    studentId={studentId}
                    sectionType={currentSection.title === 'Apply to Program' ? 'available' : 'applied'}
                    registrationId={registrationId}
                    userRole="OPS"
                  />
                </div>
              ) : (
                <FormSectionRenderer
                  section={currentSection}
                  values={formValues[currentPart.key]?.[currentSection._id] || {}}
                  onChange={(subSectionId, index, key, value) =>
                    handleFieldChange(currentPart.key, currentSection._id, subSectionId, index, key, value)
                  }
                  onAddInstance={(subSectionId) =>
                    handleAddInstance(currentPart.key, currentSection._id, subSectionId)
                  }
                  onRemoveInstance={(subSectionId, index) =>
                    handleRemoveInstance(currentPart.key, currentSection._id, subSectionId, index)
                  }
                  isAdminEdit={true}
                  registrationId={registrationId}
                  studentId={studentId}
                  userRole="OPS"
                />
              )}
            </div>
          )}

          {/* Save Button - Hide for document sections */}
          {currentSection && !currentSection.title.toLowerCase().includes('document') && (
            <FormSaveButtons
              onSave={handleSaveSection}
              saving={saving}
            />
          )}
        </div>
      </EduplanCoachLayout>
    </>
  );
}
