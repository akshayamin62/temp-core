'use client';

import { useEffect, useState, Suspense } from 'react';
import axios from 'axios';
import { useSearchParams } from 'next/navigation';
import { IVY_API_URL } from '@/lib/ivyApi';

interface PointerScore {
    pointerNo: number;
    score: number;
    maxScore: number;
}

interface IvyScoreData {
    studentIvyServiceId: string;
    pointerScores: PointerScore[];
    overallScore: number;
    generatedAt: string;
}

const pointerNames: { [key: number]: string } = {
    1: 'Academic Excellence',
    2: 'Spike in One Area',
    3: 'Leadership Initiative',
    4: 'Global Social Impact',
    5: 'Authentic Storytelling',
    6: 'Intellectual Curiosity',
};

const pointerDescriptions: { [key: number]: string } = {
    1: 'GPA, test scores, and course rigor',
    2: 'Deep expertise in a specific field',
    3: 'Leadership roles and demonstrated impact',
    4: 'Community service and social contributions',
    5: 'Essay writing and personal narrative',
    6: 'Research and learning beyond curriculum',
};

function IvyExpertIvyScoreDashboard() {
    const searchParams = useSearchParams();
    const [scoreData, setScoreData] = useState<IvyScoreData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [recalculating, setRecalculating] = useState(false);

    const studentId = searchParams.get('studentId');
    const studentIvyServiceId = searchParams.get('studentIvyServiceId');

    useEffect(() => {
        if (studentId) {
            fetchIvyScore();
        } else {
            setError('Student ID is required');
            setLoading(false);
        }
    }, [studentId]);

    const fetchIvyScore = async () => {
        try {
            setLoading(true);
            const response = await axios.get(
                `${IVY_API_URL}/ivy-score/${studentId}`,
                { params: { studentIvyServiceId } }
            );

            if (response.data.success) {
                setScoreData(response.data.data);
            } else {
                setError('Failed to load score data');
            }
        } catch (err: any) {
            console.error('Error fetching Ivy score:', err);
            setError(err.response?.data?.message || 'Failed to load Ivy score');
        } finally {
            setLoading(false);
        }
    };

    const handleRecalculate = async () => {
        try {
            setRecalculating(true);
            const response = await axios.post(
                `${IVY_API_URL}/ivy-score/recalculate/${studentId}`,
                null,
                { params: { studentIvyServiceId } }
            );

            if (response.data.success) {
                setScoreData(response.data.data);
            }
        } catch (err: any) {
            console.error('Error recalculating score:', err);
            alert('Failed to recalculate score');
        } finally {
            setRecalculating(false);
        }
    };

    const getScoreColor = (score: number, maxScore: number): string => {
        const percentage = (score / maxScore) * 100;
        if (percentage >= 80) return 'bg-green-500';
        if (percentage >= 60) return 'bg-brand-500';
        if (percentage >= 40) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const getScoreGrade = (score: number, maxScore: number): string => {
        const percentage = (score / maxScore) * 100;
        if (percentage >= 90) return 'Excellent';
        if (percentage >= 80) return 'Very Good';
        if (percentage >= 70) return 'Good';
        if (percentage >= 60) return 'Fair';
        return 'Needs Improvement';
    };

    const getRecommendation = (score: number, maxScore: number): string => {
        const percentage = (score / maxScore) * 100;
        if (percentage >= 80) return 'Maintain current performance';
        if (percentage >= 60) return 'Focus on improvement strategies';
        if (percentage >= 40) return 'Requires significant attention';
        return 'Critical - immediate intervention needed';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-brand-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-brand-600 border-r-transparent"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading student score...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-brand-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
                    <div className="text-center">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Score</h3>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <button
                            onClick={fetchIvyScore}
                            className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!scoreData) {
        return null;
    }

    const totalMaxScore = 60;
    const overallPercentage = (scoreData.overallScore / totalMaxScore) * 100;

    return (
        <div className="min-h-screen bg-brand-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header with Actions */}
                <div className="flex items-center justify-between mb-12">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-3">
                            Student Ivy League Score
                        </h1>
                        <p className="text-lg text-gray-600">
                            Comprehensive evaluation across all 6 admission pointers
                        </p>
                    </div>
                    <button
                        onClick={handleRecalculate}
                        disabled={recalculating}
                        className="px-6 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {recalculating ? (
                            <>
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                                Recalculating...
                            </>
                        ) : (
                            <>
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Recalculate
                            </>
                        )}
                    </button>
                </div>

                {/* Overall Score Card */}
                <div className="bg-brand-600 rounded-3xl shadow-2xl p-8 mb-8 text-white">
                    <div className="text-center">
                        <p className="text-brand-200 text-sm font-medium uppercase tracking-wide mb-2">
                            Overall Ivy Score
                        </p>
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <span className="text-7xl font-bold">{scoreData.overallScore.toFixed(1)}</span>
                            <span className="text-3xl text-brand-200">/ {totalMaxScore}</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="max-w-2xl mx-auto mb-4">
                            <div className="h-4 bg-brand-800/30 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-yellow-400 to-green-400 rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${overallPercentage}%` }}
                                ></div>
                            </div>
                        </div>

                        <p className="text-xl font-semibold text-brand-100">
                            {getScoreGrade(scoreData.overallScore, totalMaxScore)}
                        </p>
                        <p className="text-sm text-brand-200 mt-2">
                            Last updated: {new Date(scoreData.generatedAt).toLocaleDateString()} at{' '}
                            {new Date(scoreData.generatedAt).toLocaleTimeString()}
                        </p>
                    </div>
                </div>

                {/* Individual Pointer Scores */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {scoreData.pointerScores.map((pointer) => {
                        const percentage = (pointer.score / pointer.maxScore) * 100;
                        const colorClass = getScoreColor(pointer.score, pointer.maxScore);

                        return (
                            <div
                                key={pointer.pointerNo}
                                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-brand-200"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-100 text-brand-600 font-bold">
                                            {pointer.pointerNo}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-lg leading-tight">
                                                {pointerNames[pointer.pointerNo]}
                                            </h3>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-600 mb-4">
                                    {pointerDescriptions[pointer.pointerNo]}
                                </p>

                                <div className="mb-3">
                                    <div className="flex items-baseline justify-between mb-2">
                                        <span className="text-3xl font-bold text-gray-900">
                                            {pointer.score.toFixed(1)}
                                        </span>
                                        <span className="text-sm text-gray-500">
                                            / {pointer.maxScore}
                                        </span>
                                    </div>

                                    <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${colorClass} rounded-full transition-all duration-700 ease-out`}
                                            style={{ width: `${percentage}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                            {getScoreGrade(pointer.score, pointer.maxScore)}
                                        </span>
                                        <span className="text-sm font-medium text-brand-600">
                                            {percentage.toFixed(0)}%
                                        </span>
                                    </div>

                                    {/* Ivy Expert Recommendation */}
                                    <div className="pt-2 border-t border-gray-100">
                                        <p className="text-xs text-gray-600 italic">
                                            💡 {getRecommendation(pointer.score, pointer.maxScore)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Ivy Expert Notes */}
                <div className="mt-12 bg-amber-50 border border-amber-200 rounded-2xl p-6">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                            <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <h4 className="font-semibold text-amber-900 mb-1">Ivy Expert Notes</h4>
                            <p className="text-sm text-amber-800">
                                Scores are automatically updated when you submit evaluations. Use the &quot;Recalculate&quot; button to manually
                                refresh if needed. Focus on pointers with lower scores to improve overall readiness. Each pointer contributes
                                equally to the total score (max 10 points each).
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function IvyScorePage() {
    return (
        <Suspense fallback={<div className="p-12 text-center text-gray-500">Loading...</div>}>
            <IvyExpertIvyScoreDashboard />
        </Suspense>
    );
}
