'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
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

export default function ParentIvyScoreDashboardPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
            <ParentIvyScoreDashboard />
        </Suspense>
    );
}

function ParentIvyScoreDashboard() {
    const searchParams = useSearchParams();
    const [scoreData, setScoreData] = useState<IvyScoreData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const studentId = searchParams.get('studentId') || '';

    useEffect(() => {
        fetchIvyScore();
    }, []);

    const fetchIvyScore = async () => {
        try {
            setLoading(true);
            const response = await axios.get(
                `${IVY_API_URL}/ivy-score/${studentId}`
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

    const getScoreColor = (score: number, maxScore: number): string => {
        const percentage = (score / maxScore) * 100;
        if (percentage >= 80) return 'bg-green-500';
        if (percentage >= 60) return 'bg-blue-500';
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

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading score data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
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
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
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
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-3">
                        Your Child&apos;s Ivy League Readiness
                    </h1>
                    <p className="text-lg text-gray-600">
                        Monitor progress across all 6 key admission pointers
                    </p>
                </div>

                {/* Overall Score Card */}
                <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl shadow-2xl p-8 mb-8 text-white">
                    <div className="text-center">
                        <p className="text-indigo-200 text-sm font-medium uppercase tracking-wide mb-2">
                            Overall Ivy Score
                        </p>
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <span className="text-7xl font-bold">{scoreData.overallScore.toFixed(1)}</span>
                            <span className="text-3xl text-indigo-200">/ {totalMaxScore}</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="max-w-2xl mx-auto mb-4">
                            <div className="h-4 bg-indigo-800/30 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-yellow-400 to-green-400 rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${overallPercentage}%` }}
                                ></div>
                            </div>
                        </div>

                        <p className="text-xl font-semibold text-indigo-100">
                            {getScoreGrade(scoreData.overallScore, totalMaxScore)}
                        </p>
                        <p className="text-sm text-indigo-200 mt-2">
                            Last updated: {new Date(scoreData.generatedAt).toLocaleDateString()}
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
                                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-indigo-200"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 font-bold">
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

                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        {getScoreGrade(pointer.score, pointer.maxScore)}
                                    </span>
                                    <span className="text-sm font-medium text-indigo-600">
                                        {percentage.toFixed(0)}%
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Info Footer */}
                <div className="mt-12 bg-blue-50 border border-blue-200 rounded-2xl p-6">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h4 className="font-semibold text-blue-900 mb-1">About This Score</h4>
                            <p className="text-sm text-blue-800">
                                Each pointer is scored on a scale of 0-10. The overall score is the sum of all 6 pointers (maximum 60 points).
                                Scores are automatically updated when the Ivy Expert evaluates your child&apos;s submissions. This dashboard provides
                                real-time visibility into your child&apos;s Ivy League preparation progress.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
