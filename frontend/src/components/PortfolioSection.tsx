'use client';

import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { BrainographyDataType } from '@/components/BrainographyDataDisplay';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface PortfolioItem {
  _id: string;
  reportType: 'career' | 'development';
  selectedCareerGoals: string[];
  status: 'pending' | 'generating' | 'completed' | 'failed';
  fileName?: string;
  fileSize?: number;
  generatedAt?: string;
  generationError?: string;
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
  const [generatingCareer, setGeneratingCareer] = useState(false);
  const [generatingDev, setGeneratingDev] = useState(false);

  const careerGoals = brainographyData?.careerGoals || [];

  const toggleGoal = (goal: string) => {
    setSelectedGoals(prev => {
      if (prev.includes(goal)) return prev.filter(g => g !== goal);
      if (prev.length >= 2) {
        toast.error('You can select a maximum of 2 career goals');
        return prev;
      }
      return [...prev, goal];
    });
  };

  const handleGenerate = async (reportType: 'career' | 'development') => {
    if (selectedGoals.length === 0) {
      toast.error('Please select at least 1 career goal');
      return;
    }
    const setLoading = reportType === 'career' ? setGeneratingCareer : setGeneratingDev;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/portfolio/${registrationId}/generate`,
        { reportType, selectedCareerGoals: selectedGoals },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`${reportType === 'career' ? 'Career' : 'Development'} report generated successfully!`);
      onPortfoliosChange();
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to generate ${reportType} report`);
    } finally {
      setLoading(false);
    }
  };

  // Skip rendering if no brainography data extracted yet
  if (!brainographyData?._id) return null;

  // On coach side (allowGenerate=false), don't render anything — BrainographyDataDisplay handles display
  if (!allowGenerate) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-blue-700 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Education Portfolio Generator</h3>
            <p className="text-sm text-white/80">Select career goals and generate your personalized reports</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Career Goal Selection */}
        {careerGoals.length > 0 ? (
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Select Career Goals (Max 2)
            </h4>
            <p className="text-xs text-gray-500 mb-4">Choose up to 2 career goals for your personalized report generation</p>

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
            <p className="text-xs text-amber-600 mt-1">Ask your Eduplan Coach to re-extract the data from the PDF</p>
          </div>
        )}

        {/* Generate Buttons */}
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => handleGenerate('career')}
            disabled={generatingCareer || selectedGoals.length === 0}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all ${
              generatingCareer || selectedGoals.length === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
            }`}
          >
            {generatingCareer ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Generating Career Report...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Generate Career Report
              </>
            )}
          </button>

          <button
            onClick={() => handleGenerate('development')}
            disabled={generatingDev || selectedGoals.length === 0}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all ${
              generatingDev || selectedGoals.length === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm'
            }`}
          >
            {generatingDev ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Generating Development Report...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Generate Development Report
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Standalone row component for a single portfolio/report entry – used in brainography report section */
export function PortfolioRow({ portfolio, onDownload }: { portfolio: PortfolioItem; onDownload: (p: PortfolioItem) => void }) {
  const statusConfig = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
    generating: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Generating...' },
    completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
    failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' },
  };
  const st = statusConfig[portfolio.status];

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">
            {portfolio.reportType === 'career' ? 'Career Report' : 'Development Report'}
          </p>
          <p className="text-xs text-gray-500">
            Goals: {portfolio.selectedCareerGoals.join(', ')}
            {portfolio.generatedAt && (
              <> | {new Date(portfolio.generatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</>
            )}
            {portfolio.fileSize && <> | {(portfolio.fileSize / 1024).toFixed(1)} KB</>}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.text}`}>
          {st.label}
        </span>
        {portfolio.status === 'completed' && (
          <button
            onClick={() => onDownload(portfolio)}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
          >
            Download
          </button>
        )}
        {portfolio.status === 'failed' && portfolio.generationError && (
          <span className="text-xs text-red-500 max-w-xs truncate" title={portfolio.generationError}>
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
