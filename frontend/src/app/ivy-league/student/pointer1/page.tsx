'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import axios from 'axios';
import { useStudentService } from '../useStudentService';
import { IVY_API_URL } from '@/lib/ivyApi';

interface Subject {
    _id?: string;
    name: string;
    marksObtained: number;
    totalMarks: number;
    feedback?: string;
}

interface Project {
    _id?: string;
    title: string;
    description: string;
    organizationName?: string;
    projectUrl?: string;
    feedback?: string;
}

interface SubSection {
    _id?: string;
    testType: 'weekly' | 'month-wise' | 'term-wise' | 'final-term' | 'olympiad' | 'test' | 'project';
    month: string;
    year: number;
    subjects: Subject[];
    projects?: Project[];
    overallFeedback?: string;
    score?: number;
}

interface Section {
    _id?: string;
    examName: string;
    subSections: SubSection[];
    weightage?: number;
}

interface AcademicData {
    formal: {
        sections: Section[];
    };
    informal: {
        sections: Section[];
    };
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const YEARS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

function Pointer1Content() {
    const { studentId, studentIvyServiceId, loading: serviceLoading, error: serviceError, readOnly } = useStudentService();

    const [activeTab, setActiveTab] = useState<'formal' | 'informal'>('formal');
    const [sections, setSections] = useState<Section[]>([]);
    const [newSectionName, setNewSectionName] = useState('');
    const [showAddSection, setShowAddSection] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);
    const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
    const activeTabRef = useRef(activeTab);
    activeTabRef.current = activeTab;
    const [academicScore, setAcademicScore] = useState<{
        finalScore: number;
        documentAvg: number;
        weightedScoreSum: number;
        evaluatedDocsCount: number;
        informalSectionsWithScores: number;
    } | null>(null);

    useEffect(() => {
        if (studentId && studentIvyServiceId) {
            fetchAcademicData();
            fetchAcademicScore();
        }
    }, [studentId, studentIvyServiceId, activeTab]);

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
        } catch (error) {
            console.error('Error updating subsection:', error);
        }
    }, [studentId, studentIvyServiceId]);

    const updateSubSection = (sectionId: string, subSectionId: string, field: string, value: any) => {
        // Update local state immediately for responsive UI
        setSections(prev => prev.map(s =>
            s._id === sectionId
                ? {
                    ...s,
                    subSections: s.subSections.map(ss => {
                        if (ss._id !== subSectionId) return ss;
                        const updated = { ...ss, [field]: value };
                        // When switching to project type, initialize projects array locally
                        if (field === 'testType' && value === 'project' && (!ss.projects || ss.projects.length === 0)) {
                            updated.projects = [{ title: 'Project 1', description: '', organizationName: '', projectUrl: '', feedback: '' }];
                        }
                        // When switching away from project type, initialize subjects array locally
                        if (field === 'testType' && value !== 'project' && (!ss.subjects || ss.subjects.length === 0)) {
                            updated.subjects = [{ name: 'Subject 1', marksObtained: 0, totalMarks: 100, feedback: '' }];
                        }
                        return updated;
                    })
                }
                : s
        ));
        // Debounce API call by 2 seconds
        const key = `subsection-${sectionId}-${subSectionId}-${field}`;
        if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
        debounceTimers.current[key] = setTimeout(() => {
            updateSubSectionAPI(sectionId, subSectionId, field, value, activeTabRef.current);
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

    const addProject = async (sectionId: string, subSectionId: string) => {
        // Optimistically add to local state
        const tempProject: Project = { title: '', description: '', organizationName: '', projectUrl: '', feedback: '' };
        setSections(prev => prev.map(s =>
            s._id === sectionId
                ? {
                    ...s,
                    subSections: s.subSections.map(ss =>
                        ss._id === subSectionId
                            ? { ...ss, projects: [...(ss.projects || []), tempProject] }
                            : ss
                    )
                }
                : s
        ));
        try {
            await axios.post(`${IVY_API_URL}/pointer1/academic/project`, {
                studentId,
                studentIvyServiceId,
                sectionId,
                subSectionId,
                title: '',
                description: '',
                organizationName: '',
                projectUrl: '',
                tab: activeTab
            });
            fetchAcademicData();
        } catch (error) {
            console.error('Error adding project:', error);
            fetchAcademicData(); // Revert on error
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
        } catch (error) {
            console.error('Error updating subject:', error);
        }
    }, [studentId, studentIvyServiceId]);

    const updateProjectAPI = useCallback(async (sectionId: string, subSectionId: string, projectId: string, field: string, value: any, tab: string) => {
        try {
            await axios.put(`${IVY_API_URL}/pointer1/academic/project`, {
                studentId,
                studentIvyServiceId,
                sectionId,
                subSectionId,
                projectId,
                [field]: value,
                tab
            });
        } catch (error) {
            console.error('Error updating project:', error);
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
        // Debounce API call by 2 seconds (skip if no ID yet)
        if (!subjectId) return;
        const key = `subject-${subjectId}-${field}`;
        if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
        debounceTimers.current[key] = setTimeout(() => {
            updateSubjectAPI(sectionId, subSectionId, subjectId, field, value, activeTabRef.current);
        }, 2000);
    };

    const updateProject = (sectionId: string, subSectionId: string, projectId: string, field: string, value: any) => {
        setSections(prev => prev.map(s =>
            s._id === sectionId
                ? {
                    ...s,
                    subSections: s.subSections.map(ss =>
                        ss._id === subSectionId
                            ? { ...ss, projects: ss.projects?.map(proj => proj._id === projectId ? { ...proj, [field]: value } : proj) }
                            : ss
                    )
                }
                : s
        ));
        // Debounce API call by 2 seconds (skip if no ID yet)
        if (!projectId) return;
        const key = `project-${projectId}-${field}`;
        if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
        debounceTimers.current[key] = setTimeout(() => {
            updateProjectAPI(sectionId, subSectionId, projectId, field, value, activeTabRef.current);
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

    const deleteProjectHandler = async (sectionId: string, subSectionId: string, projectId: string) => {
        if (!confirm('Are you sure you want to delete this project?')) return;
        try {
            await axios.delete(`${IVY_API_URL}/pointer1/academic/project`, {
                data: { studentId, studentIvyServiceId, sectionId, subSectionId, projectId, tab: activeTab }
            });
            fetchAcademicData();
        } catch (error) {
            console.error('Error deleting project:', error);
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

    if (serviceLoading || loading) return <div className="p-8 text-center text-gray-500 font-medium">Loading...</div>;
    if (serviceError) return <div className="p-8 text-center text-red-500 font-medium">{serviceError}</div>;

    return (
        <div className="max-w-6xl mx-auto py-12 px-6">
            {/* Read-Only Banner */}
            {readOnly && (
                <div className="mb-8 bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                    <svg className="w-6 h-6 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span className="text-sm font-bold text-amber-800 uppercase tracking-wide">Read-Only View — Super Admin</span>
                </div>
            )}
            <header className="mb-12 flex justify-between items-start">
                <div>
                    <h1 className="text-5xl font-black text-gray-900 mb-4 tracking-tight">
                        Academic Excellence
                    </h1>
                    <p className="text-xl text-gray-500 max-w-2xl leading-relaxed">
                        Manage your academic performance records and evaluations.
                    </p>
                </div>

                {/* Academic Excellence Score Card */}
                {academicScore && (
                    <div className="bg-white p-10 rounded-[3rem] shadow-2xl border-4 border-blue-50 flex flex-col items-center justify-center text-center scale-110 md:mr-10">
                        <span className="text-[10px] font-black tracking-[0.3em] text-gray-400 uppercase mb-2">Academic Excellence Score</span>
                        <div className="text-7xl font-black text-blue-600 leading-none">{academicScore.finalScore.toFixed(2)}</div>
                    </div>
                )}
            </header>

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
                {/* Add Section Button - Moved to Right */}
                {!readOnly && !showAddSection ? (
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
                                {activeTab === 'informal' && section.weightage !== undefined && (
                                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 font-bold rounded-full text-sm">
                                        Weightage: {section.weightage}%
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-3">
                                    {!readOnly && (
                                    <button
                                        onClick={() => addSubSection(sectionIndex)}
                                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700"
                                    >
                                        + Add Sub-Section
                                    </button>
                                    )}
                                    <button
                                        onClick={() => toggleSection(sectionIndex)}
                                        className="p-2 bg-white rounded-lg hover:bg-gray-100"
                                    >
                                        <svg className={`w-5 h-5 transition-transform ${expandedSections.has(sectionIndex) ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    {!readOnly && (
                                    <button
                                        onClick={() => deleteSectionHandler(section._id!)}
                                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                        title="Delete Section"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                    )}
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
                                                            disabled={readOnly}
                                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 outline-none text-black disabled:opacity-60 disabled:cursor-not-allowed"
                                                        >
                                                            {activeTab === 'informal' ? (
                                                                <>
                                                                    <option value="olympiad">Olympiad</option>
                                                                    <option value="test">Test</option>
                                                                    <option value="project">Project</option>
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
                                                            disabled={readOnly}
                                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 outline-none text-black disabled:opacity-60 disabled:cursor-not-allowed"
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
                                                            disabled={readOnly}
                                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 outline-none text-black disabled:opacity-60 disabled:cursor-not-allowed"
                                                        >
                                                            {YEARS.map(year => (
                                                                <option key={year} value={year}>{year}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                                {!readOnly && (
                                                <button
                                                    onClick={() => deleteSubSectionHandler(section._id!, subSection._id!)}
                                                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 mt-6"
                                                    title="Delete Sub-Section"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                                )}
                                            </div>

                                            {activeTab === 'informal' && subSection.testType === 'project' ? (
                                                <div className="space-y-3">
                                                    {subSection.projects?.map((project, projectIndex) => (
                                                        <div key={project._id || projectIndex} className="grid grid-cols-2 gap-3 items-start p-4 bg-gray-50 rounded-xl">
                                                            <div>
                                                                <label className="block text-xs font-bold text-gray-600 mb-1">Project Title</label>
                                                                <input
                                                                    type="text"
                                                                    value={project.title}
                                                                    onChange={(e) => updateProject(section._id!, subSection._id!, project._id!, 'title', e.target.value)}
                                                                    readOnly={readOnly}
                                                                    placeholder="Project title"
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 outline-none text-sm text-black placeholder:text-gray-400 read-only:opacity-60 read-only:cursor-not-allowed"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-gray-600 mb-1">Organization (if any)</label>
                                                                <input
                                                                    type="text"
                                                                    value={project.organizationName || ''}
                                                                    onChange={(e) => updateProject(section._id!, subSection._id!, project._id!, 'organizationName', e.target.value)}
                                                                    readOnly={readOnly}
                                                                    placeholder="Organization name"
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 outline-none text-sm text-black placeholder:text-gray-400 read-only:opacity-60 read-only:cursor-not-allowed"
                                                                />
                                                            </div>
                                                            <div className="col-span-2">
                                                                <label className="block text-xs font-bold text-gray-600 mb-1">Project Description</label>
                                                                <textarea
                                                                    rows={3}
                                                                    value={project.description}
                                                                    onChange={(e) => updateProject(section._id!, subSection._id!, project._id!, 'description', e.target.value)}
                                                                    readOnly={readOnly}
                                                                    placeholder="Describe the project"
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 outline-none text-sm text-black placeholder:text-gray-400 resize-none read-only:opacity-60 read-only:cursor-not-allowed"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-gray-600 mb-1">Project URL (if any)</label>
                                                                <input
                                                                    type="url"
                                                                    value={project.projectUrl || ''}
                                                                    onChange={(e) => updateProject(section._id!, subSection._id!, project._id!, 'projectUrl', e.target.value)}
                                                                    readOnly={readOnly}
                                                                    placeholder="https://..."
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 outline-none text-sm text-black placeholder:text-gray-400 read-only:opacity-60 read-only:cursor-not-allowed"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-gray-600 mb-1">Feedback</label>
                                                                <div className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm min-h-[40px] italic">
                                                                    {project.feedback || 'Awaiting feedback'}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-end justify-center h-full pb-1">
                                                                {!readOnly && (
                                                                <button
                                                                    onClick={() => deleteProjectHandler(section._id!, subSection._id!, project._id!)}
                                                                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                                                    title="Delete Project"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {!readOnly && (
                                                    <button
                                                        onClick={() => addProject(section._id!, subSection._id!)}
                                                        className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-300 w-full"
                                                    >
                                                        + Add Project
                                                    </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {subSection.subjects?.map((subject, subjectIndex) => (
                                                        <div key={subject._id || subjectIndex} className="grid grid-cols-6 gap-3 items-start p-4 bg-gray-50 rounded-xl">
                                                            <div>
                                                                <label className="block text-xs font-bold text-gray-600 mb-1">Subject</label>
                                                                <input
                                                                    type="text"
                                                                    value={subject.name}
                                                                    onChange={(e) => updateSubject(section._id!, subSection._id!, subject._id!, 'name', e.target.value)}
                                                                    readOnly={readOnly}
                                                                    placeholder="Subject name"
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 outline-none text-sm text-black placeholder:text-gray-400 read-only:opacity-60 read-only:cursor-not-allowed"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-gray-600 mb-1">Marks Obtained</label>
                                                                <input
                                                                    type="number"
                                                                    value={subject.marksObtained}
                                                                    onChange={(e) => updateSubject(section._id!, subSection._id!, subject._id!, 'marksObtained', parseFloat(e.target.value))}
                                                                    readOnly={readOnly}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 outline-none text-sm text-black read-only:opacity-60 read-only:cursor-not-allowed"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-gray-600 mb-1">Total Marks</label>
                                                                <input
                                                                    type="number"
                                                                    value={subject.totalMarks}
                                                                    onChange={(e) => updateSubject(section._id!, subSection._id!, subject._id!, 'totalMarks', parseFloat(e.target.value))}
                                                                    readOnly={readOnly}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 outline-none text-sm text-black read-only:opacity-60 read-only:cursor-not-allowed"
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
                                                                <div className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm min-h-[40px] italic">
                                                                    {subject.feedback || 'Awaiting feedback'}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-end justify-center h-full pb-1">
                                                                {!readOnly && (
                                                                <button
                                                                    onClick={() => deleteSubjectHandler(section._id!, subSection._id!, subject._id!)}
                                                                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                                                    title="Delete Subject"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {!readOnly && (
                                                    <button
                                                        onClick={() => addSubject(section._id!, subSection._id!)}
                                                        className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-300 w-full"
                                                    >
                                                        + Add Subject
                                                    </button>
                                                    )}
                                                </div>
                                            )}
                                            
                                            {/* Overall Feedback - Read Only for Student */}
                                            <div className="mt-4 pt-4 border-t border-gray-200">
                                                <div className="flex items-center gap-4 mb-2">
                                                    <label className="block text-sm font-bold text-gray-700">Overall Feedback</label>
                                                    {subSection.score !== undefined && (
                                                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 font-bold rounded-full text-sm">
                                                            Score: {subSection.score}/10
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="px-4 py-3 bg-gray-50 text-gray-700 rounded-lg text-sm min-h-[60px] border border-gray-200">
                                                    {subSection.overallFeedback || <span className="italic text-gray-400">No overall feedback provided yet</span>}
                                                </div>
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
    );
}

export default function Pointer1Page() {
    return (
        <div className="font-sans">
            <Suspense fallback={
                <div className="p-12 text-center text-indigo-400 font-black animate-pulse tracking-widest uppercase">
                    Loading...
                </div>
            }>
                <Pointer1Content />
            </Suspense>
        </div>
    );
}

