'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, teamMeetAPI, opsScheduleAPI, activityAPI } from '@/lib/api';
import { User, USER_ROLE, TeamMeet, TEAMMEET_STATUS, OpsSchedule, FormStructure } from '@/types';
import { getServiceFormStructure, SectionConfig } from '@/config/formConfig';
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
import PaymentSection from '@/components/PaymentSection';
import BrainographyDataDisplay, { BrainographyDataType } from '@/components/BrainographyDataDisplay';
import PortfolioSection, { PortfolioItem, PortfolioRow, usePortfolioDownload } from '@/components/PortfolioSection';
import ActivityAnalyticsDashboard from '@/components/ActivityAnalyticsDashboard';
import OpsScheduleCalendar from '@/components/OpsScheduleCalendar';
import TeamMeetSidebar from '@/components/TeamMeetSidebar';
import TeamMeetFormPanel from '@/components/TeamMeetFormPanel';
import OpsScheduleFormPanel from '@/components/OpsScheduleFormPanel';

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

type ActiveView = 'dashboard' | 'analytics' | 'brainography' | 'portfolio' | 'form' | 'payment';

export default function EduplanCoachStudentFormEditPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params?.studentId as string;
  const registrationId = params?.registrationId as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formStructure, setFormStructure] = useState<FormStructure[]>([]);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  const [formValues, setFormValues] = useState<any>({});
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [serviceInfo, setServiceInfo] = useState<any>(null);
  const [planTier, setPlanTier] = useState<string | undefined>();
  const [registrationObj, setRegistrationObj] = useState<any>(null);
  const initialParentalReadOnlyRef = useRef<number[]>([]);

  const [brainographyDoc, setBrainographyDoc] = useState<BrainographyDoc | null>(null);
  const [uploadingBrainography, setUploadingBrainography] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [brainographyData, setBrainographyData] = useState<BrainographyDataType | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState<{ step: string; pct: number } | null>(null);
  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([]);
  const handlePortfolioDownload = usePortfolioDownload();

  const [activeView, setActiveView] = useState<ActiveView>('analytics');
  const [isEducationPlanning, setIsEducationPlanning] = useState(false);
  const [isStudyAbroad, setIsStudyAbroad] = useState(false);

  // Calendar / TeamMeet state
  const [teamMeets, setTeamMeets] = useState<TeamMeet[]>([]);
  const [opsTasks, setOpsTasks] = useState<OpsSchedule[]>([]);
  const [selectedTeamMeet, setSelectedTeamMeet] = useState<TeamMeet | null>(null);
  const [showTeamMeetPanel, setShowTeamMeetPanel] = useState(false);
  const [teamMeetPanelMode, setTeamMeetPanelMode] = useState<'create' | 'view' | 'respond'>('view');
  const [selectedOpsTask, setSelectedOpsTask] = useState<OpsSchedule | null>(null);
  const [showOpsTaskPanel, setShowOpsTaskPanel] = useState(false);
  const currentUserId = user?._id || '';

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
      if (d) setEduPlanStats({ streak: d.streak, wordCount: d.wordCount, domainBalance: d.domainBalance });
    } catch { /* silent */ }
  }, [registrationId]);

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
        await fetchBrainographyData();
        await fetchPortfolios();
      } catch (fetchError) {
        console.error('fetchAllData failed:', fetchError);
      }
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
      const response = await axios.get(`${API_URL}/brainography/${registrationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBrainographyDoc(response.data.data.document || null);
    } catch {
      // silently fail
    }
  };

  const fetchBrainographyData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/portfolio/${registrationId}/data`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data.data.brainographyData || null;
      setBrainographyData(data);
      return data;
    } catch {
      // silently fail
      return null;
    }
  };

  useEffect(() => {
    if (!brainographyDoc || brainographyData || extracting) return;
    const interval = setInterval(async () => {
      const data = await fetchBrainographyData();
      if (data) clearInterval(interval);
    }, 5000);
    return () => clearInterval(interval);
  }, [brainographyDoc, brainographyData, extracting]);

  const handleUpdateBrainographyMeta = async (field: 'standard' | 'board', value: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `${API_URL}/portfolio/${registrationId}/data`,
        { [field]: value },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setBrainographyData(response.data.data.brainographyData || null);
    } catch {
      // silently fail
    }
  };

  const fetchPortfolios = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/portfolio/${registrationId}/portfolios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPortfolios(response.data.data.portfolios || []);
    } catch {
      // silently fail
    }
  };

  const handleExtractData = async () => {
    setExtracting(true);
    setExtractProgress({ step: 'Preparing PDF for AI analysis...', pct: 10 });
    try {
      const token = localStorage.getItem('token');
      const progressSteps = [
        { step: 'Sending PDF to GPT-4o...', pct: 20 },
        { step: 'Analyzing brainography patterns...', pct: 40 },
        { step: 'Extracting skills & quotients...', pct: 60 },
        { step: 'Parsing career goals & styles...', pct: 80 },
        { step: 'Saving extracted data...', pct: 90 },
      ];
      let stepIdx = 0;
      const interval = setInterval(() => {
        if (stepIdx < progressSteps.length) {
          setExtractProgress(progressSteps[stepIdx]);
          stepIdx++;
        }
      }, 5000);
      const response = await axios.post(
        `${API_URL}/portfolio/${registrationId}/extract`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      clearInterval(interval);
      setExtractProgress({ step: 'Extraction complete!', pct: 100 });
      setBrainographyData(response.data.data.brainographyData || null);
      toast.success('Brainography data extracted successfully!');
      setTimeout(() => setExtractProgress(null), 2000);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to extract data');
      setExtractProgress(null);
    } finally {
      setExtracting(false);
    }
  };

  const handleBrainographyUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBrainography(true);
    try {
      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('file', file);
      await axios.post(`${API_URL}/brainography/${registrationId}/upload`, fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Brainography report uploaded successfully!');
      await fetchBrainography();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload brainography report');
    } finally {
      setUploadingBrainography(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
    } catch {
      toast.error('Failed to download brainography report');
    }
  };

  const fetchAllData = async () => {
    const token = localStorage.getItem('token');
    try {
      const [studentResponse, registrationResponse] = await Promise.all([
        axios.get(`${API_URL}/super-admin/students/${studentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/super-admin/students/${studentId}/registrations/${registrationId}/answers`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

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
      setIsEducationPlanning(isEduPlan);
      const studyAbroad = !isEduPlan;
      setIsStudyAbroad(studyAbroad);
      if (isEduPlan) {
        setActiveView('dashboard');
        fetchTeamMeetsForStudent();
        fetchOpsTasksForStudent();
        fetchEduPlanStats();
      } else {
        setActiveView('form');
      }

      if (!extractedServiceId) throw new Error('Service ID not found');

      const serviceSlug = typeof regServiceId === 'object' ? regServiceId.slug : '';
      const partConfigs = getServiceFormStructure(serviceSlug);
      const structure = partConfigs.map(part => ({
        part: { key: part.key, title: part.title, description: part.description, order: part.order },
        order: part.order,
        sections: part.sections,
      }));
      setFormStructure(structure);

      const answers = registrationData.answers || [];
      const formattedAnswers: any = {};
      answers.forEach((answer: any) => {
        if (answer && answer.partKey) {
          formattedAnswers[answer.partKey] = answer.answers || {};
        }
      });

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
                  const phoneField = subSection.fields?.find(
                    (f: any) => f.key === 'phone' || f.key === 'phoneNumber' || f.key === 'mobileNumber'
                  );
                  if (phoneField && studentData.mobileNumber && !instance[phoneField.key]) {
                    instance[phoneField.key] = studentData.mobileNumber;
                  }
                  subSection.fields?.forEach((field: any) => {
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
      // Compute initial parental readOnly indices from DB data
      const profileParental = formattedAnswers['PROFILE']?.['parentalDetails'];
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
    partKey: string, sectionId: string, subSectionId: string, index: number, key: string, value: any
  ) => {
    setFormValues((prev: any) => {
      const newValues = JSON.parse(JSON.stringify(prev));
      if (!newValues[partKey]) newValues[partKey] = {};
      if (!newValues[partKey][sectionId]) newValues[partKey][sectionId] = {};
      if (!newValues[partKey][sectionId][subSectionId]) newValues[partKey][sectionId][subSectionId] = [];
      if (!newValues[partKey][sectionId][subSectionId][index]) newValues[partKey][sectionId][subSectionId][index] = {};
      newValues[partKey][sectionId][subSectionId][index][key] = value;

      if (key === 'sameAsMailingAddress') {
        const cs = formStructure[currentPartIndex];
        const ps = cs?.sections?.filter((s: any) => s.title === 'Personal Details') || [];
        if (ps.length > 0) {
          const ms = ps[0].subSections.find((s: any) => s.title === 'Mailing Address');
          if (value && ms) {
            const mv = newValues[partKey][sectionId][ms.key]?.[0] || {};
            newValues[partKey][sectionId][subSectionId][index]['permanentAddress1'] = mv['mailingAddress1'] || '';
            newValues[partKey][sectionId][subSectionId][index]['permanentAddress2'] = mv['mailingAddress2'] || '';
            newValues[partKey][sectionId][subSectionId][index]['permanentCountry'] = mv['mailingCountry'] || '';
            newValues[partKey][sectionId][subSectionId][index]['permanentState'] = mv['mailingState'] || '';
            newValues[partKey][sectionId][subSectionId][index]['permanentCity'] = mv['mailingCity'] || '';
            newValues[partKey][sectionId][subSectionId][index]['permanentPostalCode'] = mv['mailingPostalCode'] || '';
          }
        }
      }
      if (key.includes('Country')) {
        newValues[partKey][sectionId][subSectionId][index][key.replace('Country', 'State')] = '';
        newValues[partKey][sectionId][subSectionId][index][key.replace('Country', 'City')] = '';
      } else if (key.includes('State')) {
        newValues[partKey][sectionId][subSectionId][index][key.replace('State', 'City')] = '';
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
      if (instances.length > 0) { instances.splice(instances.length - 1, 0, {}); } else { instances.push({}); }
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
    const cs = formStructure[currentPartIndex];
    if (!cs) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const partKey = cs.part.key;
      const answers = formValues[partKey] || {};
      await axios.put(
        `${API_URL}/super-admin/students/${studentId}/answers/${partKey}`,
        { answers },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Changes saved successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const currentFormStruct = formStructure[currentPartIndex];
  const currentPart = currentFormStruct?.part;
  const currentSection = currentFormStruct?.sections?.[currentSectionIndex];

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

  const navButtons: { key: ActiveView; label: string; icon: string }[] = isEducationPlanning
    ? [
        { key: 'dashboard', label: 'Dashboard', icon: '🏠' },
        { key: 'analytics', label: 'Activity Analysis', icon: '📊' },
        { key: 'brainography', label: 'Brainography Analysis', icon: '🧠' },
        { key: 'portfolio', label: 'Education Portfolio Generator', icon: '📁' },
        { key: 'payment', label: 'Payment', icon: '💳' },
      ]
    : [];

  return (
    <>
      <Toaster position="top-right" />
      <EduplanCoachLayout user={user}>
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
              editMode="EDUPLAN_COACH"
              studentId={studentId}
              planTier={planTier}
              serviceSlug={typeof serviceInfo === 'object' ? serviceInfo.slug : ''}
              adminId={studentInfo.adminId?._id}
            />
          )}

          {isEducationPlanning && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
              <div className="flex border-b border-gray-200">
                {navButtons.map((btn) => (
                  <button key={btn.key} onClick={() => setActiveView(btn.key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-4 text-sm font-semibold transition-colors border-b-2 ${activeView === btn.key ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}>
                    {btn.label}
                  </button>
                ))}
                <button onClick={() => router.push(`/eduplan-coach/students/${studentId}/registration/${registrationId}/activity`)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-4 text-sm font-semibold transition-colors border-b-2 border-transparent text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                  Activity Management
                </button>
              </div>
            </div>
          )}

          {/* Education Planning Dashboard */}
          {isEducationPlanning && activeView === 'dashboard' && (() => {
            const stats = eduPlanStats;
            const entries = stats ? Object.values(stats.domainBalance) : [];
            const totalPlanned = entries.reduce((s, e) => s + e.planned, 0);
            const totalCompleted = entries.reduce((s, e) => s + e.completed, 0);
            const overall = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 50) / 10 : 0;
            return (
              <div className="mb-6 space-y-8">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Activity Overview <span className="text-sm font-normal text-gray-500">(Last 3 Months)</span></h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-5"><div className="flex items-center justify-between"><div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center text-lg">🔥</div><h3 className="text-3xl font-extrabold text-gray-900">{stats?.streak.current ?? 0}</h3></div><p className="text-sm font-semibold text-gray-700 mt-3">Current Streak (days)</p></div>
                    <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-5"><div className="flex items-center justify-between"><div className="w-10 h-10 bg-yellow-100 text-yellow-600 rounded-lg flex items-center justify-center text-lg">🏆</div><h3 className="text-3xl font-extrabold text-gray-900">{stats?.streak.longest ?? 0}</h3></div><p className="text-sm font-semibold text-gray-700 mt-3">Longest Streak (days)</p></div>
                    <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-5"><div className="flex items-center justify-between"><div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-lg">📅</div><h3 className="text-3xl font-extrabold text-gray-900">{stats?.streak.totalDays ?? 0}</h3></div><p className="text-sm font-semibold text-gray-700 mt-3">Total Days</p></div>
                    <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-5"><div className="flex items-center justify-between"><div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center text-lg">📝</div><h3 className="text-3xl font-extrabold text-gray-900">{stats?.wordCount.total ?? 0}</h3></div><div className="flex items-center justify-between mt-3"><p className="text-sm font-semibold text-gray-700">New Words</p><p className="text-xs text-gray-500">{stats?.wordCount.thisMonth ?? 0} this month</p></div></div>
                    <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-5"><div className="flex items-center justify-between"><div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-lg">⭐</div><h3 className="text-3xl font-extrabold text-gray-900">{overall} / 5</h3></div><div className="flex items-center justify-between mt-3"><p className="text-sm font-semibold text-gray-700">Overall Performance</p><p className="text-xs text-gray-500">{totalCompleted}/{totalPlanned}</p></div></div>
                  </div>
                </div>
                <div>
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-3">
                      <OpsScheduleCalendar schedules={opsTasks} onScheduleSelect={(schedule) => { setSelectedOpsTask(schedule); setShowOpsTaskPanel(true); }} onDateSelect={() => {}} teamMeets={teamMeets} onTeamMeetSelect={(tm) => { setSelectedTeamMeet(tm); setTeamMeetPanelMode('view'); setShowTeamMeetPanel(true); }} currentUserId={currentUserId} />
                    </div>
                    <div className="lg:col-span-1">
                      <TeamMeetSidebar teamMeets={teamMeets} onTeamMeetClick={(tm) => { setSelectedTeamMeet(tm); setTeamMeetPanelMode('view'); setShowTeamMeetPanel(true); }} currentUserId={currentUserId} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {isEducationPlanning && activeView === 'analytics' && (
            <div className="mb-6">
              <ActivityAnalyticsDashboard registrationId={registrationId} />
            </div>
          )}

          {isEducationPlanning && activeView === 'brainography' && (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{brainographyDoc.fileName}</p>
                          <p className="text-xs text-gray-500">
                            {(brainographyDoc.fileSize / 1024).toFixed(1)} KB | Uploaded: {new Date(brainographyDoc.uploadedAt).toLocaleDateString('en-GB')} | Version: {brainographyDoc.version}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={handleBrainographyView} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium">View</button>
                        <button onClick={handleBrainographyDownload} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium">Download</button>
                        <label className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium cursor-pointer">
                          Re-upload
                          <input ref={fileInputRef} type="file" className="hidden" onChange={handleBrainographyUpload} accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" />
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
                    <label className={`inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium cursor-pointer ${uploadingBrainography ? 'opacity-50 pointer-events-none' : ''}`}>
                      {uploadingBrainography ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Uploading...</>) : 'Upload Brainography Report'}
                      <input ref={fileInputRef} type="file" className="hidden" onChange={handleBrainographyUpload} accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" disabled={uploadingBrainography} />
                    </label>
                  </div>
                )}
                {portfolios.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Generated Reports</p>
                    <div className="flex flex-wrap gap-3">
                      {portfolios.map((p) => (<div key={p._id} className="flex-1 min-w-[260px]"><PortfolioRow portfolio={p} onDownload={handlePortfolioDownload} /></div>))}
                    </div>
                  </div>
                )}
              </div>

              {brainographyDoc && (
                <div className="mb-6">
                  {!brainographyData ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
                      <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="text-sm font-medium text-blue-800">AI is extracting data from brainography report...</p>
                      <p className="text-xs text-blue-600 mt-1">This may take a minute. Please wait.</p>
                      {extractProgress && (
                        <div className="mt-4 max-w-md mx-auto">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-blue-800">{extractProgress.step}</span>
                            <span className="text-xs font-bold text-blue-700">{extractProgress.pct}%</span>
                          </div>
                          <div className="w-full bg-blue-100 rounded-full h-2.5 overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-500 to-blue-500 h-2.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${extractProgress.pct}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <BrainographyDataDisplay data={brainographyData} canEdit onUpdate={handleUpdateBrainographyMeta} />
                  )}
                </div>
              )}


            </>
          )}

          {isEducationPlanning && activeView === 'portfolio' && (
            <div className="mb-6">
              {brainographyData ? (
                <PortfolioSection registrationId={registrationId} brainographyData={brainographyData} portfolios={portfolios} onPortfoliosChange={fetchPortfolios} allowGenerate={false} />
              ) : (
                <div className="text-center py-16">
                  <p className="text-sm text-gray-500">Brainography data is required to generate portfolios. Upload and extract it via Brainography Analysis first.</p>
                </div>
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

          {activeView === 'form' && (
            <>
              <FormPartsNavigation formStructure={formStructure} currentPartIndex={currentPartIndex} onPartChange={(index) => { setActiveView('form'); setCurrentPartIndex(index); setCurrentSectionIndex(0); }} showPayment={true} isPaymentActive={false} onPaymentClick={() => setActiveView('payment')} />
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
                      <ProgramSection studentId={studentId} sectionType={currentSection.title === 'Apply to Program' ? 'available' : 'applied'} registrationId={registrationId} userRole="EDUPLAN_COACH" />
                    </div>
                  ) : (() => {
                    const isParentalSection = currentPart.key === 'PROFILE' && currentSection.title === 'Parental Details';
                    const parentalReadOnlyInstances = isParentalSection ? initialParentalReadOnlyRef.current : [];
                    return (
                    <FormSectionRenderer
                      section={currentSection}
                      values={formValues[currentPart.key]?.[currentSection.key] || {}}
                      onChange={(subSectionId, index, key, value) => handleFieldChange(currentPart.key, currentSection.key, subSectionId, index, key, value)}
                      onAddInstance={(subSectionId) => handleAddInstance(currentPart.key, currentSection.key, subSectionId)}
                      onRemoveInstance={(subSectionId, index) => handleRemoveInstance(currentPart.key, currentSection.key, subSectionId, index)}
                      isAdminEdit={true}
                      registrationId={registrationId}
                      studentId={studentId}
                      userRole="EDUPLAN_COACH"
                      readOnlyKeys={currentPart.key === 'PROFILE' && currentSection.title === 'Personal Details' ? ['firstName', 'middleName', 'lastName'] : undefined}
                      noDelete={isParentalSection}
                      readOnlyInstances={isParentalSection ? parentalReadOnlyInstances : []}
                    />
                    );
                  })()}
                </div>
              )}
              {currentSection && !currentSection.title.toLowerCase().includes('document') && (
                <FormSaveButtons onSave={handleSaveSection} saving={saving} />
              )}
            </>
          )}

          {isEducationPlanning && formStructure.length === 0 && activeView === 'form' && (
            <div className="text-center py-16">
              <p className="text-sm text-gray-500">No form data available for this service. Use the tabs above to access Activity Analysis, Brainography, and Portfolio features.</p>
            </div>
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
      </EduplanCoachLayout>

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
