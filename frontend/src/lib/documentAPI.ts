import api from './api';
import { DocumentCategory } from '@/types';

export const documentAPI = {
  // Get all document fields (FILE type fields from database)
  getDocumentFields: () => {
    return api.get('/documents/fields/list');
  },

  // Add new document field (Admin/OPS only)
  addDocumentField: (
    documentName: string,
    category: DocumentCategory,
    required: boolean = false,
    helpText?: string
  ) => {
    return api.post('/documents/fields/add', {
      documentName,
      category,
      required,
      helpText,
    });
  },

  // Delete document field (Admin only)
  deleteDocumentField: (fieldId: string) => {
    return api.delete(`/documents/fields/${fieldId}`);
  },

  // Upload document (auto-save)
  uploadDocument: async (
    registrationId: string,
    studentId: string,
    documentKey: string,
    documentName: string,
    category: DocumentCategory,
    file: File,
    isCustomField: boolean = false,
    allowMultiple: boolean = false
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('registrationId', registrationId);
    formData.append('studentId', studentId);
    formData.append('documentKey', documentKey);
    formData.append('documentName', documentName);
    formData.append('category', category);
    formData.append('isCustomField', isCustomField.toString());
    formData.append('allowMultiple', allowMultiple.toString());

    return api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Get all documents for a registration
  getDocuments: (registrationId: string) => {
    return api.get(`/documents/${registrationId}`);
  },

  // Download document
  downloadDocument: async (documentId: string) => {
    const response = await api.get(`/documents/${documentId}/download`, {
      responseType: 'blob',
    });
    return response;
  },

  // View document (fetch as blob for inline viewing)
  viewDocument: async (documentId: string) => {
    const response = await api.get(`/documents/${documentId}/view`, {
      responseType: 'blob',
    });
    return response;
  },

  // Approve document (OPS/Admin only)
  approveDocument: (documentId: string) => {
    return api.put(`/documents/${documentId}/approve`);
  },

  // Reject document (OPS/Admin only)
  rejectDocument: (documentId: string, rejectionMessage: string) => {
    return api.put(`/documents/${documentId}/reject`, { rejectionMessage });
  },

  // Delete document
  deleteDocument: (documentId: string) => {
    return api.delete(`/documents/${documentId}`);
  },
};

