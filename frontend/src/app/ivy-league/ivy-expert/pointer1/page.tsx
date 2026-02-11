'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import { IVY_API_URL } from '@/lib/ivyApi';

interface Subject {
    _id?: string;
    name: string;
    marksObtained: number;
    totalMarks: number;
    feedback?: string;
}

interface SubSection {
    _id?: string;
    testType: 'weekly' | 'month-wise' | 'term-wise' | 'final-term' | 'olympiad' | 'test';
    month: string;
    year: number;
    subjects: Subject[];
    overallFeedback?: string;
    score?: number;
}

interface Section {
    _id?: string;
    examName: string;
    subSections: SubSection[];
    weightage?: number;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const YEARS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

function IvyExpertPointer1Content() {
    const searchParams = useSearchParams();
    const studentId = searchParams.get('studentId');
    const studentIvyServiceId = searchParams.get('studentIvyServiceId');

    const [activeTab, setActiveTab] = useState<'formal' | 'informal'>('formal');
    const [sections, setSections] = useState<Section[]>([]);
    const [newSectionName, setNewSectionName] = useState('');
    const [showAddSection, setShowAddSection] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);
    const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
    const [academicScore, setAcademicScore] = useState<{
        finalScore: number;
        documentAvg: number;
        weightedScoreSum: number;
        evaluatedDocsCount: number;
        informalSectionsWithScores: number;
    } | null>(null);

    useEffect(() => {
        fetchAcademicData();
        fetchAcademicScore();
    }, [studentId, activeTab]);

    const fetchAcademicScore = async () => {
        if (!studentId || !studentIvyServiceId) return;
        try {
            const response = await axios.get(`${IVY_API_URL}/pointer1/academic/score/${studentId}`, {
                params: { studentIvyServiceId }
            });
            setAcademicScore(response.data.data);
        } catch (error) {
            console.error('Error fetching academic score:', error);
        }
    };

    const fetchAcademicData = async () => {
        if (!studentId || !studentIvyServiceId) return;
        try {
            const response = await axios.get(`${IVY_API_URL}/pointer1/academic/${studentId}`, {
                params: { studentIvyServiceId }
            });
            setSections(response.data.data?.[activeTab]?.sections || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const addSection = async () => {
        if (!newSectionName.trim() || !studentId || !studentIvyServiceId) return;
        try {
            // First, create the section
            const sectionResponse = await axios.post(`${IVY_API_URL}/pointer1/academic/section`, {
                studentId,
                studentIvyServiceId,
                examName: newSectionName,
                tab: activeTab
            });
            
            // Get the new section ID from the response (last section in the array)
            const sections = sectionResponse.data.data[activeTab].sections;
            const newSectionId = sections[sections.length - 1]._id;
            const defaultTestType = activeTab === 'informal' ? 'olympiad' : 'weekly';
            
            // Automatically add one sub-section with one subject
            await axios.post(`${IVY_API_URL}/pointer1/academic/subsection`, {
                studentId,
                studentIvyServiceId,
                sectionId: newSectionId,
                testType: defaultTestType,
                month: MONTHS[0],
                year: YEARS[0],
                tab: activeTab
            });
            
            setNewSectionName('');
            setShowAddSection(false);
            
            // Fetch updated data
            await fetchAcademicData();
            
            // Find the index of the newly added section and expand it
            // The new section is the last one in the array (0-indexed)
            const newSectionIndex = sections.length - 1;
            setExpandedSections(prev => new Set([...prev, newSectionIndex]));
        } catch (error) {
            console.error('Error adding section:', error);
        }
    };

    const addSubSection = async (sectionIndex: number) => {
        const section = sections[sectionIndex];
        if (!section._id) return;
        const defaultTestType = activeTab === 'informal' ? 'olympiad' : 'weekly';
        try {
            await axios.post(`${IVY_API_URL}/pointer1/academic/subsection`, {
                studentId,
                studentIvyServiceId,
                sectionId: section._id,
                testType: defaultTestType,
                month: MONTHS[0],
                year: YEARS[0],
                tab: activeTab
            });
            // Ensure the section is expanded after adding sub-section
            setExpandedSections(prev => new Set([...prev, sectionIndex]));
            fetchAcademicData();
        } catch (error) {
            console.error('Error adding subsection:', error);
        }
    };

    const updateSubSectionAPI = useCallback(async (sectionId: string, subSectionId: string, field: string, value: any, tab: string) => {
        try {
            await axios.put(`${IVY_API_URL}/pointer1/academic/subsection`, {
                studentId,
                studentIvyServiceId,
                sectionId,
                subSectionId,
                [field]: value,
                tab
            });
            if (field !== 'overallFeedback') {
                fetchAcademicData();
            }
            if (tab === 'informal' && field === 'score') {
                fetchAcademicScore();
            }
        } catch (error) {
            console.error('Error updating subsection:', error);
        }
    }, [studentId, studentIvyServiceId]);

    const updateSubSection = (sectionId: string, subSectionId: string, field: string, value: any) => {
        // Update local state immediately for responsive UI
        setSections(prev => prev.map(s =>
            s._id === sectionId
                ? { ...s, subSections: s.subSections.map(ss => ss._id === subSectionId ? { ...ss, [field]: value } : ss) }
                : s
        ));
        // Debounce API call by 2 seconds
        const key = `subsection-${sectionId}-${subSectionId}-${field}`;
        if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
        debounceTimers.current[key] = setTimeout(() => {
            updateSubSectionAPI(sectionId, subSectionId, field, value, activeTab);
        }, 2000);
    };

    const addSubject = async (sectionId: string, subSectionId: string) => {
        try {
            await axios.post(`${IVY_API_URL}/pointer1/academic/subject`, {
                studentId,
                studentIvyServiceId,
                sectionId,
                subSectionId,
                name: '',
                marksObtained: 0,
                totalMarks: 100,
                tab: activeTab
            });
            fetchAcademicData();
        } catch (error) {
            console.error('Error adding subject:', error);
        }
    };

    const updateSubjectAPI = useCallback(async (sectionId: string, subSectionId: string, subjectId: string, field: string, value: any, tab: string) => {
        try {
            await axios.put(`${IVY_API_URL}/pointer1/academic/subject`, {
                studentId,
                studentIvyServiceId,
                sectionId,
                subSectionId,
                subjectId,
                [field]: value,
                tab
            });
            fetchAcademicData();
        } catch (error) {
            console.error('Error updating subject:', error);
        }
    }, [studentId, studentIvyServiceId]);

    const updateSubject = (sectionId: string, subSectionId: string, subjectId: string, field: string, value: any) => {
        // Update local state immediately for responsive UI
        setSections(prev => prev.map(s =>
            s._id === sectionId
                ? {
                    ...s,
                    subSections: s.subSections.map(ss =>
                        ss._id === subSectionId
                            ? { ...ss, subjects: ss.subjects?.map(sub => sub._id === subjectId ? { ...sub, [field]: value } : sub) }
                            : ss
                    )
                }
                : s
        ));
        // Debounce API call by 2 seconds
        const key = `subject-${subjectId}-${field}`;
        if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
        debounceTimers.current[key] = setTimeout(() => {
            updateSubjectAPI(sectionId, subSectionId, subjectId, field, value, activeTab);
        }, 2000);
    };

    const deleteSectionHandler = async (sectionId: string) => {
        if (!confirm('Are you sure you want to delete this section?')) return;
        try {
            await axios.delete(`${IVY_API_URL}/pointer1/academic/section`, {
                data: { studentId, studentIvyServiceId, sectionId, tab: activeTab }
            });
            fetchAcademicData();
        } catch (error) {
            console.error('Error deleting section:', error);
        }
    };

    const deleteSubSectionHandler = async (sectionId: string, subSectionId: string) => {
        if (!confirm('Are you sure you want to delete this sub-section?')) return;
        try {
            await axios.delete(`${IVY_API_URL}/pointer1/academic/subsection`, {
                data: { studentId, studentIvyServiceId, sectionId, subSectionId, tab: activeTab }
            });
            fetchAcademicData();
        } catch (error) {
            console.error('Error deleting sub-section:', error);
        }
    };

    const deleteSubjectHandler = async (sectionId: string, subSectionId: string, subjectId: string) => {
        if (!confirm('Are you sure you want to delete this subject?')) return;
        try {
            await axios.delete(`${IVY_API_URL}/pointer1/academic/subject`, {
                data: { studentId, studentIvyServiceId, sectionId, subSectionId, subjectId, tab: activeTab }
            });
            fetchAcademicData();
        } catch (error) {
            console.error('Error deleting subject:', error);
        }
    };

    const toggleSection = (index: number) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedSections(newExpanded);
    };

    const updateWeightage = async (sectionId: string, newWeightage: number) => {
        // Update local state immediately
        setSections(prevSections =>
            prevSections.map(s =>
                s._id === sectionId ? { ...s, weightage: newWeightage } : s
            )
        );
    };

    const saveWeightages = async () => {
        try {
            const weightages = sections.map(s => ({
                sectionId: s._id!,
                weightage: s.weightage || 0
            }));

            const totalWeightage = weightages.reduce((sum, w) => sum + w.weightage, 0);
            if (Math.abs(totalWeightage - 100) > 0.01) {
                alert(`Total weightage must equal 100. Current total: ${totalWeightage.toFixed(2)}`);
                return;
            }

            await axios.put(`${IVY_API_URL}/pointer1/academic/weightages`, {
                studentId,
                studentIvyServiceId,
                weightages
            });

            alert('Weightages saved successfully!');
            fetchAcademicScore(); // Refresh score after weightages change
        } catch (error: any) {
            console.error('Error saving weightages:', error);
            alert(error.response?.data?.message || 'Failed to save weightages');
            fetchAcademicData(); // Revert to server state
        }
    };

    const getTotalWeightage = () => {
        return sections.reduce((sum, s) => sum + (s.weightage || 0), 0);
    };

    if (loading) return <div className="p-12 text-center text-indigo-400 font-black animate-pulse">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans tracking-tight">
            <div className="max-w-6xl mx-auto">
                <div className="mb-12 flex justify-between items-start">
                    <div>
                        <h1 className="text-6xl font-black text-gray-900 tracking-tighter mb-4">
                            ACADEMIC<br /><span className="text-indigo-600">EXCELLENCE</span>
                        </h1>
                        <p className="text-xl text-gray-400 font-medium max-w-xl">
                            Manage student academic performance and provide evaluations.
                        </p>
                    </div>

                    {/* Academic Excellence Score Card */}
                    {academicScore && (
                        <div className="bg-white p-10 rounded-[3rem] shadow-2xl border-4 border-blue-50 flex flex-col items-center justify-center text-center scale-110 md:mr-10">
                            <span className="text-[10px] font-black tracking-[0.3em] text-gray-400 uppercase mb-2">Academic Excellence Score</span>
                            <div className="text-7xl font-black text-blue-600 leading-none">{academicScore.finalScore.toFixed(2)}</div>
                            <div className="mt-3 text-[10px] font-bold text-gray-400 space-y-1">
                                <div>Marksheet Avg: {academicScore.documentAvg.toFixed(2)}/10 ({academicScore.evaluatedDocsCount} docs)</div>
                                <div>Informal Score: {academicScore.weightedScoreSum.toFixed(2)}/10</div>
                                <div className="text-gray-300 pt-1">(DocAvg/2 + Informal/2)</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-8 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('formal')}
                        className={`px-8 py-4 font-bold text-sm transition-all ${
                            activeTab === 'formal'
                                ? 'text-indigo-600 border-b-2 border-indigo-600'
                                : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        Formal
                    </button>
                    <button
                        onClick={() => setActiveTab('informal')}
                        className={`px-8 py-4 font-bold text-sm transition-all ${
                            activeTab === 'informal'
                                ? 'text-indigo-600 border-b-2 border-indigo-600'
                                : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        Informal
                    </button>
                </div>

                {/* Tab Content */}
                <div className="space-y-6">
                    {/* Weightage Total Indicator for Informal Tab */}
                    {activeTab === 'informal' && sections.length > 0 && (
                        <div className={`p-4 rounded-xl border-2 ${
                            Math.abs(getTotalWeightage() - 100) < 0.01 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-red-50 border-red-200'
                        }`}>
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-gray-700">Total Weightage:</span>
                                <span className={`text-2xl font-black ${
                                    Math.abs(getTotalWeightage() - 100) < 0.01 
                                        ? 'text-green-600' 
                                        : 'text-red-600'
                                }`}>
                                    {getTotalWeightage().toFixed(2)}%
                                </span>
                            </div>
                            {Math.abs(getTotalWeightage() - 100) >= 0.01 && (
                                <p className="text-sm text-red-600 mt-2">
                                    ⚠️ Total must equal 100%. Please adjust the weightages.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Add Section Button - Moved to Right */}
                    {!showAddSection ? (
                        <div className="flex justify-end">
                            <button
                                onClick={() => setShowAddSection(true)}
                                className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg"
                            >
                                + Add Section
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white p-6 rounded-2xl border-2 border-indigo-200 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">New Section</h3>
                            <div className="flex gap-4">
                                <input
                                    type="text"
                                    placeholder="Exam Name (e.g., Mid-Term, Final Exam)"
                                    value={newSectionName}
                                    onChange={(e) => setNewSectionName(e.target.value)}
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:border-indigo-500 outline-none text-black placeholder:text-gray-400"
                                />
                                <button
                                    onClick={addSection}
                                    className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700"
                                >
                                    Save
                                </button>
                                <button
                                    onClick={() => {
                                        setShowAddSection(false);
                                        setNewSectionName('');
                                    }}
                                    className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Sections */}
                    {sections.map((section, sectionIndex) => (
                        <div key={section._id || sectionIndex} className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-3xl border-2 border-indigo-200 shadow-lg">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-2xl font-black text-gray-900 uppercase">{section.examName}</h2>
                                    {activeTab === 'informal' && (
                                        <div className="flex items-center gap-2">
                                            <label className="text-sm font-bold text-gray-600">Weightage:</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="1"
                                                value={section.weightage || 0}
                                                onChange={(e) => updateWeightage(section._id!, parseFloat(e.target.value) || 0)}
                                                onBlur={saveWeightages}
                                                className="w-16 px-2 py-1 border border-gray-300 rounded-lg focus:border-indigo-500 outline-none text-sm text-black text-center font-bold"
                                            />
                                            <span className="text-sm font-bold text-gray-600">%</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-3">
                                        <button
                                            onClick={() => addSubSection(sectionIndex)}
                                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700"
                                        >
                                            + Add Sub-Section
                                        </button>
                                        <button
                                            onClick={() => toggleSection(sectionIndex)}
                                            className="p-2 bg-white rounded-lg hover:bg-gray-100"
                                        >
                                            <svg className={`w-5 h-5 transition-transform ${expandedSections.has(sectionIndex) ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => deleteSectionHandler(section._id!)}
                                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                            title="Delete Section"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {expandedSections.has(sectionIndex) && (
                                    <div className="space-y-4">
                                        {section.subSections?.map((subSection, subIndex) => (
                                            <div key={subSection._id || subIndex} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                                {/* Sub-section header with horizontal fields */}
                                                <div className="flex items-start gap-4 mb-6">
                                                    <div className="flex-1 grid grid-cols-3 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">Test Type</label>
                                                            <select
                                                                value={subSection.testType}
                                                                onChange={(e) => updateSubSection(section._id!, subSection._id!, 'testType', e.target.value)}
                                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 outline-none text-black"
                                                            >
                                                                {activeTab === 'informal' ? (
                                                                    <>
                                                                        <option value="olympiad">Olympiad</option>
                                                                        <option value="test">Test</option>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <option value="weekly">Weekly</option>
                                                                        <option value="month-wise">Month-wise</option>
                                                                        <option value="term-wise">Term-wise</option>
                                                                        <option value="final-term">Final-term</option>
                                                                    </>
                                                                )}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">Month</label>
                                                            <select
                                                                value={subSection.month}
                                                                onChange={(e) => updateSubSection(section._id!, subSection._id!, 'month', e.target.value)}
                                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 outline-none text-black"
                                                            >
                                                                {MONTHS.map(month => (
                                                                    <option key={month} value={month}>{month}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">Year</label>
                                                            <select
                                                                value={subSection.year}
                                                                onChange={(e) => updateSubSection(section._id!, subSection._id!, 'year', parseInt(e.target.value))}
                                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 outline-none text-black"
                                                            >
                                                                {YEARS.map(year => (
                                                                    <option key={year} value={year}>{year}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => deleteSubSectionHandler(section._id!, subSection._id!)}
                                                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 mt-6"
                                                        title="Delete Sub-Section"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>

                                                {/* Subjects */}
                                                <div className="space-y-3">
                                                    {subSection.subjects?.map((subject, subjectIndex) => (
                                                        <div key={subject._id || subjectIndex} className="grid grid-cols-6 gap-3 items-start p-4 bg-gray-50 rounded-xl">
                                                            <div>
                                                                <label className="block text-xs font-bold text-gray-600 mb-1">Subject</label>
                                                                <input
                                                                    type="text"
                                                                    value={subject.name}
                                                                    onChange={(e) => updateSubject(section._id!, subSection._id!, subject._id!, 'name', e.target.value)}
                                                                    placeholder="Subject name"
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 outline-none text-sm text-black placeholder:text-gray-400"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-gray-600 mb-1">Marks Obtained</label>
                                                                <input
                                                                    type="number"
                                                                    value={subject.marksObtained}
                                                                    onChange={(e) => updateSubject(section._id!, subSection._id!, subject._id!, 'marksObtained', parseFloat(e.target.value))}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 outline-none text-sm text-black"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-gray-600 mb-1">Total Marks</label>
                                                                <input
                                                                    type="number"
                                                                    value={subject.totalMarks}
                                                                    onChange={(e) => updateSubject(section._id!, subSection._id!, subject._id!, 'totalMarks', parseFloat(e.target.value))}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 outline-none text-sm text-black"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-gray-600 mb-1">Percentage</label>
                                                                <div className="px-3 py-2 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-sm text-center">
                                                                    {subject.totalMarks > 0 ? ((subject.marksObtained / subject.totalMarks) * 100).toFixed(2) : '0.00'}%
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-gray-600 mb-1">Feedback</label>
                                                                <input
                                                                    type="text"
                                                                    value={subject.feedback || ''}
                                                                    onChange={(e) => updateSubject(section._id!, subSection._id!, subject._id!, 'feedback', e.target.value)}
                                                                    placeholder="Enter feedback"
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 outline-none text-sm text-black placeholder:text-gray-400"
                                                                />
                                                            </div>
                                                            <div className="flex items-end justify-center h-full pb-1">
                                                                <button
                                                                    onClick={() => deleteSubjectHandler(section._id!, subSection._id!, subject._id!)}
                                                                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                                                    title="Delete Subject"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button
                                                        onClick={() => addSubject(section._id!, subSection._id!)}
                                                        className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-300 w-full"
                                                    >
                                                        + Add Subject
                                                    </button>
                                                </div>
                                                
                                                {/* Overall Feedback and Score - Editable for Ivy Expert */}
                                                <div className="mt-4 pt-4 border-t border-gray-200">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <label className="block text-sm font-bold text-gray-700">Overall Feedback</label>
                                                        <div className="flex items-center gap-2">
                                                            <label className="text-sm font-bold text-gray-700">Score (0-10):</label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="10"
                                                                step="0.5"
                                                                value={subSection.score ?? 0}
                                                                onChange={(e) => {
                                                                    const value = Math.max(0, Math.min(10, parseFloat(e.target.value) || 0));
                                                                    updateSubSection(section._id!, subSection._id!, 'score', value);
                                                                }}
                                                                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 outline-none text-sm text-black text-center font-bold"
                                                            />
                                                        </div>
                                                    </div>
                                                    <textarea
                                                        value={subSection.overallFeedback || ''}
                                                        onChange={(e) => {
                                                            const newValue = e.target.value;
                                                            // Update local state immediately
                                                            setSections(prevSections => 
                                                                prevSections.map(s => 
                                                                    s._id === section._id 
                                                                        ? {
                                                                            ...s,
                                                                            subSections: s.subSections.map(ss => 
                                                                                ss._id === subSection._id 
                                                                                    ? { ...ss, overallFeedback: newValue }
                                                                                    : ss
                                                                            )
                                                                        }
                                                                        : s
                                                                )
                                                            );
                                                        }}
                                                        onBlur={(e) => updateSubSection(section._id!, subSection._id!, 'overallFeedback', e.target.value)}
                                                        placeholder="Enter overall feedback for this sub-section..."
                                                        rows={3}
                                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-indigo-500 outline-none text-sm text-black placeholder:text-gray-400 resize-none"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                        {(!section.subSections || section.subSections.length === 0) && (
                                            <p className="text-gray-400 text-center py-8 italic">No sub-sections added yet</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}

                        {sections.length === 0 && !showAddSection && (
                            <div className="text-center py-16 text-gray-400">
                                <p className="text-lg font-medium">No sections added yet. Click "Add Section" to get started.</p>
                            </div>
                        )}
                </div>
            </div>
        </div>
    );
}

export default function IvyExpertPointer1Page() {
    return (
        <Suspense fallback={<div className="p-12 text-center text-gray-300 font-black animate-pulse tracking-[1em] uppercase">Loading...</div>}>
            <IvyExpertPointer1Content />
        </Suspense>
    );
}
