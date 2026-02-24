'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ivyApi from '@/lib/ivyApi';
import { BACKEND_URL } from '@/lib/ivyApi';

/* ── Section metadata (must match parent page) ─────────────────────── */
const SECTION_META: Record<string, { label: string; color: string; icon: string }> = {
  'Global Awareness': { label: 'Global Awareness', color: 'from-blue-600 to-blue-700', icon: '🌍' },
  'Critical Thinking': { label: 'Critical Thinking', color: 'from-purple-600 to-purple-700', icon: '💡' },
  'Academic Aptitude': { label: 'Academic Aptitude', color: 'from-emerald-600 to-emerald-700', icon: '📊' },
  'Quantitative Logic': { label: 'Quantitative Logic', color: 'from-orange-600 to-orange-700', icon: '🔢' },
};

interface Option { label: string; text: string; }
interface Question {
  _id: string;
  section: string;
  questionText: string;
  questionImageUrl?: string | null;
  options: Option[];
  selectedOption: string | null;
  isVisited: boolean;
}

/* ── STATUS COLORS (matches screenshot) ────────────────────────────── */
// Grey  = not visited
// Red   = visited but not answered
// Green = answered

function getQuestionColor(q: Question): string {
  if (q.selectedOption) return 'bg-green-500 text-white border-green-600';         // answered
  if (q.isVisited) return 'bg-red-500 text-white border-red-600';                  // visited, not answered
  return 'bg-gray-300 text-gray-700 border-gray-400';                              // not visited
}

export default function SectionTestPage() {
  const router = useRouter();
  const params = useParams();
  const sectionIndex = parseInt(params.sectionIndex as string, 10);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [sectionName, setSectionName] = useState('');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);

  // Proctoring
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fsWarning, setFsWarning] = useState(false);
  const [tabWarning, setTabWarning] = useState(false);
  const [violations, setViolations] = useState(0);
  const mountedRef = useRef(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  /* ── Enter fullscreen ──────────────────────────────────────────── */
  const enterFullscreen = useCallback(() => {
    const el = document.documentElement as any;
    const req = el.requestFullscreen?.bind(el) || el.webkitRequestFullscreen?.bind(el) || el.mozRequestFullScreen?.bind(el);
    if (req) req().catch(() => {});
  }, []);

  /* ── Proctoring listeners ──────────────────────────────────────── */
  useEffect(() => {
    const onFsChange = () => {
      const doc = document as any;
      const inFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement);
      setIsFullscreen(inFs);
      if (!inFs && mountedRef.current && !submitted) {
        setFsWarning(true);
        setViolations((v) => v + 1);
        // Record on backend
        ivyApi.post('/test-session/violation').catch(() => {});
      }
    };
    const onVisibility = () => {
      if (document.hidden && mountedRef.current && !submitted) {
        setTabWarning(true);
        setViolations((v) => v + 1);
        ivyApi.post('/test-session/violation').catch(() => {});
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (e.key === 'F5' || e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && ['r', 'w', 't', 'n', 'l', 'u', 'p'].includes(key)) ||
        (e.altKey && (e.key === 'Tab' || e.key === 'F4'))) {
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };

    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('keydown', onKeyDown, { capture: true });
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      mountedRef.current = false;
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('keydown', onKeyDown, { capture: true } as EventListenerOptions);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [submitted]);

  /* ── Fetch section data ────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const res = await ivyApi.post('/test-session/start-section', { sectionIndex });
        if (res.data.success) {
          setQuestions(res.data.questions);
          setSectionName(res.data.sectionName);
          setRemainingTime(res.data.remainingTime);
          // Enter fullscreen
          enterFullscreen();
        }
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to load section');
        router.push('/ivy-league/test');
      } finally {
        setLoading(false);
      }
    })();
  }, [sectionIndex, enterFullscreen, router]);

  /* ── Timer countdown ───────────────────────────────────────────── */
  useEffect(() => {
    if (loading || submitted || remainingTime <= 0) return;

    timerRef.current = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // Auto-submit
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, submitted]);

  /* ── Format timer ──────────────────────────────────────────────── */
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  /* ── Mark current question as visited ──────────────────────────── */
  useEffect(() => {
    if (loading || questions.length === 0) return;
    const q = questions[currentIdx];
    if (q && !q.isVisited) {
      const updated = [...questions];
      updated[currentIdx] = { ...updated[currentIdx], isVisited: true };
      setQuestions(updated);
      // Save visit to backend
      ivyApi.post('/test-session/save-answer', {
        sectionIndex,
        questionIndex: currentIdx,
        isVisited: true,
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, loading]);

  /* ── Select answer (auto-save) ─────────────────────────────────── */
  const handleSelectOption = async (label: string) => {
    if (submitted) return;
    const updated = [...questions];
    // Toggle: clicking same option deselects
    const newValue = updated[currentIdx].selectedOption === label ? null : label;
    updated[currentIdx] = { ...updated[currentIdx], selectedOption: newValue, isVisited: true };
    setQuestions(updated);

    // Auto-save to backend
    try {
      await ivyApi.post('/test-session/save-answer', {
        sectionIndex,
        questionIndex: currentIdx,
        selectedOption: newValue,
        isVisited: true,
      });
    } catch (err) {
      console.error('Failed to save answer', err);
    }
  };

  /* ── Submit section ────────────────────────────────────────────── */
  const handleSubmit = async (isAutoSubmit = false) => {
    if (submitted || submitting) return;
    if (!isAutoSubmit) {
      const answered = questions.filter((q) => q.selectedOption).length;
      const unanswered = questions.length - answered;
      if (unanswered > 0) {
        const ok = confirm(`You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Submit anyway?`);
        if (!ok) return;
      }
    }

    setSubmitting(true);
    try {
      const res = await ivyApi.post('/test-session/submit-section', { sectionIndex });
      if (res.data.success) {
        setSubmitted(true);
        setSubmitResult(res.data);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Navigate back to test overview ────────────────────────────── */
  const handleBack = () => {
    // Exit fullscreen
    const doc = document as any;
    if (doc.fullscreenElement) {
      doc.exitFullscreen().finally(() => router.push('/ivy-league/test'));
    } else {
      router.push('/ivy-league/test');
    }
  };

  /* ── Loading state ─────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading section...
        </div>
      </div>
    );
  }

  const meta = SECTION_META[sectionName] || { label: sectionName, color: 'from-gray-600 to-gray-700', icon: '📝' };
  const currentQ = questions[currentIdx];
  const answeredCount = questions.filter((q) => q.selectedOption).length;
  const isUrgent = remainingTime <= 60;

  /* ── Submitted result screen ───────────────────────────────────── */
  if (submitted && submitResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Section Submitted!</h2>
          <p className="text-gray-500 mb-6">{sectionName}</p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-green-700">{submitResult.answered}</div>
              <div className="text-xs text-green-600">Answered</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{questions.filter(q => q.isVisited && !q.selectedOption).length}</div>
              <div className="text-xs text-red-500">Not Answered</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-gray-600">{questions.filter(q => !q.isVisited).length}</div>
              <div className="text-xs text-gray-500">Skipped</div>
            </div>
          </div>

          <button
            onClick={handleBack}
            className="w-full py-3 bg-gradient-to-r from-[#2959ba] to-[#1e3f8a] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            {submitResult.status === 'completed' ? 'View Results & Review Answers' : 'Next Section →'}
          </button>
        </div>
      </div>
    );
  }

  /* ── Main test UI ──────────────────────────────────────────────── */
  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden select-none">
      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${meta.color} flex items-center justify-center text-white text-sm`}>
            {meta.icon}
          </div>
          <div>
            <span className="font-bold text-gray-900 text-sm">{sectionName}: Question {currentIdx + 1}</span>
            <div className="text-[10px] text-gray-400">{answeredCount}/{questions.length} answered</div>
          </div>
        </div>

        {/* Timer */}
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-lg border font-mono text-lg font-bold ${
          isUrgent
            ? 'bg-red-50 border-red-300 text-red-600 animate-pulse'
            : 'bg-gray-50 border-gray-200 text-gray-800'
        }`}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {formatTime(remainingTime)}
        </div>

        {/* Submit */}
        <button
          onClick={() => handleSubmit(false)}
          disabled={submitting}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-60"
        >
          {submitting ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting...</>
          ) : (
            <>Submit Section</>
          )}
        </button>
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Left: Question Area ───────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
          {currentQ && (
            <>
              {/* Question text */}
              <div className="mb-6">
                <p className="text-gray-900 text-xl leading-relaxed font-medium" style={{ fontFamily: 'Calibri, sans-serif' }}>
                  <span className="font-bold text-[#2959ba] mr-2">Q{currentIdx + 1}.</span>
                  {currentQ.questionText}
                </p>
              </div>

              {/* Question image */}
              {currentQ.questionImageUrl && (
                <div className="mb-6 bg-gray-900 rounded-xl p-4 flex items-center justify-center">
                  <img
                    src={`${BACKEND_URL}${currentQ.questionImageUrl}`}
                    alt="Question"
                    className="max-h-64 object-contain rounded"
                  />
                </div>
              )}

              {/* Options */}
              <div className="space-y-3">
                {currentQ.options.map((opt) => {
                  const isSelected = currentQ.selectedOption === opt.label;
                  return (
                    <button
                      key={opt.label}
                      onClick={() => handleSelectOption(opt.label)}
                      className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border-2 text-left transition-all duration-150 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-base border-2 ${
                        isSelected
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'bg-white border-gray-300 text-gray-600'
                      }`}>
                        {opt.label}
                      </span>
                      <span className={`text-base ${isSelected ? 'text-blue-900 font-semibold' : 'text-gray-700'}`}>
                        {opt.text}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                  disabled={currentIdx === 0}
                  className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
                <span className="text-base font-medium text-gray-500">
                  {currentIdx + 1} of {questions.length}
                </span>
                <button
                  onClick={() => setCurrentIdx(Math.min(questions.length - 1, currentIdx + 1))}
                  disabled={currentIdx === questions.length - 1}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#2959ba] to-[#1e3f8a] text-white rounded-xl text-base font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Right: Question Navigation Grid ───────────────────── */}
        <div className="flex-shrink-0 w-64 border-l border-gray-200 bg-gray-50 overflow-y-auto p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Question No.</h3>

          {/* Grid */}
          <div className="grid grid-cols-5 gap-1.5 mb-6">
            {questions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIdx(idx)}
                className={`w-full aspect-square rounded-md text-xs font-bold border transition-all ${
                  idx === currentIdx
                    ? 'ring-2 ring-blue-500 ring-offset-1'
                    : ''
                } ${getQuestionColor(q)}`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="space-y-2 border-t border-gray-200 pt-4">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="w-4 h-4 rounded bg-gray-300 border border-gray-400" />
              Not Visited
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="w-4 h-4 rounded bg-red-500 border border-red-600" />
              Visited, Not Answered
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="w-4 h-4 rounded bg-green-500 border border-green-600" />
              Answered
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 border-t border-gray-200 pt-4 space-y-1 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>Answered</span>
              <span className="font-semibold text-green-600">{questions.filter((q) => q.selectedOption).length}</span>
            </div>
            <div className="flex justify-between">
              <span>Visited (no answer)</span>
              <span className="font-semibold text-red-500">{questions.filter((q) => q.isVisited && !q.selectedOption).length}</span>
            </div>
            <div className="flex justify-between">
              <span>Not Visited</span>
              <span className="font-semibold text-gray-500">{questions.filter((q) => !q.isVisited).length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Full-Screen Lost Warning ────────────────────────────── */}
      {fsWarning && (
        <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-red-400 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-9 h-9 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Full Screen Exited!</h2>
            <p className="text-gray-600 mb-2">
              This has been recorded as a <strong className="text-red-500">violation</strong>.
            </p>
            <p className="text-sm text-red-500 font-semibold mb-6">Total violations: {violations}</p>
            <button
              onClick={() => { setFsWarning(false); enterFullscreen(); }}
              className="w-full py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold rounded-xl hover:from-red-600 hover:to-red-700 transition-all shadow-md"
            >
              Return to Full Screen
            </button>
          </div>
        </div>
      )}

      {/* ── Tab Switch Warning ──────────────────────────────────── */}
      {tabWarning && (
        <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-amber-400 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-9 h-9 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Tab Switch Detected!</h2>
            <p className="text-gray-600 mb-2">
              This has been recorded as a <strong className="text-amber-600">violation</strong>.
            </p>
            <p className="text-sm text-amber-600 font-semibold mb-6">Total violations: {violations}</p>
            <button
              onClick={() => setTabWarning(false)}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all shadow-md"
            >
              I Understand — Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
