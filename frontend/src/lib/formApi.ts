import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const formApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
formApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Question APIs
export const questionAPI = {
  getMetadata: () => formApi.get('/questions/metadata'),
  create: (data: any) => formApi.post('/questions', data),
  getAll: (params?: any) => formApi.get('/questions', { params }),
  getById: (id: string) => formApi.get(`/questions/${id}`),
  update: (id: string, data: any) => formApi.put(`/questions/${id}`, data),
  toggleStatus: (id: string) => formApi.patch(`/questions/${id}/toggle-status`),
};

// Service APIs
export const serviceAPI = {
  create: (data: any) => formApi.post('/services', data),
  getAll: (params?: any) => formApi.get('/services', { params }),
  getById: (id: string) => formApi.get(`/services/${id}`),
  update: (id: string, data: any) => formApi.put(`/services/${id}`, data),
  toggleStatus: (id: string) => formApi.patch(`/services/${id}/toggle-status`),
  addSection: (serviceId: string, data: any) => formApi.post(`/services/${serviceId}/sections`, data),
  removeSection: (serviceId: string, sectionId: string) => formApi.delete(`/services/${serviceId}/sections/${sectionId}`),
  updateSectionOrder: (serviceId: string, sectionId: string, order: number) => 
    formApi.patch(`/services/${serviceId}/sections/${sectionId}/order`, { order }),
};

// Section APIs
export const sectionAPI = {
  create: (data: any) => formApi.post('/sections', data),
  getAll: (params?: any) => formApi.get('/sections', { params }),
  getById: (id: string) => formApi.get(`/sections/${id}`),
  update: (id: string, data: any) => formApi.put(`/sections/${id}`, data),
  toggleStatus: (id: string) => formApi.patch(`/sections/${id}/toggle-status`),
};

// Enrollment APIs
export const enrollmentAPI = {
  enroll: (serviceId: string) => formApi.post('/enrollments', { serviceId }),
  getMyEnrollments: () => formApi.get('/enrollments'),
  getAll: (params?: any) => formApi.get('/enrollments/all', { params }),
  getMyStudents: () => formApi.get('/enrollments/my-students'),
  getById: (id: string) => formApi.get(`/enrollments/${id}`),
  updateStatus: (id: string, status: string) => formApi.patch(`/enrollments/${id}/status`, { status }),
  assignCounselor: (id: string, counselorId: string) => formApi.patch(`/enrollments/${id}/assign-counselor`, { counselorId }),
};

// Answer APIs
export const answerAPI = {
  save: (data: any) => formApi.post('/answers/save', data),
  saveSection: (data: { enrollmentId: string; sectionId: string; sectionInstanceId: string; answers: any[] }) => 
    formApi.post('/answers/save-section', data),
  getServiceAnswers: (serviceId: string) => formApi.get(`/answers/service/${serviceId}`),
  addSectionInstance: (data: any) => formApi.post('/answers/add-section-instance', data),
  removeSectionInstance: (data: any) => formApi.delete('/answers/remove-section-instance', { data }),
  submit: (enrollmentId: string) => formApi.post('/answers/submit', { enrollmentId }),
  getStudentAnswers: (studentId: string) => formApi.get(`/answers/student/${studentId}`),
};

// Edit Request APIs
export const editRequestAPI = {
  create: (data: any) => formApi.post('/edit-requests', data),
  getPending: () => formApi.get('/edit-requests/pending'),
  getMyRequests: () => formApi.get('/edit-requests/my-requests'),
  getAll: (params?: any) => formApi.get('/edit-requests', { params }),
  approve: (id: string) => formApi.patch(`/edit-requests/${id}/approve`),
  reject: (id: string, rejectionReason: string) => formApi.patch(`/edit-requests/${id}/reject`, { rejectionReason }),
};

export default formApi;

