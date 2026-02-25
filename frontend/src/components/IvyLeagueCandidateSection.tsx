'use client';

import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '@/lib/ivyApi';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
  PieChart, Pie,
} from 'recharts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const SECTION_COLORS = ['#2959ba', '#059669', '#d97706'];
const SECTION_ICONS = ['🌍', '🧠', '📚'];
const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f97316'];

/* ─── Interfaces ─── */
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

/* ─── Interview constants ─── */
const STUDENT_INTERVIEW_SECTIONS = [
  {
    title: 'Psychological Readiness', color: 'blue', icon: '🧠',
    questions: [
      'Tell us about a time you failed. How did you respond, and what did you learn?',
      'How do you typically deal with high academic pressure or competition?',
      'Have you ever faced cultural or intellectual challenges? How did you adapt?',
      'What personal habits help you stay focused, balanced, and resilient?',
      'What mental or emotional skills do you feel you need to improve before going abroad?',
    ],
  },
  {
    title: 'Career and Life Vision', color: 'emerald', icon: '🚀',
    questions: [
      'Where do you see yourself professionally in the next 10–15 years?',
      'What kind of problems do you hope to solve in your career?',
      'What subjects or areas do you feel most passionate about?',
      'Who are your role models, and why?',
      'How do you want your career to impact the world around you?',
    ],
  },
  {
    title: 'Ivy League Purpose Clarity', color: 'violet', icon: '🎓',
    questions: [
      'Why do you want to study at an Ivy League institution specifically?',
      'What distinguishes the Ivy League from other strong institutions, in your view?',
      'What do you expect to gain (personally and professionally) from an Ivy League education?',
      'How have you researched your target universities and programs?',
      "If you don't get into an Ivy League school, how will you move forward?",
    ],
  },
  {
    title: 'Growth and Skill Upgradation Willingness', color: 'amber', icon: '📈',
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
    title: 'Student Readiness Insight', color: 'blue', icon: '👁️',
    questions: [
      'How does your child handle pressure, failure, or uncertainty?',
      'What are their greatest strengths outside academics?',
      'Where do you think they still need personal development?',
      'How independently do they operate day-to-day?',
      'Are they emotionally mature enough to live and study abroad?',
    ],
  },
  {
    title: 'Family Alignment and Expectations', color: 'emerald', icon: '👨‍👩‍👧',
    questions: [
      'Why do you want your child to study at an Ivy League school? (Social reasons, financial reasons, professional reasons, social status, etc.)',
      'How have you prepared (or plan to prepare) for this journey?',
      'What are your hopes and concerns about Ivy League life?',
      'Are you aligned with your child\'s long-term career goals?',
      'Would you be supportive if your child chooses a non-traditional career path post-Ivy League?',
    ],
  },
  {
    title: 'Cultural and Emotional Readiness', color: 'violet', icon: '🌍',
    questions: [
      'How do you see your child adapting to a global peer group?',
      'Have they had exposure to diverse or international environments before?',
      'How does your family handle emotional challenges or stress?',
      'Are you comfortable giving your child more independence?',
      'How would you help your child stay grounded abroad?',
    ],
  },
  {
    title: 'Growth Mindset & Support Strategy', color: 'amber', icon: '🌱',
    questions: [
      'What skills do you think your child must still build?',
      'Are you actively helping your child learn new skills or habits?',
      'How do you handle constructive feedback about your child\'s performance?',
      'What\'s your role in supporting their academic and personal growth?',
      'Are you open to changing family routines to support your child\'s journey?',
    ],
  },
];

const SECTION_COLOR_MAP: Record<string, { header: string; dot: string; ring: string }> = {
  blue:    { header: 'bg-blue-50 border-blue-200',    dot: 'bg-blue-600',    ring: 'focus:ring-blue-500 focus:border-blue-500' },
  emerald: { header: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-600', ring: 'focus:ring-emerald-500 focus:border-emerald-500' },
  violet:  { header: 'bg-violet-50 border-violet-200',  dot: 'bg-violet-600',  ring: 'focus:ring-violet-500 focus:border-violet-500' },
  amber:   { header: 'bg-amber-50 border-amber-200',   dot: 'bg-amber-600',   ring: 'focus:ring-amber-500 focus:border-amber-500' },
};

/* ─── Props ─── */
interface IvyLeagueCandidateSectionProps {
  /** The User model _id of the student */
  userId: string;
  /** If true, super admin can see "Open Full View" link */
  canNavigate?: boolean;
  /** Callback to navigate to full ivy expert student page */
  onNavigateToFull?: () => void;
}

export default function IvyLeagueCandidateSection({
  userId,
  canNavigate = false,
  onNavigateToFull,
}: IvyLeagueCandidateSectionProps) {
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCandidate, setIsCandidate] = useState(false);
  const [activeTab, setActiveTab] = useState<'test' | 'student-interview' | 'parent-interview'>('test');
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [studentScores, setStudentScores] = useState<number[][]>(() =>
    STUDENT_INTERVIEW_SECTIONS.map((s) => new Array(s.questions.length).fill(0))
  );
  const [parentScores, setParentScores] = useState<number[][]>(() =>
    PARENT_INTERVIEW_SECTIONS.map((s) => new Array(s.questions.length).fill(0))
  );
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current || !userId) return;
    hasFetchedRef.current = true;
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Check if student is ivy league candidate/student
      const studentsRes = await axios.get(`${API_URL}/super-admin/ivy-league/students`, { headers });
      let found = studentsRes.data.students?.find((s: any) => s.userId === userId || s.userId?.toString() === userId);

      if (!found) {
        const candidatesRes = await axios.get(`${API_URL}/super-admin/ivy-league/candidates`, { headers });
        found = candidatesRes.data.candidates?.find((c: any) => c.userId === userId || c.userId?.toString() === userId);
      }

      if (!found) {
        // Student is not an ivy league candidate
        setIsCandidate(false);
        setLoading(false);
        return;
      }

      setIsCandidate(true);
      setStudent(found);

      // Fetch test result
      try {
        const testRes = await axios.get(`${API_URL}/super-admin/ivy-league/test-result/${userId}`, { headers });
        if (testRes.data.success && testRes.data.session) {
          setTestResult(testRes.data.session);
        }
      } catch {
        // Test may not exist yet
      }
    } catch {
      setIsCandidate(false);
    } finally {
      setLoading(false);
    }
  };

  const getFullName = (s: StudentInfo) => [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' ');
  const getParentName = (s: StudentInfo) => [s.parentFirstName, s.parentMiddleName, s.parentLastName].filter(Boolean).join(' ');

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Checking Ivy League status...</p>
        </div>
      </div>
    );
  }

  if (!isCandidate) return null;

  /* ─── RENDER ─── */
  return (
    <div className="bg-white rounded-xl shadow-sm border border-purple-200 p-6 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Ivy League Candidate</h2>
            <p className="text-sm text-gray-500">Aptitude test, interview scores & candidate profile</p>
          </div>
        </div>
        {canNavigate && onNavigateToFull && (
          <button
            onClick={onNavigateToFull}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open Full View
          </button>
        )}
      </div>

      {/* Student Info Card */}
      {student && (
        <div className="border border-gray-200 rounded-lg p-5 mb-6 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase">Student Name</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{getFullName(student)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase">School &amp; Grade</p>
              <p className="text-sm text-gray-900 mt-1">{student.schoolName} &middot; Grade {student.currentGrade}</p>
              <p className="text-xs text-gray-500">{student.curriculum}</p>
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

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'test' as const, label: '📝 Test Score', color: 'blue' },
          { key: 'student-interview' as const, label: '🎓 Student Interview', color: 'green' },
          { key: 'parent-interview' as const, label: '👨‍👩‍👧 Parent Interview', color: 'purple' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
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

      {/* ═══ TEST SCORE TAB ═══ */}
      {activeTab === 'test' && (
        <div>
          {!testResult ? (
            <div className="border border-gray-200 rounded-xl p-12 text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-lg font-medium text-gray-500">Student has not started the test yet</p>
            </div>
          ) : (
            <>
              {/* Score Summary */}
              <div className="border border-gray-200 rounded-xl p-6 mb-6">
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

              {/* Performance Charts */}
              {(() => {
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
                      {/* Radar Chart */}
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                        <h4 className="text-xs font-bold text-gray-700 mb-0.5 uppercase tracking-wide">Strengths Profile</h4>
                        <p className="text-[11px] text-gray-400 mb-3 font-bold">Percentage scored in each section</p>
                        <ResponsiveContainer width="100%" height={260}>
                          <RadarChart data={radarData} outerRadius="75%">
                            <PolarGrid stroke="#e5e7eb" />
                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }} />
                            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                            <Radar name="Score %" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} dot={{ r: 4, fill: '#6366f1' }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Donut Chart */}
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                        <h4 className="text-xs font-bold text-gray-700 mb-0.5 uppercase tracking-wide">Overall Accuracy</h4>
                        <p className="text-[11px] text-gray-400 mb-3 font-bold">Distribution of {totalQ} questions</p>
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

                      {/* Bar Chart */}
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                        <h4 className="text-xs font-bold text-gray-700 mb-0.5 uppercase tracking-wide">Section Scores</h4>
                        <p className="text-[11px] text-gray-400 mb-3 font-bold">Score compared to maximum marks</p>
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

                      {/* Section Accuracy */}
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                        <h4 className="text-xs font-bold text-gray-700 mb-0.5 uppercase tracking-wide">Section Accuracy</h4>
                        <p className="text-[11px] text-gray-400 mb-3 font-bold">Percentage of attempted questions answered correctly</p>
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
              <div className="flex gap-4 mb-6 overflow-x-auto">
                {testResult.sections.map((sec, idx) => (
                  <div key={idx} className="flex-1 min-w-[200px] bg-white rounded-xl shadow-sm border border-gray-200 p-5 cursor-pointer hover:shadow-md transition-all" style={{ borderLeftWidth: 4, borderLeftColor: SECTION_COLORS[idx] || '#6b7280' }} onClick={() => setActiveSectionIdx(idx)}>
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

              {/* Question Detail */}
              {testResult.sections[activeSectionIdx]?.status === 'submitted' && testResult.sections[activeSectionIdx].questions.length > 0 && (
                <div className="border border-gray-200 rounded-xl p-6">
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
                              <img src={q.questionImageUrl.startsWith('http') ? q.questionImageUrl : `${BACKEND_URL}${q.questionImageUrl}`} alt={`Q${q.questionNumber}`} className="max-h-48 rounded-lg border" />
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

      {/* ═══ STUDENT INTERVIEW TAB ═══ */}
      {activeTab === 'student-interview' && renderInterviewTab(
        STUDENT_INTERVIEW_SECTIONS, studentScores, setStudentScores,
        'Student Interview', '🎓', 'green', student
      )}

      {/* ═══ PARENT INTERVIEW TAB ═══ */}
      {activeTab === 'parent-interview' && renderInterviewTab(
        PARENT_INTERVIEW_SECTIONS, parentScores, setParentScores,
        'Parent Interview', '👨‍👩‍👧', 'purple', student, true
      )}
    </div>
  );
}

/* ─── Interview Tab Renderer (read-only stars, read-only textareas) ─── */
function renderInterviewTab(
  sections: typeof STUDENT_INTERVIEW_SECTIONS,
  scores: number[][],
  _setScores: React.Dispatch<React.SetStateAction<number[][]>>,
  title: string,
  icon: string,
  themeColor: 'green' | 'purple',
  student: StudentInfo | null,
  showParent = false,
) {
  const sectionAverages = sections.map((_, sIdx) => {
    const s = scores[sIdx];
    const rated = s.filter((v) => v > 0);
    return rated.length > 0 ? rated.reduce((a, b) => a + b, 0) / rated.length : 0;
  });
  const overallScore = sectionAverages.some((s) => s > 0)
    ? sectionAverages.reduce((a, b) => a + b, 0).toFixed(2)
    : null;

  const themeConfig = themeColor === 'green'
    ? { bg: 'bg-green-100', text: 'text-green-600', score: 'text-green-700' }
    : { bg: 'bg-purple-100', text: 'text-purple-600', score: 'text-purple-700' };

  return (
    <div className="space-y-5">
      {/* Overall header */}
      <div className="border border-gray-200 rounded-xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${themeConfig.bg} ${themeConfig.text} flex items-center justify-center`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{icon} {title}</h3>
            <p className="text-sm text-gray-500">Each question rated 1–5 ★. Section score = average.</p>
            {showParent && student && (
              <p className="text-xs text-gray-400 mt-1">Parent: {[student.parentFirstName, student.parentMiddleName, student.parentLastName].filter(Boolean).join(' ')}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Overall Score</p>
          <p className={`text-3xl font-extrabold ${themeConfig.score}`}>
            {overallScore ?? '—'}
            {overallScore && <span className="text-base font-semibold text-gray-400"> / 20</span>}
          </p>
        </div>
      </div>

      {/* Sections */}
      {sections.map((section, sIdx) => {
        const cl = SECTION_COLOR_MAP[section.color] ?? SECTION_COLOR_MAP['blue'];
        const sScores = scores[sIdx];
        const rated = sScores.filter((v) => v > 0);
        const sectionAvg = rated.length > 0 ? (rated.reduce((a, b) => a + b, 0) / rated.length).toFixed(2) : null;

        return (
          <div key={sIdx} className="border border-gray-200 rounded-xl overflow-hidden">
            <div className={`flex items-center justify-between px-6 py-4 border-b ${cl.header}`}>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Section {sIdx + 1}</p>
                <h4 className="text-base font-bold text-gray-900">{section.icon} {section.title}</h4>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 font-medium">Section Score</p>
                <p className="text-2xl font-extrabold text-gray-800">
                  {sectionAvg ?? <span className="text-gray-400">—</span>}
                  {sectionAvg && <span className="text-sm font-semibold text-gray-400"> / 5</span>}
                </p>
                <p className="text-xs text-gray-400">{rated.length}/{sScores.length} rated</p>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {section.questions.map((q, qIdx) => (
                <div key={qIdx} className="p-5">
                  <div className="flex items-start gap-4">
                    <span className={`shrink-0 w-7 h-7 rounded-full ${cl.dot} text-white flex items-center justify-center text-xs font-bold mt-0.5`}>
                      {qIdx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 mb-3">{q}</p>
                      {/* Star Rating (read-only display) */}
                      <div className="flex items-center gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className={`w-7 h-7 ${star <= sScores[qIdx] ? 'text-amber-400' : 'text-gray-200'}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                        {sScores[qIdx] > 0 && (
                          <span className="ml-2 text-sm font-bold text-amber-600">{sScores[qIdx]} / 5</span>
                        )}
                      </div>
                      <textarea
                        readOnly
                        placeholder="No response recorded"
                        rows={2}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 bg-gray-50 resize-none cursor-default"
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
}
