'use client';

import React, { useState } from 'react';

interface SkillWithPercentage {
  name: string;
  percentage: number;
  rawPercentage?: string;
}

export interface BrainographyDataType {
  _id: string;
  studentName: string;
  standard: string;
  board?: string;
  highestSkills: SkillWithPercentage[];
  thinkingPattern: string;
  thinkingPatternDetails?: SkillWithPercentage[];
  achievementStyle: SkillWithPercentage[];
  learningCommunicationStyle: SkillWithPercentage[];
  quotients: SkillWithPercentage[];
  personalityType: string;
  careerGoals: string[];
  extractedAt: string;
}

interface Props {
  data: BrainographyDataType;
  canEdit?: boolean;
  onUpdate?: (field: 'standard' | 'board', value: string) => void;
}

/** Format a percentage value for display — prevents double "%%" */
function fmtPct(rawPercentage?: string, percentage?: number): string {
  const raw = rawPercentage || String(percentage ?? 0);
  return raw.replace(/%$/, '');
}

/** Color themes for different sections */
const sectionColors = {
  thinking: { bar: 'bg-violet-500', text: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200', icon: 'text-violet-600', badge: 'bg-violet-100 text-violet-800', light: 'bg-violet-100' },
  skills: { bar: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', badge: 'bg-blue-100 text-blue-800', light: 'bg-blue-100' },
  achievement: { bar: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600', badge: 'bg-amber-100 text-amber-800', light: 'bg-amber-100' },
  learning: { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-800', light: 'bg-emerald-100' },
  quotients: { bar: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', icon: 'text-rose-600', badge: 'bg-rose-100 text-rose-800', light: 'bg-rose-100' },
  career: { bar: 'bg-indigo-500', text: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-800', light: 'bg-indigo-100' },
};

/** Quotient ring colors */
const quotientColors = [
  { stroke: '#8b5cf6', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  { stroke: '#3b82f6', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  { stroke: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  { stroke: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  { stroke: '#ef4444', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  { stroke: '#ec4899', bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  { stroke: '#06b6d4', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  { stroke: '#f97316', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
];

function PercentageBar({ name, percentage, rawPercentage, color }: { name: string; percentage: number; rawPercentage?: string; color: typeof sectionColors.skills }) {
  const displayPct = fmtPct(rawPercentage, percentage);
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-medium text-gray-700">{name}</span>
        <span className={`text-sm font-bold ${color.text}`}>{displayPct}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div
          className={`${color.bar} h-2.5 rounded-full transition-all duration-700`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value, accentColor }: { icon: React.ReactNode; label: string; value: string; accentColor?: string }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-base font-bold ${accentColor || 'text-gray-900'}`}>{value || 'N/A'}</p>
    </div>
  );
}

function EditableInfoCard({
  icon, label, value, accentColor, canEdit, onSave,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accentColor?: string;
  canEdit?: boolean;
  onSave?: (newValue: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function handleSave() {
    onSave?.(draft.trim());
    setEditing(false);
  }
  function handleCancel() {
    setDraft(value);
    setEditing(false);
  }

  // Keep draft in sync when value changes from parent (e.g. after save)
  React.useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
        </div>
        {canEdit && !editing && (
          <button
            onClick={() => { setDraft(value); setEditing(true); }}
            className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title={`Edit ${label}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        )}
      </div>
      {editing ? (
        <div className="mt-1">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={`Enter ${label.toLowerCase()}...`}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleSave}
              className="flex-1 text-xs font-semibold bg-blue-600 text-white rounded-md py-1 hover:bg-blue-700 transition-colors"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-md py-1 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className={`text-base font-bold ${accentColor || 'text-gray-900'}`}>{value || 'N/A'}</p>
      )}
    </div>
  );
}

export default function BrainographyDataDisplay({ data, canEdit, onUpdate }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Brainography Analysis</h3>
              <p className="text-sm text-white/60">AI-extracted insights from brainography report</p>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs text-white/50 uppercase tracking-widest">Extracted</p>
            <p className="text-sm font-semibold text-white/90">
              {new Date(data.extractedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Student Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <InfoCard
            icon={<svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
            label="Student Name"
            value={data.studentName}
            accentColor="text-blue-700"
          />
          <EditableInfoCard
            icon={<svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
            label="Standard"
            value={data.standard || ''}
            accentColor="text-violet-700"
            canEdit={canEdit}
            onSave={(v) => onUpdate?.('standard', v)}
          />
          {(canEdit || data.board) && (
            <EditableInfoCard
              icon={<svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
              label="Board"
              value={data.board || ''}
              accentColor="text-emerald-700"
              canEdit={canEdit}
              onSave={(v) => onUpdate?.('board', v)}
            />
          )}
          <InfoCard
            icon={<svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            label="Personality Type"
            value={data.personalityType}
            accentColor="text-rose-700"
          />
        </div>

        {/* Thinking Pattern */}
        {(data.thinkingPatternDetails && data.thinkingPatternDetails.length > 0) ? (
          <div className={`${sectionColors.thinking.bg} rounded-xl p-5 border ${sectionColors.thinking.border}`}>
            <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <div className={`w-8 h-8 ${sectionColors.thinking.light} rounded-lg flex items-center justify-center`}>
                <svg className={`w-4 h-4 ${sectionColors.thinking.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              Thinking Pattern
              {data.thinkingPattern && (
                <span className={`ml-2 text-xs font-semibold px-2.5 py-1 rounded-full ${sectionColors.thinking.badge}`}>
                  Dominant: {data.thinkingPattern}
                </span>
              )}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
              {data.thinkingPatternDetails.map((tp) => (
                <PercentageBar key={tp.name} name={tp.name} percentage={tp.percentage} rawPercentage={tp.rawPercentage} color={sectionColors.thinking} />
              ))}
            </div>
          </div>
        ) : data.thinkingPattern ? (
          <div className={`${sectionColors.thinking.bg} rounded-xl p-5 border ${sectionColors.thinking.border}`}>
            <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
              <div className={`w-8 h-8 ${sectionColors.thinking.light} rounded-lg flex items-center justify-center`}>
                <svg className={`w-4 h-4 ${sectionColors.thinking.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              Thinking Pattern
            </h4>
            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${sectionColors.thinking.badge}`}>
              {data.thinkingPattern}
            </span>
          </div>
        ) : null}

        {/* Skills Section */}
        {data.highestSkills && data.highestSkills.length > 0 && (
          <div className={`${sectionColors.skills.bg} rounded-xl p-5 border ${sectionColors.skills.border}`}>
            <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <div className={`w-8 h-8 ${sectionColors.skills.light} rounded-lg flex items-center justify-center`}>
                <svg className={`w-4 h-4 ${sectionColors.skills.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              Skills Profile
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
              {data.highestSkills.map((skill) => (
                <PercentageBar key={skill.name} name={skill.name} percentage={skill.percentage} rawPercentage={skill.rawPercentage} color={sectionColors.skills} />
              ))}
            </div>
          </div>
        )}

        {/* Achievement Style & Learning Style - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {data.achievementStyle && data.achievementStyle.length > 0 && (
            <div className={`${sectionColors.achievement.bg} rounded-xl p-5 border ${sectionColors.achievement.border}`}>
              <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className={`w-8 h-8 ${sectionColors.achievement.light} rounded-lg flex items-center justify-center`}>
                  <svg className={`w-4 h-4 ${sectionColors.achievement.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                Achievement Style
              </h4>
              {data.achievementStyle.map((style) => (
                <PercentageBar key={style.name} name={style.name} percentage={style.percentage} rawPercentage={style.rawPercentage} color={sectionColors.achievement} />
              ))}
            </div>
          )}

          {data.learningCommunicationStyle && data.learningCommunicationStyle.length > 0 && (
            <div className={`${sectionColors.learning.bg} rounded-xl p-5 border ${sectionColors.learning.border}`}>
              <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className={`w-8 h-8 ${sectionColors.learning.light} rounded-lg flex items-center justify-center`}>
                  <svg className={`w-4 h-4 ${sectionColors.learning.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                Learning & Communication Style
              </h4>
              {data.learningCommunicationStyle.map((style) => (
                <PercentageBar key={style.name} name={style.name} percentage={style.percentage} rawPercentage={style.rawPercentage} color={sectionColors.learning} />
              ))}
            </div>
          )}
        </div>

        {/* Quotients — redesigned with larger circles and overflow-safe text */}
        {data.quotients && data.quotients.length > 0 && (
          <div className={`${sectionColors.quotients.bg} rounded-xl p-5 border ${sectionColors.quotients.border}`}>
            <h4 className="text-sm font-bold text-gray-900 mb-5 flex items-center gap-2">
              <div className={`w-8 h-8 ${sectionColors.quotients.light} rounded-lg flex items-center justify-center`}>
                <svg className={`w-4 h-4 ${sectionColors.quotients.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              Quotients
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {data.quotients.map((q, idx) => {
                const colorSet = quotientColors[idx % quotientColors.length];
                const displayPct = fmtPct(q.rawPercentage, q.percentage);
                const isLongValue = displayPct.length > 5;
                return (
                  <div key={q.name} className={`${colorSet.bg} rounded-xl p-4 text-center border ${colorSet.border} shadow-sm hover:shadow-md transition-shadow`}>
                    <div className="relative w-20 h-20 mx-auto mb-3">
                      <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="2.5"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke={colorSet.stroke}
                          strokeWidth="2.5"
                          strokeDasharray={`${Math.min(q.percentage, 100)}, 100`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`font-bold ${colorSet.text} ${isLongValue ? 'text-[10px] leading-tight' : 'text-xs'}`}>
                          {displayPct}%
                        </span>
                      </div>
                    </div>
                    <p className="text-xs font-bold text-gray-700 leading-tight">{q.name}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Career Goals */}
        {data.careerGoals && data.careerGoals.length > 0 && (
          <div className={`${sectionColors.career.bg} rounded-xl p-5 border ${sectionColors.career.border}`}>
            <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <div className={`w-8 h-8 ${sectionColors.career.light} rounded-lg flex items-center justify-center`}>
                <svg className={`w-4 h-4 ${sectionColors.career.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              Career Goals (A Key of Career)
            </h4>
            <div className="flex flex-wrap gap-2">
              {data.careerGoals.map((goal, idx) => (
                <span
                  key={idx}
                  className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${sectionColors.career.badge} shadow-sm`}
                >
                  {goal}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
