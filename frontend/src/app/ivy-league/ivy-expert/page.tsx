'use client';

import { Suspense, useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { IVY_API_URL } from '@/lib/ivyApi';

interface StudentService {
    _id: string; // The Service ID
    studentId: {
        _id: string;      // Student document _id
        userId?: string;  // User document _id
        firstName: string; // Populated
        lastName: string; // Populated
        email: string; // Populated
    };
    status: string;
    createdAt: string;
}

interface IvyCandidate {
    _id: string;
    userId: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    schoolName: string;
    curriculum: string;
    currentGrade: string;
    parentFirstName: string;
    parentLastName: string;
    parentEmail: string;
    parentMobile: string;
    testStatus: string;
    totalScore: number | null;
    maxScore: number;
    completedSections: number;
    createdAt: string;
}

interface IvyStudentItem {
    userId: string;
    studentId: string;
    studentIvyServiceId: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    schoolName: string;
    curriculum: string;
    currentGrade: string;
    createdAt: string;
}

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

interface AcademicExcellenceScore {
    finalScore: number;
    documentAvg: number;
    weightedScoreSum: number;
    evaluatedDocsCount: number;
    informalSectionsWithScores: number;
}

interface Pointer5Score {
    score: number;
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
    1: 'GPA, test scores,olympiad and projects',
    2: 'Deep expertise in a chosen field',
    3: 'Leadership roles and demonstrated impact',
    4: 'Community service and social contributions',
    5: 'Essay/Profile writing and personal narrative',
    6: 'Research and learning beyond curriculum',
};

const pointerWeightages: { [key: number]: number } = {
    1: 0.30, // 30%
    2: 0.20, // 20%
    3: 0.15, // 15%
    4: 0.10, // 10%
    5: 0.15, // 15%
    6: 0.10, // 10%
};

export default function IvyExpertDashboardPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div></div>}>
            <IvyExpertDashboard />
        </Suspense>
    );
}

function IvyExpertDashboard() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const selectedStudentId = searchParams.get('studentId');
    const userIdForProfile = searchParams.get('userId'); // User._id for candidate-profile
    const studentIvyServiceId = searchParams.get('studentIvyServiceId');

    const [students, setStudents] = useState<StudentService[]>([]);
    const [myCandidates, setMyCandidates] = useState<IvyCandidate[]>([]);
    const [myStudents, setMyStudents] = useState<IvyStudentItem[]>([]);
    const [scoreData, setScoreData] = useState<IvyScoreData | null>(null);
    const [academicScore, setAcademicScore] = useState<AcademicExcellenceScore | null>(null);
    const [pointer5Score, setPointer5Score] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [scoreLoading, setScoreLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scoreError, setScoreError] = useState<string | null>(null);
    const [candidateSearch, setCandidateSearch] = useState('');
    const [studentSearch, setStudentSearch] = useState('');

    // TODO: Replace with logged-in user context
    // ivyExpertId is no longer needed — backend resolves it from JWT

    useEffect(() => {
        // If studentId is already provided (e.g. super admin navigating from view details),
        // skip fetching the student list since /my-students requires IVY_EXPERT role
        if (selectedStudentId) {
            setLoading(false);
            return;
        }

        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                // Fetch both candidates and students assigned to this ivy expert
                const [candidatesRes, studentsRes, serviceStudentsRes] = await Promise.all([
                    axios.get(`${IVY_API_URL}/ivy-expert-candidates/my-candidates`),
                    axios.get(`${IVY_API_URL}/ivy-expert-candidates/my-ivy-students`),
                    axios.get(`${IVY_API_URL}/ivy-service/my-students`),
                ]);

                if (candidatesRes.data.success) {
                    setMyCandidates(candidatesRes.data.candidates);
                }
                if (studentsRes.data.success) {
                    setMyStudents(studentsRes.data.students);
                }
                if (serviceStudentsRes.data.success) {
                    setStudents(serviceStudentsRes.data.data);
                }
            } catch (err: any) {
                console.error('Error fetching dashboard data:', err);
                setError('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [selectedStudentId]);

    useEffect(() => {
        if (selectedStudentId && studentIvyServiceId) {
            fetchIvyScore();
            fetchAcademicScore();
            fetchPointer5Score();
        }
    }, [selectedStudentId, studentIvyServiceId]);

    const fetchAcademicScore = async () => {
        if (!selectedStudentId || !studentIvyServiceId) return;
        try {
            const response = await axios.get(
                `${IVY_API_URL}/pointer1/academic/score/${selectedStudentId}`,
                { params: { studentIvyServiceId } }
            );
            if (response.data.success) {
                setAcademicScore(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching academic score:', error);
        }
    };

    const fetchPointer5Score = async () => {
        if (!studentIvyServiceId) return;
        try {
            const response = await axios.get(
                `${IVY_API_URL}/pointer5/score/${studentIvyServiceId}`
            );
            if (response.data.success) {
                setPointer5Score(response.data.data.score);
            }
        } catch (error) {
            console.error('Error fetching Pointer 5 score:', error);
        }
    };

    const fetchIvyScore = async () => {
        try {
            setScoreLoading(true);
            setScoreError(null);
            const response = await axios.get(
                `${IVY_API_URL}/ivy-score/${selectedStudentId}`,
                { params: { studentIvyServiceId } }
            );

            if (response.data.success) {
                setScoreData(response.data.data);
            } else {
                setScoreError('Failed to load score data');
            }
        } catch (err: any) {
            console.error('Error fetching Ivy score:', err);
            setScoreError(err.response?.data?.message || 'Failed to load Ivy score');
        } finally {
            setScoreLoading(false);
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

    const handlePointerClick = (pointerNo: number) => {
        const queryParams = new URLSearchParams();
        if (selectedStudentId) queryParams.set('studentId', selectedStudentId);
        if (studentIvyServiceId) queryParams.set('studentIvyServiceId', studentIvyServiceId);

        if (pointerNo === 1) {
            router.push(`/ivy-league/ivy-expert/pointer1?${queryParams.toString()}`);
        } else if (pointerNo === 5) {
            router.push(`/ivy-league/ivy-expert/pointer5?${queryParams.toString()}`);
        } else if (pointerNo === 6) {
            router.push(`/ivy-league/ivy-expert/pointer6?${queryParams.toString()}`);
        } else if ([2, 3, 4].includes(pointerNo)) {
            router.push(`/ivy-league/ivy-expert/activities?pointerNo=${pointerNo}&${queryParams.toString()}`);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading students...</div>;
    if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

    // If a student is selected, show the Ivy Score dashboard
    if (selectedStudentId && studentIvyServiceId) {
        const selectedStudent = students.find(s => s.studentId._id === selectedStudentId);

        if (scoreLoading) {
            return (
                <div className="p-20 text-center">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-brand-600 border-r-transparent"></div>
                    <p className="mt-4 text-gray-500 font-bold uppercase tracking-widest text-xs">Loading Student Performance Data...</p>
                </div>
            );
        }

        if (scoreError) {
            return (
                <div className="p-12">
                    <div className="bg-red-50 border-2 border-red-100 rounded-3xl p-10 text-center max-w-lg mx-auto shadow-xl shadow-red-50">
                        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mb-6 border-4 border-white shadow-lg">
                            <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">Load Failed</h3>
                        <p className="text-gray-500 font-medium mb-8 leading-relaxed">{scoreError}</p>
                        <button
                            onClick={fetchIvyScore}
                            className="px-8 py-3 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-100 uppercase tracking-widest text-sm"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            );
        }

        if (!scoreData) return null;

        const totalMaxScore = 10;

        // Calculate weighted overall score
        let calculatedOverallScore = 0;
        scoreData.pointerScores.forEach((pointer) => {
            const score = pointer.pointerNo === 1 && academicScore
                ? academicScore.finalScore
                : pointer.pointerNo === 5 && pointer5Score !== null
                    ? pointer5Score
                    : pointer.score;
            const weight = pointerWeightages[pointer.pointerNo] || 0;
            calculatedOverallScore += score * weight;
        });

        const overallScore = calculatedOverallScore;
        const overallPercentage = (overallScore / totalMaxScore) * 100;

        return (
            <div className="p-8 md:p-12 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000">
                {/* Header */}
                <header className="mb-16">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-6xl font-black text-gray-900 tracking-tighter mb-4 leading-tight">
                                {selectedStudent?.studentId.firstName ? `${selectedStudent.studentId.firstName} ${selectedStudent.studentId.lastName}` : 'Student'}'s Ivy League Readiness
                            </h1>
                            <p className="text-xl text-gray-400 font-medium max-w-2xl leading-relaxed">
                                Track competitive trajectory across all core admission pillars. Scores are real-time and reflect current evaluations.
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                const resolvedUserId = userIdForProfile || selectedStudent?.studentId.userId || selectedStudentId;
                                router.push(`/ivy-league/ivy-expert/student-report/${resolvedUserId}`);
                            }}
                            className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            View Candidate Report
                        </button>
                    </div>
                </header>

                {/* Overall Score Card */}
                <div className="relative mb-16 group">
                    <div className="absolute inset-0 bg-brand-600 rounded-[3rem] blur-3xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
                    <div className="relative bg-white rounded-[3.5rem] shadow-[0_32px_64px_-16px_rgba(41,89,186,0.1)] border border-gray-100 p-12 overflow-hidden">
                        <div className="flex flex-col md:flex-row items-center gap-12">
                            <div className="flex-1 text-center md:text-left">
                                <span className="text-[10px] font-black tracking-[0.4em] text-gray-400 uppercase mb-4 block">Calculated Potential</span>
                                <div className="flex items-baseline justify-center md:justify-start gap-4 mb-6">
                                    <span className="text-9xl font-black text-brand-600 leading-none tracking-tighter">{overallScore.toFixed(1)}</span>
                                    <span className="text-3xl font-black text-gray-300">/ {totalMaxScore}</span>
                                </div>
                                <div className="inline-flex items-center gap-3 bg-brand-50 text-brand-600 px-6 py-3 rounded-full text-base font-black uppercase tracking-widest">
                                    <span className="h-2 w-2 bg-brand-600 rounded-full animate-pulse"></span>
                                    {getScoreGrade(overallScore, totalMaxScore)}
                                </div>
                            </div>

                            <div className="w-full md:w-[400px] space-y-6">
                                <div className="flex items-end justify-between mb-2">
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Aggregate Readiness</span>
                                    <span className="text-2xl font-black text-brand-600">{overallPercentage.toFixed(0)}%</span>
                                </div>
                                <div className="h-8 bg-gray-50 rounded-2xl overflow-hidden p-1.5 border border-gray-100 flex items-center">
                                    <div
                                        className="h-full bg-brand-600 rounded-xl transition-all duration-1500 ease-out shadow-[0_0_20px_rgba(41,89,186,0.3)]"
                                        style={{ width: `${overallPercentage}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-center text-gray-400 font-bold italic">Last evaluated on {new Date(scoreData.generatedAt).toLocaleDateString('en-GB')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Individual Pointer Scores */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {scoreData.pointerScores.map((pointer) => {
                        // Use academic excellence score for Pointer 1 if available
                        // Use pointer5Score for Pointer 5 if available
                        const displayScore = pointer.pointerNo === 1 && academicScore
                            ? academicScore.finalScore
                            : pointer.pointerNo === 5 && pointer5Score !== null
                                ? pointer5Score
                                : pointer.score;
                        const percentage = (displayScore / pointer.maxScore) * 100;
                        const colorClass = getScoreColor(displayScore, pointer.maxScore);

                        return (
                            <div
                                key={pointer.pointerNo}
                                onClick={() => handlePointerClick(pointer.pointerNo)}
                                className="bg-white rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:translate-y-[-8px] transition-all duration-500 p-8 border border-gray-100 hover:border-brand-100 group flex flex-col cursor-pointer"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 font-black text-xl border border-brand-100 shadow-inner group-hover:bg-brand-600 group-hover:text-white transition-colors">
                                            {pointer.pointerNo}
                                        </div>
                                        <h3 className="font-black text-gray-900 text-lg leading-tight uppercase tracking-tight">
                                            {pointerNames[pointer.pointerNo]}
                                        </h3>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-400 font-bold mb-8 leading-relaxed uppercase tracking-wide">
                                    {pointerDescriptions[pointer.pointerNo]}
                                </p>

                                {pointer.pointerNo === 1 && academicScore && (
                                    <div className="mb-4 text-xs text-gray-500 space-y-1">
                                        {/* <div className="flex justify-between">
                                            <span>Evaluated Docs:</span>
                                            <span className="font-bold">{academicScore.evaluatedDocsCount}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Informal Sections:</span>
                                            <span className="font-bold">{academicScore.informalSectionsWithScores}</span>
                                        </div> */}
                                    </div>
                                )}

                                <div className="mt-auto">
                                    <div className="flex items-baseline justify-between mb-4">
                                        <span className="text-5xl font-black text-gray-900 tracking-tighter">
                                            {displayScore.toFixed(1)}
                                        </span>
                                        <span className="text-sm font-black text-gray-300 uppercase italic">
                                            Target: {pointer.maxScore}
                                        </span>
                                    </div>

                                    <div className="h-3 bg-gray-50 rounded-full overflow-hidden border border-gray-100 p-0.5">
                                        <div
                                            className={`h-full ${colorClass} rounded-full transition-all duration-1000 ease-out shadow-sm`}
                                            style={{ width: `${percentage}%` }}
                                        ></div>
                                    </div>

                                    <div className="flex items-center justify-between mt-4">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                            {getScoreGrade(pointer.score, pointer.maxScore)}
                                        </span>
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${colorClass} text-white uppercase tracking-tighter`}>
                                            {percentage.toFixed(0)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Info Panel */}
                <div className="mt-20 bg-gray-900 rounded-[3rem] p-12 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-brand-600 rounded-full blur-[120px] opacity-20 translate-x-1/2 -translate-y-1/2"></div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-12 text-center md:text-left">
                        <div className="flex-shrink-0 w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center backdrop-blur-xl border border-white/20">
                            <svg className="h-10 w-10 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h4 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Understanding Student Profile</h4>
                            <p className="text-brand-200/60 font-medium leading-relaxed max-w-3xl">
                                Each pointer follows the Ivy League evaluation matrix scaled from 0-10. Scores are manually verified based on shared evidences.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Show two-section dashboard when no student is selected

    const getCandidateName = (c: IvyCandidate) =>
        [c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ');

    const getStudentName = (s: IvyStudentItem) =>
        [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' ');

    const getTestStatusBadge = (status: string) => {
        const map: Record<string, { label: string; className: string }> = {
            'not-started': { label: 'Not Started', className: 'bg-gray-100 text-gray-800' },
            'in-progress': { label: 'In Progress', className: 'bg-yellow-100 text-yellow-800' },
            completed: { label: 'Completed', className: 'bg-green-100 text-green-800' },
        };
        const s = map[status] || map['not-started'];
        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.className}`}>
                {s.label}
            </span>
        );
    };

    const filteredCandidates = myCandidates.filter((c) => {
        if (!candidateSearch) return true;
        const q = candidateSearch.toLowerCase();
        return getCandidateName(c).toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.schoolName.toLowerCase().includes(q);
    });

    const filteredStudents = myStudents.filter((s) => {
        if (!studentSearch) return true;
        const q = studentSearch.toLowerCase();
        return getStudentName(s).toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || (s.schoolName || '').toLowerCase().includes(q);
    });

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-1">Ivy Expert Dashboard</h1>
                    <p className="text-gray-600">Manage your assigned Ivy League candidates and students</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Ivy Candidates</p>
                                <p className="text-3xl font-bold text-gray-900">{myCandidates.length}</p>
                            </div>
                            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Ivy Students</p>
                                <p className="text-3xl font-bold text-gray-900">{myStudents.length}</p>
                            </div>
                            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-100 text-green-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Section 1: Ivy Candidates ── */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Ivy Candidates</h2>
                                    <p className="text-sm text-gray-500">Candidates assigned to you for evaluation</p>
                                </div>
                            </div>
                            <input
                                type="text"
                                placeholder="Search candidates..."
                                value={candidateSearch}
                                onChange={(e) => setCandidateSearch(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent w-64 text-gray-900"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        {filteredCandidates.length === 0 ? (
                            <div className="text-center py-12">
                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                </svg>
                                <p className="mt-2 text-gray-500 font-medium">No candidates assigned yet</p>
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Candidate</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">School</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Grade</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Test Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Score</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredCandidates.map((c) => (
                                        <tr key={c._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                                                        <span className="text-amber-600 font-semibold text-sm">
                                                            {c.firstName?.charAt(0)?.toUpperCase() || ''}{c.lastName?.charAt(0)?.toUpperCase() || ''}
                                                        </span>
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">{getCandidateName(c)}</div>
                                                        <div className="text-sm text-gray-500">{c.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{c.schoolName}</div>
                                                <div className="text-sm text-gray-500">{c.curriculum}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.currentGrade}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{getTestStatusBadge(c.testStatus)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                                {c.testStatus === 'completed' && c.totalScore !== null
                                                    ? `${c.totalScore} / ${c.maxScore}`
                                                    : '—'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                                                <button
                                                    onClick={() => router.push(`/ivy-league/ivy-expert/candidates/${c.userId}`)}
                                                    className="px-3 py-1.5 rounded-lg transition-colors text-xs bg-blue-600 text-white hover:bg-blue-700"
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {filteredCandidates.length > 0 && (
                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                            <p className="text-sm text-gray-600">
                                Showing {filteredCandidates.length} candidate{filteredCandidates.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    )}
                </div>

                {/* ── Section 2: Ivy Students ── */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Ivy Students</h2>
                                    <p className="text-sm text-gray-500">Candidates converted to students under your guidance</p>
                                </div>
                            </div>
                            <input
                                type="text"
                                placeholder="Search students..."
                                value={studentSearch}
                                onChange={(e) => setStudentSearch(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent w-64 text-gray-900"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        {filteredStudents.length === 0 ? (
                            <div className="text-center py-12">
                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                </svg>
                                <p className="mt-2 text-gray-500 font-medium">No students converted yet</p>
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Student</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">School</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Grade</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Joined</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredStudents.map((s) => (
                                        <tr key={s.userId} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                                        <span className="text-green-600 font-semibold text-sm">
                                                            {s.firstName?.charAt(0)?.toUpperCase() || ''}{s.lastName?.charAt(0)?.toUpperCase() || ''}
                                                        </span>
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">{getStudentName(s)}</div>
                                                        <div className="text-sm text-gray-500">{s.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{s.schoolName || '—'}</div>
                                                <div className="text-sm text-gray-500">{s.curriculum || ''}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{s.currentGrade || '—'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => router.push(`/ivy-league/ivy-expert?studentId=${s.studentId}&userId=${s.userId}&studentIvyServiceId=${s.studentIvyServiceId}`)}
                                                        className="px-3 py-1.5 rounded-lg transition-colors text-xs bg-blue-600 text-white hover:bg-blue-700"
                                                    >
                                                        View Details
                                                    </button>
                                                    <button
                                                        onClick={() => router.push(`/ivy-league/ivy-expert/student-report/${s.userId}`)}
                                                        className="px-3 py-1.5 rounded-lg transition-colors text-xs bg-purple-600 text-white hover:bg-purple-700"
                                                    >
                                                        View Report
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {filteredStudents.length > 0 && (
                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                            <p className="text-sm text-gray-600">
                                Showing {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
