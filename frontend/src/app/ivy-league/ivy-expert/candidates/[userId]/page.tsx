'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';
import { IVY_API_URL } from '@/lib/ivyApi';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
import AuthImage from '@/components/AuthImage';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
  PieChart, Pie,
} from 'recharts';

const SECTION_COLORS = ['#2959ba', '#059669', '#d97706'];
const SECTION_ICONS = ['🌍', '🧠', '📚'];

interface QuestionData {
  questionNumber: number;
  questionText: string;
  questionImageUrl: string | null;
  options: { label: string; text: string }[];
  selectedOption: string | null;
  correctOption: string;
  explanation: string;
  isCorrect: boolean | null;
  marksAwarded: number;
}

interface SectionData {
  sectionName: string;
  sectionIndex: number;
  status: string;
  score: number;
  questionCount: number;
  timeLimit: number;
  answered: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  questions: QuestionData[];
}

interface TestResult {
  status: string;
  totalScore: number;
  maxScore: number;
  violations: number;
  sections: SectionData[];
}

interface CandidateInfo {
  _id: string;
  userId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  schoolName: string;
  curriculum: string;
  currentGrade: string;
  parentFirstName: string;
  parentMiddleName?: string;
  parentLastName: string;
  parentEmail: string;
  parentMobile: string;
}

interface StudentMeeting {
  _id: string;
  subject: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  meetingType: string;
  status: string;
  zohoMeetingUrl?: string;
  zohoMeetingId?: string;
  zohoMeetingPassword?: string;
  requestedBy: { firstName: string; middleName?: string; lastName: string; email: string };
  requestedTo: { firstName: string; middleName?: string; lastName: string; email: string };
}

interface ParentMeeting {
  _id: string;
  subject: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  meetingMode: string;
  status: string;
  meetLink?: string;
  zohoMeetingUrl?: string;
  zohoMeetingId?: string;
  zohoMeetingPassword?: string;
  toName: string;
  toEmail: string;
  toMobile: string;
}

const STUDENT_INTERVIEW_SECTIONS = [
  {
    title: 'Psychological Readiness',
    color: 'blue',
    icon: '🧠',
    questions: [
      'Tell us about a time you failed. How did you respond, and what did you learn?',
      'How do you typically deal with high academic pressure or competition?',
      'Have you ever faced cultural or intellectual challenges? How did you adapt?',
      'What personal habits help you stay focused, balanced, and resilient?',
      'What mental or emotional skills do you feel you need to improve before going abroad?',
    ],
  },
  {
    title: 'Career and Life Vision',
    color: 'emerald',
    icon: '🚀',
    questions: [
      'Where do you see yourself professionally in the next 10–15 years?',
      'What kind of problems do you hope to solve in your career?',
      'What subjects or areas do you feel most passionate about?',
      'Who are your role models, and why?',
      'How do you want your career to impact the world around you?',
    ],
  },
  {
    title: 'Ivy League Purpose Clarity',
    color: 'violet',
    icon: '🎓',
    questions: [
      'Why do you want to study at an Ivy League institution specifically?',
      'What distinguishes the Ivy League from other strong institutions, in your view?',
      'What do you expect to gain (personally and professionally) from an Ivy League education?',
      'How have you researched your target universities and programs?',
      "If you don't get into an Ivy League school, how will you move forward?",
    ],
  },
  {
    title: 'Growth and Skill Upgradation Willingness',
    color: 'amber',
    icon: '📈',
    questions: [
      'What skills (academic, technical, or soft) are you currently working on?',
      'Tell us about a time you had to learn something completely new and uncomfortable.',
      'Are you open to mentorship, coaching, or critical feedback?',
      'How do you plan to upgrade your skills to match Ivy League standards?',
      'Are you willing to change or sacrifice certain routines to meet your goals?',
    ],
  },
];

const PARENT_INTERVIEW_SECTIONS = [
  {
    title: 'Student Readiness Insight',
    color: 'blue',
    icon: '👁️',
    questions: [
      'How does your child handle pressure, failure, or uncertainty?',
      'What are their greatest strengths outside academics?',
      'Where do you think they still need personal development?',
      'How independently do they operate day-to-day?',
      'Are they emotionally mature enough to live and study abroad?',
    ],
  },
  {
    title: 'Family Alignment and Expectations',
    color: 'emerald',
    icon: '👨‍👩‍👧',
    questions: [
      'Why do you want your child to study at an Ivy League school? (Social reasons, financial reasons, professional reasons, social status, etc.)',
      'How have you prepared (or plan to prepare) for this journey?',
      'What are your hopes and concerns about Ivy League life?',
      'Are you aligned with your child\'s long-term career goals?',
      'Would you be supportive if your child chooses a non-traditional career path post-Ivy League?',
    ],
  },
  {
    title: 'Cultural and Emotional Readiness',
    color: 'violet',
    icon: '🌍',
    questions: [
      'How do you see your child adapting to a global peer group?',
      'Have they had exposure to diverse or international environments before?',
      'How does your family handle emotional challenges or stress?',
      'Are you comfortable giving your child more independence?',
      'How would you help your child stay grounded abroad?',
    ],
  },
  {
    title: 'Growth Mindset & Support Strategy',
    color: 'amber',
    icon: '🌱',
    questions: [
      'What skills do you think your child must still build?',
      'Are you actively helping your child learn new skills or habits?',
      'How do you handle constructive feedback about your child\'s performance?',
      'What\'s your role in supporting their academic and personal growth?',
      'Are you open to changing family routines to support your child\'s journey?',
    ],
  },
];

export default function IvyExpertCandidateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.userId as string;

  const [candidate, setCandidate] = useState<CandidateInfo | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'test' | 'student-interview' | 'parent-interview'>('test');
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [studentScores, setStudentScores] = useState<number[][]>(() =>
    STUDENT_INTERVIEW_SECTIONS.map((s) => new Array(s.questions.length).fill(0))
  );
  const [parentScores, setParentScores] = useState<number[][]>(() =>
    PARENT_INTERVIEW_SECTIONS.map((s) => new Array(s.questions.length).fill(0))
  );
  const [studentResponses, setStudentResponses] = useState<string[][]>(() =>
    STUDENT_INTERVIEW_SECTIONS.map((s) => new Array(s.questions.length).fill(''))
  );
  const [parentResponses, setParentResponses] = useState<string[][]>(() =>
    PARENT_INTERVIEW_SECTIONS.map((s) => new Array(s.questions.length).fill(''))
  );
  const [converting, setConverting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clearances, setClearances] = useState({ testCleared: false, studentInterviewCleared: false, parentInterviewCleared: false });
  const [clearingStage, setClearingStage] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);

  // --- Meeting scheduling state ---
  const [studentMeetings, setStudentMeetings] = useState<StudentMeeting[]>([]);
  const [parentMeetings, setParentMeetings] = useState<ParentMeeting[]>([]);
  const [showStudentScheduleForm, setShowStudentScheduleForm] = useState(false);
  const [showParentScheduleForm, setShowParentScheduleForm] = useState(false);
  const [studentMeetForm, setStudentMeetForm] = useState({
    subject: '',
    scheduledDate: '',
    scheduledTime: '',
    duration: 30,
    meetingType: 'ONLINE',
  });
  const [parentMeetForm, setParentMeetForm] = useState({
    subject: '',
    scheduledDate: '',
    scheduledTime: '',
    duration: 30,
    meetingMode: 'online',
  });
  const [schedulingStudent, setSchedulingStudent] = useState(false);
  const [schedulingParent, setSchedulingParent] = useState(false);
  // Per-meeting edit state: { [meetingId]: { status, notes } }
  const [meetEditState, setMeetEditState] = useState<Record<string, { status: string; notes: string }>>({});
  const [savingMeet, setSavingMeet] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch candidate info from my-candidates
      const candidatesRes = await axios.get(`${IVY_API_URL}/ivy-expert-candidates/my-candidates`);
      const found = candidatesRes.data.candidates?.find((c: any) =>
        c.userId === userId || c.userId?.toString() === userId
      );
      if (found) {
        setCandidate(found);
      }

      // Fetch test result
      const testRes = await axios.get(`${IVY_API_URL}/ivy-expert-candidates/test-result/${userId}`);
      if (testRes.data.success && testRes.data.session) {
        setTestResult(testRes.data.session);
        setClearances({
          testCleared: testRes.data.session.testCleared ?? false,
          studentInterviewCleared: testRes.data.session.studentInterviewCleared ?? false,
          parentInterviewCleared: testRes.data.session.parentInterviewCleared ?? false,
        });
      }

      // Fetch existing interview data
      const interviewRes = await axios.get(`${IVY_API_URL}/ivy-expert-candidates/interview/${userId}`);
      if (interviewRes.data.success) {
        if (interviewRes.data.studentInterview?.answers) {
          const newScores = STUDENT_INTERVIEW_SECTIONS.map((s) => new Array(s.questions.length).fill(0));
          const newResponses = STUDENT_INTERVIEW_SECTIONS.map((s) => new Array(s.questions.length).fill(''));
          interviewRes.data.studentInterview.answers.forEach((a: any) => {
            if (newScores[a.sectionIndex] && newScores[a.sectionIndex][a.questionIndex] !== undefined) {
              newScores[a.sectionIndex][a.questionIndex] = a.score;
              newResponses[a.sectionIndex][a.questionIndex] = a.response || '';
            }
          });
          setStudentScores(newScores);
          setStudentResponses(newResponses);
        }
        if (interviewRes.data.parentInterview?.answers) {
          const newScores = PARENT_INTERVIEW_SECTIONS.map((s) => new Array(s.questions.length).fill(0));
          const newResponses = PARENT_INTERVIEW_SECTIONS.map((s) => new Array(s.questions.length).fill(''));
          interviewRes.data.parentInterview.answers.forEach((a: any) => {
            if (newScores[a.sectionIndex] && newScores[a.sectionIndex][a.questionIndex] !== undefined) {
              newScores[a.sectionIndex][a.questionIndex] = a.score;
              newResponses[a.sectionIndex][a.questionIndex] = a.response || '';
            }
          });
          setParentScores(newScores);
          setParentResponses(newResponses);
        }
      }

      // Fetch scheduled meetings
      await fetchMeetings();
    } catch {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchMeetings = async () => {
    try {
      const [stuRes, parRes] = await Promise.all([
        axios.get(`${API_URL}/team-meets/ivy-candidate/${userId}`),
        axios.get(`${IVY_API_URL}/parent-interview-schedule?candidateUserId=${userId}`),
      ]);
      if (stuRes.data.success) setStudentMeetings(stuRes.data.data.teamMeets || []);
      if (parRes.data.success) setParentMeetings(parRes.data.data.schedules || []);
    } catch {
      // non-critical, ignore
    }
  };

  const handleClearStage = async (stage: 'test' | 'student-interview' | 'parent-interview') => {
    setClearingStage(stage);
    try {
      const res = await axios.post(
        `${IVY_API_URL}/ivy-expert-candidates/clear-stage/${userId}`,
        { stage }
      );
      if (res.data.success) {
        toast.success(`Stage cleared! Congratulations sent to candidate.`);
        setClearances({
          testCleared: res.data.testCleared,
          studentInterviewCleared: res.data.studentInterviewCleared,
          parentInterviewCleared: res.data.parentInterviewCleared,
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to clear stage');
    } finally {
      setClearingStage(null);
    }
  };

  const handleScheduleStudentMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentMeetForm.subject || !studentMeetForm.scheduledDate || !studentMeetForm.scheduledTime) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSchedulingStudent(true);
    try {
      await axios.post(`${API_URL}/team-meets`, {
        requestedTo: userId,
        subject: studentMeetForm.subject,
        scheduledDate: studentMeetForm.scheduledDate,
        scheduledTime: studentMeetForm.scheduledTime,
        duration: studentMeetForm.duration,
        meetingType: studentMeetForm.meetingType,
        interviewType: 'student_interview',
      });
      toast.success('Student interview meeting scheduled!');
      setShowStudentScheduleForm(false);
      setStudentMeetForm({ subject: '', scheduledDate: '', scheduledTime: '', duration: 30, meetingType: 'ONLINE' });
      await fetchMeetings();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to schedule meeting');
    } finally {
      setSchedulingStudent(false);
    }
  };

  const handleScheduleParentMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentMeetForm.subject || !parentMeetForm.scheduledDate || !parentMeetForm.scheduledTime) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSchedulingParent(true);
    try {
      await axios.post(`${IVY_API_URL}/parent-interview-schedule`, {
        candidateUserId: userId,
        subject: parentMeetForm.subject,
        scheduledDate: parentMeetForm.scheduledDate,
        scheduledTime: parentMeetForm.scheduledTime,
        duration: parentMeetForm.duration,
        meetingMode: parentMeetForm.meetingMode,

      });
      toast.success('Parent interview meeting scheduled!');
      setShowParentScheduleForm(false);
      setParentMeetForm({ subject: '', scheduledDate: '', scheduledTime: '', duration: 30, meetingMode: 'online' });
      await fetchMeetings();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to schedule meeting');
    } finally {
      setSchedulingParent(false);
    }
  };

  const getMeetEdit = (id: string, currentStatus: string, currentNotes?: string) =>
    meetEditState[id] ?? { status: currentStatus, notes: currentNotes ?? '' };

  const handleSaveStudentMeet = async (meetId: string) => {
    const edit = meetEditState[meetId];
    if (!edit) return;
    setSavingMeet((s) => ({ ...s, [meetId]: true }));
    try {
      await axios.patch(`${API_URL}/team-meets/${meetId}/ivy-update`, { status: edit.status, notes: edit.notes });
      toast.success('Meeting updated!');
      await fetchMeetings();
      setMeetEditState((s) => { const n = { ...s }; delete n[meetId]; return n; });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update meeting');
    } finally {
      setSavingMeet((s) => ({ ...s, [meetId]: false }));
    }
  };

  const handleSaveParentMeet = async (meetId: string) => {
    const edit = meetEditState[meetId];
    if (!edit) return;
    setSavingMeet((s) => ({ ...s, [meetId]: true }));
    try {
      await axios.patch(`${IVY_API_URL}/parent-interview-schedule/${meetId}/status`, { status: edit.status, notes: edit.notes });
      toast.success('Meeting updated!');
      await fetchMeetings();
      setMeetEditState((s) => { const n = { ...s }; delete n[meetId]; return n; });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update meeting');
    } finally {
      setSavingMeet((s) => ({ ...s, [meetId]: false }));
    }
  };

  const saveInterview = async (type: 'student' | 'parent') => {
    try {
      const sections = type === 'student' ? STUDENT_INTERVIEW_SECTIONS : PARENT_INTERVIEW_SECTIONS;
      const scores = type === 'student' ? studentScores : parentScores;
      const responses = type === 'student' ? studentResponses : parentResponses;

      const answers: any[] = [];
      sections.forEach((sec, sIdx) => {
        sec.questions.forEach((_, qIdx) => {
          answers.push({
            sectionIndex: sIdx,
            questionIndex: qIdx,
            score: scores[sIdx][qIdx],
            response: responses[sIdx][qIdx],
          });
        });
      });

      await axios.put(`${IVY_API_URL}/ivy-expert-candidates/interview/${userId}`, {
        type,
        answers,
      });
      toast.success(`${type === 'student' ? 'Student' : 'Parent'} interview saved!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save interview');
    } finally {
      setSaving(false);
    }
  };

  const handleConvertToStudent = async () => {
    if (!confirm('Are you sure you want to convert this candidate to an Ivy Student?')) return;
    setConverting(true);
    try {
      const res = await axios.post(`${IVY_API_URL}/ivy-expert-candidates/convert-to-student`, {
        userId,
      });
      if (res.data.success) {
        toast.success('Candidate converted to student successfully!');
        setTimeout(() => router.push('/ivy-league/ivy-expert'), 1500);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to convert candidate');
    } finally {
      setConverting(false);
    }
  };

  const getFullName = (c: CandidateInfo) =>
    [c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ');

  const getParentName = (c: CandidateInfo) =>
    [c.parentFirstName, c.parentMiddleName, c.parentLastName].filter(Boolean).join(' ');

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gray-50">
        <div className="p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/ivy-league/ivy-expert')}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {candidate ? getFullName(candidate) : 'Candidate Details'}
                </h1>
                <p className="text-gray-600 mt-1">
                  {candidate ? `${candidate.schoolName} • Grade ${candidate.currentGrade} • ${candidate.curriculum}` : ''}
                </p>
              </div>
            </div>
            <button
              onClick={handleConvertToStudent}
              disabled={converting || !clearances.testCleared || !clearances.studentInterviewCleared || !clearances.parentInterviewCleared}
              title={(!clearances.testCleared || !clearances.studentInterviewCleared || !clearances.parentInterviewCleared) ? 'All 3 stages (Test, Student Interview, Parent Interview) must be cleared before conversion' : 'Convert to IVY Student'}
              className={`px-5 py-2.5 rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${(!clearances.testCleared || !clearances.studentInterviewCleared || !clearances.parentInterviewCleared) ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
            >
              {converting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Convert to Student
                </>
              )}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Student Info Card */}
              {candidate && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase">Student Name</p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{getFullName(candidate)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase">Email</p>
                      <p className="text-sm text-gray-900 mt-1">{candidate.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase">Parent Name</p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{getParentName(candidate)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase">Parent Contact</p>
                      <p className="text-sm text-gray-900 mt-1">{candidate.parentEmail}</p>
                      <p className="text-sm text-gray-900">{candidate.parentMobile}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Navigation */}
              <div className="flex gap-2 mb-6">
                {[
                  { key: 'test', label: '📝 Test Score', color: 'blue' },
                  { key: 'student-interview', label: '🎓 Student Interview', color: 'green' },
                  { key: 'parent-interview', label: '👨‍👩‍👧 Parent Interview', color: 'purple' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                      activeTab === tab.key
                        ? tab.color === 'blue'
                          ? 'bg-blue-600 text-white'
                          : tab.color === 'green'
                          ? 'bg-green-600 text-white'
                          : 'bg-purple-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Test Score Tab */}
              {activeTab === 'test' && (
                <div>
                  {!testResult ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="text-lg font-medium text-gray-500">Student has not started the test yet</p>
                    </div>
                  ) : (
                    <>
                      {/* Score Summary */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-bold text-gray-900">Score Summary</h3>
                          {clearances.testCleared ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-green-100 text-green-700">
                              ✓ Test Cleared
                            </span>
                          ) : (
                            <button
                              onClick={() => handleClearStage('test')}
                              disabled={clearingStage === 'test'}
                              className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                            >
                              {clearingStage === 'test' ? 'Clearing...' : '✓ Clear Test'}
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <div className="bg-blue-50 rounded-lg p-4 text-center">
                            <p className="text-2xl font-extrabold text-blue-700">{testResult.totalScore}</p>
                            <p className="text-xs font-semibold text-blue-600 mt-1">Total Score</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4 text-center">
                            <p className="text-2xl font-extrabold text-gray-700">{testResult.maxScore}</p>
                            <p className="text-xs font-semibold text-gray-600 mt-1">Max Score</p>
                          </div>
                          <div className="bg-green-50 rounded-lg p-4 text-center">
                            <p className="text-2xl font-extrabold text-green-700">
                              {testResult.sections.reduce((s, sec) => s + sec.correct, 0)}
                            </p>
                            <p className="text-xs font-semibold text-green-600 mt-1">Correct</p>
                          </div>
                          <div className="bg-red-50 rounded-lg p-4 text-center">
                            <p className="text-2xl font-extrabold text-red-700">
                              {testResult.sections.reduce((s, sec) => s + sec.incorrect, 0)}
                            </p>
                            <p className="text-xs font-semibold text-red-600 mt-1">Incorrect</p>
                          </div>
                          <div className="bg-amber-50 rounded-lg p-4 text-center">
                            <p className="text-2xl font-extrabold text-amber-700">
                              {testResult.sections.reduce((s, sec) => s + sec.unanswered, 0)}
                            </p>
                            <p className="text-xs font-semibold text-amber-600 mt-1">Skipped</p>
                          </div>
                        </div>
                        {testResult.violations > 0 && (
                          <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 rounded-lg px-4 py-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <span className="text-sm font-semibold">{testResult.violations} tab violation(s) recorded</span>
                          </div>
                        )}
                      </div>

                      {/* Performance Analysis Charts */}
                      {(() => {
                        const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f97316'];
                        const totalCorrect = testResult.sections.reduce((s, sec) => s + sec.correct, 0);
                        const totalIncorrect = testResult.sections.reduce((s, sec) => s + sec.incorrect, 0);
                        const totalSkipped = testResult.sections.reduce((s, sec) => s + sec.unanswered, 0);
                        const totalQ = totalCorrect + totalIncorrect + totalSkipped;

                        const radarData = testResult.sections.map((sec) => ({
                          subject: sec.sectionName.split(' ').slice(0, 2).join(' '),
                          score: sec.questionCount > 0 ? Math.round((sec.score / (sec.questionCount * 2)) * 100) : 0,
                          fullMark: 100,
                        }));

                        const barData = testResult.sections.map((sec, i) => ({
                          name: sec.sectionName.split(' ').slice(0, 2).join(' '),
                          'Your Score': sec.score,
                          'Max Marks': sec.questionCount * 2,
                          fill: CHART_COLORS[i % CHART_COLORS.length],
                        }));

                        const donutData = [
                          { name: 'Correct', value: totalCorrect, color: '#22c55e' },
                          { name: 'Incorrect', value: totalIncorrect, color: '#ef4444' },
                          { name: 'Skipped', value: totalSkipped, color: '#9ca3af' },
                        ];

                        const accuracyData = testResult.sections.map((sec, i) => {
                          const attempted = sec.correct + sec.incorrect;
                          return {
                            name: sec.sectionName.split(' ').slice(0, 2).join(' '),
                            accuracy: attempted > 0 ? Math.round((sec.correct / attempted) * 100) : 0,
                            fill: CHART_COLORS[i % CHART_COLORS.length],
                          };
                        });

                        return (
                          <div className="mb-6">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                              </div>
                              <h3 className="text-lg font-bold text-gray-900">Performance Analysis</h3>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                                <h4 className="text-sm font-bold text-gray-900 mb-0.5 uppercase tracking-wide">Strengths Profile</h4>
                                <p className="text-xs text-gray-900 mb-3 font-bold">Percentage scored in each section</p>
                                <ResponsiveContainer width="100%" height={260}>
                                  <RadarChart data={radarData} outerRadius="75%">
                                    <PolarGrid stroke="#e5e7eb" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }} />
                                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                                    <Radar name="Score %" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} dot={{ r: 4, fill: '#6366f1' }} />
                                  </RadarChart>
                                </ResponsiveContainer>
                              </div>
                              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                                <h4 className="text-sm font-bold text-gray-900 mb-0.5 uppercase tracking-wide">Overall Accuracy</h4>
                                <p className="text-xs text-gray-900 mb-3 font-bold">Distribution of {totalQ} questions</p>
                                <div className="relative">
                                  <ResponsiveContainer width="100%" height={260}>
                                    <PieChart>
                                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={3} dataKey="value" strokeWidth={2} stroke="#fff">
                                        {donutData.map((entry, idx) => (<Cell key={idx} fill={entry.color} />))}
                                      </Pie>
                                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={(value: any, name: any) => [`${value} questions`, name]} />
                                    </PieChart>
                                  </ResponsiveContainer>
                                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-3xl font-black text-gray-900">{totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0}%</span>
                                    <span className="text-xs font-bold text-gray-400">Accuracy</span>
                                  </div>
                                </div>
                                <div className="flex justify-center gap-5 mt-1">
                                  {donutData.map((d) => (
                                    <div key={d.name} className="flex items-center gap-1.5">
                                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                                      <span className="text-xs font-bold text-gray-600">{d.name} ({d.value})</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                                <h4 className="text-sm font-bold text-gray-900 mb-0.5 uppercase tracking-wide">Section Scores</h4>
                                <p className="text-xs text-gray-900 mb-3 font-bold">Score compared to maximum marks</p>
                                <ResponsiveContainer width="100%" height={260}>
                                  <BarChart data={barData} barGap={4}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }} />
                                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
                                    <Bar dataKey="Your Score" radius={[6, 6, 0, 0]}>
                                      {barData.map((_, idx) => (<Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />))}
                                    </Bar>
                                    <Bar dataKey="Max Marks" fill="#ef4444" radius={[6, 6, 0, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                                <h4 className="text-sm font-bold text-gray-900 mb-0.5 uppercase tracking-wide">Section Accuracy</h4>
                                <p className="text-xs text-gray-900 mb-3 font-bold">Percentage of attempted questions answered correctly</p>
                                <div className="space-y-5 mt-2">
                                  {accuracyData.map((sec, idx) => (
                                    <div key={idx}>
                                      <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-sm font-bold text-gray-700">{SECTION_ICONS[idx] || '📝'} {sec.name}</span>
                                        <span className="text-sm font-bold" style={{ color: sec.fill }}>{sec.accuracy}%</span>
                                      </div>
                                      <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${sec.accuracy}%`, backgroundColor: sec.fill }} />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Section Cards */}
                      <div className="flex gap-4 mb-6">
                        {testResult.sections.map((sec, idx) => (
                          <div
                            key={idx}
                            className="flex-1 min-w-0 bg-white rounded-xl shadow-sm border border-gray-200 p-5 cursor-pointer hover:shadow-md transition-all"
                            style={{ borderLeftWidth: 4, borderLeftColor: SECTION_COLORS[idx] || '#6b7280' }}
                            onClick={() => setActiveSectionIdx(idx)}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-lg font-bold text-gray-900">{SECTION_ICONS[idx]} {sec.sectionName}</p>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${sec.status === 'submitted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                {sec.status === 'submitted' ? 'Submitted' : sec.status}
                              </span>
                            </div>
                            {sec.status === 'submitted' && (
                              <div className="grid grid-cols-4 gap-2 text-center">
                                <div><p className="text-lg font-bold" style={{ color: SECTION_COLORS[idx] }}>{sec.score}</p><p className="text-[10px] text-gray-500 font-semibold">Score</p></div>
                                <div><p className="text-lg font-bold text-green-600">{sec.correct}</p><p className="text-[10px] text-gray-500 font-semibold">Correct</p></div>
                                <div><p className="text-lg font-bold text-red-600">{sec.incorrect}</p><p className="text-[10px] text-gray-500 font-semibold">Wrong</p></div>
                                <div><p className="text-lg font-bold text-gray-500">{sec.unanswered}</p><p className="text-[10px] text-gray-500 font-semibold">Skipped</p></div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Question-level Review */}
                      {testResult.sections[activeSectionIdx]?.status === 'submitted' &&
                       testResult.sections[activeSectionIdx].questions.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                          <h3 className="text-lg font-bold text-gray-900 mb-4">
                            {SECTION_ICONS[activeSectionIdx]} {testResult.sections[activeSectionIdx].sectionName} — Questions
                          </h3>
                          <div className="space-y-5">
                            {testResult.sections[activeSectionIdx].questions.map((q) => (
                              <div key={q.questionNumber} className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className={`px-4 py-2 flex items-center justify-between text-sm font-semibold ${
                                  q.isCorrect === true ? 'bg-green-50 text-green-700' : q.isCorrect === false ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'
                                }`}>
                                  <span>Q{q.questionNumber}.</span>
                                  <span>{q.isCorrect === true ? '✅ Correct (+2)' : q.isCorrect === false ? '❌ Incorrect (−0.5)' : '⬜ Skipped (0)'}</span>
                                </div>
                                <div className="p-4">
                                  <p className="text-sm font-medium text-gray-900 mb-3">{q.questionText}</p>
                                  {q.questionImageUrl && (
                                    <div className="mb-3">
                                      {q.questionImageUrl.startsWith('http') ? (
                                        <img src={q.questionImageUrl} alt={`Q${q.questionNumber}`} className="max-h-48 rounded-lg border" />
                                      ) : (
                                        <AuthImage path={q.questionImageUrl} alt={`Q${q.questionNumber}`} className="max-h-48 rounded-lg border" />
                                      )}
                                    </div>
                                  )}
                                  <div className="space-y-2 mb-3">
                                    {q.options.map((opt) => {
                                      const isCorrect = opt.label === q.correctOption;
                                      const isSelected = opt.label === q.selectedOption;
                                      let borderColor = 'border-gray-200';
                                      let bgColor = '';
                                      if (isCorrect) { borderColor = 'border-green-400'; bgColor = 'bg-green-50'; }
                                      else if (isSelected && !isCorrect) { borderColor = 'border-red-400'; bgColor = 'bg-red-50'; }
                                      return (
                                        <div key={opt.label} className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${borderColor} ${bgColor}`}>
                                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isCorrect ? 'bg-green-500 text-white' : isSelected ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'}`}>{opt.label}</span>
                                          <span className="text-sm text-gray-800">{opt.text}</span>
                                          {isCorrect && <span className="ml-auto text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Correct</span>}
                                          {isSelected && !isCorrect && <span className="ml-auto text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Student&apos;s Answer</span>}
                                          {isSelected && isCorrect && <span className="ml-auto text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Student&apos;s Answer ✓</span>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {q.explanation && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                      <p className="text-xs font-semibold text-blue-700 mb-1">💡 Explanation</p>
                                      <p className="text-sm text-blue-900">{q.explanation}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Student Interview Tab */}
              {activeTab === 'student-interview' && (() => {
                const sectionColorMap: Record<string, { header: string; dot: string; ring: string }> = {
                  blue:    { header: 'bg-blue-600',    dot: 'bg-blue-600',    ring: 'focus:ring-blue-500 focus:border-blue-500' },
                  emerald: { header: 'bg-blue-600', dot: 'bg-emerald-600', ring: 'focus:ring-emerald-500 focus:border-emerald-500' },
                  violet:  { header: 'bg-blue-600',  dot: 'bg-violet-600',  ring: 'focus:ring-violet-500 focus:border-violet-500' },
                  amber:   { header: 'bg-blue-600',   dot: 'bg-amber-600',   ring: 'focus:ring-amber-500 focus:border-amber-500' },
                };

                const sectionAverages = STUDENT_INTERVIEW_SECTIONS.map((_, sIdx) => {
                  const scores = studentScores[sIdx];
                  const rated = scores.filter((s) => s > 0);
                  return rated.length > 0 ? rated.reduce((a, b) => a + b, 0) / rated.length : 0;
                });
                const overallScore = sectionAverages.some((s) => s > 0)
                  ? sectionAverages.reduce((a, b) => a + b, 0).toFixed(2)
                  : null;

                return (
                  <div className="space-y-5">
                    {/* Schedule Student Interview Meeting */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <button
                        onClick={() => {
                          if (!showStudentScheduleForm && candidate) {
                            setStudentMeetForm((f) => ({
                              ...f,
                              subject: f.subject || `Student Interview — ${[candidate.firstName, candidate.middleName, candidate.lastName].filter(Boolean).join(' ')}`,
                            }));
                          }
                          setShowStudentScheduleForm((v) => !v);
                        }}
                        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <span className="font-semibold text-gray-900">Schedule Student Interview Meeting</span>
                        </div>
                        <svg className={`w-5 h-5 text-gray-400 transition-transform ${showStudentScheduleForm ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {showStudentScheduleForm && (
                        <form onSubmit={handleScheduleStudentMeeting} className="px-6 pb-6 border-t border-gray-100">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="md:col-span-2">
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Subject *</label>
                              <input
                                type="text"
                                value={studentMeetForm.subject}
                                onChange={(e) => setStudentMeetForm((f) => ({ ...f, subject: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-green-500 focus:border-green-500"
                                placeholder="e.g. Student Interview — John Doe"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Date *</label>
                              <input
                                type="date"
                                value={studentMeetForm.scheduledDate}
                                onChange={(e) => setStudentMeetForm((f) => ({ ...f, scheduledDate: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-green-500 focus:border-green-500"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Time *</label>
                              <input
                                type="time"
                                value={studentMeetForm.scheduledTime}
                                onChange={(e) => setStudentMeetForm((f) => ({ ...f, scheduledTime: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-green-500 focus:border-green-500"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Duration</label>
                              <select
                                value={studentMeetForm.duration}
                                onChange={(e) => setStudentMeetForm((f) => ({ ...f, duration: Number(e.target.value) }))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-green-500 focus:border-green-500"
                              >
                                <option value={15}>15 minutes</option>
                                <option value={30}>30 minutes</option>
                                <option value={45}>45 minutes</option>
                                <option value={60}>60 minutes</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Mode</label>
                              <select
                                value={studentMeetForm.meetingType}
                                onChange={(e) => setStudentMeetForm((f) => ({ ...f, meetingType: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-green-500 focus:border-green-500"
                              >
                                <option value="ONLINE">Online</option>
                                <option value="FACE_TO_FACE">In Person</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex gap-3 mt-4">
                            <button
                              type="submit"
                              disabled={schedulingStudent}
                              className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
                            >
                              {schedulingStudent ? 'Scheduling...' : 'Schedule Meeting'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowStudentScheduleForm(false)}
                              className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}
                    </div>

                    {/* Student Interview Meetings List */}
                    {studentMeetings.length > 0 && (
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Scheduled Meetings</h4>
                        <div className="space-y-3">
                          {studentMeetings.map((m) => {
                            const edit = getMeetEdit(m._id, m.status, (m as any).notes);
                            const dirty = !!meetEditState[m._id];
                            return (
                            <div key={m._id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-gray-900 text-sm">{m.subject}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {new Date(m.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at {m.scheduledTime} &bull; {m.duration} min &bull; {m.meetingType === 'ONLINE' ? 'Online' : 'In Person'}
                                  </p>
                                  {m.meetingType === 'ONLINE' && (m.zohoMeetingId || m.zohoMeetingPassword) && (
                                    <div className="flex flex-wrap gap-4 mt-1.5">
                                      {m.zohoMeetingId && (
                                        <span className="text-xs text-gray-600"><span className="font-semibold">Meeting ID:</span> {m.zohoMeetingId}</span>
                                      )}
                                      {m.zohoMeetingPassword && (
                                        <span className="text-xs text-gray-600"><span className="font-semibold">Password:</span> {m.zohoMeetingPassword}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <select
                                    value={edit.status}
                                    onChange={(e) => setMeetEditState((s) => ({ ...s, [m._id]: { ...getMeetEdit(m._id, m.status, (m as any).notes), status: e.target.value } }))}
                                    className="border border-gray-300 rounded-lg px-2 py-1 text-xs font-semibold focus:ring-green-500 focus:border-green-500"
                                  >
                                    <option value="CONFIRMED">CONFIRMED</option>
                                    <option value="COMPLETED">COMPLETED</option>
                                    <option value="CANCELLED">CANCELLED</option>
                                  </select>
                                  {m.meetingType === 'ONLINE' && m.zohoMeetingUrl && (
                                    <a href={m.zohoMeetingUrl} target="_blank" rel="noopener noreferrer"
                                      className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700">
                                      Join
                                    </a>
                                  )}
                                </div>
                              </div>
                              <div className="mt-2">
                                <textarea
                                  rows={2}
                                  placeholder="Add notes about this meeting..."
                                  value={edit.notes}
                                  onChange={(e) => setMeetEditState((s) => ({ ...s, [m._id]: { ...getMeetEdit(m._id, m.status, (m as any).notes), notes: e.target.value } }))}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-700 focus:ring-green-500 focus:border-green-500 resize-none"
                                />
                                {dirty && (
                                  <button
                                    onClick={() => handleSaveStudentMeet(m._id)}
                                    disabled={!!savingMeet[m._id]}
                                    className="mt-1.5 px-4 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 disabled:opacity-50"
                                  >
                                    {savingMeet[m._id] ? 'Saving...' : 'Save'}
                                  </button>
                                )}
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">Student Interview</h3>
                          <p className="text-sm text-gray-500">Rate each question 1–5 ★. Section score = average of question scores.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Overall Score</p>
                          <p className="text-3xl font-extrabold text-green-700">
                            {overallScore ?? '—'}
                            {overallScore && <span className="text-base font-semibold text-gray-400"> / 20</span>}
                          </p>
                        </div>
                        <button
                          onClick={() => saveInterview('student')}
                          disabled={saving}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        {clearances.studentInterviewCleared ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-green-100 text-green-700">
                            ✓ Student Interview Cleared
                          </span>
                        ) : (
                          <button
                            onClick={() => handleClearStage('student-interview')}
                            disabled={clearingStage === 'student-interview' || !clearances.testCleared}
                            title={!clearances.testCleared ? 'Test must be cleared first' : undefined}
                            className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                          >
                            {clearingStage === 'student-interview' ? 'Clearing...' : '✓ Clear Student Interview'}
                          </button>
                        )}
                      </div>
                    </div>

                    {STUDENT_INTERVIEW_SECTIONS.map((section, sIdx) => {
                      const cl = sectionColorMap[section.color] ?? sectionColorMap['blue'];
                      const scores = studentScores[sIdx];
                      const rated = scores.filter((s) => s > 0);
                      const sectionAvg = rated.length > 0 ? (rated.reduce((a, b) => a + b, 0) / rated.length).toFixed(2) : null;

                      return (
                        <div key={sIdx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                          <div className={`flex items-center justify-between px-6 py-4 border-b border-blue-500 ${cl.header}`}>
                            <div>
                              <p className="text-xs font-semibold text-blue-100 uppercase tracking-wide mb-0.5">Section {sIdx + 1}</p>
                              <h4 className="text-base font-bold text-white">{section.icon} {section.title}</h4>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-blue-100 font-medium">Section Score</p>
                              <p className="text-2xl font-extrabold text-white">
                                {sectionAvg ?? <span className="text-blue-200">—</span>}
                                {sectionAvg && <span className="text-sm font-semibold text-blue-200"> / 5</span>}
                              </p>
                              <p className="text-xs text-blue-200">{rated.length}/{scores.length} rated</p>
                            </div>
                          </div>
                          <div className="divide-y divide-gray-100">
                            {section.questions.map((q, qIdx) => (
                              <div key={qIdx} className="p-5">
                                <div className="flex items-start gap-4">
                                  <span className={`shrink-0 w-7 h-7 rounded-full ${cl.dot} text-white flex items-center justify-center text-xs font-bold mt-0.5`}>{qIdx + 1}</span>
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-900 mb-3">{q}</p>
                                    <div className="flex items-center gap-1 mb-3">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                          key={star}
                                          onClick={() => {
                                            const next = studentScores.map((row) => [...row]);
                                            next[sIdx][qIdx] = next[sIdx][qIdx] === star ? 0 : star;
                                            setStudentScores(next);
                                          }}
                                          title={`Rate ${star}`}
                                          className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                                        >
                                          <svg className={`w-7 h-7 transition-colors ${star <= scores[qIdx] ? 'text-amber-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                          </svg>
                                        </button>
                                      ))}
                                      {scores[qIdx] > 0 && <span className="ml-2 text-sm font-bold text-amber-600">{scores[qIdx]} / 5</span>}
                                    </div>
                                    <textarea
                                      placeholder="Record student's response..."
                                      rows={2}
                                      value={studentResponses[sIdx][qIdx]}
                                      onChange={(e) => {
                                        const next = studentResponses.map((row) => [...row]);
                                        next[sIdx][qIdx] = e.target.value;
                                        setStudentResponses(next);
                                      }}
                                      className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm ${cl.ring} text-gray-700 resize-none`}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Parent Interview Tab */}
              {activeTab === 'parent-interview' && (() => {
                const sectionColorMap: Record<string, { header: string; dot: string; ring: string }> = {
                  blue:    { header: 'bg-blue-600',    dot: 'bg-blue-600',    ring: 'focus:ring-blue-500 focus:border-blue-500' },
                  emerald: { header: 'bg-blue-600', dot: 'bg-emerald-600', ring: 'focus:ring-emerald-500 focus:border-emerald-500' },
                  violet:  { header: 'bg-blue-600',  dot: 'bg-violet-600',  ring: 'focus:ring-violet-500 focus:border-violet-500' },
                  amber:   { header: 'bg-blue-600',   dot: 'bg-amber-600',   ring: 'focus:ring-amber-500 focus:border-amber-500' },
                };

                const sectionAverages = PARENT_INTERVIEW_SECTIONS.map((_, sIdx) => {
                  const scores = parentScores[sIdx];
                  const rated = scores.filter((s) => s > 0);
                  return rated.length > 0 ? rated.reduce((a, b) => a + b, 0) / rated.length : 0;
                });
                const overallScore = sectionAverages.some((s) => s > 0)
                  ? sectionAverages.reduce((a, b) => a + b, 0).toFixed(2)
                  : null;

                const parentName = candidate ? [candidate.parentFirstName, candidate.parentMiddleName, candidate.parentLastName].filter(Boolean).join(' ') : '';

                return (
                  <div className="space-y-5">
                    {/* Parent info strip */}
                    {/* {candidate && (
                      <div className="bg-purple-50 border border-purple-200 rounded-xl px-5 py-3 flex flex-wrap items-center gap-4 text-sm">
                        <span className="font-semibold text-purple-800">👨‍👩‍👧 Parent:</span>
                        <span className="text-purple-900 font-medium">{parentName}</span>
                        <span className="text-purple-700">{candidate.parentEmail}</span>
                        <span className="text-purple-700">{candidate.parentMobile}</span>
                      </div>
                    )} */}

                    {/* Schedule Parent Interview Meeting */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <button
                        onClick={() => {
                          if (!showParentScheduleForm && candidate) {
                            setParentMeetForm((f) => ({
                              ...f,
                              subject: f.subject || `Parent Interview — ${parentName}`,
                            }));
                          }
                          setShowParentScheduleForm((v) => !v);
                        }}
                        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <span className="font-semibold text-gray-900">Schedule Parent Interview Meeting</span>
                        </div>
                        <svg className={`w-5 h-5 text-gray-400 transition-transform ${showParentScheduleForm ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {showParentScheduleForm && (
                        <form onSubmit={handleScheduleParentMeeting} className="px-6 pb-6 border-t border-gray-100">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="md:col-span-2">
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Subject *</label>
                              <input
                                type="text"
                                value={parentMeetForm.subject}
                                onChange={(e) => setParentMeetForm((f) => ({ ...f, subject: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-purple-500 focus:border-purple-500"
                                placeholder="e.g. Parent Interview — Parent Name"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Date *</label>
                              <input
                                type="date"
                                value={parentMeetForm.scheduledDate}
                                onChange={(e) => setParentMeetForm((f) => ({ ...f, scheduledDate: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-purple-500 focus:border-purple-500"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Time *</label>
                              <input
                                type="time"
                                value={parentMeetForm.scheduledTime}
                                onChange={(e) => setParentMeetForm((f) => ({ ...f, scheduledTime: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-purple-500 focus:border-purple-500"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Duration</label>
                              <select
                                value={parentMeetForm.duration}
                                onChange={(e) => setParentMeetForm((f) => ({ ...f, duration: Number(e.target.value) }))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-purple-500 focus:border-purple-500"
                              >
                                <option value={15}>15 minutes</option>
                                <option value={30}>30 minutes</option>
                                <option value={45}>45 minutes</option>
                                <option value={60}>60 minutes</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Mode</label>
                              <select
                                value={parentMeetForm.meetingMode}
                                onChange={(e) => setParentMeetForm((f) => ({ ...f, meetingMode: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-purple-500 focus:border-purple-500"
                              >
                                <option value="online">Online</option>
                                <option value="offline">In Person</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex gap-3 mt-4">
                            <button
                              type="submit"
                              disabled={schedulingParent}
                              className="px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
                            >
                              {schedulingParent ? 'Scheduling...' : 'Schedule Meeting'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowParentScheduleForm(false)}
                              className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}
                    </div>

                    {/* Parent Interview Meetings List */}
                    {parentMeetings.length > 0 && (
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Scheduled Meetings</h4>
                        <div className="space-y-3">
                          {parentMeetings.map((m) => {
                            const edit = getMeetEdit(m._id, m.status, (m as any).notes);
                            const dirty = !!meetEditState[m._id];
                            return (
                            <div key={m._id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-gray-900 text-sm">{m.subject}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {new Date(m.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at {m.scheduledTime} &bull; {m.duration} min &bull; {m.meetingMode === 'online' ? 'Online' : 'In Person'}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-0.5">To: {m.toName} &bull; {m.toEmail}</p>
                                  {m.meetingMode === 'online' && (m.zohoMeetingId || m.zohoMeetingPassword) && (
                                    <div className="flex flex-wrap gap-4 mt-1.5">
                                      {m.zohoMeetingId && (
                                        <span className="text-xs text-gray-600"><span className="font-semibold">Meeting ID:</span> {m.zohoMeetingId}</span>
                                      )}
                                      {m.zohoMeetingPassword && (
                                        <span className="text-xs text-gray-600"><span className="font-semibold">Password:</span> {m.zohoMeetingPassword}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <select
                                    value={edit.status}
                                    onChange={(e) => setMeetEditState((s) => ({ ...s, [m._id]: { ...getMeetEdit(m._id, m.status, (m as any).notes), status: e.target.value } }))}
                                    className="border border-gray-300 rounded-lg px-2 py-1 text-xs font-semibold focus:ring-purple-500 focus:border-purple-500"
                                  >
                                    <option value="scheduled">scheduled</option>
                                    <option value="completed">completed</option>
                                    <option value="cancelled">cancelled</option>
                                  </select>
                                  {m.meetingMode === 'online' && (m.zohoMeetingUrl || m.meetLink) && (
                                    <a href={(m.zohoMeetingUrl || m.meetLink)!} target="_blank" rel="noopener noreferrer"
                                      className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700">
                                      Join
                                    </a>
                                  )}
                                </div>
                              </div>
                              <div className="mt-2">
                                <textarea
                                  rows={2}
                                  placeholder="Add notes about this meeting..."
                                  value={edit.notes}
                                  onChange={(e) => setMeetEditState((s) => ({ ...s, [m._id]: { ...getMeetEdit(m._id, m.status, (m as any).notes), notes: e.target.value } }))}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-700 focus:ring-purple-500 focus:border-purple-500 resize-none"
                                />
                                {dirty && (
                                  <button
                                    onClick={() => handleSaveParentMeet(m._id)}
                                    disabled={!!savingMeet[m._id]}
                                    className="mt-1.5 px-4 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 disabled:opacity-50"
                                  >
                                    {savingMeet[m._id] ? 'Saving...' : 'Save'}
                                  </button>
                                )}
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">Parent Interview</h3>
                          <p className="text-sm text-gray-500">Rate each question 1–5 ★. Section score = average of question scores.</p>
                          {candidate && <p className="text-xs text-gray-400 mt-1">Parent: {getParentName(candidate)}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Overall Score</p>
                          <p className="text-3xl font-extrabold text-purple-700">
                            {overallScore ?? '—'}
                            {overallScore && <span className="text-base font-semibold text-gray-400"> / 20</span>}
                          </p>
                        </div>
                        <button
                          onClick={() => saveInterview('parent')}
                          disabled={saving}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-semibold disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        {clearances.parentInterviewCleared ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-green-100 text-green-700">
                            ✓ Parent Interview Cleared
                          </span>
                        ) : (
                          <button
                            onClick={() => handleClearStage('parent-interview')}
                            disabled={clearingStage === 'parent-interview' || !clearances.studentInterviewCleared}
                            title={!clearances.studentInterviewCleared ? 'Student Interview must be cleared first' : undefined}
                            className="px-4 py-2 rounded-lg text-sm font-semibold bg-purple-700 text-white hover:bg-purple-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                          >
                            {clearingStage === 'parent-interview' ? 'Clearing...' : '✓ Clear Parent Interview'}
                          </button>
                        )}
                      </div>
                    </div>

                    {PARENT_INTERVIEW_SECTIONS.map((section, sIdx) => {
                      const cl = sectionColorMap[section.color] ?? sectionColorMap['blue'];
                      const scores = parentScores[sIdx];
                      const rated = scores.filter((s) => s > 0);
                      const sectionAvg = rated.length > 0 ? (rated.reduce((a, b) => a + b, 0) / rated.length).toFixed(2) : null;

                      return (
                        <div key={sIdx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                          <div className={`flex items-center justify-between px-6 py-4 border-b border-blue-500 ${cl.header}`}>
                            <div>
                              <p className="text-xs font-semibold text-blue-100 uppercase tracking-wide mb-0.5">Section {sIdx + 1}</p>
                              <h4 className="text-base font-bold text-white">{section.icon} {section.title}</h4>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-blue-100 font-medium">Section Score</p>
                              <p className="text-2xl font-extrabold text-white">
                                {sectionAvg ?? <span className="text-blue-200">—</span>}
                                {sectionAvg && <span className="text-sm font-semibold text-blue-200"> / 5</span>}
                              </p>
                              <p className="text-xs text-blue-200">{rated.length}/{scores.length} rated</p>
                            </div>
                          </div>
                          <div className="divide-y divide-gray-100">
                            {section.questions.map((q, qIdx) => (
                              <div key={qIdx} className="p-5">
                                <div className="flex items-start gap-4">
                                  <span className={`shrink-0 w-7 h-7 rounded-full ${cl.dot} text-white flex items-center justify-center text-xs font-bold mt-0.5`}>{qIdx + 1}</span>
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-900 mb-3">{q}</p>
                                    <div className="flex items-center gap-1 mb-3">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                          key={star}
                                          onClick={() => {
                                            const next = parentScores.map((row) => [...row]);
                                            next[sIdx][qIdx] = next[sIdx][qIdx] === star ? 0 : star;
                                            setParentScores(next);
                                          }}
                                          title={`Rate ${star}`}
                                          className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                                        >
                                          <svg className={`w-7 h-7 transition-colors ${star <= scores[qIdx] ? 'text-amber-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                          </svg>
                                        </button>
                                      ))}
                                      {scores[qIdx] > 0 && <span className="ml-2 text-sm font-bold text-amber-600">{scores[qIdx]} / 5</span>}
                                    </div>
                                    <textarea
                                      placeholder="Record parent's response..."
                                      rows={2}
                                      value={parentResponses[sIdx][qIdx]}
                                      onChange={(e) => {
                                        const next = parentResponses.map((row) => [...row]);
                                        next[sIdx][qIdx] = e.target.value;
                                        setParentResponses(next);
                                      }}
                                      className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm ${cl.ring} text-gray-700 resize-none`}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </>
  );
}
