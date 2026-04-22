import api from './api';

export const b2bLeadDocumentAPI = {
  // ─── Document Fields ─────────────────────────────────────────────────────

  // Get document fields for a lead (ops/super-admin)
  getFields: (leadId: string) => {
    return api.get(`/b2b-lead-documents/fields/${leadId}`);
  },

  // Get my document fields (admin/advisor self-service)
  getMyFields: () => {
    return api.get('/b2b-lead-documents/my-fields');
  },

  // Add a document field
  addField: (data: { leadId: string; documentName: string; required?: boolean; helpText?: string }) => {
    return api.post('/b2b-lead-documents/fields', data);
  },

  // Delete (soft) a document field
  deleteField: (fieldId: string) => {
    return api.delete(`/b2b-lead-documents/fields/${fieldId}`);
  },

  // Seed default document fields (admin/advisor)
  seedDefaults: () => {
    return api.post('/b2b-lead-documents/seed-defaults');
  },

  // Get fields for a specific admin (b2b-ops/super-admin)
  getFieldsByAdmin: (adminId: string) => {
    return api.get(`/b2b-lead-documents/fields/by-admin/${adminId}`);
  },

  // Get fields for a specific advisor (b2b-ops/super-admin)
  getFieldsByAdvisor: (advisorId: string) => {
    return api.get(`/b2b-lead-documents/fields/by-advisor/${advisorId}`);
  },

  // Get documents for a specific admin (b2b-ops/super-admin)
  getDocsByAdmin: (adminId: string) => {
    return api.get(`/b2b-lead-documents/by-admin/${adminId}`);
  },

  // Get documents for a specific advisor (b2b-ops/super-admin)
  getDocsByAdvisor: (advisorId: string) => {
    return api.get(`/b2b-lead-documents/by-advisor/${advisorId}`);
  },

  // ─── Documents ───────────────────────────────────────────────────────────

  // Get documents for a lead (ops/super-admin)
  getDocuments: (leadId: string) => {
    return api.get(`/b2b-lead-documents/${leadId}`);
  },

  // Get my documents (admin/advisor self-service)
  getMyDocuments: () => {
    return api.get('/b2b-lead-documents/my-documents');
  },

  // Upload a document (ops/super-admin specifies leadId; admin/advisor omit it)
  uploadDocument: (
    leadId: string | null,
    documentFieldId: string,
    documentKey: string,
    documentName: string,
    file: File
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    if (leadId) formData.append('leadId', leadId);
    formData.append('documentFieldId', documentFieldId);
    formData.append('documentKey', documentKey);
    formData.append('documentName', documentName);
    return api.post('/b2b-lead-documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // View document inline (blob)
  viewDocument: (documentId: string) => {
    return api.get(`/b2b-lead-documents/${documentId}/view`, {
      responseType: 'blob',
    });
  },

  // Approve document
  approveDocument: (documentId: string) => {
    return api.put(`/b2b-lead-documents/${documentId}/approve`);
  },

  // Reject document
  rejectDocument: (documentId: string, rejectionMessage: string) => {
    return api.put(`/b2b-lead-documents/${documentId}/reject`, { rejectionMessage });
  },

  // Delete document
  deleteDocument: (documentId: string) => {
    return api.delete(`/b2b-lead-documents/${documentId}`);
  },
};
