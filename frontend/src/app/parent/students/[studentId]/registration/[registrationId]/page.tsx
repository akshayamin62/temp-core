'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, parentAPI, serviceAPI } from '@/lib/api';
import { User, USER_ROLE, FormStructure, FormSection, FormSubSection } from '@/types';
import FormSectionRenderer from '@/components/FormSectionRenderer';
import FormPartsNavigation from '@/components/FormPartsNavigation';
import FormSectionsNavigation from '@/components/FormSectionsNavigation';
import StudentFormHeader from '@/components/StudentFormHeader';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName } from '@/utils/nameHelpers';
import ParentLayout from '@/components/ParentLayout';

export default function ParentStudentRegistrationPage() {
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
      if (userData.role !== USER_ROLE.PARENT) {
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

  const fetchAllData = async () => {
    try {
      const studentResponse = await parentAPI.getStudentDetails(studentId);
      const studentData = studentResponse.data.data.student;
      setStudentInfo(studentData);

      const registrationResponse = await parentAPI.getStudentFormAnswers(studentId, registrationId);
      const registrationData = registrationResponse.data.data;
      const regServiceId = registrationData.registration.serviceId;
      const extractedServiceId = typeof regServiceId === 'object' ? regServiceId._id : regServiceId;

      setServiceInfo(regServiceId);

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

  return (
    <>
      <Toaster position="top-right" />
      <ParentLayout user={user}>
        <div className="p-8">
          <button onClick={() => router.push(`/parent/students/${studentId}`)} className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors">
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
              studentId={studentId}
            />
          )}

          {/* Read Only Badge */}
          <div className="mb-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-800 rounded-lg border border-purple-200 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            Read Only Access
          </div>

          {/* Form Navigation */}
          {formStructure.length > 0 && (
            <>
              <FormPartsNavigation
                formStructure={formStructure}
                currentPartIndex={currentPartIndex}
                onPartChange={(index: number) => { setCurrentPartIndex(index); setCurrentSectionIndex(0); }}
              />

              {currentFormStruct?.sections && currentFormStruct.sections.length > 0 && (
                <FormSectionsNavigation
                  sections={currentFormStruct.sections}
                  currentSectionIndex={currentSectionIndex}
                  onSectionChange={setCurrentSectionIndex}
                />
              )}

              {/* Form Section Content */}
              {currentSection && currentPart && (
                <div className="mt-6">
                  <FormSectionRenderer
                    section={currentSection}
                    values={formValues[currentPart.key]?.[currentSection._id] || {}}
                    onChange={handleFieldChange}
                    onAddInstance={handleAddInstance}
                    onRemoveInstance={handleRemoveInstance}
                    errors={{}}
                    readOnly={true}
                  />
                </div>
              )}
            </>
          )}

          {formStructure.length === 0 && !loading && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500">No form data available for this registration.</p>
            </div>
          )}
        </div>
      </ParentLayout>
    </>
  );
}
