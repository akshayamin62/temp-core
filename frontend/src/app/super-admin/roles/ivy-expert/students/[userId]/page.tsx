'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';
import AuthImage from '@/components/AuthImage';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
  PieChart, Pie,
} from 'recharts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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

interface StudentInfo {
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

export default function StudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.userId as string;

  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<StudentInfo | null>(null);
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
  const [savingInterview, setSavingInterview] = useState(false);
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
      if (userData.role !== USER_ROLE.SUPER_ADMIN) {
        toast.error('Access denied.');
        router.push('/');
        return;
      }
      setUser(userData);
      fetchData();
    } catch {
      toast.error('Please login to continue');
      router.push('/login');
    }
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const studentsRes = await axios.get(`${API_URL}/super-admin/ivy-league/students`, { headers });
      let found = studentsRes.data.students?.find((s: any) => s.userId === userId || s.userId?.toString() === userId);

      if (!found) {
        const candidatesRes = await axios.get(`${API_URL}/super-admin/ivy-league/candidates`, { headers });
        found = candidatesRes.data.candidates?.find((c: any) => c.userId === userId || c.userId?.toString() === userId);
      }

      if (found) setStudent(found);

      const testRes = await axios.get(`${API_URL}/super-admin/ivy-league/test-result/${userId}`, { headers });
      if (testRes.data.success && testRes.data.session) {
        setTestResult(testRes.data.session);
      }

      // Fetch interview data
      try {
        const interviewRes = await axios.get(`${API_URL}/super-admin/ivy-league/interview/${userId}`, { headers });
        if (interviewRes.data.success) {
          if (interviewRes.data.studentInterview?.answers) {
            const newScores = STUDENT_INTERVIEW_SECTIONS.map((s) => new Array(s.questions.length).fill(0));
            const newResponses = STUDENT_INTERVIEW_SECTIONS.map((s) => new Array(s.questions.length).fill(''));
            for (const a of interviewRes.data.studentInterview.answers) {
              if (newScores[a.sectionIndex] && a.questionIndex < newScores[a.sectionIndex].length) {
                newScores[a.sectionIndex][a.questionIndex] = a.score;
                newResponses[a.sectionIndex][a.questionIndex] = a.response || '';
              }
            }
            setStudentScores(newScores);
            setStudentResponses(newResponses);
          }
          if (interviewRes.data.parentInterview?.answers) {
            const newScores = PARENT_INTERVIEW_SECTIONS.map((s) => new Array(s.questions.length).fill(0));
            const newResponses = PARENT_INTERVIEW_SECTIONS.map((s) => new Array(s.questions.length).fill(''));
            for (const a of interviewRes.data.parentInterview.answers) {
              if (newScores[a.sectionIndex] && a.questionIndex < newScores[a.sectionIndex].length) {
                newScores[a.sectionIndex][a.questionIndex] = a.score;
                newResponses[a.sectionIndex][a.questionIndex] = a.response || '';
              }
            }
            setParentScores(newScores);
            setParentResponses(newResponses);
          }
        }
      } catch {
        // Interview data may not exist yet — not an error
      }
    } catch {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const saveInterview = async (type: 'student' | 'parent', scores: number[][], responses: string[][]) => {
    try {
      setSavingInterview(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const sections = type === 'student' ? STUDENT_INTERVIEW_SECTIONS : PARENT_INTERVIEW_SECTIONS;
      const answers: { sectionIndex: number; questionIndex: number; score: number; response: string }[] = [];
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
      await axios.put(`${API_URL}/super-admin/ivy-league/interview/${userId}`, { type, answers }, { headers });
      toast.success(`${type === 'student' ? 'Student' : 'Parent'} interview saved`);
    } catch {
      toast.error('Failed to save interview');
    } finally {
      setSavingInterview(false);
    }
  };

  const getFullName = (s: StudentInfo) => [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' ');
  const getParentName = (s: StudentInfo) => [s.parentFirstName, s.parentMiddleName, s.parentLastName].filter(Boolean).join(' ');

  if (!user) return null;

  return (
    <>
      <Toaster position="top-right" />
      <SuperAdminLayout user={user}>
        <div className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => router.push('/super-admin/roles/ivy-expert/students')} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{student ? getFullName(student) : 'Student Details'}</h1>
              <p className="text-gray-600 mt-1">{student ? `${student.schoolName} • Grade ${student.currentGrade} • ${student.curriculum}` : ''}</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {student && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase">Student Name</p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{getFullName(student)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase">Email</p>
                      <p className="text-sm text-gray-900 mt-1">{student.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase">Parent Name</p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{getParentName(student)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase">Parent Contact</p>
                      <p className="text-sm text-gray-900 mt-1">{student.parentEmail}</p>
                      <p className="text-sm text-gray-900">{student.parentMobile}</p>
                    </div>
                  </div>
                </div>
              )}

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
                        ? tab.color === 'blue' ? 'bg-blue-600 text-white' : tab.color === 'green' ? 'bg-green-600 text-white' : 'bg-purple-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

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
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Score Summary</h3>
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
                            <p className="text-2xl font-extrabold text-green-700">{testResult.sections.reduce((s, sec) => s + sec.correct, 0)}</p>
                            <p className="text-xs font-semibold text-green-600 mt-1">Correct</p>
                          </div>
                          <div className="bg-red-50 rounded-lg p-4 text-center">
                            <p className="text-2xl font-extrabold text-red-700">{testResult.sections.reduce((s, sec) => s + sec.incorrect, 0)}</p>
                            <p className="text-xs font-semibold text-red-600 mt-1">Incorrect</p>
                          </div>
                          <div className="bg-amber-50 rounded-lg p-4 text-center">
                            <p className="text-2xl font-extrabold text-amber-700">{testResult.sections.reduce((s, sec) => s + sec.unanswered, 0)}</p>
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

                      {/* ── Performance Analysis Charts ── */}
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
                              {/* 1. Radar Chart */}
                              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                                <h4 className="text-xs font-bold text-gray-700 mb-0.5 uppercase tracking-wide">Strengths Profile</h4>
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

                              {/* 2. Donut */}
                              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                                <h4 className="text-xs font-bold text-gray-700 mb-0.5 uppercase tracking-wide">Overall Accuracy</h4>
                                <p className="text-xs text-gray-900 mb-3 font-bold">Distribution of {totalQ} questions</p>
                                <div className="relative">
                                  <ResponsiveContainer width="100%" height={260}>
                                    <PieChart>
                                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={3} dataKey="value" strokeWidth={2} stroke="#fff">
                                        {donutData.map((entry, idx) => (
                                          <Cell key={idx} fill={entry.color} />
                                        ))}
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

                              {/* 3. Bar Chart */}
                              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                                <h4 className="text-xs font-bold text-gray-700 mb-0.5 uppercase tracking-wide">Section Scores</h4>
                                <p className="text-xs text-gray-900 mb-3 font-bold">Score compared to maximum marks</p>
                                <ResponsiveContainer width="100%" height={260}>
                                  <BarChart data={barData} barGap={4}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }} />
                                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
                                    <Bar dataKey="Your Score" radius={[6, 6, 0, 0]}>
                                      {barData.map((_, idx) => (
                                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                                      ))}
                                    </Bar>
                                    <Bar dataKey="Max Marks" fill="#ef4444" radius={[6, 6, 0, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>

                              {/* 4. Section Accuracy */}
                              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                                <h4 className="text-xs font-bold text-gray-700 mb-0.5 uppercase tracking-wide">Section Accuracy</h4>
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
                          <div key={idx} className="flex-1 min-w-0 bg-white rounded-xl shadow-sm border border-gray-200 p-5 cursor-pointer hover:shadow-md transition-all" style={{ borderLeftWidth: 4, borderLeftColor: SECTION_COLORS[idx] || '#6b7280' }} onClick={() => setActiveSectionIdx(idx)}>
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-lg font-bold text-gray-900">{SECTION_ICONS[idx]} {sec.sectionName}</p>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${sec.status === 'submitted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                {sec.status === 'submitted' ? 'Submitted' : sec.status}
                              </span>
                            </div>
                            {sec.status === 'submitted' && (
                              <div className="grid grid-cols-4 gap-2 text-center">
                                <div>
                                  <p className="text-lg font-bold" style={{ color: SECTION_COLORS[idx] }}>{sec.score}</p>
                                  <p className="text-[10px] text-gray-500 font-semibold">Score</p>
                                </div>
                                <div>
                                  <p className="text-lg font-bold text-green-600">{sec.correct}</p>
                                  <p className="text-[10px] text-gray-500 font-semibold">Correct</p>
                                </div>
                                <div>
                                  <p className="text-lg font-bold text-red-600">{sec.incorrect}</p>
                                  <p className="text-[10px] text-gray-500 font-semibold">Wrong</p>
                                </div>
                                <div>
                                  <p className="text-lg font-bold text-gray-500">{sec.unanswered}</p>
                                  <p className="text-[10px] text-gray-500 font-semibold">Skipped</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {testResult.sections[activeSectionIdx]?.status === 'submitted' && testResult.sections[activeSectionIdx].questions.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                          <h3 className="text-lg font-bold text-gray-900 mb-4">{SECTION_ICONS[activeSectionIdx]} {testResult.sections[activeSectionIdx].sectionName} — Questions</h3>
                          <div className="space-y-5">
                            {testResult.sections[activeSectionIdx].questions.map((q) => (
                              <div key={q.questionNumber} className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className={`px-4 py-2 flex items-center justify-between text-sm font-semibold ${q.isCorrect === true ? 'bg-green-50 text-green-700' : q.isCorrect === false ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'}`}>
                                  <span>Q{q.questionNumber}.</span>
                                  <span>{q.isCorrect === true ? '✅ Correct (+2)' : q.isCorrect === false ? '❌ Incorrect (−0.5)' : '⬜ Skipped (0)'}</span>
                                </div>
                                <div className="p-4">
                                  <p className="text-sm font-medium text-gray-900 mb-3">{q.questionText}</p>
                                  {q.questionImageUrl && (
                                    <div className="mb-3">
                                      {q.questionImageUrl.startsWith('http') ? <img src={q.questionImageUrl} alt={`Q${q.questionNumber}`} className="max-h-48 rounded-lg border" /> : <AuthImage path={q.questionImageUrl} alt={`Q${q.questionNumber}`} className="max-h-48 rounded-lg border" />}
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

              {activeTab === 'student-interview' && (() => {
                const sectionColorMap: Record<string, { header: string; badge: string; dot: string; ring: string }> = {
                  blue:    { header: 'bg-blue-600',    badge: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-600',    ring: 'focus:ring-blue-500 focus:border-blue-500' },
                  emerald: { header: 'bg-blue-600', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-600', ring: 'focus:ring-emerald-500 focus:border-emerald-500' },
                  violet:  { header: 'bg-blue-600',  badge: 'bg-violet-100 text-violet-700',  dot: 'bg-violet-600',  ring: 'focus:ring-violet-500 focus:border-violet-500' },
                  amber:   { header: 'bg-blue-600',   badge: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-600',   ring: 'focus:ring-amber-500 focus:border-amber-500' },
                };

                const sectionAverages = STUDENT_INTERVIEW_SECTIONS.map((_, sIdx) => {
                  const scores = studentScores[sIdx];
                  const rated = scores.filter((s) => s > 0);
                  return rated.length > 0 ? rated.reduce((a, b) => a + b, 0) / rated.length : 0;
                });
                const overallScore =
                  sectionAverages.some((s) => s > 0)
                    ? sectionAverages.reduce((a, b) => a + b, 0).toFixed(2)
                    : null;

                return (
                  <div className="space-y-5">
                    {/* Overall header */}
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
                          onClick={() => saveInterview('student', studentScores, studentResponses)}
                          disabled={savingInterview}
                          className="px-5 py-2.5 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 shadow-sm"
                        >
                          {savingInterview ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>

                    {/* Sections */}
                    {STUDENT_INTERVIEW_SECTIONS.map((section, sIdx) => {
                      const cl = sectionColorMap[section.color] ?? sectionColorMap['blue'];
                      const scores = studentScores[sIdx];
                      const rated = scores.filter((s) => s > 0);
                      const sectionAvg =
                        rated.length > 0
                          ? (rated.reduce((a, b) => a + b, 0) / rated.length).toFixed(2)
                          : null;

                      return (
                        <div key={sIdx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                          {/* Section header */}
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

                          {/* Questions */}
                          <div className="divide-y divide-gray-100">
                            {section.questions.map((q, qIdx) => (
                              <div key={qIdx} className="p-5">
                                <div className="flex items-start gap-4">
                                  <span className={`shrink-0 w-7 h-7 rounded-full ${cl.dot} text-white flex items-center justify-center text-xs font-bold mt-0.5`}>
                                    {qIdx + 1}
                                  </span>
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-900 mb-3">{q}</p>
                                    {/* Star Rating */}
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
                                          <svg
                                            className={`w-7 h-7 transition-colors ${
                                              star <= scores[qIdx] ? 'text-amber-400' : 'text-gray-200'
                                            }`}
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                          >
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                          </svg>
                                        </button>
                                      ))}
                                      {scores[qIdx] > 0 && (
                                        <span className="ml-2 text-sm font-bold text-amber-600">
                                          {scores[qIdx]} / 5
                                        </span>
                                      )}
                                    </div>
                                    {/* Response note */}
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

              {activeTab === 'parent-interview' && (() => {
                const sectionColorMap: Record<string, { header: string; badge: string; dot: string; ring: string }> = {
                  blue:    { header: 'bg-blue-600',    badge: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-600',    ring: 'focus:ring-blue-500 focus:border-blue-500' },
                  emerald: { header: 'bg-blue-600', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-600', ring: 'focus:ring-emerald-500 focus:border-emerald-500' },
                  violet:  { header: 'bg-blue-600',  badge: 'bg-violet-100 text-violet-700',  dot: 'bg-violet-600',  ring: 'focus:ring-violet-500 focus:border-violet-500' },
                  amber:   { header: 'bg-blue-600',   badge: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-600',   ring: 'focus:ring-amber-500 focus:border-amber-500' },
                };

                const sectionAverages = PARENT_INTERVIEW_SECTIONS.map((_, sIdx) => {
                  const scores = parentScores[sIdx];
                  const rated = scores.filter((s) => s > 0);
                  return rated.length > 0 ? rated.reduce((a, b) => a + b, 0) / rated.length : 0;
                });
                const overallScore =
                  sectionAverages.some((s) => s > 0)
                    ? sectionAverages.reduce((a, b) => a + b, 0).toFixed(2)
                    : null;

                return (
                  <div className="space-y-5">
                    {/* Overall header */}
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
                          {student && <p className="text-xs text-gray-400 mt-1">Parent: {getParentName(student)}</p>}
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
                          onClick={() => saveInterview('parent', parentScores, parentResponses)}
                          disabled={savingInterview}
                          className="px-5 py-2.5 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 shadow-sm"
                        >
                          {savingInterview ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>

                    {/* Sections */}
                    {PARENT_INTERVIEW_SECTIONS.map((section, sIdx) => {
                      const cl = sectionColorMap[section.color] ?? sectionColorMap['blue'];
                      const scores = parentScores[sIdx];
                      const rated = scores.filter((s) => s > 0);
                      const sectionAvg =
                        rated.length > 0
                          ? (rated.reduce((a, b) => a + b, 0) / rated.length).toFixed(2)
                          : null;

                      return (
                        <div key={sIdx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                          {/* Section header */}
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

                          {/* Questions */}
                          <div className="divide-y divide-gray-100">
                            {section.questions.map((q, qIdx) => (
                              <div key={qIdx} className="p-5">
                                <div className="flex items-start gap-4">
                                  <span className={`shrink-0 w-7 h-7 rounded-full ${cl.dot} text-white flex items-center justify-center text-xs font-bold mt-0.5`}>
                                    {qIdx + 1}
                                  </span>
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-900 mb-3">{q}</p>
                                    {/* Star Rating */}
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
                                          <svg
                                            className={`w-7 h-7 transition-colors ${
                                              star <= scores[qIdx] ? 'text-amber-400' : 'text-gray-200'
                                            }`}
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                          >
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                          </svg>
                                        </button>
                                      ))}
                                      {scores[qIdx] > 0 && (
                                        <span className="ml-2 text-sm font-bold text-amber-600">
                                          {scores[qIdx]} / 5
                                        </span>
                                      )}
                                    </div>
                                    {/* Response note */}
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
      </SuperAdminLayout>
    </>
  );
}
