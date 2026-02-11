import api from './api';
import { DocumentCategory } from '@/types';

export type COREDocumentType = 'CORE' | 'EXTRA';

export const coreDocumentAPI = {
  // Get CORE document fields for a specific student (optionally filter by type)
  getCOREDocumentFields: (registrationId: string, type?: COREDocumentType) => {
    const params = type ? { type } : {};
    return api.get(`/core-documents/${registrationId}`, { params });
  },

  // Add new CORE document field (Admin/OPS only)
  addCOREDocumentField: (
    registrationId: string,
    documentName: string,
    category: DocumentCategory,
    required: boolean = false,
    helpText?: string,
    allowMultiple?: boolean,
    documentType?: COREDocumentType
  ) => {
    return api.post('/core-documents/add', {
      registrationId,
      documentName,
      category,
      required,
      helpText,
      allowMultiple,
      documentType,
    });
  },

  // Delete CORE document field (Admin/OPS only)
  deleteCOREDocumentField: (fieldId: string) => {
    return api.delete(`/core-documents/${fieldId}`);
  },
};

