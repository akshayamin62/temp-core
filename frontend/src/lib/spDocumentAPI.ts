import api from './api';

export const spDocumentAPI = {
  // Upload SP document
  uploadDocument: async (
    documentKey: string,
    documentName: string,
    file: File,
    serviceProviderId?: string
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentKey', documentKey);
    formData.append('documentName', documentName);
    if (serviceProviderId) {
      formData.append('serviceProviderId', serviceProviderId);
    }

    return api.post('/sp-documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Upload company logo
  uploadLogo: async (file: File, serviceProviderId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (serviceProviderId) {
      formData.append('serviceProviderId', serviceProviderId);
    }

    return api.post('/sp-documents/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Get my documents (Service Provider)
  getMyDocuments: () => {
    return api.get('/sp-documents/my-documents');
  },

  // Get documents for a specific SP (Super Admin)
  getDocuments: (serviceProviderId: string) => {
    return api.get(`/sp-documents/${serviceProviderId}`);
  },

  // View document (inline as blob)
  viewDocument: async (documentId: string) => {
    return api.get(`/sp-documents/${documentId}/view`, {
      responseType: 'blob',
    });
  },

  // Download document
  downloadDocument: async (documentId: string) => {
    return api.get(`/sp-documents/${documentId}/download`, {
      responseType: 'blob',
    });
  },

  // Approve document (Super Admin)
  approveDocument: (documentId: string) => {
    return api.put(`/sp-documents/${documentId}/approve`);
  },

  // Reject document (Super Admin)
  rejectDocument: (documentId: string, rejectionMessage: string) => {
    return api.put(`/sp-documents/${documentId}/reject`, { rejectionMessage });
  },

  // Delete document (Super Admin)
  deleteDocument: (documentId: string) => {
    return api.delete(`/sp-documents/${documentId}`);
  },
};
