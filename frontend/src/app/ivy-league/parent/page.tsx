'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function ParentDashboardPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div></div>}>
            <ParentDashboard />
        </Suspense>
    );
}

function ParentDashboard() {
    const searchParams = useSearchParams();
    const studentId = searchParams.get('studentId') || '';
    const queryString = `?studentId=${studentId}`;

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Parent Overview</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Link href={`/ivy-league/parent/ivy-score${queryString}`} className="block group">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-brand-300 transition-all h-full">
                            <div className="h-12 w-12 bg-brand-100 rounded-lg flex items-center justify-center mb-4 text-brand-600">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-brand-600">Readiness Score</h2>
                            <p className="text-gray-600 text-sm">View your child's overall Ivy League readiness score.</p>
                        </div>
                    </Link>

                    <Link href={`/ivy-league/parent/activities${queryString}`} className="block group">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-brand-300 transition-all h-full">
                            <div className="h-12 w-12 bg-brand-100 rounded-lg flex items-center justify-center mb-4 text-brand-600">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-brand-600">Activities Progress</h2>
                            <p className="text-gray-600 text-sm">Monitor progress on Pointers 2, 3, and 4.</p>
                        </div>
                    </Link>

                    <Link href={`/ivy-league/parent/pointer5${queryString}`} className="block group">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-brand-300 transition-all h-full">
                            <div className="h-12 w-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4 text-pink-600">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-pink-600">Essay & Courses</h2>
                            <p className="text-gray-600 text-sm">Check status of Essay (P5) and Course work (P6).</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
