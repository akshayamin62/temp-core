'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ivyApi, { BACKEND_URL } from '@/lib/ivyApi';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
  PieChart, Pie,
} from 'recharts';

interface Option { label: string; text: string; }

interface ReviewQuestion {
  questionNumber: number;
  questionText: string;
  questionImageUrl?: string | null;
  options: Option[];
  selectedOption: string | null;
  correctOption: string;
  explanation: string;
  isCorrect: boolean | null;
  marksAwarded: number;
}

interface ReviewSection {
  sectionName: string;
  sectionIndex: number;
  score: number;
  maxMarks: number;
  questions: ReviewQuestion[];
}

interface ReviewData {
  totalScore: number;
  maxScore: number;
  violations: number;
  sections: ReviewSection[];
}

const SECTION_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  'Global Awareness': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: '🌍' },
  'Critical Thinking': { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: '💡' },
  'Academic Aptitude': { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: '📊' },
  'Quantitative Logic': { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: '🔢' },
};

export default function TestReviewPage() {
  const router = useRouter();
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(0);

  const fetchReview = useCallback(async () => {
    try {
      const res = await ivyApi.get('/test-session/review');
      if (res.data.success) {
        setReviewData(res.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to load review');
      router.push('/ivy-league/test');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchReview(); }, [fetchReview]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading review...
        </div>
      </div>
    );
  }

  if (!reviewData) return null;

  const currentSection = reviewData.sections[activeSection];
  const sectionMeta = SECTION_COLORS[currentSection.sectionName] || { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', icon: '📝' };

  const totalCorrect = reviewData.sections.reduce((sum, s) => sum + s.questions.filter(q => q.isCorrect === true).length, 0);
  const totalIncorrect = reviewData.sections.reduce((sum, s) => sum + s.questions.filter(q => q.isCorrect === false).length, 0);
  const totalSkipped = reviewData.sections.reduce((sum, s) => sum + s.questions.filter(q => q.selectedOption === null).length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Header */}
      <div className="sticky top-25 z-40 bg-white/95 backdrop-blur shadow-sm border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2959ba] to-[#1e3f8a] flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 tracking-wide">Answer Review</span>
        </div>
        <button
          onClick={() => router.push('/ivy-league/test')}
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium"
        >
          ← Back to Test
        </button>
      </div>

      <div className="w-full px-4 sm:px-6 py-8">
        {/* Score Summary */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Test Result Summary</h1>
            <p className="text-gray-500 text-sm">Review your answers, correct answers, and explanations</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-gradient-to-br from-[#2959ba]/10 to-[#1e3f8a]/10 border border-[#2959ba]/30 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-[#2959ba]">{reviewData.totalScore}</div>
              <div className="text-xs font-semibold text-[#2959ba]/70">Total Score</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-gray-700">{reviewData.maxScore}</div>
              <div className="text-xs font-semibold text-gray-500">Max Score</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-green-700">{totalCorrect}</div>
              <div className="text-xs font-semibold text-green-600">Correct</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-red-600">{totalIncorrect}</div>
              <div className="text-xs font-semibold text-red-500">Incorrect</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-gray-600">{totalSkipped}</div>
              <div className="text-xs font-semibold text-gray-500">Skipped</div>
            </div>
          </div>
        </div>

        {/* Detailed Section Cards (One Line) */}
        <div className="mb-8">
          <div className="grid grid-cols-4 gap-4">
            {reviewData.sections.map((sec) => {
              const meta = SECTION_COLORS[sec.sectionName] || { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', icon: '📝' };
              const correct = sec.questions.filter(q => q.isCorrect === true).length;
              const incorrect = sec.questions.filter(q => q.isCorrect === false).length;
              const skipped = sec.questions.filter(q => q.selectedOption === null).length;

              const borderColorMap: Record<string, string> = {
                'Global Awareness': 'border-l-blue-600',
                'Critical Thinking': 'border-l-purple-600',
                'Academic Aptitude': 'border-l-emerald-600',
                'Quantitative Logic': 'border-l-orange-600',
              };

              return (
                <div
                  key={sec.sectionIndex}
                  className={`bg-white border-l-4 ${borderColorMap[sec.sectionName] || 'border-l-gray-600'} border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow`}
                >
                  {/* Header with title and badge */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <h3 className={`text-lg font-bold ${meta.text} mb-1`}>{meta.icon} {sec.sectionName}</h3>
                    </div>
                    <span className="text-xs font-semibold bg-green-100 text-green-700 px-3 py-1.5 rounded-full whitespace-nowrap">
                      Submitted
                    </span>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-black text-gray-900">{sec.score.toFixed(1)}</div>
                      <div className="text-sm font-semibold text-gray-500 mt-1">Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-black text-green-600">{correct}</div>
                      <div className="text-sm font-semibold text-gray-500 mt-1">Correct</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-black text-red-600">{incorrect}</div>
                      <div className="text-sm font-semibold text-gray-500 mt-1">Wrong</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-black text-gray-600">{skipped}</div>
                      <div className="text-sm font-semibold text-gray-500 mt-1">Skipped</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Graphical Analysis ── */}
        {(() => {
          const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f97316'];

          // Radar data: percentage scored per section
          const radarData = reviewData.sections.map((sec) => ({
            subject: sec.sectionName.split(' ').slice(0, 2).join(' '),
            score: sec.maxMarks > 0 ? Math.round((sec.score / sec.maxMarks) * 100) : 0,
            fullMark: 100,
          }));

          // Bar data: score vs max marks
          const barData = reviewData.sections.map((sec, i) => ({
            name: sec.sectionName.split(' ').slice(0, 2).join(' '),
            'Your Score': sec.score,
            'Max Marks': sec.maxMarks,
            fill: CHART_COLORS[i % CHART_COLORS.length],
          }));

          // Donut: overall correct / incorrect / skipped
          const totalQ = reviewData.sections.reduce((s, sec) => s + sec.questions.length, 0);
          const donutData = [
            { name: 'Correct', value: totalCorrect, color: '#22c55e' },
            { name: 'Incorrect', value: totalIncorrect, color: '#ef4444' },
            { name: 'Skipped', value: totalSkipped, color: '#9ca3af' },
          ];

          // Accuracy per section for horizontal bars
          const accuracyData = reviewData.sections.map((sec, i) => {
            const attempted = sec.questions.filter(q => q.selectedOption !== null).length;
            const correct = sec.questions.filter(q => q.isCorrect === true).length;
            return {
              name: sec.sectionName.split(' ').slice(0, 2).join(' '),
              accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : 0,
              fill: CHART_COLORS[i % CHART_COLORS.length],
            };
          });

          return (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Performance Analysis</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Radar Chart — Strengths Profile */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h3 className="text-sm font-bold text-gray-900 mb-1 uppercase tracking-wide">Strengths Profile</h3>
                  <p className="text-sm text-gray-900 mb-4 font-bold">Percentage scored in each section</p>
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={radarData} outerRadius="75%">
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                      <Radar name="Score %" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} dot={{ r: 4, fill: '#6366f1' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* 2. Donut — Overall Accuracy */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h3 className="text-sm font-bold text-gray-900 mb-1 uppercase tracking-wide">Overall Accuracy</h3>
                  <p className="text-sm text-gray-900 mb-4 font-bold">Distribution of {totalQ} questions</p>
                  <div className="relative">
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={donutData}
                          cx="50%" cy="50%"
                          innerRadius={70} outerRadius={110}
                          paddingAngle={3}
                          dataKey="value"
                          strokeWidth={2}
                          stroke="#fff"
                        >
                          {donutData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                          formatter={(value: number, name: string) => [`${value} questions`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-black text-gray-900">
                        {totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0}%
                      </span>
                      <span className="text-xs font-bold text-gray-400">Accuracy</span>
                    </div>
                  </div>
                  {/* Legend */}
                  <div className="flex justify-center gap-6 mt-2">
                    {donutData.map((d) => (
                      <div key={d.name} className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-xs font-bold text-gray-600">{d.name} ({d.value})</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Bar Chart — Score vs Max */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h3 className="text-sm font-bold text-gray-900 mb-1 uppercase tracking-wide">Section Scores</h3>
                  <p className="text-sm text-gray-900 mb-4 font-bold">Your score compared to maximum marks</p>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={barData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }} />
                      <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
                      <Bar dataKey="Your Score" radius={[6, 6, 0, 0]}>
                        {barData.map((entry, idx) => (
                          <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                      <Bar dataKey="Max Marks" fill="#ef4444" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* 4. Accuracy per Section — horizontal bar */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h3 className="text-sm font-bold text-gray-900 mb-1 uppercase tracking-wide">Section Accuracy</h3>
                  <p className="text-sm text-gray-900 mb-4 font-bold">Percentage of attempted questions answered correctly</p>
                  <div className="space-y-5 mt-2">
                    {accuracyData.map((sec, idx) => (
                      <div key={idx}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-bold text-gray-700">{reviewData.sections[idx] && SECTION_COLORS[reviewData.sections[idx].sectionName]?.icon} {sec.name}</span>
                          <span className="text-sm font-bold" style={{ color: sec.fill }}>{sec.accuracy}%</span>
                        </div>
                        <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${sec.accuracy}%`, backgroundColor: sec.fill }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Section Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {reviewData.sections.map((sec, idx) => {
            const meta = SECTION_COLORS[sec.sectionName] || { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', icon: '📝' };
            return (
              <button
                key={idx}
                onClick={() => setActiveSection(idx)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                  activeSection === idx
                    ? `${meta.bg} ${meta.border} border-2 ${meta.text} shadow-sm`
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>{meta.icon}</span>
                {sec.sectionName}
              </button>
            );
          })}
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {currentSection.questions.map((q) => {
            const isCorrect = q.isCorrect === true;
            const isIncorrect = q.isCorrect === false;
            const isSkipped = q.selectedOption === null;

            return (
              <div
                key={q.questionNumber}
                className={`bg-white border rounded-2xl overflow-hidden shadow-sm ${
                  isCorrect ? 'border-green-200' : isIncorrect ? 'border-red-200' : 'border-gray-200'
                }`}
              >
                {/* Status bar */}
                <div className={`px-5 py-2 flex items-center justify-between ${
                  isCorrect ? 'bg-green-50' : isIncorrect ? 'bg-red-50' : 'bg-gray-50'
                }`}>
                  <span className="text-sm font-bold text-gray-700">
                    Question {q.questionNumber}
                  </span>
                  <div className="flex items-center gap-2">
                    {isCorrect && (
                      <span className="text-xs font-bold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">✅ Correct (+2)</span>
                    )}
                    {isIncorrect && (
                      <span className="text-xs font-bold bg-red-100 text-red-600 px-2.5 py-1 rounded-full">❌ Incorrect (−0.5)</span>
                    )}
                    {isSkipped && (
                      <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">⬜ Skipped (0)</span>
                    )}
                  </div>
                </div>

                <div className="p-5">
                  {/* Question text */}
                  <p className="text-gray-900 text-base font-medium leading-relaxed mb-4">
                    <span className="font-bold text-[#2959ba] mr-2">Q{q.questionNumber}.</span>
                    {q.questionText}
                  </p>

                  {/* Question image */}
                  {q.questionImageUrl && (
                    <div className="mb-4 bg-gray-100 rounded-xl p-3 flex items-center justify-center">
                      <img
                        src={`${BACKEND_URL}${q.questionImageUrl}`}
                        alt="Question"
                        className="max-h-48 object-contain rounded"
                      />
                    </div>
                  )}

                  {/* Options */}
                  <div className="space-y-2 mb-4">
                    {q.options.map((opt) => {
                      const isStudentAnswer = q.selectedOption === opt.label;
                      const isCorrectAnswer = q.correctOption === opt.label;

                      let optionStyle = 'border-gray-200 bg-white text-gray-700';
                      if (isCorrectAnswer) {
                        optionStyle = 'border-green-400 bg-green-50 text-green-800';
                      }
                      if (isStudentAnswer && !isCorrectAnswer) {
                        optionStyle = 'border-red-400 bg-red-50 text-red-800';
                      }

                      return (
                        <div
                          key={opt.label}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 ${optionStyle}`}
                        >
                          <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 ${
                            isCorrectAnswer
                              ? 'bg-green-500 border-green-500 text-white'
                              : isStudentAnswer
                                ? 'bg-red-500 border-red-500 text-white'
                                : 'bg-white border-gray-300 text-gray-500'
                          }`}>
                            {opt.label}
                          </span>
                          <span className="flex-1 text-sm font-medium">{opt.text}</span>
                          {isCorrectAnswer && (
                            <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Correct</span>
                          )}
                          {isStudentAnswer && !isCorrectAnswer && (
                            <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Your Answer</span>
                          )}
                          {isStudentAnswer && isCorrectAnswer && (
                            <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Your Answer ✓</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  {q.explanation && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-bold text-blue-700">Explanation</span>
                      </div>
                      <p className="text-sm text-blue-800 leading-relaxed">{q.explanation}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom nav */}
        <div className="mt-8 mb-4 flex items-center justify-between">
          <button
            onClick={() => setActiveSection(Math.max(0, activeSection - 1))}
            disabled={activeSection === 0}
            className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Previous Section
          </button>
          <span className="text-sm text-gray-500 font-medium">
            Section {activeSection + 1} of {reviewData.sections.length}
          </span>
          <button
            onClick={() => setActiveSection(Math.min(reviewData.sections.length - 1, activeSection + 1))}
            disabled={activeSection === reviewData.sections.length - 1}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#2959ba] to-[#1e3f8a] text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next Section →
          </button>
        </div>
      </div>
    </div>
  );
}
