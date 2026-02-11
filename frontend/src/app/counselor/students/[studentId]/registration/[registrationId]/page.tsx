'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, serviceAPI, adminStudentAPI } from '@/lib/api';
import { User, USER_ROLE, FormStructure, FormSection, FormSubSection, FormField } from '@/types';
import FormSectionRenderer from '@/components/FormSectionRenderer';
import FormPartsNavigation from '@/components/FormPartsNavigation';
import FormSectionsNavigation from '@/components/FormSectionsNavigation';
import StudentFormHeader from '@/components/StudentFormHeader';
import ProgramSection from '@/components/ProgramSection';
import toast, { Toaster } from 'react-hot-toast';

export default function CounselorStudentRegistrationPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params?.studentId as string;
  const registrationId = params?.registrationId as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Form structure
  const [formStructure, setFormStructure] = useState<FormStructure[]>([]);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  
  // Form data
  const [formValues, setFormValues] = useState<any>({});
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [serviceInfo, setServiceInfo] = useState<any>(null);

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
    } catch (error) {
      toast.error('Please login to continue');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    try {
      // Fetch student details and form answers in parallel
      const [studentResponse, registrationResponse] = await Promise.all([
        adminStudentAPI.getStudentDetails(studentId),
        adminStudentAPI.getStudentFormAnswers(studentId, registrationId)
      ]);
      
      // Extract data from responses
      const studentData = studentResponse.data.data.student;
      const registrationData = registrationResponse.data.data;
      const regServiceId = registrationData.registration.serviceId;
      const extractedServiceId = typeof regServiceId === 'object' ? regServiceId._id : regServiceId;
      
      setStudentInfo(studentData);
      setServiceInfo(regServiceId);
      
      // Fetch form structure
      if (!extractedServiceId) {
        throw new Error('Service ID not found');
      }
      
      const formResponse = await serviceAPI.getServiceForm(extractedServiceId);
      const structure = formResponse.data.data.formStructure || [];
      setFormStructure(structure);
      
      // Process form answers
      const answers = registrationData.answers || [];
      const formattedAnswers: any = {};
      
      // Format answers to match form structure
      answers.forEach((answer: any) => {
        if (answer && answer.partKey) {
          formattedAnswers[answer.partKey] = answer.answers || {};
        }
      });
      
      // Initialize empty sections
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
      if (error.response?.status === 403) {
        toast.error('Access denied');
        router.push('/counselor/students');
      } else {
        toast.error('Failed to load form data');
      }
    }
  };

  // Read-only handlers (no-op)
  const handleFieldChange = () => {
    // Read-only - no changes allowed
  };

  const handleAddInstance = () => {
    // Read-only - no changes allowed
  };

  const handleRemoveInstance = () => {
    // Read-only - no changes allowed
  };

  const currentFormStructure = formStructure[currentPartIndex];
  const currentPart = currentFormStructure?.part;
  const currentSection = currentFormStructure?.sections?.[currentSectionIndex];

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
        <div className="p-8">
          {/* Read-only Badge */}
          <div className="mb-4 flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 w-fit">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-sm font-medium">Read-only access - You cannot edit this form</span>
          </div>

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
              studentName={studentInfo.userId?.name || 'Student'}
              serviceName={serviceInfo.name}
              editMode="admin"
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

          {/* Current Section Form - Read Only */}
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
                    isReadOnly={true}
                  />
                </div>
              ) : (
                <FormSectionRenderer
                  section={currentSection}
                  values={formValues[currentPart.key]?.[currentSection._id] || {}}
                  onChange={(subSectionId, index, key, value) =>
                    handleFieldChange()
                  }
                  onAddInstance={(subSectionId) =>
                    handleAddInstance()
                  }
                  onRemoveInstance={(subSectionId, index) =>
                    handleRemoveInstance()
                  }
                  isAdminEdit={false}
                  registrationId={registrationId}
                  studentId={studentId}
                  userRole="ADMIN"
                  readOnly={true}
                />
              )}
            </div>
          )}
        </div>
    </>
  );
}
