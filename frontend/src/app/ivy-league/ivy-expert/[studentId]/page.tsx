'use client';

import { Suspense, use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function IvyExpertStudentHubPage({ params }: { params: Promise<{ studentId: string }> }) {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
            <IvyExpertStudentHub params={params} />
        </Suspense>
    );
}

function IvyExpertStudentHub({ params }: { params: Promise<{ studentId: string }> }) {
    const resolvedParams = use(params); // Unwrap params in Next.js 15+
    const { studentId } = resolvedParams;
    const searchParams = useSearchParams();
    const serviceId = searchParams.get('serviceId');

    // We could fetch student details here again if needed, or trust the ID
    // For now, we build the hub.

    const queryString = `?studentId=${studentId}&studentIvyServiceId=${serviceId || ''}`;

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <Link href="/ivy-league/ivy-expert" className="text-indigo-600 hover:text-indigo-800 mb-4 inline-block">
                        ← Back to Student List
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">Student Management Hub</h1>
                    <p className="text-gray-600 mt-2">Managing Student ID: <span className="font-mono text-sm bg-gray-200 px-2 py-1 rounded">{studentId}</span></p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {/* Pointer 1: Academic Excellence */}
                    <Link href={`/ivy-league/ivy-expert/pointer1${queryString}`} className="block group">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-indigo-300 transition-all h-full relative overflow-hidden">
                            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 text-blue-600">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600">Academic Excellence</h2>
                            <p className="text-gray-600 text-sm">Review documents and evaluate marksheet performance.</p>
                        </div>
                    </Link>

                    {/* Pointer 2: Spike in One Area */}
                    <Link href={`/ivy-league/ivy-expert/activities${queryString}&pointerNo=2`} className="block group">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all h-full relative overflow-hidden">
                            <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4 text-blue-600">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600">Spike in One Area</h2>
                            <p className="text-gray-600 text-sm">Review activity suggestions and evaluate performance.</p>
                        </div>
                    </Link>

                    {/* Pointer 3: Leadership & Initiative */}
                    <Link href={`/ivy-league/ivy-expert/activities${queryString}&pointerNo=3`} className="block group">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-indigo-300 transition-all h-full relative overflow-hidden">
                            <div className="h-12 w-12 bg-indigo-50 rounded-lg flex items-center justify-center mb-4 text-indigo-600">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-indigo-600">Leadership & Initiative</h2>
                            <p className="text-gray-600 text-sm">Review activity suggestions and evaluate performance.</p>
                        </div>
                    </Link>

                    {/* Pointer 4: Global & Social Impact */}
                    <Link href={`/ivy-league/ivy-expert/activities${queryString}&pointerNo=4`} className="block group">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-purple-300 transition-all h-full relative overflow-hidden">
                            <div className="h-12 w-12 bg-purple-50 rounded-lg flex items-center justify-center mb-4 text-purple-600">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h.158a2.5 2.5 0 012.236 1.382l.842 1.684a1 1 0 00.894.553H20M13 4.108V5a3 3 0 003 3H20m-7-7a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-purple-600">Global & Social Impact</h2>
                            <p className="text-gray-600 text-sm">Review activity suggestions and evaluate performance.</p>
                        </div>
                    </Link>

                    {/* Essay */}
                    <Link href={`/ivy-league/ivy-expert/pointer5${queryString}`} className="block group">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-indigo-300 transition-all h-full relative overflow-hidden">
                            <div className="h-12 w-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4 text-pink-600">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-pink-600">Authentic & Reflective Storytelling</h2>
                            <p className="text-gray-600 text-sm">Upload guidelines and evaluate the student's essay.</p>
                        </div>
                    </Link>

                    {/* Courses */}
                    <Link href={`/ivy-league/ivy-expert/pointer6${queryString}`} className="block group">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-indigo-300 transition-all h-full relative overflow-hidden">
                            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4 text-orange-600">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-orange-600">Engagement with Learning & Intellectual Curiosity</h2>
                            <p className="text-gray-600 text-sm">Upload course list and evaluate certificates.</p>
                        </div>
                    </Link>

                    {/* Review Score */}
                    <Link href={`/ivy-league/ivy-expert/ivy-score${queryString}`} className="block group">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-indigo-300 transition-all h-full relative overflow-hidden">
                            <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4 text-yellow-600">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-yellow-600">Ivy Score</h2>
                            <p className="text-gray-600 text-sm">Review overall readiness score and pointer breakdown.</p>
                        </div>
                    </Link>

                </div>
            </div>
        </div>
    );
}
