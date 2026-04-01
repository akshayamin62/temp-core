'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { BrainographyDataType } from '@/components/BrainographyDataDisplay';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface PortfolioItem {
  _id: string;
  reportType: 'career' | 'development';
  selectedCareerGoals: string[];
  topicLabel?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  fileName?: string;
  fileSize?: number;
  generatedAt?: string;
  generationError?: string;
}

interface ReportLimit {
  maxTopics: number;
  usedTopics: number;
  topics: string[];
}

interface Props {
  registrationId: string;
  brainographyData: BrainographyDataType;
  portfolios: PortfolioItem[];
  onPortfoliosChange: () => void;
  /** If false, hide career selection & generate buttons (for Eduplan Coach view) */
  allowGenerate?: boolean;
}

export default function PortfolioSection({
  registrationId,
  brainographyData,
  portfolios,
  onPortfoliosChange,
  allowGenerate = true,
}: Props) {
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<{ step: string; pct: number } | null>(null);
  const [reportLimit, setReportLimit] = useState<ReportLimit | null>(null);

  const careerGoals = brainographyData?.careerGoals || [];

  // Fetch report limit
  const fetchReportLimit = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/portfolio/${registrationId}/report-limit`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReportLimit(res.data.data);
    } catch {
      // silent
    }
  }, [registrationId]);

  useEffect(() => {
    fetchReportLimit();
  }, [fetchReportLimit, portfolios]);

  const toggleGoal = (goal: string) => {
    // Unchecking is always allowed
    if (selectedGoals.includes(goal)) {
      setSelectedGoals((prev) => prev.filter((g) => g !== goal));
      return;
    }

    // Work out what the selection would look like after adding this goal
    const newSelection = [...selectedGoals, goal];
    const newTopicLabel = newSelection.slice().sort().join(', ');
    const isExistingTopic = reportLimit?.topics.includes(newTopicLabel) ?? false;

    // If this would re-generate an already-existing topic, always allow
    if (isExistingTopic) {
      setSelectedGoals(newSelection);
      return;
    }

    // Cap to remaining topic slots (max 2 hard-cap)
    const remaining = reportLimit ? reportLimit.maxTopics - reportLimit.usedTopics : 2;
    const maxGoals = Math.min(remaining, 2);

    if (newSelection.length > maxGoals) {
      if (maxGoals === 0) {
        toast.error('Report limit reached. You cannot generate new topics.');
      } else {
        toast.error(
          `You can select at most ${maxGoals} career goal${maxGoals !== 1 ? 's' : ''} (${remaining} topic slot${remaining !== 1 ? 's' : ''} remaining).`,
        );
      }
      return;
    }

    setSelectedGoals(newSelection);
  };

  const canGenerate = (() => {
    if (selectedGoals.length === 0) return false;
    if (!reportLimit) return true;
    const topicLabel = selectedGoals.slice().sort().join(', ');
    const isExisting = reportLimit.topics.includes(topicLabel);
    if (isExisting) return true; // Re-generate existing topic
    return reportLimit.usedTopics < reportLimit.maxTopics;
  })();

  const handleGenerate = async () => {
    if (selectedGoals.length === 0) {
      toast.error('Please select at least 1 career goal');
      return;
    }
    setGenerating(true);
    setProgress({ step: 'Starting report generation...', pct: 5 });
    try {
      const token = localStorage.getItem('token');

      // Simulate progress during the long API call
      const progressSteps = [
        { step: 'Generating Career Report (Section 1/6)...', pct: 10 },
        { step: 'Generating Career Report (Section 3/6)...', pct: 25 },
        { step: 'Generating Career Report (Section 5/6)...', pct: 40 },
        { step: 'Generating Development Report (Section 1/7)...', pct: 50 },
        { step: 'Generating Development Report (Section 3/7)...', pct: 65 },
        { step: 'Generating Development Report (Section 5/7)...', pct: 75 },
        { step: 'Building DOCX documents...', pct: 85 },
        { step: 'Almost done...', pct: 92 },
      ];
      let stepIdx = 0;
      const interval = setInterval(() => {
        if (stepIdx < progressSteps.length) {
          setProgress(progressSteps[stepIdx]);
          stepIdx++;
        }
      }, 12000);

      await axios.post(
        `${API_URL}/portfolio/${registrationId}/generate`,
        { selectedCareerGoals: selectedGoals },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      clearInterval(interval);
      setProgress({ step: 'Reports generated successfully!', pct: 100 });
      toast.success('Career & Development reports generated successfully!');
      onPortfoliosChange();
      fetchReportLimit();

      setTimeout(() => setProgress(null), 2000);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate reports');
      setProgress(null);
    } finally {
      setGenerating(false);
    }
  };

  // Skip rendering if no brainography data extracted yet
  if (!brainographyData?._id) return null;

  // On coach side (allowGenerate=false), don't render — BrainographyDataDisplay handles display
  if (!allowGenerate) return null;

  const remainingTopics = reportLimit ? reportLimit.maxTopics - reportLimit.usedTopics : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Education Portfolio Generator</h3>
              <p className="text-sm text-white/80">Select career goals and generate both Career & Development reports</p>
            </div>
          </div>
          {reportLimit && (
            <div className="text-right">
              <div className="flex items-center gap-1.5">
                {Array.from({ length: reportLimit.maxTopics }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full ${i < reportLimit.usedTopics ? 'bg-emerald-400' : 'bg-white/30'}`}
                  />
                ))}
              </div>
              <p className="text-xs text-white/70 mt-1">
                {reportLimit.usedTopics}/{reportLimit.maxTopics} topics used
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Limit info banner */}
        {reportLimit && remainingTopics !== null && remainingTopics <= 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.832c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-orange-800">Report limit reached</p>
              <p className="text-xs text-orange-600 mt-0.5">
                You&apos;ve used all {reportLimit.maxTopics} topic(s). Contact your admin to increase the limit.
              </p>
            </div>
          </div>
        )}

        {/* Career Goal Selection */}
        {careerGoals.length > 0 ? (
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Select Career Goals (Max {reportLimit?.maxTopics ?? 2})
            </h4>
            <p className="text-xs text-gray-500 mb-4">
              {remainingTopics !== null && remainingTopics > 0 ? (
                <>You can generate <strong>{remainingTopics}</strong> more topic set{remainingTopics !== 1 ? 's' : ''}. One click generates <strong>both</strong> Career &amp; Development reports.</>
              ) : remainingTopics === 0 ? (
                <>You have used all <strong>{reportLimit?.maxTopics}</strong> topic slot{(reportLimit?.maxTopics ?? 1) !== 1 ? 's' : ''}. You can still re-generate existing topics.</>
              ) : (
                <>Choose up to <strong>{reportLimit?.maxTopics ?? 2}</strong> career goals. One click generates <strong>both</strong> Career &amp; Development reports.</>
              )}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {careerGoals.map((goal) => {
                const isSelected = selectedGoals.includes(goal);
                return (
                  <label
                    key={goal}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleGoal(goal)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className={`text-sm font-medium ${isSelected ? 'text-blue-800' : 'text-gray-700'}`}>
                      {goal}
                    </span>
                  </label>
                );
              })}
            </div>

            {selectedGoals.length > 0 && (
              <div className="mt-4 flex items-center gap-2 text-sm text-blue-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Selected: {selectedGoals.join(', ')}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-amber-50 rounded-xl p-5 border border-amber-200 text-center">
            <svg className="w-8 h-8 mx-auto mb-2 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.832c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-sm text-amber-800 font-medium">No career goals extracted from brainography report</p>
          </div>
        )}

        {/* Progress bar */}
        {progress && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-800">{progress.step}</span>
              <span className="text-sm font-bold text-blue-700">{progress.pct}%</span>
            </div>
            <div className="w-full bg-blue-100 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Single Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={generating || !canGenerate}
          className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold text-base transition-all ${
            generating || !canGenerate
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
          }`}
        >
          {generating ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating Career & Development Reports...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate Career & Development Reports
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/** Standalone row component for a single portfolio/report entry */
export function PortfolioRow({ portfolio, onDownload }: { portfolio: PortfolioItem; onDownload: (p: PortfolioItem) => void }) {
  const statusConfig = {
    pending: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Pending', dot: 'bg-amber-400' },
    generating: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Generating...', dot: 'bg-blue-400' },
    completed: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Completed', dot: 'bg-emerald-400' },
    failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed', dot: 'bg-red-400' },
  };
  const st = statusConfig[portfolio.status];
  const isCareer = portfolio.reportType === 'career';

  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border ${isCareer ? 'bg-blue-50/50 border-blue-200' : 'bg-emerald-50/50 border-emerald-200'}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isCareer ? 'bg-blue-100' : 'bg-emerald-100'}`}>
          <svg className={`w-4 h-4 ${isCareer ? 'text-blue-600' : 'text-emerald-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            {isCareer ? 'Career Report' : 'Development Report'}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {portfolio.selectedCareerGoals.join(', ')}
            {portfolio.generatedAt && (
              <> &middot; {new Date(portfolio.generatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</>
            )}
            {portfolio.fileSize ? <> &middot; {(portfolio.fileSize / 1024).toFixed(1)} KB</> : null}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${st.bg} ${st.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
          {st.label}
        </span>
        {portfolio.status === 'completed' && (
          <button
            onClick={() => onDownload(portfolio)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
        )}
        {portfolio.status === 'failed' && portfolio.generationError && (
          <span className="text-xs text-red-500 max-w-[120px] truncate" title={portfolio.generationError}>
            {portfolio.generationError}
          </span>
        )}
      </div>
    </div>
  );
}

/** Helper hook for portfolio download logic */
export function usePortfolioDownload() {
  const handleDownload = async (portfolio: PortfolioItem) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/portfolio/download/${portfolio._id}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', portfolio.fileName || `${portfolio.reportType}_report.docx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download report');
    }
  };
  return handleDownload;
}
