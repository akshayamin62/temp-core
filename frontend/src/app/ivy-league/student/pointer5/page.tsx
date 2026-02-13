'use client';

import { useState, useEffect, Suspense } from 'react';
import axios from 'axios';
import { useStudentService } from '../useStudentService';
import { IVY_API_URL } from '@/lib/ivyApi';
import { fetchBlobUrl, useBlobUrl, fileApi } from '@/lib/useBlobUrl';

interface Attachment {
    fileName: string;
    fileUrl: string;
}

interface Task {
    _id: string;
    taskDescription: string;
    wordLimit: number;
    attachments: Attachment[];
    createdAt: string;
}

interface Submission {
    _id: string;
    studentResponse: string;
    wordsLearned: string;
    wordCount: number;
    submittedAt: string;
}

interface Evaluation {
    _id: string;
    score: number;
    feedback: string;
    evaluatedAt: string;
}

interface TaskStatus {
    task: Task;
    submission: Submission | null;
    evaluation: Evaluation | null;
}

function StudentPointer5Content() {
    const { studentId, studentIvyServiceId, loading: serviceLoading, error: serviceError, readOnly } = useStudentService();

    const [tasks, setTasks] = useState<TaskStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
    const [responses, setResponses] = useState<{ [taskId: string]: { response: string; wordsLearned: string } }>({});
    const [submitting, setSubmitting] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [viewingFile, setViewingFile] = useState<{ [taskId: string]: { url: string; name: string; type: string } | null }>({});
    const [pointer5Score, setPointer5Score] = useState<number | null>(null);

    useEffect(() => {
        if (studentIvyServiceId) {
            fetchStatus();
            fetchPointer5Score();
        }
    }, [studentIvyServiceId]);

    const fetchStatus = async () => {
        try {
            const res = await axios.get(`${IVY_API_URL}/pointer5/status/${studentIvyServiceId}`);
            if (res.data.success) {
                setTasks(res.data.data.tasks || []);
                // Initialize response states
                const resStates: { [taskId: string]: { response: string; wordsLearned: string } } = {};
                res.data.data.tasks?.forEach((t: TaskStatus) => {
                    resStates[t.task._id] = {
                        response: t.submission?.studentResponse || '',
                        wordsLearned: t.submission?.wordsLearned || '',
                    };
                });
                setResponses(resStates);
            }
        } catch (error) {
            console.error('Error fetching status:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPointer5Score = async () => {
        try {
            const res = await axios.get(`${IVY_API_URL}/pointer5/score/${studentIvyServiceId}`);
            if (res.data.success && res.data.data?.score !== undefined) {
                setPointer5Score(res.data.data.score);
            }
        } catch (error) {
            console.error('Error fetching pointer5 score:', error);
        }
    };

    const countWords = (text: string): number => {
        return text.trim().split(/\s+/).filter(w => w.length > 0).length;
    };

    const handleSubmit = async (taskId: string) => {
        const resData = responses[taskId];
        if (!resData?.response.trim()) {
            setMessage({ type: 'error', text: 'Response is required' });
            return;
        }

        setSubmitting(taskId);
        setMessage(null);

        try {
            await axios.post(`${IVY_API_URL}/pointer5/submit`, {
                taskId,
                studentIvyServiceId,
                studentResponse: resData.response,
                wordsLearned: resData.wordsLearned,
            });
            setMessage({ type: 'success', text: 'Response submitted successfully!' });
            fetchStatus();
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to submit response' });
        } finally {
            setSubmitting(null);
        }
    };

    const toggleTask = (taskId: string) => {
        setExpandedTasks((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(taskId)) {
                newSet.delete(taskId);
            } else {
                newSet.add(taskId);
            }
            return newSet;
        });
    };

    const downloadFile = async (fileUrl: string, fileName: string) => {
        try {
            const response = await fileApi.get(fileUrl, { responseType: 'blob' });
            const url = window.URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
        }
    };

    const viewFile = async (taskId: string, fileUrl: string, fileName: string) => {
        const fileExtension = fileName.split('.').pop()?.toLowerCase();
        let fileType = 'other';
        
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension || '')) {
            fileType = 'image';
        } else if (fileExtension === 'pdf') {
            fileType = 'pdf';
        }
        
        try {
            const blobUrl = await fetchBlobUrl(fileUrl);
            setViewingFile(prev => ({ ...prev, [taskId]: { url: blobUrl, name: fileName, type: fileType } }));
        } catch {
            console.error('Failed to load file for viewing');
        }
    };

    const preventCopyPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        return false;
    };

    if (!studentIvyServiceId && !serviceLoading) {
        return (
            <div className="min-h-screen bg-gray-50 p-6 md:p-12">
                <div className="max-w-6xl mx-auto bg-red-50 text-red-800 border border-red-200 p-6 rounded-2xl">
                    {serviceError || 'Student Ivy Service ID is required.'}
                </div>
            </div>
        );
    }

    if (serviceLoading) {
        return <div className="p-20 text-center text-gray-500">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-12">
            <div className="max-w-6xl mx-auto">
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

                {/* Header */}
                <div className="mb-12 flex justify-between items-start">
                    <div>
                        <h1 className="text-5xl font-black text-gray-900 tracking-tighter mb-4">
                            POINTER 5: AUTHENTIC & REFLECTIVE STORYTELLING
                        </h1>
                        <p className="text-xl text-gray-400 font-medium max-w-xl">
                            Complete assigned writing tasks and share your learnings
                        </p>
                    </div>

                    {/* Pointer 5 Score Card */}
                    {pointer5Score !== null && pointer5Score !== undefined && (
                        // <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-brand-100 flex flex-col items-center justify-center text-center scale-110 md:mr-10">
                        //     <span className="text-xs font-black tracking-widest text-gray-400 uppercase mb-2">Current Mean Score</span>
                        //     <div className="text-5xl font-black text-brand-600 leading-none">{typeof pointer5Score === 'number' ? pointer5Score.toFixed(2) : '0.00'}</div>
                        // </div>

                        <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-brand-100 flex flex-col items-center justify-center text-center scale-110 md:mr-10">
                            <span className="text-xs font-black tracking-widest text-gray-400 uppercase mb-2">Current Mean Score</span>
                            <div className="text-5xl font-black text-brand-600 leading-none">{typeof pointer5Score === 'number' ? pointer5Score.toFixed(2) : '0.00'}</div>
                        </div>
                    )}
                </div>

                {/* Message */}
                {message && (
                    <div className={`mb-6 p-4 rounded-xl ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                        {message.text}
                    </div>
                )}

                {/* Loading */}
                {loading ? (
                    <div className="text-center py-20 text-gray-500">Loading...</div>
                ) : tasks.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-200">
                        <div className="text-6xl mb-6">📝</div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">No Tasks Assigned Yet</h2>
                        <p className="text-gray-600">Your Ivy Expert will assign writing tasks here.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {tasks.map((taskStatus, index) => {
                            const currentResponse = responses[taskStatus.task._id]?.response || '';
                            const wordCount = countWords(currentResponse);
                            const isOverLimit = wordCount > taskStatus.task.wordLimit;

                            return (
                                <div key={taskStatus.task._id} className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                                    {/* Task Header */}
                                    <div
                                        className="p-6 cursor-pointer hover:bg-gray-50 transition-all"
                                        onClick={() => toggleTask(taskStatus.task._id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <span className="text-2xl font-black text-brand-600">#{tasks.length - index}</span>
                                                <div>
                                                    <p className="font-bold text-gray-900 line-clamp-1">{taskStatus.task.taskDescription}</p>
                                                    <p className="text-sm text-gray-500">Word Limit: {taskStatus.task.wordLimit}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {taskStatus.evaluation ? (
                                                    <span className="px-4 py-2 bg-green-100 text-green-700 font-bold rounded-xl">
                                                        Score: {taskStatus.evaluation.score}/10
                                                    </span>
                                                ) : taskStatus.submission ? (
                                                    <span className="px-4 py-2 bg-brand-100 text-brand-700 font-bold rounded-xl">
                                                        Submitted
                                                    </span>
                                                ) : (
                                                    <span className="px-4 py-2 bg-yellow-100 text-yellow-700 font-bold rounded-xl">
                                                        Pending
                                                    </span>
                                                )}
                                                <svg
                                                    className={`w-6 h-6 text-gray-400 transition-transform ${expandedTasks.has(taskStatus.task._id) ? 'rotate-180' : ''}`}
                                                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Content */}
                                    {expandedTasks.has(taskStatus.task._id) && (
                                        <div className="border-t border-gray-100 p-6 space-y-6">
                                            {/* Task Details */}
                                            <div className="bg-brand-50 rounded-2xl p-6">
                                                <h3 className="text-sm font-black text-brand-600 uppercase tracking-wider mb-3">Task Description</h3>
                                                <p className="text-gray-900 whitespace-pre-wrap">{taskStatus.task.taskDescription}</p>
                                                {taskStatus.task.attachments.length > 0 && (
                                                    <div className="mt-4">
                                                        <p className="text-sm font-bold text-gray-500 mb-2">Attachments:</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {taskStatus.task.attachments.map((att, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    onClick={() => viewFile(taskStatus.task._id, att.fileUrl, att.fileName)}
                                                                    className={`px-3 py-1 text-sm rounded-lg transition-all border ${
                                                                        viewingFile[taskStatus.task._id]?.name === att.fileName
                                                                            ? 'bg-brand-600 text-white border-brand-600'
                                                                            : 'bg-white text-brand-700 border-brand-200 hover:bg-brand-100'
                                                                    }`}
                                                                >
                                                                    📎 {att.fileName}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* File Viewer - Inline */}
                                            {viewingFile[taskStatus.task._id] && (
                                                <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-200">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider">
                                                            Viewing: {viewingFile[taskStatus.task._id]?.name}
                                                        </h3>
                                                        <button
                                                            onClick={() => setViewingFile(prev => ({ ...prev, [taskStatus.task._id]: null }))}
                                                            className="text-gray-500 hover:text-gray-700 font-bold text-xl px-3 py-1 rounded-lg hover:bg-gray-200"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                    <div className="bg-white rounded-xl overflow-hidden" onContextMenu={(e) => e.preventDefault()}>
                                                        {viewingFile[taskStatus.task._id]?.type === 'image' ? (
                                                            <img
                                                                src={viewingFile[taskStatus.task._id]?.url}
                                                                alt={viewingFile[taskStatus.task._id]?.name}
                                                                className="max-w-full h-auto mx-auto pointer-events-none select-none"
                                                                onContextMenu={(e) => e.preventDefault()}
                                                                draggable={false}
                                                            />
                                                        ) : viewingFile[taskStatus.task._id]?.type === 'pdf' ? (
                                                            <iframe
                                                                src={viewingFile[taskStatus.task._id]?.url}
                                                                className="w-full h-[600px] border-0"
                                                                title={viewingFile[taskStatus.task._id]?.name}
                                                            />
                                                        ) : (
                                                            <div className="text-center py-20">
                                                                <p className="text-gray-600 mb-2">Preview not available for this file type</p>
                                                                <p className="text-sm text-gray-500">{viewingFile[taskStatus.task._id]?.name}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Response Input - 70/30 split */}
                                            <div className="grid grid-cols-10 gap-4">
                                                <div className="col-span-7">
                                                    <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
                                                        <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider mb-3">Your Response</h3>
                                                        <textarea
                                                            value={responses[taskStatus.task._id]?.response || ''}
                                                            onChange={(e) => setResponses(prev => ({
                                                                ...prev,
                                                                [taskStatus.task._id]: { ...prev[taskStatus.task._id], response: e.target.value }
                                                            }))}
                                                            onCopy={preventCopyPaste}
                                                            onCut={preventCopyPaste}
                                                            onPaste={preventCopyPaste}
                                                            placeholder="Write your response here..."
                                                            rows={10}
                                                            disabled={readOnly || !!taskStatus.evaluation}
                                                            spellCheck="false"
                                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-gray-900 bg-white resize-none disabled:bg-gray-50"
                                                        />
                                                        <div className="flex justify-end mt-2">
                                                            <span className={`text-sm font-bold ${isOverLimit ? 'text-red-600' : 'text-gray-500'}`}>
                                                                {wordCount} / {taskStatus.task.wordLimit} words
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-span-3">
                                                    <div className="bg-brand-50 border-2 border-brand-200 rounded-2xl p-6 h-full">
                                                        <h3 className="text-sm font-black text-brand-700 uppercase tracking-wider mb-3">Words Learned</h3>
                                                        <textarea
                                                            value={responses[taskStatus.task._id]?.wordsLearned || ''}
                                                            onChange={(e) => setResponses(prev => ({
                                                                ...prev,
                                                                [taskStatus.task._id]: { ...prev[taskStatus.task._id], wordsLearned: e.target.value }
                                                            }))}
                                                            placeholder="List new words you learned..."
                                                            rows={10}
                                                            disabled={readOnly || !!taskStatus.evaluation}
                                                            spellCheck="false"
                                                            className="w-full px-4 py-3 border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-gray-900 bg-white resize-none disabled:bg-gray-50"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Submit Button */}
                                            {!readOnly && !taskStatus.evaluation && (
                                                <div className="flex justify-end">
                                                    <button
                                                        onClick={() => handleSubmit(taskStatus.task._id)}
                                                        disabled={submitting === taskStatus.task._id || isOverLimit}
                                                        className="px-8 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {submitting === taskStatus.task._id ? 'Submitting...' : taskStatus.submission ? 'Update Response' : 'Submit Response'}
                                                    </button>
                                                </div>
                                            )}

                                            {/* Evaluation Display */}
                                            {taskStatus.evaluation && (
                                                <div className="bg-green-50 rounded-2xl p-6">
                                                    <h3 className="text-sm font-black text-green-600 uppercase tracking-wider mb-3">Ivy Expert Feedback</h3>
                                                    <div className="flex items-start gap-6">
                                                        <div className="text-center">
                                                            <div className="text-4xl font-black text-green-600">{taskStatus.evaluation.score}</div>
                                                            <div className="text-sm text-green-600 font-bold">out of 10</div>
                                                        </div>
                                                        {taskStatus.evaluation.feedback && (
                                                            <div className="flex-1">
                                                                <p className="text-gray-900">{taskStatus.evaluation.feedback}</p>
                                                                <p className="text-sm text-gray-500 mt-2">
                                                                    Evaluated: {new Date(taskStatus.evaluation.evaluatedAt).toLocaleString()}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function StudentPointer5Page() {
    return (
        <Suspense fallback={<div className="p-20 text-center">Loading...</div>}>
            <StudentPointer5Content />
        </Suspense>
    );
}
