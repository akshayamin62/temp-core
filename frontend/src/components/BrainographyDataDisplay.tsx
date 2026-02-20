'use client';

import React from 'react';

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
}

/** Format a percentage value for display — prevents double "%%" */
function fmtPct(rawPercentage?: string, percentage?: number): string {
  const raw = rawPercentage || String(percentage ?? 0);
  return raw.replace(/%$/, '');
}

function PercentageBar({ name, percentage, rawPercentage }: { name: string; percentage: number; rawPercentage?: string }) {
  const displayPct = fmtPct(rawPercentage, percentage);
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{name}</span>
        <span className="text-sm font-semibold text-teal-700">{displayPct}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className="bg-teal-500 h-2 rounded-full transition-all duration-700"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-base font-semibold text-gray-900">{value || 'N/A'}</p>
    </div>
  );
}

export default function BrainographyDataDisplay({ data }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-teal-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Brainography Analysis</h3>
              <p className="text-sm text-white/80">AI-extracted insights from brainography report</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/70">Extracted on</p>
            <p className="text-sm font-medium text-white">
              {new Date(data.extractedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Student Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoCard
            icon={<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
            label="Student Name"
            value={data.studentName}
          />
          <InfoCard
            icon={<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
            label="Standard"
            value={data.standard}
          />
          {data.board && (
            <InfoCard
              icon={<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
              label="Board"
              value={data.board}
            />
          )}
          <InfoCard
            icon={<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            label="Personality Type"
            value={data.personalityType}
          />
        </div>

        {/* Thinking Pattern (with both percentages) */}
        {(data.thinkingPatternDetails && data.thinkingPatternDetails.length > 0) ? (
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Thinking Pattern
              {data.thinkingPattern && (
                <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                  Dominant: {data.thinkingPattern}
                </span>
              )}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
              {data.thinkingPatternDetails.map((tp) => (
                <PercentageBar key={tp.name} name={tp.name} percentage={tp.percentage} rawPercentage={tp.rawPercentage} />
              ))}
            </div>
          </div>
        ) : data.thinkingPattern ? (
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Thinking Pattern
            </h4>
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-teal-50 text-teal-800 border border-teal-200">
              {data.thinkingPattern}
            </span>
          </div>
        ) : null}

        {/* Skills Section */}
        {data.highestSkills && data.highestSkills.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Skills Profile
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
              {data.highestSkills.map((skill) => (
                <PercentageBar key={skill.name} name={skill.name} percentage={skill.percentage} rawPercentage={skill.rawPercentage} />
              ))}
            </div>
          </div>
        )}

        {/* Achievement Style & Learning Style - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Achievement Style */}
          {data.achievementStyle && data.achievementStyle.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Achievement Style
              </h4>
              {data.achievementStyle.map((style) => (
                <PercentageBar key={style.name} name={style.name} percentage={style.percentage} rawPercentage={style.rawPercentage} />
              ))}
            </div>
          )}

          {/* Learning & Communication Style */}
          {data.learningCommunicationStyle && data.learningCommunicationStyle.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Learning & Communication Style
              </h4>
              {data.learningCommunicationStyle.map((style) => (
                <PercentageBar key={style.name} name={style.name} percentage={style.percentage} rawPercentage={style.rawPercentage} />
              ))}
            </div>
          )}
        </div>

        {/* Quotients */}
        {data.quotients && data.quotients.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Quotients
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {data.quotients.map((q) => (
                <div key={q.name} className="bg-white rounded-lg p-4 text-center border border-gray-200">
                  <div className="relative w-14 h-14 mx-auto mb-2">
                    <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="3"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#0d9488"
                        strokeWidth="3"
                        strokeDasharray={`${q.percentage}, 100`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-teal-700">{fmtPct(q.rawPercentage, q.percentage)}%</span>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-gray-700">{q.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Career Goals */}
        {data.careerGoals && data.careerGoals.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Career Goals (A Key of Career)
            </h4>
            <div className="flex flex-wrap gap-2">
              {data.careerGoals.map((goal, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-teal-50 text-teal-800 border border-teal-200"
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
