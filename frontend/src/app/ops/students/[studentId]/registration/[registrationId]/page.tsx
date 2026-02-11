'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, serviceAPI } from '@/lib/api';
import { User, USER_ROLE, FormStructure, FormSection, FormSubSection, FormField } from '@/types';
import OpsLayout from '@/components/OpsLayout';
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

export default function StudentFormEditPage() {
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

      if (userData.role !== USER_ROLE.OPS) {
        toast.error('Access denied.');
        router.push('/');
        return;
      }

      setUser(userData);
      
      // Fetch all data efficiently with parallel requests
      try {
        await fetchAllData();
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

  const fetchAllData = async () => {
    const token = localStorage.getItem('token');
    
    try {
      // Make both independent API calls in PARALLEL
      const [studentResponse, registrationResponse] = await Promise.all([
        axios.get(`${API_URL}/super-admin/students/${studentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/super-admin/students/${studentId}/registrations/${registrationId}/answers`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      // Extract data from responses
      const studentData = studentResponse.data.data.student;
      const registrationData = registrationResponse.data.data;
      const regServiceId = registrationData.registration.serviceId;
      const extractedServiceId = typeof regServiceId === 'object' ? regServiceId._id : regServiceId;
      
      setStudentInfo(studentData);
      setServiceInfo(regServiceId);
      
      if (!extractedServiceId) {
        throw new Error('Service ID not found');
      }
      
      // Fetch form structure
      const formResponse = await serviceAPI.getServiceForm(extractedServiceId);
      const structure = formResponse.data.data.formStructure || [];
      setFormStructure(structure);
      
      // Process form answers
      const answers = registrationData.answers || [];
      const formattedAnswers: any = {};
      
      answers.forEach((answer: any) => {
        if (answer && answer.partKey) {
          formattedAnswers[answer.partKey] = answer.answers || {};
        }
      });
      
      // Pre-fill phone and country defaults
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
        toast.error('Access denied. You are not assigned as the active OPS for this student.');
        router.push('/ops/students');
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

      // Add the new instance before the last one (if there are existing instances)
      const instances = newValues[partKey][sectionId][subSectionId];
      if (instances.length > 0) {
        // Insert before the last element
        instances.splice(instances.length - 1, 0, {});
      } else {
        // No existing instances, just add it
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
      <OpsLayout user={user}>
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
              {/* Check if this is Application section with program management */}
              {currentPart.key === 'APPLICATION' && 
               (currentSection.title === 'Apply to Program' || currentSection.title === 'Applied Program') ? (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="bg-blue-600 px-6 py-4 -mx-6 -mt-6 mb-6 border-b border-blue-700">
                    <h3 className="text-xl font-semibold text-white">{currentSection.title}</h3>
                    {currentSection.description && (
                      <p className="text-blue-100 text-sm mt-1">{currentSection.description}</p>
                    )}
                  </div>
                  <ProgramSection
                    studentId={studentId}
                    sectionType={currentSection.title === 'Apply to Program' ? 'available' : 'applied'}
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
      </OpsLayout>
    </>
  );
}
