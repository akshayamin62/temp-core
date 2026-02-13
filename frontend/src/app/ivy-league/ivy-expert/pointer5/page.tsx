'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import { ErrorHighlightedText } from '@/components/ErrorHighlightedText';
import { IVY_API_URL } from '@/lib/ivyApi';
import { fileApi } from '@/lib/useBlobUrl';

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

function IvyExpertPointer5Content() {
    const searchParams = useSearchParams();
    const studentIvyServiceId = searchParams.get('studentIvyServiceId');
    const ivyExpertId = searchParams.get('ivyExpertId') || '';

    const [tasks, setTasks] = useState<TaskStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddTask, setShowAddTask] = useState(false);
    const [newTaskDescription, setNewTaskDescription] = useState('');
    const [newWordLimit, setNewWordLimit] = useState('500');
    const [newAttachments, setNewAttachments] = useState<File[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
    const [evaluations, setEvaluations] = useState<{ [taskId: string]: { score: string; feedback: string } }>({});
    const [pointer5Score, setPointer5Score] = useState<number | null>(null);

    useEffect(() => {
        if (studentIvyServiceId) {
            fetchStatus();
            fetchPointer5Score();
        }
    }, [studentIvyServiceId]);

    const fetchStatus = async () => {
        try {
            const response = await axios.get(`${IVY_API_URL}/pointer5/status/${studentIvyServiceId}`);
            if (response.data.success) {
                setTasks(response.data.data.tasks || []);
                // Initialize evaluation states
                const evalStates: { [taskId: string]: { score: string; feedback: string } } = {};
                response.data.data.tasks?.forEach((t: TaskStatus) => {
                    evalStates[t.task._id] = {
                        score: t.evaluation?.score?.toString() || '',
                        feedback: t.evaluation?.feedback || '',
                    };
                });
                setEvaluations(evalStates);
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

    const handleAddTask = async () => {
        if (!newTaskDescription.trim()) {
            setMessage({ type: 'error', text: 'Task description is required' });
            return;
        }

        setSubmitting(true);
        setMessage(null);

        try {
            const formData = new FormData();
            formData.append('studentIvyServiceId', studentIvyServiceId!);
            formData.append('ivyExpertId', ivyExpertId);
            formData.append('taskDescription', newTaskDescription);
            formData.append('wordLimit', newWordLimit);
            newAttachments.forEach((file) => {
                formData.append('attachments', file);
            });

            const response = await axios.post(`${IVY_API_URL}/pointer5/task`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (response.data.success) {
                setMessage({ type: 'success', text: 'Task added successfully!' });
                setNewTaskDescription('');
                setNewWordLimit('500');
                setNewAttachments([]);
                setShowAddTask(false);
                fetchStatus();
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to add task' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm('Are you sure you want to delete this task?')) return;

        try {
            await axios.delete(`${IVY_API_URL}/pointer5/task/${taskId}`);
            setMessage({ type: 'success', text: 'Task deleted successfully!' });
            fetchStatus();
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to delete task' });
        }
    };

    const handleEvaluate = async (taskStatus: TaskStatus) => {
        const evalData = evaluations[taskStatus.task._id];
        if (!evalData?.score) {
            setMessage({ type: 'error', text: 'Score is required' });
            return;
        }

        const scoreNum = parseFloat(evalData.score);
        if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10) {
            setMessage({ type: 'error', text: 'Score must be between 0 and 10' });
            return;
        }

        try {
            await axios.post(`${IVY_API_URL}/pointer5/evaluate`, {
                submissionId: taskStatus.submission!._id,
                taskId: taskStatus.task._id,
                studentIvyServiceId,
                ivyExpertId,
                score: scoreNum,
                feedback: evalData.feedback,
            });
            setMessage({ type: 'success', text: 'Evaluation saved successfully!' });
            await fetchStatus();
            await fetchPointer5Score(); // Update score after evaluation
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to save evaluation' });
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

    if (!studentIvyServiceId) {
        return (
            <div className="min-h-screen bg-gray-50 p-6 md:p-12">
                <div className="max-w-6xl mx-auto bg-red-50 text-red-800 border border-red-200 p-6 rounded-2xl">
                    Student Ivy Service ID is required.
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-12">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <header className="mb-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-5xl font-black text-gray-900 tracking-tighter mb-4">
                            POINTER 5: AUTHENTIC & REFLECTIVE STORYTELLING
                        </h1>
                        <p className="text-xl text-gray-400 font-medium max-w-xl">
                            Assign writing tasks and evaluate student responses
                        </p>
                    </div>

                    {/* Pointer 5 Score Card */}
                    {/* {pointer5Score !== null && pointer5Score !== undefined && (
                        <div className="bg-white p-10 rounded-[3rem] shadow-2xl border-4 border-brand-50 flex flex-col items-center justify-center text-center scale-110 md:mr-10">
                            <span className="text-[10px] font-black tracking-[0.3em] text-gray-400 uppercase mb-2">Current Mean Score</span>
                            <div className="text-7xl font-black text-brand-600 leading-none">{typeof pointer5Score === 'number' ? pointer5Score.toFixed(2) : '0.00'}</div>
                        </div>
                    )} */}
                </header>

                {/* Add Task Button */}
                {!showAddTask && (
                    <div className="mb-8 flex justify-end">
                        <button
                            onClick={() => setShowAddTask(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-all shadow-lg hover:shadow-xl"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Task
                        </button>
                    </div>
                )}

                {/* Add Task Modal */}
                {showAddTask && (
                    <div className="mb-8 bg-white rounded-3xl p-8 shadow-sm border-2 border-brand-200">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">New Task</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Task Description</label>
                                <textarea
                                    value={newTaskDescription}
                                    onChange={(e) => setNewTaskDescription(e.target.value)}
                                    placeholder="Enter task description..."
                                    rows={4}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-gray-900 bg-white resize-none"
                                />
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Word Limit</label>
                                    <input
                                        type="number"
                                        value={newWordLimit}
                                        onChange={(e) => setNewWordLimit(e.target.value)}
                                        min="50"
                                        max="5000"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-gray-900 bg-white"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Attachments (Optional)</label>
                                    <input
                                        type="file"
                                        multiple
                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                        onChange={(e) => setNewAttachments(Array.from(e.target.files || []))}
                                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                                    />
                                </div>
                            </div>
                            {newAttachments.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {newAttachments.map((file, idx) => (
                                        <span key={idx} className="px-3 py-1 bg-brand-50 text-brand-700 text-sm rounded-lg">
                                            {file.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setShowAddTask(false);
                                        setNewTaskDescription('');
                                        setNewWordLimit('500');
                                        setNewAttachments([]);
                                    }}
                                    className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddTask}
                                    disabled={submitting}
                                    className="px-6 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-all disabled:opacity-50"
                                >
                                    {submitting ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">No Tasks Yet</h2>
                        <p className="text-gray-600">Click "Add Task" to create a writing assignment for the student.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {tasks.map((taskStatus, index) => (
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
                                                <span className="px-4 py-2 bg-yellow-100 text-yellow-700 font-bold rounded-xl">
                                                    Pending Evaluation
                                                </span>
                                            ) : (
                                                <span className="px-4 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl">
                                                    Awaiting Response
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
                                        <div className="bg-gray-50 rounded-2xl p-6">
                                            <h3 className="text-sm font-black text-gray-500 uppercase tracking-wider mb-3">Task Description</h3>
                                            <p className="text-gray-900 whitespace-pre-wrap">{taskStatus.task.taskDescription}</p>
                                            {taskStatus.task.attachments.length > 0 && (
                                                <div className="mt-4">
                                                    <p className="text-sm font-bold text-gray-500 mb-2">Attachments:</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {taskStatus.task.attachments.map((att, idx) => (
                                                            <button
                                                                key={idx}
                                                                onClick={() => downloadFile(att.fileUrl, att.fileName)}
                                                                className="px-3 py-1 bg-brand-50 text-brand-700 text-sm rounded-lg hover:bg-brand-100 transition-all"
                                                            >
                                                                📎 {att.fileName}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="mt-4 flex justify-end">
                                                <button
                                                    onClick={() => handleDeleteTask(taskStatus.task._id)}
                                                    className="text-red-600 text-sm font-bold hover:text-red-800"
                                                >
                                                    Delete Task
                                                </button>
                                            </div>
                                        </div>

                                        {/* Student Response */}
                                        {taskStatus.submission ? (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-10 gap-4">
                                                    <div className="col-span-7 bg-brand-50 rounded-2xl p-6">
                                                        <h3 className="text-sm font-black text-brand-600 uppercase tracking-wider mb-3">Student Response</h3>
                                                        <ErrorHighlightedText text={taskStatus.submission.studentResponse} />
                                                        <p className="text-sm text-brand-600 mt-4">Word Count: {taskStatus.submission.wordCount}/{taskStatus.task.wordLimit}</p>
                                                    </div>
                                                    <div className="col-span-3 bg-brand-50 rounded-2xl p-6">
                                                        <h3 className="text-sm font-black text-brand-600 uppercase tracking-wider mb-3">Words Learned</h3>
                                                        <p className="text-gray-900 whitespace-pre-wrap">{taskStatus.submission.wordsLearned || 'None provided'}</p>
                                                    </div>
                                                </div>

                                                {/* Evaluation Section */}
                                                <div className="bg-green-50 rounded-2xl p-6">
                                                    <h3 className="text-sm font-black text-green-600 uppercase tracking-wider mb-4">
                                                        {taskStatus.evaluation ? 'Update Evaluation' : 'Evaluate Response'}
                                                    </h3>
                                                    <div className="flex gap-4">
                                                        <div className="w-32">
                                                            <label className="block text-sm font-bold text-gray-700 mb-2">Score (0-10)</label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="10"
                                                                step="0.5"
                                                                value={evaluations[taskStatus.task._id]?.score || ''}
                                                                onChange={(e) => setEvaluations(prev => ({
                                                                    ...prev,
                                                                    [taskStatus.task._id]: { ...prev[taskStatus.task._id], score: e.target.value }
                                                                }))}
                                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 bg-white"
                                                            />
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="block text-sm font-bold text-gray-700 mb-2">Feedback</label>
                                                            <input
                                                                type="text"
                                                                value={evaluations[taskStatus.task._id]?.feedback || ''}
                                                                onChange={(e) => setEvaluations(prev => ({
                                                                    ...prev,
                                                                    [taskStatus.task._id]: { ...prev[taskStatus.task._id], feedback: e.target.value }
                                                                }))}
                                                                placeholder="Enter feedback..."
                                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 bg-white"
                                                            />
                                                        </div>
                                                        <div className="flex items-end">
                                                            <button
                                                                onClick={() => handleEvaluate(taskStatus)}
                                                                className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all"
                                                            >
                                                                {taskStatus.evaluation ? 'Update' : 'Submit'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-gray-100 rounded-2xl p-6 text-center text-gray-500">
                                                Student has not submitted a response yet.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function IvyExpertPointer5Page() {
    return (
        <Suspense fallback={<div className="p-20 text-center">Loading...</div>}>
            <IvyExpertPointer5Content />
        </Suspense>
    );
}
