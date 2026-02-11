'use client';

import { useEffect, useState } from 'react';
import { documentAPI } from '@/lib/documentAPI';
import { coreDocumentAPI } from '@/lib/coreDocumentAPI';
import { YOUR_DOCUMENTS_CONFIG } from '@/config/yourDocumentsConfig';
import { StudentDocument, DocumentCategory, DocumentStatus } from '@/types';
import toast from 'react-hot-toast';
import { Upload, Download, Check, X, Plus, FileText, AlertCircle, Trash2 } from 'lucide-react';

interface DocumentUploadSectionProps {
  registrationId: string;
  studentId: string;
  userRole: 'STUDENT' | 'OPS' | 'SUPER_ADMIN' | 'ADMIN' | 'COUNSELOR';
  sectionTitle: string;
}

interface COREDocumentField {
  _id: string;
  documentKey: string;
  documentName: string;
  documentType?: 'CORE' | 'EXTRA';
  category: 'PRIMARY' | 'SECONDARY';
  required: boolean;
  helpText?: string;
  allowMultiple: boolean;
  order: number;
}

export default function DocumentUploadSection({
  registrationId,
  studentId,
  userRole,
  sectionTitle,
}: DocumentUploadSectionProps) {
  // Only STUDENT, OPS, and SUPER_ADMIN can upload documents
  // ADMIN and COUNSELOR have read-only access
  const canUpload = ['STUDENT', 'OPS', 'SUPER_ADMIN'].includes(userRole);
  
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [coreDocumentFields, setCOREDocumentFields] = useState<COREDocumentField[]>([]);
  const [extraDocumentFields, setExtraDocumentFields] = useState<COREDocumentField[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [showAddExtraFieldModal, setShowAddExtraFieldModal] = useState(false);
  const [rejectingDocumentId, setRejectingDocumentId] = useState<string | null>(null);
  const [rejectionMessage, setRejectionMessage] = useState('');
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldHelpText, setNewFieldHelpText] = useState('');
  const [newFieldAllowMultiple, setNewFieldAllowMultiple] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<{docId: string, fieldKey: string} | null>(null);
  const [documentBlobUrls, setDocumentBlobUrls] = useState<{[key: string]: string}>({});
  const [uploadingMultiple, setUploadingMultiple] = useState<{documentKey: string, documentName: string, category: string, file: File, allowMultiple: boolean, documentIdToReplace?: string} | null>(null);
  const [customDocumentName, setCustomDocumentName] = useState('');

  const isYourDocumentsSection = sectionTitle.toLowerCase().includes('your');
  const isCOREDocumentsSection = sectionTitle.toLowerCase().includes('core');

  useEffect(() => {
    fetchData();
    
    // Cleanup blob URLs on unmount
    return () => {
      Object.values(documentBlobUrls).forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [registrationId, sectionTitle]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (isCOREDocumentsSection) {
        await Promise.all([fetchCOREDocumentFields(), fetchDocuments()]);
      } else if (isYourDocumentsSection) {
        await Promise.all([fetchExtraDocumentFields(), fetchDocuments()]);
      } else {
        await fetchDocuments();
      }
    } catch (error: any) {
      console.warn('Failed to fetch data:', error);
      if ((error as any).isNetworkError) {
        toast.error('Cannot connect to server. Please ensure the backend is running.');
      } else if ((error as any).isTimeout) {
        toast.error('Server request timeout. Please try again.');
      } else {
        toast.error('Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCOREDocumentFields = async () => {
    try {
      const response = await coreDocumentAPI.getCOREDocumentFields(registrationId, 'CORE');
      const fields = response.data.data.fields || [];
      setCOREDocumentFields(fields);
    } catch (error: any) {
      console.error('Failed to fetch CORE document fields:', error);
      throw error;
    }
  };

  const fetchExtraDocumentFields = async () => {
    try {
      const response = await coreDocumentAPI.getCOREDocumentFields(registrationId, 'EXTRA');
      const fields = response.data.data.fields || [];
      setExtraDocumentFields(fields);
    } catch (error: any) {
      console.error('Failed to fetch Extra document fields:', error);
      // Don't throw - Extra documents are optional, just log the error
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await documentAPI.getDocuments(registrationId);
      const docs = response.data.data.documents || [];
      setDocuments(docs);
    } catch (error: any) {
      console.warn('Failed to fetch documents:', error);
      throw error;
    }
  };

  const handleFileSelect = async (
    documentKey: string,
    documentName: string,
    category: 'PRIMARY' | 'SECONDARY',
    file: File,
    allowMultiple: boolean = false,
    documentIdToReplace?: string
  ) => {
    // Validate file
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF, JPG, and PNG files are allowed');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    // If multiple uploads allowed, prompt for custom name
    if (allowMultiple) {
      setUploadingMultiple({ documentKey, documentName, category, file, allowMultiple, documentIdToReplace });
      return;
    }

    // Single file upload - proceed directly
    await performUpload(documentKey, documentName, category, file, allowMultiple, undefined, documentIdToReplace);
  };

  const performUpload = async (
    documentKey: string,
    documentName: string,
    category: string,
    file: File,
    allowMultiple: boolean = false,
    customName?: string,
    documentIdToReplace?: string
  ) => {
    try {
      setUploading(documentKey);
      
      // Delete old document if replacing
      if (documentIdToReplace) {
        await documentAPI.deleteDocument(documentIdToReplace);
      }
      
      const finalDocName = customName || documentName;
      await documentAPI.uploadDocument(
        registrationId,
        studentId,
        documentKey,
        finalDocName,
        category as DocumentCategory,
        file,
        false,
        allowMultiple
      );
      toast.success(documentIdToReplace ? 'Document reuploaded successfully' : 'Document uploaded successfully');
      await fetchDocuments();
    } catch (error: any) {
      console.warn('Upload error:', error);
      if ((error as any).isNetworkError) {
        toast.error('Cannot connect to server. Please ensure the backend is running.');
      } else if ((error as any).isTimeout) {
        toast.error('Server request timeout. Please try again.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to upload document');
      }
    } finally {
      setUploading(null);
      setUploadingMultiple(null);
      setCustomDocumentName('');
    }
  };

  const handleMultipleUploadSubmit = async () => {
    if (!customDocumentName.trim()) {
      toast.error('Please enter a document name');
      return;
    }

    if (uploadingMultiple) {
      await performUpload(
        uploadingMultiple.documentKey,
        uploadingMultiple.documentName,
        uploadingMultiple.category,
        uploadingMultiple.file,
        uploadingMultiple.allowMultiple,
        customDocumentName,
        uploadingMultiple.documentIdToReplace
      );
    }
  };

  const handleDownload = async (doc: StudentDocument) => {
    try {
      const response = await documentAPI.downloadDocument(doc._id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: any) {
      console.warn('Download error:', error);
      toast.error('Failed to download document');
    }
  };

  const handleApprove = async (doc: StudentDocument) => {
    try {
      await documentAPI.approveDocument(doc._id);
      toast.success('Document approved');
      await fetchDocuments();
    } catch (error: any) {
      console.warn('Approve error:', error);
      toast.error('Failed to approve document');
    }
  };

  const handleRejectClick = (documentId: string) => {
    setRejectingDocumentId(documentId);
    setRejectionMessage('');
  };

  const handleRejectSubmit = async (documentId: string) => {
    if (!rejectionMessage.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      await documentAPI.rejectDocument(documentId, rejectionMessage);
      toast.success('Document rejected');
      setRejectingDocumentId(null);
      setRejectionMessage('');
      await fetchDocuments();
    } catch (error: any) {
      console.warn('Reject error:', error);
      toast.error('Failed to reject document');
    }
  };

  const handleAddCOREDocumentField = async () => {
    if (!newFieldName.trim()) {
      toast.error('Please enter a document name');
      return;
    }

    try {
      // Always set category as SECONDARY and required as false
      await coreDocumentAPI.addCOREDocumentField(
        registrationId,
        newFieldName,
        DocumentCategory.SECONDARY,
        false, // required is always false
        newFieldHelpText || undefined,
        newFieldAllowMultiple,
        'CORE' // Document type
      );
      toast.success('CORE document field added successfully');
      setShowAddFieldModal(false);
      setNewFieldName('');
      setNewFieldHelpText('');
      setNewFieldAllowMultiple(false);
      await fetchCOREDocumentFields();
    } catch (error: any) {
      console.warn('Add field error:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to add CORE document field');
      }
    }
  };

  const handleAddExtraDocumentField = async () => {
    if (!newFieldName.trim()) {
      toast.error('Please enter a document name');
      return;
    }

    try {
      // Always set category as SECONDARY and required as false
      await coreDocumentAPI.addCOREDocumentField(
        registrationId,
        newFieldName,
        DocumentCategory.SECONDARY,
        false, // required is always false
        newFieldHelpText || undefined,
        newFieldAllowMultiple,
        'EXTRA' // Document type for Extra documents
      );
      toast.success('Extra document field added successfully');
      setShowAddExtraFieldModal(false);
      setNewFieldName('');
      setNewFieldHelpText('');
      setNewFieldAllowMultiple(false);
      await fetchExtraDocumentFields();
    } catch (error: any) {
      console.warn('Add Extra field error:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to add Extra document field');
      }
    }
  };

  const getDocumentsForField = (documentKey: string): StudentDocument[] => {
    return documents.filter((doc) => doc.documentKey === documentKey);
  };


  const handleViewDocument = async (documentId: string, fieldKey: string) => {
    // Toggle view
    if (viewingDocument?.docId === documentId) {
      setViewingDocument(null);
      return;
    }

    // Check if we already have the blob URL
    if (documentBlobUrls[documentId]) {
      setViewingDocument({ docId: documentId, fieldKey });
      return;
    }

    // Fetch the document as blob
    try {
      const response = await documentAPI.viewDocument(documentId);
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const blobUrl = URL.createObjectURL(blob);
      
      setDocumentBlobUrls(prev => ({ ...prev, [documentId]: blobUrl }));
      setViewingDocument({ docId: documentId, fieldKey });
    } catch (error) {
      console.error('Error viewing document:', error);
      toast.error('Failed to load document preview');
    }
  };

  const renderDocumentField = (
    documentKey: string,
    documentName: string,
    category: 'PRIMARY' | 'SECONDARY',
    required: boolean,
    allowMultiple: boolean,
    helpText?: string
  ) => {
    const fieldDocuments = getDocumentsForField(documentKey);
    
    const isUploading = uploading === documentKey;
    
    return (
      <div
        key={documentKey}
        className="border-2 border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-gray-50"
      >
        {/* Show field title and upload button only if no documents OR if multiple upload allowed */}
        {(fieldDocuments.length === 0 || allowMultiple) && (
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-600" />
                <h4 className="font-medium text-gray-900">{documentName}</h4>
                {required && (
                  <span className="text-sm text-red-500 font-bold">*</span>
                )}
                {allowMultiple && (
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Multiple</span>
                )}
              </div>
              {helpText && (
                <p className="text-sm text-gray-700 mt-1">{helpText}</p>
              )}
            </div>

            {/* Upload Button */}
            {canUpload && (allowMultiple || fieldDocuments.length === 0) && (
              <div className="ml-4">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(documentKey, documentName, category, file, allowMultiple);
                      e.target.value = '';
                    }}
                    disabled={isUploading}
                  />
                  <div className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all text-sm font-semibold flex items-center gap-2 whitespace-nowrap shadow-md hover:shadow-lg">
                    <Upload className="w-4 h-4" />
                    {isUploading ? 'Uploading...' : allowMultiple && fieldDocuments.length > 0 ? 'Add More' : 'Upload'}
                  </div>
                </label>
              </div>
            )}
          </div>
        )}            {/* Show all uploaded documents for this field */}
            {fieldDocuments.length > 0 && (
              <div className={allowMultiple ? "space-y-3" : ""}>
                {fieldDocuments.map((document) => (
                  <div key={document._id} className="border-2 border-blue-100 rounded-xl p-5 bg-gradient-to-r from-white to-blue-50/30 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-200">
                    <div className="flex items-center justify-between gap-4">
                      {/* Document Name */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        <h5 className="text-base font-semibold text-gray-900 truncate">{document.documentName}</h5>
                      </div>
                      
                      {/* Status Badge */}
                      <div className="flex-shrink-0">
                        {document.status === DocumentStatus.PENDING && (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300">
                            <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                            Pending
                          </span>
                        )}
                        {document.status === DocumentStatus.APPROVED && (
                          <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-500">
                            <Check className="w-4 h-4 text-white" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleViewDocument(document._id, documentKey)}
                          className={`px-4 py-2 rounded-lg transition-all text-xs font-semibold flex items-center gap-1.5 shadow-sm ${
                            viewingDocument?.docId === document._id
                              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md'
                              : 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 hover:from-blue-100 hover:to-blue-200 border border-blue-200'
                          }`}
                        >
                          <FileText className="w-4 h-4" />
                          {viewingDocument?.docId === document._id ? 'Hide' : 'View'}
                        </button>
                        
                        <button
                          onClick={() => handleDownload(document)}
                          className="px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all text-xs font-semibold flex items-center gap-1.5 border border-gray-300 shadow-sm"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                        
                        {userRole === 'SUPER_ADMIN' && (
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileSelect(documentKey, documentName, category, file, allowMultiple, document._id);
                                e.target.value = '';
                              }}
                              disabled={isUploading}
                            />
                            <div className="px-4 py-2 bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 rounded-lg hover:from-purple-100 hover:to-purple-200 transition-all text-xs font-semibold flex items-center gap-1.5 border border-purple-300 shadow-sm">
                              <Upload className="w-4 h-4" />
                              Reupload
                            </div>
                          </label>
                        )}
                        
                        {(userRole === 'OPS' || userRole === 'SUPER_ADMIN') && document.status === DocumentStatus.PENDING && (
                          <>
                            <button
                              onClick={() => handleApprove(document)}
                              className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                            >
                              <Check className="w-4 h-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectClick(document._id)}
                              className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                            >
                              <X className="w-4 h-4" />
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Inline Document Viewer */}
                    {viewingDocument?.docId === document._id && documentBlobUrls[document._id] && (
                      <div className="mt-3 border-t pt-3">
                        <div className="bg-white rounded border border-gray-300 overflow-hidden">
                          {document.mimeType === 'application/pdf' ? (
                            <iframe
                              src={documentBlobUrls[document._id]}
                              className="w-full h-[600px] border-0"
                              title={document.fileName}
                            />
                          ) : document.mimeType.startsWith('image/') ? (
                            <img
                              src={documentBlobUrls[document._id]}
                              alt={document.fileName}
                              className="w-full h-auto max-h-[600px] object-contain"
                            />
                          ) : document.mimeType === 'application/msword' || document.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? (
                            <div className="p-8 text-center">
                              <FileText className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                              <p className="text-gray-900 font-medium mb-2">Word Document Preview Not Available</p>
                              <p className="text-sm text-gray-600 mb-4">This file type cannot be previewed in the browser.</p>
                              <button
                                onClick={() => handleDownload(document)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                              >
                                <Download className="w-4 h-4" />
                                Download to View
                              </button>
                            </div>
                          ) : (
                            <div className="p-8 text-center">
                              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-900 font-medium mb-2">Preview Not Available</p>
                              <p className="text-sm text-gray-600 mb-4">This file type cannot be previewed in the browser.</p>
                              <button
                                onClick={() => handleDownload(document)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                              >
                                <Download className="w-4 h-4" />
                                Download to View
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Inline Rejection Form */}
                    {rejectingDocumentId === document._id && (
                      <div className="mt-4 border-t-2 border-red-100 pt-4">
                        <div className="bg-gradient-to-r from-red-50 to-red-100/50 border-2 border-red-200 rounded-xl p-5 shadow-inner">
                          <h4 className="text-sm font-semibold text-red-900 mb-2">Reject Document</h4>
                          <p className="text-xs text-red-700 mb-3">
                            Please provide a reason for rejecting this document.
                          </p>
                          <textarea
                            value={rejectionMessage}
                            onChange={(e) => setRejectionMessage(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm text-gray-900 bg-white shadow-sm"
                            placeholder="Enter rejection reason..."
                            rows={3}
                            autoFocus
                          />
                          <div className="flex justify-end gap-2 mt-4">
                            <button
                              onClick={() => {
                                setRejectingDocumentId(null);
                                setRejectionMessage('');
                              }}
                              className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 rounded-lg transition-all border border-gray-300 bg-white"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleRejectSubmit(document._id)}
                              className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-md"
                            >
                              Reject Document
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}              </div>
            )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-900">Loading documents...</p>
        </div>
      </div>
    );
  }

  // Render Your Documents Section
  if (isYourDocumentsSection) {
    const primaryFields = YOUR_DOCUMENTS_CONFIG.filter((f) => f.category === 'PRIMARY');
    const secondaryFields = YOUR_DOCUMENTS_CONFIG.filter((f) => f.category === 'SECONDARY');

    return (
      <>
        <div className="space-y-6">
          {/* Add Document Button - Only for OPS/SUPER_ADMIN */}
          {canUpload && (userRole === 'SUPER_ADMIN' || userRole === 'OPS') && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddExtraFieldModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Document Field
              </button>
            </div>
          )}

          {/* Primary Documents */}
          {primaryFields.length > 0 && (
            <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-md">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b-2 border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">Primary Documents</h3>
                {/* <p className="text-gray-600 text-sm mt-1">Required documents for your application</p> */}
              </div>
              <div className="p-6 space-y-3">
                {primaryFields.map((field) =>
                  renderDocumentField(
                    field.documentKey,
                    field.documentName,
                    field.category,
                    field.required,
                    field.allowMultiple,
                    field.helpText
                  )
                )}
              </div>
            </div>
          )}

          {/* Secondary Documents */}
          {secondaryFields.length > 0 && (
            <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-md">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b-2 border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">Secondary Documents</h3>
                {/* <p className="text-gray-600 text-sm mt-1">Optional supporting documents</p> */}
              </div>
              <div className="p-6 space-y-3">
                {secondaryFields.map((field) =>
                  renderDocumentField(
                    field.documentKey,
                    field.documentName,
                    field.category,
                    field.required,
                    field.allowMultiple,
                    field.helpText
                  )
                )}
              </div>
            </div>
          )}

          {/* Extra Documents - Student-specific, dynamic fields */}
          {extraDocumentFields.length > 0 && (
            <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-md">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b-2 border-gray-200">
                <h3 className="text-xl font-bold ">Extra Documents</h3>
                {/* <p className=" text-sm mt-1">Additional documents specific to your profile</p> */}
              </div>
              <div className="p-6 space-y-3">
                {extraDocumentFields.map((field) =>
                  renderDocumentField(
                    field.documentKey,
                    field.documentName,
                    field.category,
                    field.required,
                    field.allowMultiple,
                    field.helpText
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* Multiple Upload Name Prompt Modal */}
        {uploadingMultiple && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Name Your Document</h3>
              <p className="text-sm text-gray-600 mb-4">
                Please provide a name for this document to help identify it later.
              </p>
              <input
                type="text"
                value={customDocumentName}
                onChange={(e) => setCustomDocumentName(e.target.value)}
                placeholder="e.g., Mathematics Certificate"
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleMultipleUploadSubmit();
                  }
                }}
              />
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setUploadingMultiple(null);
                    setCustomDocumentName('');
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMultipleUploadSubmit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Upload Document
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Extra Field Modal */}
        {showAddExtraFieldModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Extra Document Field</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Document Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="e.g., Visa Copy"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newFieldHelpText}
                    onChange={(e) => setNewFieldHelpText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="e.g., Upload a scanned copy of your visa"
                    rows={3}
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="allowMultipleExtra"
                    checked={newFieldAllowMultiple}
                    onChange={(e) => setNewFieldAllowMultiple(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="allowMultipleExtra" className="ml-2 text-sm text-gray-900">
                    Allow multiple uploads
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddExtraFieldModal(false);
                    setNewFieldName('');
                    setNewFieldHelpText('');
                    setNewFieldAllowMultiple(false);
                  }}
                  className="px-4 py-2 text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddExtraDocumentField}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Field
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Render CORE Documents Section
  if (isCOREDocumentsSection) {
    return (
      <>
        <div className="space-y-6">
        {/* Add Document Button - Only for Admin/OPS */}
        {canUpload && (userRole === 'SUPER_ADMIN' || userRole === 'OPS') && (
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddFieldModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Document Field
            </button>
          </div>
        )}

        {/* CORE Document Fields */}
        {loading ? (
          <div className="bg-white rounded-lg border border-gray-300 p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-700">Loading CORE documents...</p>
          </div>
        ) : coreDocumentFields.length > 0 ? (
          <div className="space-y-4">
            {coreDocumentFields.map((field) =>
              renderDocumentField(
                field.documentKey,
                field.documentName,
                field.category,
                field.required,
                field.allowMultiple,
                field.helpText
              )
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-300 p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No CORE Document Fields</h3>
            <p className="text-gray-700">
              {userRole === 'SUPER_ADMIN' || userRole === 'OPS'
                ? 'Click "Add Document Field" to create personalized document requirements for this student.'
                : 'No CORE document fields have been configured for you yet.'}
            </p>
          </div>
        )}

        {/* Add Field Modal */}
        {showAddFieldModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add CORE Document Field</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Document Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="e.g., Birth Certificate"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newFieldHelpText}
                    onChange={(e) => setNewFieldHelpText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="e.g., Upload a certified copy"
                    rows={3}
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="allowMultiple"
                    checked={newFieldAllowMultiple}
                    onChange={(e) => setNewFieldAllowMultiple(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="allowMultiple" className="ml-2 text-sm text-gray-900">
                    Allow multiple uploads
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddFieldModal(false);
                    setNewFieldName('');
                    setNewFieldHelpText('');
                    setNewFieldAllowMultiple(false);
                  }}
                  className="px-4 py-2 text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCOREDocumentField}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Field
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </>
    );
  }

  return null;
}


