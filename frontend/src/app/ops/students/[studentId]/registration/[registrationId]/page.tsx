'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, serviceAPI, programAPI, teamMeetAPI, opsScheduleAPI } from '@/lib/api';
import { getServiceFormStructure } from '@/config/formConfig';
import { User, USER_ROLE, FormStructure, FormSection, FormSubSection, FormField, TeamMeet, TEAMMEET_STATUS, OpsSchedule } from '@/types';
import OpsLayout from '@/components/OpsLayout';
import FormSectionRenderer from '@/components/FormSectionRenderer';
import FormPartsNavigation from '@/components/FormPartsNavigation';
import FormSectionsNavigation from '@/components/FormSectionsNavigation';
import FormSaveButtons from '@/components/FormSaveButtons';
import StudentFormHeader from '@/components/StudentFormHeader';
import ProgramSection from '@/components/ProgramSection';
import OpsScheduleCalendar from '@/components/OpsScheduleCalendar';
import TeamMeetSidebar from '@/components/TeamMeetSidebar';
import TeamMeetFormPanel from '@/components/TeamMeetFormPanel';
import OpsScheduleFormPanel from '@/components/OpsScheduleFormPanel';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName } from '@/utils/nameHelpers';
import axios from 'axios';
import PaymentSection from '@/components/PaymentSection';

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
  const [errors, setErrors] = useState<any>({});
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [serviceInfo, setServiceInfo] = useState<any>(null);
  const [planTier, setPlanTier] = useState<string | undefined>();
  const [registrationObj, setRegistrationObj] = useState<any>(null);

  // Dashboard / view state
  type ActiveView = 'dashboard' | 'form' | 'payment';
  const [activeView, setActiveView] = useState<ActiveView>('form');
  const [isStudyAbroad, setIsStudyAbroad] = useState(false);
  const [programStats, setProgramStats] = useState({
    suggested: 0, selected: 0, shortlisted: 0, inProgress: 0, applied: 0, offerReceived: 0, offerAccepted: 0, rejected: 0, closed: 0,
  });

  // Calendar / TeamMeet state (Study Abroad dashboard)
  const [teamMeets, setTeamMeets] = useState<TeamMeet[]>([]);
  const [opsTasks, setOpsTasks] = useState<OpsSchedule[]>([]);
  const [selectedTeamMeet, setSelectedTeamMeet] = useState<TeamMeet | null>(null);
  const [showTeamMeetPanel, setShowTeamMeetPanel] = useState(false);
  const [teamMeetPanelMode, setTeamMeetPanelMode] = useState<'create' | 'view' | 'respond'>('view');
  const [selectedOpsTask, setSelectedOpsTask] = useState<OpsSchedule | null>(null);
  const [showOpsTaskPanel, setShowOpsTaskPanel] = useState(false);
  const currentUserId = user?._id || '';

  const fetchTeamMeetsForStudent = useCallback(async () => {
    if (!studentId) return;
    try {
      const res = await teamMeetAPI.getStudentTeamMeets(studentId);
      setTeamMeets(res.data.data.teamMeets || []);
    } catch (error) {
      console.error('Error fetching student team meets:', error);
    }
  }, [studentId]);

  const fetchOpsTasksForStudent = useCallback(async () => {
    if (!studentId) return;
    try {
      const res = await opsScheduleAPI.getStudentTasks(studentId);
      setOpsTasks(res.data.data.schedules || []);
    } catch (error) {
      console.error('Error fetching student OPS tasks:', error);
    }
  }, [studentId]);

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
      setPlanTier(registrationData.registration.planTier);
      setRegistrationObj(registrationData.registration);

      const svcName = typeof regServiceId === 'object' ? regServiceId.name : '';
      const svcSlug = typeof regServiceId === 'object' ? regServiceId.slug : '';
      const isEduPlan = svcSlug === 'education-planning' || svcName === 'Education Planning';
      const studyAbroad = !isEduPlan;
      setIsStudyAbroad(studyAbroad);
      if (studyAbroad) {
        setActiveView('dashboard');
        fetchProgramStats();
        fetchTeamMeetsForStudent();
        fetchOpsTasksForStudent();
      }
      
      if (!extractedServiceId) {
        throw new Error('Service ID not found');
      }
      
      // Fetch form structure
      const serviceSlug = typeof regServiceId === 'object' ? regServiceId.slug : '';
      const partConfigs = getServiceFormStructure(serviceSlug);
      const structure = partConfigs.map(part => ({
        part: { key: part.key, title: part.title, description: part.description, order: part.order },
        order: part.order,
        sections: part.sections,
      }));
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
        structure.forEach((part) => {
          const partKey = part.part.key;
          if (!formattedAnswers[partKey]) formattedAnswers[partKey] = {};
          
          part.sections?.forEach((section) => {
            if (!formattedAnswers[partKey][section.key]) formattedAnswers[partKey][section.key] = {};
            
            section.subSections?.forEach((subSection) => {
              if (!formattedAnswers[partKey][section.key][subSection.key]) {
                formattedAnswers[partKey][section.key][subSection.key] = [{}];
              }
              
              const instances = formattedAnswers[partKey][section.key][subSection.key];
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

  const fetchProgramStats = async () => {
    if (!registrationId || !studentId) return;
    try {
      const [availableRes, appliedRes] = await programAPI.getStudentProgramStats(studentId, registrationId);
      const availablePrograms = availableRes.data.data.programs || [];
      const appliedPrograms = appliedRes.data.data.programs || [];
      const all = [...availablePrograms, ...appliedPrograms];
      const count = (status: string) => all.filter((p: any) => p.status === status).length;
      setProgramStats({
        suggested: availablePrograms.length, selected: appliedPrograms.length,
        shortlisted: count('Shortlisted'), inProgress: count('In Progress'), applied: count('Applied'),
        offerReceived: count('Offer Received'), offerAccepted: count('Offer Accepted'),
        rejected: count('Rejected / Declined'), closed: count('Closed'),
      });
    } catch (error: any) {
      console.error('Error fetching program stats:', error);
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
            const mailingValues = newValues[partKey][sectionId][mailingSubSection.key]?.[0] || {};
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

      // Add the new instance at the end
      newValues[partKey][sectionId][subSectionId].push({});
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

  const validateCurrentSection = (): boolean => {
    const cs = formStructure[currentPartIndex];
    if (!cs) return true;
    const section = cs.sections?.[currentSectionIndex];
    if (!section) return true;
    const partKey = cs.part.key;
    const sectionKey = section.key;
    const sectionValues = formValues[partKey]?.[sectionKey] || {};
    const newErrors: any = {};
    let hasErrors = false;

    section.subSections.forEach((subSection) => {
      const subSectionValues = sectionValues[subSection.key] || [{}];
      subSectionValues.forEach((instanceValues: any, index: number) => {
        const visibleFields = subSection.fields.filter((f) => {
          const eduLevel = instanceValues?.educationLevel;
          const board = instanceValues?.board;
          if (f.key === 'board' || f.key === 'boardFullName') {
            if (eduLevel !== 'secondary_school' && eduLevel !== 'higher_secondary_school') return false;
          }
          if (f.key === 'boardFullName') {
            if (board !== 'State Board' && board !== 'Other') return false;
          }
          if (f.key === 'fieldOfStudy' && eduLevel === 'secondary_school') return false;
          return true;
        });
        visibleFields.forEach((field) => {
          if (field.required) {
            const value = instanceValues?.[field.key];
            if (!value || (typeof value === 'string' && value.trim() === '')) {
              if (!newErrors[subSection.key]) newErrors[subSection.key] = [];
              if (!newErrors[subSection.key][index]) newErrors[subSection.key][index] = {};
              newErrors[subSection.key][index][field.key] = `${field.label} is required`;
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
    const currentFormStructure = formStructure[currentPartIndex];
    if (!currentFormStructure) return;

    if (!validateCurrentSection()) {
      toast.error('Please fill all required fields');
      return;
    }

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
              studentId={studentId}
              planTier={planTier}
              serviceSlug={typeof serviceInfo === 'object' ? serviceInfo.slug : ''}
              adminId={studentInfo.adminId?._id}
            />
          )}

          {/* Study Abroad: FormPartsNavigation with Dashboard tab */}
          {isStudyAbroad && (
            <FormPartsNavigation
              formStructure={formStructure}
              currentPartIndex={currentPartIndex}
              onPartChange={(index) => { setActiveView('form'); setCurrentPartIndex(index); setCurrentSectionIndex(0); }}
              showDashboard={true}
              isDashboardActive={activeView === 'dashboard'}
              onDashboardClick={() => setActiveView('dashboard')}
              showPayment={true}
              isPaymentActive={activeView === 'payment'}
              onPaymentClick={() => setActiveView('payment')}
            />
          )}

          {/* Study Abroad Dashboard (read-only, matching student side) */}
          {isStudyAbroad && activeView === 'dashboard' && (() => {
            const dashboardStatCards = [
              { title: 'Suggested Program', value: programStats.suggested, color: 'blue' as const, icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
              { title: 'Selected Program', value: programStats.selected, color: 'cyan' as const, icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
              { title: 'Shortlisted Application', value: programStats.shortlisted, color: 'blue' as const, icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg> },
              { title: 'In Progress', value: programStats.inProgress, color: 'orange' as const, icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
              { title: 'Applied', value: programStats.applied, color: 'blue' as const, icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
              { title: 'Offer Received', value: programStats.offerReceived, color: 'green' as const, icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
              { title: 'Offer Accepted', value: programStats.offerAccepted, color: 'green' as const, icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg> },
              { title: 'Offer Rejected', value: programStats.rejected, color: 'red' as const, icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg> },
              { title: 'Application Closed', value: programStats.closed, color: 'gray' as const, icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg> },
            ];
            const totalPrograms = programStats.suggested + programStats.selected;
            const navigateToApplicationSection = (sectionTitle: 'Apply to Program' | 'Applied Program') => {
              const appPartIndex = formStructure.findIndex((p: any) => p.part?.key === 'APPLICATION');
              if (appPartIndex < 0) return;
              const sections = formStructure[appPartIndex].sections || [];
              const sectionIdx = sections.findIndex((s: any) => s.title === sectionTitle);
              setCurrentPartIndex(appPartIndex);
              setCurrentSectionIndex(sectionIdx >= 0 ? sectionIdx : 0);
              setActiveView('form');
            };
            return (
              <div className="mb-6 space-y-8">
                {/* Application Stats */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Application Overview</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {dashboardStatCards.map((card) => {
                      const colorMap: Record<string, string> = {
                        blue: 'bg-blue-100 text-blue-600', cyan: 'bg-cyan-100 text-cyan-600',
                        green: 'bg-green-100 text-green-600', orange: 'bg-orange-100 text-orange-600',
                        red: 'bg-red-100 text-red-600', gray: 'bg-gray-200 text-gray-600',
                      };
                      const pct = totalPrograms > 0 ? (card.value / totalPrograms) * 100 : 0;
                      const targetSection = card.title === 'Suggested Program' ? 'Apply to Program' : 'Applied Program';
                      return (
                        <div
                          key={card.title}
                          onClick={() => navigateToApplicationSection(targetSection)}
                          className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-5 transition-all cursor-pointer hover:border-blue-400 hover:shadow-md"
                        >
                          <div className="flex items-center justify-between">
                            <div className={`w-10 h-10 ${colorMap[card.color]} rounded-lg flex items-center justify-center`}>
                              {card.icon}
                            </div>
                            <h3 className="text-3xl font-extrabold text-gray-900">{card.value}</h3>
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <p className="text-sm font-semibold text-gray-700">{card.title}</p>
                            <p className="text-sm font-semibold text-gray-900">{pct.toFixed(1)}%</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Schedule Calendar Section */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Schedule</h2>
                      <p className="text-sm text-gray-500">Student meetings and tasks</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-3">
                      <OpsScheduleCalendar
                        schedules={opsTasks}
                        onScheduleSelect={(schedule) => { setSelectedOpsTask(schedule); setShowOpsTaskPanel(true); }}
                        onDateSelect={() => {}}
                        teamMeets={teamMeets}
                        onTeamMeetSelect={(tm) => { setSelectedTeamMeet(tm); setTeamMeetPanelMode('view'); setShowTeamMeetPanel(true); }}
                        currentUserId={currentUserId}
                      />
                    </div>
                    <div className="lg:col-span-1">
                      <TeamMeetSidebar
                        teamMeets={teamMeets}
                        onTeamMeetClick={(tm) => { setSelectedTeamMeet(tm); setTeamMeetPanelMode('view'); setShowTeamMeetPanel(true); }}
                        currentUserId={currentUserId}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Form Parts Navigation */}
          {activeView === 'form' && (
            <>
          {!isStudyAbroad && (
            <FormPartsNavigation
              formStructure={formStructure}
              currentPartIndex={currentPartIndex}
              onPartChange={(index) => {
                setActiveView('form');
                setCurrentPartIndex(index);
                setCurrentSectionIndex(0);
              }}
              showPayment={true}
              isPaymentActive={false}
              onPaymentClick={() => setActiveView('payment')}
            />
          )}

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
                    registrationId={registrationId}
                    userRole="OPS"
                  />
                </div>
              ) : (
                <FormSectionRenderer
                  section={currentSection}
                  values={formValues[currentPart.key]?.[currentSection.key] || {}}
                  onChange={(subSectionId, index, key, value) =>
                    handleFieldChange(currentPart.key, currentSection.key, subSectionId, index, key, value)
                  }
                  onAddInstance={(subSectionId) =>
                    handleAddInstance(currentPart.key, currentSection.key, subSectionId)
                  }
                  onRemoveInstance={(subSectionId, index) =>
                    handleRemoveInstance(currentPart.key, currentSection.key, subSectionId, index)
                  }
                  isAdminEdit={true}
                  registrationId={registrationId}
                  studentId={studentId}
                  userRole="OPS"
                  noDelete={currentPart.key === 'PROFILE' && currentSection.title === 'Parental Details'}
                  errors={errors}
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
            </>
          )}

          {/* Payment View */}
          {activeView === 'payment' && (
            <div className="mb-6">
              <PaymentSection
                registrationId={registrationId}
                studentId={studentId}
                paymentStatus={registrationObj?.paymentStatus}
                paymentAmount={registrationObj?.paymentAmount}
                paymentDate={registrationObj?.paymentDate}
                planTier={planTier}
                serviceName={typeof serviceInfo === 'object' ? serviceInfo.name : ''}
                totalAmount={registrationObj?.totalAmount}
                discountedAmount={registrationObj?.discountedAmount}
                paymentModel={registrationObj?.paymentModel}
                installmentPlan={registrationObj?.installmentPlan}
                totalPaid={registrationObj?.totalPaid}
                paymentComplete={registrationObj?.paymentComplete}
                readOnly={true}
              />
            </div>
          )}
        </div>
      </OpsLayout>

      {/* TeamMeet Panel (read-only) */}
      <TeamMeetFormPanel
        teamMeet={selectedTeamMeet}
        isOpen={showTeamMeetPanel}
        onClose={() => { setShowTeamMeetPanel(false); setSelectedTeamMeet(null); }}
        onSave={() => { setShowTeamMeetPanel(false); setSelectedTeamMeet(null); }}
        mode={teamMeetPanelMode}
        currentUserId={currentUserId}
        readOnly={true}
      />

      {/* OPS Task Panel (read-only) */}
      <OpsScheduleFormPanel
        schedule={selectedOpsTask}
        students={[]}
        isOpen={showOpsTaskPanel}
        onClose={() => { setShowOpsTaskPanel(false); setSelectedOpsTask(null); }}
        onSubmit={async () => {}}
        readOnly={true}
      />
    </>
  );
}
