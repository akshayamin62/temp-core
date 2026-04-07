'use client';

import { useEffect, useState, Suspense, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { serviceAPI, formAnswerAPI, teamMeetAPI, programAPI, opsScheduleAPI, authAPI, activityAPI, servicePlanAPI } from '@/lib/api';
import { StudentServiceRegistration, Service, TeamMeet, TEAMMEET_STATUS, OpsSchedule } from '@/types';
import { getServiceFormStructure, PartConfig, SectionConfig } from '@/config/formConfig';
import { getServicePlans } from '@/config/servicePlans';
import toast, { Toaster } from 'react-hot-toast';
import FormSectionRenderer from '@/components/FormSectionRenderer';
import { StudyAbroadLayout, EducationPlanningLayout, CoachingClassesLayout } from '@/components/layouts';
import ProgramSection from '@/components/ProgramSection';
import { getFullName } from '@/utils/nameHelpers';
import axios from 'axios';
import BrainographyDataDisplay, { BrainographyDataType } from '@/components/BrainographyDataDisplay';
import PortfolioSection, { PortfolioItem, PortfolioRow, usePortfolioDownload } from '@/components/PortfolioSection';
import ActivityAnalyticsDashboard from '@/components/ActivityAnalyticsDashboard';
import TeamMeetSidebar from '@/components/TeamMeetSidebar';
import TeamMeetFormPanel from '@/components/TeamMeetFormPanel';
import OpsScheduleCalendar from '@/components/OpsScheduleCalendar';
import OpsScheduleFormPanel from '@/components/OpsScheduleFormPanel';
import CoachingClassCards, { ClassTiming } from '@/components/CoachingClassCards';
import { fetchBlobUrl } from '@/lib/useBlobUrl';

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

type ActiveView = 'dashboard' | 'analytics' | 'brainography' | 'portfolio' | 'form';

function MyDetailsContent() {
  const router = useRouter();
  const params = useParams();
  const registrationId = params.registrationId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [registration, setRegistration] = useState<ExtendedRegistration | null>(null);
  const [formStructure, setFormStructure] = useState<{ part: { key: string; title: string; description?: string; order: number }; order: number; sections: SectionConfig[] }[]>([]);
  const [selectedPartIndex, setSelectedPartIndex] = useState(0);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);
  const [formValues, setFormValues] = useState<any>({});
  const [errors, setErrors] = useState<any>({});
  const initialParentalReadOnlyRef = useRef<number[]>([]);
  const [brainographyDoc, setBrainographyDoc] = useState<BrainographyDoc | null>(null);
  const [currentUser, setCurrentUser] = useState<{ firstName?: string; middleName?: string; lastName?: string; email: string; profilePicture?: string } | null>(null);

  // Coaching classes pricing (for coaching service registrations)
  const [coachingPricing, setCoachingPricing] = useState<Record<string, number> | null>(null);

  // Extracted data & Portfolio
  const [brainographyData, setBrainographyData] = useState<BrainographyDataType | null>(null);
  const [extractingBrainography, setExtractingBrainography] = useState(false);
  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([]);
  const handlePortfolioDownload = usePortfolioDownload();

  // Education Planning Dashboard stats
  const [eduPlanStats, setEduPlanStats] = useState<{
    streak: { current: number; longest: number; totalDays: number };
    wordCount: { total: number; thisMonth: number };
    domainBalance: Record<string, { planned: number; completed: number }>;
  } | null>(null);

  const fetchEduPlanStats = useCallback(async () => {
    if (!registrationId) return;
    try {
      const res = await activityAPI.getActivityAnalytics(registrationId, 3);
      const d = res.data.data;
      if (d) {
        setEduPlanStats({
          streak: d.streak,
          wordCount: d.wordCount,
          domainBalance: d.domainBalance,
        });
      }
    } catch {
      // silent
    }
  }, [registrationId]);

  // Fetch TeamMeets for calendar
  const fetchTeamMeets = useCallback(async () => {
    try {
      const response = await teamMeetAPI.getTeamMeetsForCalendar();
      setTeamMeets(response.data.data.teamMeets);
    } catch (error: any) {
      console.error('Error fetching team meets:', error);
    }
  }, []);

  // Fetch program stats for dashboard
  const fetchProgramStats = useCallback(async () => {
    if (!registrationId) return;
    try {
      const response = await programAPI.getStudentPrograms(registrationId);
      const { availablePrograms = [], appliedPrograms = [] } = response.data.data;
      const all = [...availablePrograms, ...appliedPrograms];
      const count = (status: string) => all.filter((p: any) => p.status === status).length;
      setProgramStats({
        suggested: availablePrograms.length,
        selected: appliedPrograms.length,
        shortlisted: count('Shortlisted'),
        inProgress: count('In Progress'),
        applied: count('Applied'),
        offerReceived: count('Offer Received'),
        offerAccepted: count('Offer Accepted'),
        rejected: count('Rejected / Declined'),
        closed: count('Closed'),
      });
    } catch (error: any) {
      console.error('Error fetching program stats:', error);
    }
  }, [registrationId]);

  // Fetch OPS tasks assigned to this student
  const fetchOpsTasks = useCallback(async () => {
    try {
      const response = await opsScheduleAPI.getMyTasksAsStudent();
      setOpsTasks(response.data.data.schedules || []);
    } catch (error: any) {
      console.error('Error fetching OPS tasks:', error);
    }
  }, []);

  // Active view: analytics (default) | brainography | portfolio | form
  const [activeView, setActiveView] = useState<ActiveView>('analytics');

  // TeamMeet state (Study Abroad dashboard)
  const [teamMeets, setTeamMeets] = useState<TeamMeet[]>([]);
  const [selectedTeamMeet, setSelectedTeamMeet] = useState<TeamMeet | null>(null);
  const [showTeamMeetPanel, setShowTeamMeetPanel] = useState(false);
  const [teamMeetPanelMode, setTeamMeetPanelMode] = useState<'create' | 'view' | 'respond'>('create');
  const [selectedTeamMeetDate, setSelectedTeamMeetDate] = useState<Date | undefined>(undefined);

  // Program stats state (Study Abroad dashboard)
  const [programStats, setProgramStats] = useState({
    suggested: 0,
    selected: 0,
    shortlisted: 0,
    inProgress: 0,
    applied: 0,
    offerReceived: 0,
    offerAccepted: 0,
    rejected: 0,
    closed: 0,
  });

  // OPS tasks assigned to this student
  const [opsTasks, setOpsTasks] = useState<OpsSchedule[]>([]);
  const [selectedOpsTask, setSelectedOpsTask] = useState<OpsSchedule | null>(null);
  const [showOpsTaskPanel, setShowOpsTaskPanel] = useState(false);

  // Fetch current user profile for sidebar display
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await authAPI.getProfile();
        const userData = response.data.data.user;
        setCurrentUser(userData);
      } catch (error) {
        // Silently fail - user info is optional for sidebar
      }
    };
    fetchUser();
  }, []);

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
      setActiveView('dashboard');
      fetchBrainography();
      fetchBrainographyData();
      fetchPortfolios();
      fetchTeamMeets();
      fetchOpsTasks();
      fetchEduPlanStats();
    } else {
      // Non-EduPlan services (e.g. Study Abroad) should default to dashboard view
      setActiveView('dashboard');
      fetchTeamMeets();
      fetchProgramStats();
      fetchOpsTasks();
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

  const handleBrainographyView = async () => {
    if (!brainographyDoc) return;
    try {
      const path = brainographyDoc.filePath.startsWith('/') ? brainographyDoc.filePath : `/${brainographyDoc.filePath}`;
      const blobUrl = await fetchBlobUrl(path);
      window.open(blobUrl, '_blank');
    } catch {
      toast.error('Failed to load document');
    }
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
      const data = response.data.data.brainographyData || null;
      setBrainographyData(data);
      if (data) setExtractingBrainography(false);
      return data;
    } catch (error) {
      // Silently fail
      return null;
    }
  };

  useEffect(() => {
    if (!brainographyDoc || brainographyData) { setExtractingBrainography(false); return; }
    setExtractingBrainography(true);
    const interval = setInterval(async () => {
      const data = await fetchBrainographyData();
      if (data) clearInterval(interval);
    }, 5000);
    return () => clearInterval(interval);
  }, [brainographyDoc, brainographyData]);

  const handleUpdateBrainographyMeta = async (field: 'standard' | 'board', value: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `${BRAINOGRAPHY_API_URL}/portfolio/${registrationId}/data`,
        { [field]: value },
        { headers: { Authorization: `Bearer ${token}` } },
      );
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

      // Remember active registration for outer pages (parents, alumni, service-providers)
      sessionStorage.setItem('activeRegistrationId', registrationId!);

      // Get form structure from local config (no API call)
      const serviceObj = typeof reg.serviceId === 'object' ? reg.serviceId : null;
      const serviceSlug = serviceObj?.slug || '';
      const partConfigs = getServiceFormStructure(serviceSlug);
      const localFormStructure = partConfigs.map(part => ({
        part: { key: part.key, title: part.title, description: part.description, order: part.order },
        order: part.order,
        sections: part.sections,
      }));
      setFormStructure(localFormStructure);

      // Fetch coaching pricing if this is a coaching-classes registration
      if (serviceSlug === 'coaching-classes') {
        try {
          const pricingRes = await servicePlanAPI.getPricing('coaching-classes');
          setCoachingPricing(pricingRes.data.data.pricing || null);
        } catch { /* ignore */ }
      }

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
        values[partKey] = answer.answers;
      });
      
      // Initialize form structure and pre-fill phone and country defaults
      if (localFormStructure.length > 0) {
        localFormStructure.forEach((part) => {
          const partKey = part.part.key;
          if (!values[partKey]) values[partKey] = {};
          
          part.sections?.forEach((section) => {
            if (!values[partKey][section.key]) values[partKey][section.key] = {};
            
            section.subSections?.forEach((subSection) => {
              if (!values[partKey][section.key][subSection.key]) {
                values[partKey][section.key][subSection.key] = [{}];
              }
              
              const instances = values[partKey][section.key][subSection.key];
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
      
      // Compute initial parental readOnly indices from DB data
      const profileParental = values['PROFILE']?.['parentalDetails'];
      if (profileParental) {
        const indices: number[] = [];
        Object.values(profileParental).forEach((subData: any) => {
          if (Array.isArray(subData)) {
            subData.forEach((entry: any, idx: number) => {
              if (entry && Object.values(entry).some((v: any) => v && String(v).trim() !== '')) {
                indices.push(idx);
              }
            });
          }
        });
        initialParentalReadOnlyRef.current = indices;
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
      const section = currentPart?.sections?.find(s => s.key === sectionId);
      const subSection = section?.subSections?.find(ss => ss.key === subSectionId);
      
      if (subSection) {
        subSection.fields?.forEach((field) => {
          // Set default for country fields
          if ((field.key === 'mailingCountry' || field.key === 'permanentCountry') && field.defaultValue) {
            newInstance[field.key] = field.defaultValue;
          }
        });
      }
      
      // Add the new instance at the end
      newValues[partKey][sectionId][subSectionId].push(newInstance);
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

  const validateSection = (partKey: string, sectionKey: string): boolean => {
    const currentPart = formStructure[selectedPartIndex];
    const section = currentPart.sections.sort((a, b) => a.order - b.order)[selectedSectionIndex];
    const sectionValues = formValues[partKey]?.[sectionKey] || {};
    
    const newErrors: any = {};
    let hasErrors = false;

    // Validate each subsection
    section.subSections.forEach((subSection) => {
      const subSectionValues = sectionValues[subSection.key] || [{}];
      
      subSectionValues.forEach((instanceValues: any, index: number) => {
        // Filter fields by visibility (same logic as FormSubSectionRenderer)
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
            let value = instanceValues?.[field.key];
            
            // If value is empty and field has defaultValue, use defaultValue
            if ((!value || (typeof value === 'string' && value.trim() === '')) && field.defaultValue) {
              value = field.defaultValue;
              if (instanceValues) {
                instanceValues[field.key] = field.defaultValue;
              }
              setFormValues((prev: any) => {
                const newValues = JSON.parse(JSON.stringify(prev));
                if (newValues[partKey]?.[sectionKey]?.[subSection.key]?.[index]) {
                  newValues[partKey][sectionKey][subSection.key][index][field.key] = field.defaultValue;
                }
                return newValues;
              });
            }
            
            // Now validate
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
    try {
      const currentPart = formStructure[selectedPartIndex];
      const section = currentPart.sections[selectedSectionIndex];
      const partKey = currentPart.part.key;
      const sectionKey = section.key;

      // Validate before saving
      if (!validateSection(partKey, sectionKey)) {
        toast.error('Please fill all required fields');
        return;
      }

      setSaving(true);
      
      // Get ONLY current section answers
      const sectionAnswers = formValues[partKey]?.[sectionKey] || {};
      
      // Get existing part answers from database to merge with
      const existingAnswersResponse = await formAnswerAPI.getFormAnswers(registrationId!, partKey);
      const existingAnswers = existingAnswersResponse.data.data.answers;
      
      // Merge: keep all existing answers and update only current section
      let allPartAnswers = {};
      if (existingAnswers && existingAnswers.length > 0) {
        allPartAnswers = { ...existingAnswers[0].answers };
      }
      allPartAnswers = { ...allPartAnswers, [sectionKey]: sectionAnswers };
      
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

  // ─── TeamMeet Handlers (Study Abroad Dashboard) ───
  const currentUserId = (() => {
    // Derive from registration data - find student userId
    if (registration?.studentId && typeof registration.studentId === 'object') {
      // We don't have userId directly on registration; use localStorage
    }
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.id || payload._id || payload.userId;
      }
    } catch {}
    return undefined;
  })();

  const handleTeamMeetSelect = (teamMeet: TeamMeet) => {
    setSelectedTeamMeet(teamMeet);
    if (teamMeet.requestedTo._id === currentUserId && teamMeet.status === TEAMMEET_STATUS.PENDING_CONFIRMATION) {
      setTeamMeetPanelMode('respond');
    } else {
      setTeamMeetPanelMode('view');
    }
    setShowTeamMeetPanel(true);
  };

  const handleTeamMeetDateSelect = (date: Date) => {
    setSelectedTeamMeetDate(date);
    setSelectedTeamMeet(null);
    setTeamMeetPanelMode('create');
    setShowTeamMeetPanel(true);
  };

  const handleScheduleTeamMeet = () => {
    setSelectedTeamMeet(null);
    setSelectedTeamMeetDate(undefined);
    setTeamMeetPanelMode('create');
    setShowTeamMeetPanel(true);
  };

  const handleTeamMeetSave = async () => {
    setShowTeamMeetPanel(false);
    setSelectedTeamMeet(null);
    setSelectedTeamMeetDate(undefined);
    await fetchTeamMeets();
  };

  const handleTeamMeetPanelClose = () => {
    setShowTeamMeetPanel(false);
    setSelectedTeamMeet(null);
    setSelectedTeamMeetDate(undefined);
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
    { key: 'analytics' as ActiveView, label: 'Activity Analysis' },
    { key: 'brainography' as ActiveView, label: 'Brainography Analysis' },
    { key: 'portfolio' as ActiveView, label: 'Portfolio Generator' },
  ] : [];

  const isStudyAbroad = !isEducationPlanning;

  /* ─── Study Abroad Dashboard Stat Cards ─── */
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

  /* ─── Study Abroad Dashboard Renderer ─── */
  const renderStudentDashboard = () => {
    const totalPrograms = programStats.suggested + programStats.selected;

    const navigateToApplicationSection = (sectionTitle: 'Apply to Program' | 'Applied Program') => {
      const appPartIndex = formStructure.findIndex((p: any) => p.part?.key === 'APPLICATION');
      if (appPartIndex < 0) return;
      const sortedSections = [...(formStructure[appPartIndex].sections || [])].sort((a: any, b: any) => a.order - b.order);
      const sectionIdx = sortedSections.findIndex((s: any) => s.title === sectionTitle);
      setSelectedPartIndex(appPartIndex);
      setSelectedSectionIndex(sectionIdx >= 0 ? sectionIdx : 0);
      setActiveView('form');
    };

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Application Stats */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Application Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {dashboardStatCards.map((card) => {
              const colorMap: Record<string, string> = {
                blue: 'bg-blue-100 text-blue-600',
                cyan: 'bg-cyan-100 text-cyan-600',
                green: 'bg-green-100 text-green-600',
                orange: 'bg-orange-100 text-orange-600',
                red: 'bg-red-100 text-red-600',
                gray: 'bg-gray-200 text-gray-600',
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

        {/* Schedule Calendar Section (Combined OPS Tasks + Team Meet) */}
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <OpsScheduleCalendar
                schedules={opsTasks}
                onScheduleSelect={(schedule) => { setSelectedOpsTask(schedule); setShowOpsTaskPanel(true); }}
                onDateSelect={handleTeamMeetDateSelect}
                teamMeets={teamMeets}
                onTeamMeetSelect={handleTeamMeetSelect}
                currentUserId={currentUserId}
              />
            </div>
            <div className="lg:col-span-1">
              <TeamMeetSidebar
                teamMeets={teamMeets}
                onTeamMeetClick={handleTeamMeetSelect}
                onScheduleClick={handleScheduleTeamMeet}
                currentUserId={currentUserId}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ─── Education Planning Dashboard Renderer ─── */
  const renderEduPlanDashboard = () => {
    const stats = eduPlanStats;
    const entries = stats ? Object.values(stats.domainBalance) : [];
    const totalPlanned = entries.reduce((s, e) => s + e.planned, 0);
    const totalCompleted = entries.reduce((s, e) => s + e.completed, 0);
    const overall = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 50) / 10 : 0;

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Activity Stats */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Activity Overview <span className="text-sm font-normal text-gray-500">(Last 3 Months)</span></h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-5 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center text-lg">🔥</div>
                <h3 className="text-3xl font-extrabold text-gray-900">{stats?.streak.current ?? 0}</h3>
              </div>
              <p className="text-sm font-semibold text-gray-700 mt-3">Current Streak (days)</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-5 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-yellow-100 text-yellow-600 rounded-lg flex items-center justify-center text-lg">🏆</div>
                <h3 className="text-3xl font-extrabold text-gray-900">{stats?.streak.longest ?? 0}</h3>
              </div>
              <p className="text-sm font-semibold text-gray-700 mt-3">Longest Streak (days)</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-5 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-lg">📅</div>
                <h3 className="text-3xl font-extrabold text-gray-900">{stats?.streak.totalDays ?? 0}</h3>
              </div>
              <p className="text-sm font-semibold text-gray-700 mt-3">Total Days</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-5 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center text-lg">📝</div>
                <h3 className="text-3xl font-extrabold text-gray-900">{stats?.wordCount.total ?? 0}</h3>
              </div>
              <div className="flex items-center justify-between mt-3">
                <p className="text-sm font-semibold text-gray-700">New Words</p>
                <p className="text-xs text-gray-500">{stats?.wordCount.thisMonth ?? 0} this month</p>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-5 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-lg">⭐</div>
                <h3 className="text-3xl font-extrabold text-gray-900">{overall} / 5</h3>
              </div>
              <div className="flex items-center justify-between mt-3">
                <p className="text-sm font-semibold text-gray-700">Overall Performance</p>
                <p className="text-xs text-gray-500">{totalCompleted}/{totalPlanned}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule Calendar Section */}
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <OpsScheduleCalendar
                schedules={opsTasks}
                onScheduleSelect={(schedule) => { setSelectedOpsTask(schedule); setShowOpsTaskPanel(true); }}
                onDateSelect={handleTeamMeetDateSelect}
                teamMeets={teamMeets}
                onTeamMeetSelect={handleTeamMeetSelect}
                currentUserId={currentUserId}
              />
            </div>
            <div className="lg:col-span-1">
              <TeamMeetSidebar
                teamMeets={teamMeets}
                onTeamMeetClick={handleTeamMeetSelect}
                onScheduleClick={handleScheduleTeamMeet}
                currentUserId={currentUserId}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

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
                <span>{btn.label}</span>
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
        {brainographyDoc && !brainographyData && extractingBrainography && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm font-medium text-blue-800">AI is extracting data from brainography report...</p>
            <p className="text-xs text-blue-600 mt-1">This may take a minute. Please wait.</p>
          </div>
        )}
        {brainographyData && <BrainographyDataDisplay data={brainographyData} canEdit onUpdate={handleUpdateBrainographyMeta} />}
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
      const isCoachingClasses = service?.slug === 'coaching-classes' || service?.name === 'Coaching Classes';

      if (isCoachingClasses) {
        const coachingPlans = getServicePlans('coaching-classes');
        const regTier = registration?.planTier;
        const regClasses: Record<string, ClassTiming | null> = {};
        if (regTier) {
          regClasses[regTier] = (registration as any)?.classTiming || null;
        }

        return (
          <div className="min-h-screen bg-gray-50">
            <Toaster position="top-right" />
            <CoachingClassesLayout
              serviceName={service?.name || 'Coaching Classes'}
              user={currentUser}
            >
              <div className="p-6 lg:p-8">
                <div className="mb-8">
                  <h2 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">Service Plan</h2>
                  <p className="mt-1 text-gray-500 text-lg max-w-2xl">Your registered coaching class details and available plans.</p>
                </div>
                <CoachingClassCards
                  plans={coachingPlans}
                  pricing={coachingPricing}
                  registeredClasses={regClasses}
                />
              </div>
            </CoachingClassesLayout>
          </div>
        );
      }

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
        <EducationPlanningLayout
          serviceName={service?.name || 'Education Planning'}
          user={currentUser}
          activeView={activeView}
          onViewChange={(view) => setActiveView(view as ActiveView)}
          onMyActivityClick={() => router.push(`/student/registration/${registrationId}/activity`)}
        >
          {/* Dashboard */}
          {activeView === 'dashboard' && renderEduPlanDashboard()}

          {/* Dynamic Content Area */}
          {activeView === 'analytics' && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <ActivityAnalyticsDashboard registrationId={registrationId} />
            </div>
          )}
          {activeView === 'brainography' && renderBrainographyContent()}
          {activeView === 'portfolio' && renderPortfolioContent()}

          {renderSupportTeam()}
        </EducationPlanningLayout>

        {/* TeamMeet Slide-in Panel */}
        <TeamMeetFormPanel
          teamMeet={selectedTeamMeet}
          isOpen={showTeamMeetPanel}
          onClose={handleTeamMeetPanelClose}
          onSave={handleTeamMeetSave}
          selectedDate={selectedTeamMeetDate}
          mode={teamMeetPanelMode}
          currentUserId={currentUserId}
        />

        {/* OpsSchedule Task Detail Panel */}
        <OpsScheduleFormPanel
          schedule={selectedOpsTask}
          students={[]}
          isOpen={showOpsTaskPanel}
          onClose={() => { setShowOpsTaskPanel(false); setSelectedOpsTask(null); }}
          onSubmit={async () => {}}
          readOnly={true}
        />
      </div>
    );
  } // end if (formStructure.length === 0)

  const currentPart = formStructure[selectedPartIndex];
  const currentSection = currentPart.sections.sort((a, b) => a.order - b.order)[selectedSectionIndex];

  const renderFormContent = () => (
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
                    key={section.key}
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
                  values={formValues[currentPart.part.key]?.[currentSection.key] || {}}
                  onChange={(subSectionId, index, key, value) =>
                    handleFieldChange(currentPart.part.key, currentSection.key, subSectionId, index, key, value)
                  }
                  onAddInstance={(subSectionId) =>
                    handleAddInstance(currentPart.part.key, currentSection.key, subSectionId)
                  }
                  onRemoveInstance={(subSectionId, index) =>
                    handleRemoveInstance(currentPart.part.key, currentSection.key, subSectionId, index)
                  }
                  errors={errors}
                  registrationId={registrationId!}
                  studentId={registration?.studentId?.toString()}
                  userRole="STUDENT"
                />
              ) : (
                <>
                  {(() => {
                    const isParentalSection = currentPart.part.key === 'PROFILE' && currentSection.title === 'Parental Details';
                    const parentalReadOnlyInstances = isParentalSection ? initialParentalReadOnlyRef.current : [];
                    const allParentalSlotsFilled = parentalReadOnlyInstances.length >= 2;
                    return (
                      <>
                        <FormSectionRenderer
                          section={currentSection}
                          values={formValues[currentPart.part.key]?.[currentSection.key] || {}}
                          onChange={(subSectionId, index, key, value) =>
                            handleFieldChange(currentPart.part.key, currentSection.key, subSectionId, index, key, value)
                          }
                          onAddInstance={(subSectionId) =>
                            handleAddInstance(currentPart.part.key, currentSection.key, subSectionId)
                          }
                          onRemoveInstance={(subSectionId, index) =>
                            handleRemoveInstance(currentPart.part.key, currentSection.key, subSectionId, index)
                          }
                          errors={errors}
                          readOnly={isParentalSection && allParentalSlotsFilled}
                          readOnlyKeys={currentPart.part.key === 'PROFILE' ? ['firstName', 'middleName', 'lastName'] : undefined}
                          noDelete={isParentalSection}
                          readOnlyInstances={isParentalSection ? parentalReadOnlyInstances : []}
                        />
                        {isParentalSection && parentalReadOnlyInstances.length > 0 && (
                          <div className="mt-3 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                            {allParentalSlotsFilled
                              ? 'Both parental detail entries are saved. Contact your counselor or admin to make changes.'
                              : 'Saved parental details cannot be edited. You may add one more parent entry.'}
                          </div>
                        )}
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
                    );
                  })()}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );

  // ═══ Regular Form View ═══
  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {isEducationPlanning ? (
        <EducationPlanningLayout
          formStructure={formStructure}
          currentPartIndex={selectedPartIndex}
          onPartChange={(index) => {
            setSelectedPartIndex(index);
            setSelectedSectionIndex(0);
            setActiveView('form');
          }}
          onSectionChange={(index) => {
            setSelectedSectionIndex(index);
            setActiveView('form');
          }}
          serviceName={service?.name || 'Education Planning'}
          user={currentUser}
          activeView={activeView}
          onViewChange={(view) => setActiveView(view as ActiveView)}
          onMyActivityClick={() => router.push(`/student/registration/${registrationId}/activity`)}
        >
          {activeView === 'dashboard' && renderEduPlanDashboard()}
          {activeView === 'analytics' && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <ActivityAnalyticsDashboard registrationId={registrationId} />
            </div>
          )}
          {activeView === 'brainography' && renderBrainographyContent()}
          {activeView === 'portfolio' && renderPortfolioContent()}
          {activeView === 'form' && renderFormContent()}
          {renderSupportTeam()}
        </EducationPlanningLayout>
      ) : (
        <StudyAbroadLayout
          formStructure={formStructure}
          currentPartIndex={selectedPartIndex}
          onPartChange={(index) => {
            setSelectedPartIndex(index);
            setSelectedSectionIndex(0);
            setActiveView('form');
          }}
          onSectionChange={(index) => {
            setSelectedSectionIndex(index);
            setActiveView('form');
          }}
          serviceName={service?.name || 'Study Abroad'}
          showDashboard={true}
          isDashboardActive={activeView === 'dashboard'}
          onDashboardClick={() => setActiveView('dashboard')}
          user={currentUser}
        >
          {activeView === 'dashboard' && renderStudentDashboard()}
          {activeView === 'form' && renderFormContent()}
          {renderSupportTeam()}
        </StudyAbroadLayout>
      )}

      {/* TeamMeet Slide-in Panel */}
      <TeamMeetFormPanel
        teamMeet={selectedTeamMeet}
        isOpen={showTeamMeetPanel}
        onClose={handleTeamMeetPanelClose}
        onSave={handleTeamMeetSave}
        selectedDate={selectedTeamMeetDate}
        mode={teamMeetPanelMode}
        currentUserId={currentUserId}
      />

      {/* OpsSchedule Task Detail Panel */}
      <OpsScheduleFormPanel
        schedule={selectedOpsTask}
        students={[]}
        isOpen={showOpsTaskPanel}
        onClose={() => { setShowOpsTaskPanel(false); setSelectedOpsTask(null); }}
        onSubmit={async () => {}}
        readOnly={true}
      />
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
