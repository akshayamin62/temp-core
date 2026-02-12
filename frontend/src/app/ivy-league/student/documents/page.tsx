'use client';

import { useState, useEffect, Suspense } from 'react';
import axios from 'axios';
import { useStudentService } from '../useStudentService';
import { IVY_API_URL } from '@/lib/ivyApi';
import { useBlobUrl } from '@/lib/useBlobUrl';

interface AcademicDoc {
    _id: string;
    documentType: string;
    customLabel?: string;
    fileUrl: string;
    fileName: string;
    uploadedAt: string;
}

const DOCUMENT_TYPES = [
    { key: 'BIRTH_CERTIFICATE', label: 'Birth Certificate', description: 'Official government issued birth certificate.' },
    { key: 'AADHAR_CARD', label: 'Aadhar Card', description: 'Masked Aadhar card (e.g., xxxx xxxx 1234).' },
    { key: 'MARKSHEET_8', label: 'Class 8 Marksheet', description: 'Academic record for 8th grade.' },
    { key: 'MARKSHEET_9', label: 'Class 9 Marksheet', description: 'Academic record for 9th grade.' },
    { key: 'MARKSHEET_10', label: 'Class 10 Marksheet', description: 'Academic record for 10th grade.' },
    { key: 'MARKSHEET_11', label: 'Class 11 Marksheet', description: 'Academic record for 11th grade.' },
    { key: 'MARKSHEET_12', label: 'Class 12 Marksheet', description: 'Academic record for 12th grade.' },
];

function InlineDocViewer({ url, onClose }: { url: string, onClose: () => void }) {
    const { blobUrl, loading, error } = useBlobUrl(url);
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);

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
                {error ? (
                    <p className="text-red-400 font-bold">Failed to load document</p>
                ) : loading || !blobUrl ? (
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

function DocumentsContent() {
    const { studentId, studentIvyServiceId, loading: serviceLoading, error: serviceError, readOnly } = useStudentService();

    const [documents, setDocuments] = useState<AcademicDoc[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState<string | null>(null);
    const [universityLabel, setUniversityLabel] = useState('');
    const [viewingDocId, setViewingDocId] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchStatus = async () => {
        if (!studentId) return;
        try {
            const response = await axios.get(`${IVY_API_URL}/pointer1/status/${studentId}`, {
                params: { studentIvyServiceId }
            });
            setDocuments(response.data.data.documents);
        } catch (error) {
            console.error('Error fetching status:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (studentId && studentIvyServiceId) {
            fetchStatus();
        }
    }, [studentId, studentIvyServiceId]);

    const handleFileChange = async (type: string, file: File, label?: string) => {
        if (!studentId || !studentIvyServiceId) {
            setMessage({ type: 'error', text: 'Missing student or service information' });
            return;
        }

        if (type === 'UNIVERSITY_MARKSHEET' && !label) {
            setMessage({ type: 'error', text: 'Please provide a semester name (e.g., Sem 1)' });
            return;
        }

        const formData = new FormData();
        formData.append('documentType', type);
        formData.append('studentId', studentId);
        formData.append('studentIvyServiceId', studentIvyServiceId);
        if (label) formData.append('customLabel', label);
        formData.append('document', file);

        setUploading(label ? `${type}-${label}` : type);
        setMessage(null);

        try {
            await axios.post(`${IVY_API_URL}/pointer1/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setMessage({ type: 'success', text: 'Document uploaded successfully!' });
            setUniversityLabel('');
            fetchStatus();
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Upload failed' });
        } finally {
            setUploading(null);
        }
    };

    if (serviceLoading || loading) return <div className="p-8 text-center text-gray-500 font-medium tracking-wide animate-pulse">Loading documents...</div>;
    if (serviceError) return <div className="p-8 text-center text-red-500 font-medium">{serviceError}</div>;

    const getExisting = (type: string) => documents.find(d => d.documentType === type);
    const getUniversityDocs = () => documents.filter(d => d.documentType === 'UNIVERSITY_MARKSHEET');

    return (
        <div className="max-w-4xl mx-auto py-12 px-6">

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

            <header className="mb-12">
                <h1 className="text-5xl font-black text-gray-900 mb-4 tracking-tight">Document Repository</h1>
                <p className="text-xl text-gray-500 max-w-2xl leading-relaxed">Upload and manage all your identity proofs and academic marksheets.</p>
            </header>

            {message && (
                <div className={`mb-10 p-5 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 ${message.type === 'success' ? 'bg-green-50 text-green-800 border-l-4 border-green-500' : 'bg-red-50 text-red-800 border-l-4 border-red-500'
                    }`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${message.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                        <span className="text-lg">{message.type === 'success' ? '✓' : '⚠'}</span>
                    </div>
                    <p className="font-semibold">{message.text}</p>
                </div>
            )}

            <div className="space-y-6">
                {/* Standard Documents */}
                <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6 flex items-center gap-2">
                    <span className="h-2 w-2 bg-blue-600 rounded-full"></span>
                    Identity & School Records
                </h2>
                <div className="grid gap-6">
                    {DOCUMENT_TYPES.map((doc) => {
                        const existing = getExisting(doc.key);
                        const isUploading = uploading === doc.key;
                        const isViewing = viewingDocId === doc.key;

                        return (
                            <div key={doc.key} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-6 hover:shadow-xl hover:border-blue-100 transition-all group">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{doc.label}</h3>
                                        <p className="text-gray-500 mt-1 font-medium">{doc.description}</p>
                                        {existing && (
                                            <div className="mt-3 flex items-center gap-2 text-blue-500 text-sm font-bold bg-blue-50 w-fit px-3 py-1 rounded-full">
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                </svg>
                                                {existing.fileName}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {existing && (
                                            <button
                                                onClick={() => setViewingDocId(isViewing ? null : doc.key)}
                                                className={`p-4 rounded-2xl transition-all shadow-inner ${isViewing ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                            >
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            </button>
                                        )}

                                        <label className={`flex items-center justify-center px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all cursor-pointer whitespace-nowrap active:scale-95 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''} ${readOnly ? 'hidden' : ''}`}>
                                            {isUploading ? 'Uploading...' : (existing ? 'Replace File' : 'Upload File')}
                                            <input type="file" className="hidden" accept=".pdf,image/*" disabled={isUploading} onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleFileChange(doc.key, file);
                                            }} />
                                        </label>
                                    </div>
                                </div>
                                {isViewing && existing && (
                                    <InlineDocViewer url={existing.fileUrl} onClose={() => setViewingDocId(null)} />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* University Marksheets Section */}
                <h2 className="text-2xl font-bold text-gray-900 mt-16 mb-6 flex items-center gap-2">
                    <span className="h-2 w-2 bg-purple-600 rounded-full"></span>
                    University Marksheets (Semester Wise)
                </h2>

                {!readOnly && (
                <div className="bg-purple-50 p-8 rounded-3xl border border-purple-100 flex flex-col md:flex-row items-end gap-4 mb-8">
                    <div className="flex-1 w-full text-left">
                        <label className="block text-sm font-bold text-purple-700 mb-2 uppercase tracking-widest ml-1">Semester Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Sem 1, Sem 2..."
                            className="w-full px-6 py-4 bg-white border-2 border-purple-100 rounded-2xl focus:border-purple-500 outline-none transition-all font-bold text-purple-900 placeholder-purple-200 shadow-inner"
                            value={universityLabel}
                            onChange={(e) => setUniversityLabel(e.target.value)}
                        />
                    </div>
                    <label className={`w-full md:w-auto flex items-center justify-center px-8 py-4 bg-purple-600 text-white font-extrabold rounded-2xl shadow-lg shadow-purple-100 hover:bg-purple-700 transition-all cursor-pointer active:scale-95 ${!universityLabel || uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {uploading?.startsWith('UNIVERSITY') ? 'Uploading...' : 'Add Marksheet'}
                        <input
                            type="file"
                            className="hidden"
                            disabled={!universityLabel || !!uploading}
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileChange('UNIVERSITY_MARKSHEET', file, universityLabel);
                            }}
                        />
                    </label>
                </div>
                )}

                <div className="grid gap-4">
                    {getUniversityDocs().map((doc) => {
                        const isViewing = viewingDocId === doc._id;
                        return (
                            <div key={doc._id} className="bg-white p-5 rounded-3xl border border-gray-100 flex flex-col gap-4 group hover:border-purple-200 transition-all shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-extrabold text-gray-900 group-hover:text-purple-600 transition-colors uppercase">{doc.customLabel}</h4>
                                        <p className="text-xs text-gray-400 font-mono mt-1">{doc.fileName}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setViewingDocId(isViewing ? null : doc._id)}
                                            className={`p-3 rounded-xl transition-all ${isViewing ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'}`}
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        </button>
                                        {!readOnly && (
                                        <label className="text-xs font-bold text-purple-600 cursor-pointer hover:underline bg-purple-50 px-3 py-1.5 rounded-lg">
                                            Update
                                            <input type="file" className="hidden" onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleFileChange('UNIVERSITY_MARKSHEET', file, doc.customLabel);
                                            }} />
                                        </label>
                                        )}
                                    </div>
                                </div>
                                {isViewing && (
                                    <InlineDocViewer url={doc.fileUrl} onClose={() => setViewingDocId(null)} />
                                )}
                            </div>
                        );
                    })}
                    {getUniversityDocs().length === 0 && (
                        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-3xl">
                            <p className="text-gray-400 font-bold italic tracking-wide">No university marksheets uploaded yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function DocumentsPage() {
    return (
        <div className="font-sans">
            <Suspense fallback={<div className="p-12 text-center text-blue-400 font-black animate-pulse tracking-widest uppercase">Loading documents...</div>}>
                <DocumentsContent />
            </Suspense>
        </div>
    );
}
