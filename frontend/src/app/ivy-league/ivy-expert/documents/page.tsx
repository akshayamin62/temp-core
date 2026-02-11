'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ivyApi from '@/lib/ivyApi';

interface Evaluation {
    score: number;
    feedback: string;
    evaluatedAt: string;
}

interface AcademicDoc {
    _id: string;
    documentType: string;
    customLabel?: string;
    fileUrl: string;
    fileName: string;
    uploadedAt: string;
    evaluation: Evaluation | null;
}

const DOC_LABELS: Record<string, string> = {
    BIRTH_CERTIFICATE: 'Birth Certificate',
    AADHAR_CARD: 'Aadhar Card',
    MARKSHEET_8: 'Class 8 Marksheet',
    MARKSHEET_9: 'Class 9 Marksheet',
    MARKSHEET_10: 'Class 10 Marksheet',
    MARKSHEET_11: 'Class 11 Marksheet',
    MARKSHEET_12: 'Class 12 Marksheet',
    UNIVERSITY_MARKSHEET: 'University Marksheet',
};

function InlineDocViewer({ url, onClose }: { url: string, onClose: () => void }) {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [loadError, setLoadError] = useState(false);
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);

    useEffect(() => {
        let cancelled = false;
        const fetchDoc = async () => {
            try {
                const res = await ivyApi.get(url, { responseType: 'blob' });
                if (!cancelled) {
                    const objectUrl = URL.createObjectURL(res.data);
                    setBlobUrl(objectUrl);
                }
            } catch {
                if (!cancelled) setLoadError(true);
            }
        };
        fetchDoc();
        return () => {
            cancelled = true;
            if (blobUrl) URL.revokeObjectURL(blobUrl);
        };
    }, [url]);

    return (
        <div className="mt-4 relative bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border-4 border-gray-800 animate-in fade-in zoom-in-95 duration-300">
            <div className="absolute top-4 right-4 z-10">
                <button
                    onClick={onClose}
                    className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all border border-white/20"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div className="min-h-[500px] flex items-center justify-center bg-gray-800">
                {loadError ? (
                    <p className="text-red-400 font-bold">Failed to load document</p>
                ) : !blobUrl ? (
                    <p className="text-gray-400 font-bold animate-pulse">Loading document...</p>
                ) : isImage ? (
                    <img src={blobUrl} alt="Document" className="max-w-full max-h-[800px] object-contain" />
                ) : (
                    <iframe src={blobUrl} className="w-full h-[600px] border-none" title="Document Viewer" />
                )}
            </div>
        </div>
    );
}

function EvaluationForm({ doc, studentIvyServiceId, onSave, onClose }: { doc: AcademicDoc, studentIvyServiceId: string, onSave: () => void, onClose?: () => void }) {
    const [score, setScore] = useState(doc.evaluation?.score.toString() || '');
    const [feedback, setFeedback] = useState(doc.evaluation?.feedback || '');
    const [submitting, setSubmitting] = useState(false);
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSave = async () => {
        const s = parseFloat(score);
        if (isNaN(s) || s < 0 || s > 10) {
            setMsg({ type: 'error', text: 'Score 0-10 required' });
            return;
        }
        setSubmitting(true);
        setMsg(null);
        try {
            await ivyApi.post(`/pointer1/evaluate`, {
                studentIvyServiceId,
                academicDocumentId: doc._id,
                score: s,
                feedback
            });
            setMsg({ type: 'success', text: 'Saved' });
            onSave();
        } catch (e: any) {
            setMsg({ type: 'error', text: 'Error' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="mt-4 p-5 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-black tracking-widest text-gray-600 uppercase">{doc.evaluation ? 'Update Evaluation' : 'Evaluate Marksheet'}</h4>
                {doc.evaluation && onClose && (
                    <button
                        onClick={onClose}
                        className="text-xs font-bold text-gray-400 hover:text-gray-600 uppercase underline"
                    >
                        Cancel
                    </button>
                )}
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <label className="block text-[10px] font-black tracking-widest text-gray-400 uppercase mb-1">Marksheet Score (0-10)</label>
                    <input
                        type="number"
                        min="0" max="10" step="0.5"
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-blue-500 outline-none font-bold text-gray-900 transition-all text-lg"
                        placeholder="0-10"
                    />
                </div>
                <div className="flex-[3]">
                    <label className="block text-[10px] font-black tracking-widest text-gray-400 uppercase mb-1">Feedback</label>
                    <input
                        type="text"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-blue-500 outline-none font-medium text-gray-700 transition-all text-sm"
                        placeholder="Observations..."
                    />
                </div>
                <div className="flex items-end">
                    <button
                        onClick={handleSave}
                        disabled={submitting}
                        className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all text-sm h-[52px]"
                    >
                        {submitting ? '...' : (doc.evaluation ? 'UPDATE' : 'SAVE')}
                    </button>
                </div>
            </div>
            {msg && <p className={`mt-2 text-xs font-bold ${msg.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>{msg.text}</p>}
        </div>
    );
}

function IvyExpertDocumentsContent() {
    const searchParams = useSearchParams();
    const studentId = searchParams.get('studentId');
    const studentIvyServiceId = searchParams.get('studentIvyServiceId');

    const [documents, setDocuments] = useState<AcademicDoc[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewingDocId, setViewingDocId] = useState<string | null>(null);
    const [updatingDocId, setUpdatingDocId] = useState<string | null>(null);

    const fetchStatus = async () => {
        if (!studentId) return;
        try {
            const response = await ivyApi.get(`/pointer1/status/${studentId}`, {
                params: { studentIvyServiceId }
            });
            setDocuments(response.data.data.documents);
        } catch (error) {
            console.error('Error fetching status:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStatus(); }, [studentId]);

    const identityDocs = documents.filter(d => ['BIRTH_CERTIFICATE', 'AADHAR_CARD'].includes(d.documentType));
    const schoolMarksheets = documents.filter(d => ['MARKSHEET_8', 'MARKSHEET_9', 'MARKSHEET_10', 'MARKSHEET_11', 'MARKSHEET_12'].includes(d.documentType));
    const uniMarksheets = documents.filter(d => d.documentType === 'UNIVERSITY_MARKSHEET');

    const totalEvaluated = documents.filter(d => d.evaluation).length;
    const sumScores = documents.reduce((acc, d) => acc + (d.evaluation?.score || 0), 0);
    const meanScore = totalEvaluated > 0 ? (sumScores / totalEvaluated).toFixed(2) : '0.00';

    if (loading) return <div className="p-12 text-center text-blue-400 font-black animate-pulse tracking-widest uppercase">Fetching Documents...</div>;

    const renderDocCard = (d: AcademicDoc, isMarksheet: boolean = false) => {
        const isViewing = viewingDocId === d._id;
        return (
            <div key={d._id} className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-100 transition-all mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">
                            {d.documentType === 'UNIVERSITY_MARKSHEET' ? d.customLabel : DOC_LABELS[d.documentType]}
                        </h3>
                        <p className="text-gray-400 text-sm font-mono mt-1">{d.fileName}</p>
                        {d.evaluation && (
                            <div className="mt-3 inline-flex items-center gap-2 bg-green-50 text-green-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                                <span className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                Score: {d.evaluation.score}/10
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setViewingDocId(isViewing ? null : d._id)}
                        className={`flex items-center gap-2 px-6 py-3 font-bold rounded-2xl transition-all border shadow-inner ${isViewing ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-600 border-transparent hover:border-blue-100'}`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {isViewing ? 'CLOSE VIEW' : 'VIEW FILE'}
                    </button>
                </div>

                {isViewing && (
                    <InlineDocViewer url={d.fileUrl} onClose={() => setViewingDocId(null)} />
                )}

                {isMarksheet && studentIvyServiceId && (
                    <>
                        {d.evaluation && updatingDocId !== d._id ? (
                            <div className="mt-4 p-5 bg-green-50 border border-green-200 rounded-2xl">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-xs font-black tracking-widest text-green-600 uppercase">Current Evaluation</h4>
                                    <button
                                        onClick={() => setUpdatingDocId(d._id)}
                                        className="px-4 py-2 bg-white border border-green-200 text-green-700 font-bold text-xs rounded-xl shadow-sm hover:bg-green-100 transition-all uppercase tracking-wider"
                                    >
                                        Update Score
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm font-bold text-green-900">
                                        Score: {d.evaluation.score}/10
                                    </p>
                                    {d.evaluation.feedback && (
                                        <p className="text-sm text-green-800">
                                            <span className="font-medium">Feedback:</span> {d.evaluation.feedback}
                                        </p>
                                    )}
                                    <p className="text-xs text-green-700">
                                        Evaluated: {new Date(d.evaluation.evaluatedAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <EvaluationForm
                                key={d._id + (d.evaluation?.evaluatedAt || 'unevaluated')}
                                doc={d}
                                studentIvyServiceId={studentIvyServiceId}
                                onSave={() => {
                                    setUpdatingDocId(null);
                                    fetchStatus();
                                }}
                                onClose={d.evaluation ? () => setUpdatingDocId(null) : undefined}
                            />
                        )}
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans tracking-tight">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                    <div>
                        <h1 className="text-6xl font-black text-gray-900 tracking-tighter mb-4">DOCUMENT<br /><span className="text-blue-600">REPOSITORY</span></h1>
                        <p className="text-xl text-gray-400 font-medium max-w-xl">Individual document verification and marksheet evaluation.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-16">
                    <section>
                        <h2 className="text-3xl font-black text-gray-900 mb-8 flex items-center gap-4">
                            <span className="h-10 w-2 bg-blue-500 rounded-full"></span>
                            IDENTITY VERIFICATION
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {identityDocs.map(d => renderDocCard(d))}
                            {identityDocs.length === 0 && <p className="text-gray-300 font-bold italic py-8 border-2 border-dashed rounded-3xl text-center md:col-span-2">No identity documents available.</p>}
                        </div>
                    </section>

                    <section>
                        <h2 className="text-3xl font-black text-gray-900 mb-8 flex items-center gap-4">
                            <span className="h-10 w-2 bg-indigo-500 rounded-full"></span>
                            SCHOOL MARKSHEETS
                        </h2>
                        {schoolMarksheets.map(d => renderDocCard(d, true))}
                        {schoolMarksheets.length === 0 && <p className="text-gray-300 font-bold italic py-12 border-2 border-dashed rounded-3xl text-center">No school marksheets available.</p>}
                    </section>

                    <section>
                        <h2 className="text-3xl font-black text-gray-900 mb-8 flex items-center gap-4">
                            <span className="h-10 w-2 bg-purple-500 rounded-full"></span>
                            UNIVERSITY RECORDS
                        </h2>
                        {uniMarksheets.map(d => renderDocCard(d, true))}
                        {uniMarksheets.length === 0 && <p className="text-gray-300 font-bold italic py-12 border-2 border-dashed rounded-3xl text-center">No university records available.</p>}
                    </section>
                </div>
            </div>
        </div>
    );
}

export default function IvyExpertDocumentsPage() {
    return (
        <Suspense fallback={<div className="p-12 text-center text-gray-300 font-black animate-pulse tracking-[1em] uppercase">Loading Documents...</div>}>
            <IvyExpertDocumentsContent />
        </Suspense>
    );
}
