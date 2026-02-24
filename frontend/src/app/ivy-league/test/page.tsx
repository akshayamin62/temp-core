'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ivyApi from '@/lib/ivyApi';

/* ── Section metadata ──────────────────────────────────────────────── */
const SECTIONS = [
  {
    name: 'Global Awareness',
    questions: 20,
    duration: '25 mins',
    timeLimit: 2700,
    marks: 40,
    color: 'from-blue-600 to-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    icon: '🌍',
  },
  {
    name: 'Critical Thinking',
    questions: 15,
    duration: '20 mins',
    timeLimit: 1800,
    marks: 30,
    color: 'from-purple-600 to-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    icon: '💡',
  },
  {
    name: 'Academic Aptitude',
    questions: 10,
    duration: '15 mins',
    timeLimit: 1800,
    marks: 20,
    color: 'from-emerald-600 to-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    icon: '📊',
  },
  {
    name: 'Quantitative Logic',
    questions: 15,
    duration: '22 mins',
    timeLimit: 2700,
    marks: 30,
    color: 'from-orange-600 to-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    icon: '🔢',
  },
];

const INSTRUCTIONS = [
  'Each section has its own timer. Complete and submit within the allotted time.',
  'You can only attempt one section at a time. Submit before starting the next.',
  'If the timer runs out, your answers will be auto-submitted.',
  'Answers are auto-saved when you select an option — no manual save needed.',
  'There is negative marking: −0.5 for each wrong answer.',
  'The test opens in full-screen mode. Exiting will be flagged as a violation.',
  'Do not switch tabs, refresh, or use external resources during the test.',
];

interface SectionStatus {
  sectionName: string;
  status: 'locked' | 'in-progress' | 'submitted';
  questionCount: number;
  timeLimit: number;
  answeredCount: number;
  visitedCount: number;
  score?: number;
  startedAt: string | null;
  submittedAt: string | null;
}

interface SessionData {
  _id: string;
  status: 'not-started' | 'in-progress' | 'completed';
  totalScore?: number;
  maxScore: number;
  violations: number;
  sections: SectionStatus[];
}

export default function IvyLeagueTestPage() {
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingSection, setStartingSection] = useState<number | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await ivyApi.get('/test-session/status');
      if (res.data.success) setSession(res.data.session);
    } catch (err) {
      console.error('Failed to fetch test status', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleStartSection = async (idx: number) => {
    if (!session) return;

    const inProgressIdx = session.sections.findIndex((s) => s.status === 'in-progress');
    if (inProgressIdx !== -1 && inProgressIdx !== idx) {
      alert(`Please submit "${session.sections[inProgressIdx].sectionName}" first.`);
      return;
    }

    setStartingSection(idx);
    try {
      const res = await ivyApi.post('/test-session/start-section', { sectionIndex: idx });
      if (res.data.success) {
        router.push(`/ivy-league/test/section/${idx}`);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start section');
      setStartingSection(null);
    }
  };

  const handleResumeSection = (idx: number) => {
    router.push(`/ivy-league/test/section/${idx}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading test...
        </div>
      </div>
    );
  }

  const completedCount = session?.sections.filter((s) => s.status === 'submitted').length ?? 0;
  const isCompleted = session?.status === 'completed';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Header */}
      <div className="sticky top-25 z-40 bg-white/95 backdrop-blur shadow-sm border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2959ba] to-[#1e3f8a] flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 tracking-wide">Ivy League Readiness Test</span>
        </div>
        <div className="flex items-center gap-3">
          {session && session.violations > 0 && (
            <span className="text-xs font-semibold bg-red-100 text-red-600 border border-red-200 px-3 py-1 rounded-full">
              ⚠ {session.violations} Violation{session.violations > 1 ? 's' : ''}
            </span>
          )}
          <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium">
            {completedCount}/4 Sections Done
          </span>
          <button
            onClick={() => router.push('/ivy-league/instructions')}
            className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
          >
            ← Back
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900 mb-2">
            {isCompleted ? '🎉 Test Completed!' : 'Ivy League Readiness Test'}
          </h1>
          <p className="text-gray-600 max-w-xl mx-auto">
            {isCompleted
              ? `You have completed all sections. Total Score: ${session?.totalScore ?? 0} / ${session?.maxScore ?? 120}`
              : 'Select a section to begin. Complete one section at a time.'}
          </p>
        </div>

        {/* Summary Row */}
        <div className="grid grid-cols-5 gap-3 mb-8">
          {[
            { label: 'Total Questions', value: '60', icon: '📝' },
            { label: 'Total Duration', value: '150 min', icon: '⏱' },
            { label: 'Max Marks', value: '120', icon: '🏆' },
            { label: 'Correct', value: '+2', icon: '✅' },
            { label: 'Wrong', value: '−0.5', icon: '⚠️' },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
              <div className="text-xl">{s.icon}</div>
              <div className="text-xl font-extrabold text-gray-900">{s.value}</div>
              <div className="text-xs font-semibold text-gray-600">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Completed banner */}
        {isCompleted && (
          <div className="mb-8 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 text-center">
            <div className="text-5xl font-black text-green-700 mb-1">{session?.totalScore ?? 0}</div>
            <div className="text-sm text-green-600 font-medium mb-4">out of {session?.maxScore ?? 120} marks</div>
            <button
              onClick={() => router.push('/ivy-league/test/review')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#2959ba] to-[#1e3f8a] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Review All Answers
            </button>
          </div>
        )}

        {/* Section Cards */}
        <div className="space-y-4 mb-10">
          {SECTIONS.map((sec, idx) => {
            const status = session?.sections[idx];
            const isInProgress = status?.status === 'in-progress';
            const isSubmitted = status?.status === 'submitted';
            const otherInProgress = session?.sections.some((s, i) => i !== idx && s.status === 'in-progress');

            return (
              <div
                key={sec.name}
                className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-all duration-200 ${
                  isSubmitted ? 'border-green-200 bg-green-50/30' : isInProgress ? `${sec.border} ${sec.bg}` : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-4 px-6 py-5">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${sec.color} flex items-center justify-center text-white text-xl`}>
                    {sec.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Section {idx + 1}</span>
                      {isSubmitted && (
                        <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">SUBMITTED</span>
                      )}
                      {isInProgress && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full animate-pulse">IN PROGRESS</span>
                      )}
                    </div>
                    <p className="text-gray-900 font-bold text-lg">{sec.name}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-gray-500">{sec.questions} questions</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">{sec.duration}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">{sec.marks} marks</span>
                    </div>
                  </div>

                  {/* Score (only after all sections complete) */}
                  {isCompleted && isSubmitted && status?.score !== undefined && (
                    <div className="hidden sm:block text-center px-4">
                      <div className="text-2xl font-black text-green-700">{status.score}</div>
                      <div className="text-[10px] text-green-600">/{sec.marks}</div>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="flex-shrink-0">
                    {isSubmitted ? (
                      <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-xl text-sm font-semibold">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Done
                      </div>
                    ) : isInProgress ? (
                      <button
                        onClick={() => handleResumeSection(idx)}
                        className={`flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r ${sec.color} text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all`}
                      >
                        Resume →
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartSection(idx)}
                        disabled={!!otherInProgress || startingSection === idx}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                          otherInProgress
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : `bg-gradient-to-r ${sec.color} text-white shadow-md hover:shadow-lg`
                        }`}
                      >
                        {startingSection === idx ? (
                          <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Starting...</>
                        ) : (
                          <>Start Section</>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Submitted stats row */}
                {isSubmitted && (
                  <div className="border-t border-green-100 px-6 py-2 flex items-center gap-4 text-xs text-gray-500">
                    <span>✅ {status?.answeredCount ?? 0} answered</span>
                    <span>⬜ {(status?.questionCount ?? 0) - (status?.answeredCount ?? 0)} unanswered</span>
                    {isCompleted && status?.score !== undefined && (
                      <span className="sm:hidden ml-auto font-semibold text-green-700">Score: {status.score}/{sec.marks}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Total Row */}
          <div className="bg-gradient-to-r from-[#2959ba]/10 to-[#1e3f8a]/10 border border-[#2959ba]/30 rounded-2xl px-6 py-4 flex items-center justify-between">
            <span className="font-bold text-gray-900 text-lg">Total</span>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-1 text-gray-700 font-semibold">60 Questions</span>
              <span className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-1 text-gray-700 font-semibold">150 min</span>
              <span className="text-sm bg-[#2959ba] rounded-lg px-3 py-1 text-white font-bold">120 Marks</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
          <span>⚠️</span> Instructions
        </h2>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
          <ul className="space-y-2">
            {INSTRUCTIONS.map((inst, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-600 text-xs flex items-center justify-center font-bold mt-0.5 border border-amber-200">
                  {i + 1}
                </span>
                {inst}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
