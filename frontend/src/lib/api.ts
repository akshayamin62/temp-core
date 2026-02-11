import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      const customError = new Error('Unable to connect to server. Please check if the backend is running.');
      customError.name = 'NetworkError';
      (customError as any).isNetworkError = true;
      return Promise.reject(customError);
    }
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      const customError = new Error('Request timeout. The server is taking too long to respond.');
      customError.name = 'TimeoutError';
      (customError as any).isTimeout = true;
      return Promise.reject(customError);
    }
    
    return Promise.reject(error);
  }
);

// API functions
export const authAPI = {
  signup: (data: { firstName: string; middleName?: string; lastName: string; email: string; role: string; captcha: string; captchaInput: string }) =>
    api.post('/auth/signup', data),
  
  verifySignupOTP: (data: { email: string; otp: string }) =>
    api.post('/auth/verify-signup-otp', data),
  
  login: (data: { email: string; captcha: string; captchaInput: string }) =>
    api.post('/auth/login', data),
  
  verifyOTP: (data: { email: string; otp: string }) =>
    api.post('/auth/verify-otp', data),
  
  getProfile: () =>
    api.get('/auth/profile'),
};

export const superAdminAPI = {
  getUsers: (params?: {
    role?: string;
    isVerified?: boolean;
    isActive?: boolean;
    search?: string;
  }) => api.get('/super-admin/users', { params }),
  
  getStats: () => api.get('/super-admin/stats'),
  
  getPendingApprovals: () => api.get('/super-admin/pending'),
  
  approveUser: (userId: string) => api.post(`/super-admin/users/${userId}/approve`),
  
  rejectUser: (userId: string, reason?: string) => 
    api.post(`/super-admin/users/${userId}/reject`, { reason }),
  
  toggleUserStatus: (userId: string) => 
    api.patch(`/super-admin/users/${userId}/toggle-status`),
  
  deleteUser: (userId: string) => api.delete(`/super-admin/users/${userId}`),
  
  createOps: (data: {
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
  }) => api.post('/super-admin/ops', data),
  
  createAdmin: (data: {
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
  }) => api.post('/super-admin/admin', data),
  
  createUserByRole: (data: FormData | {
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
    role: string;
    adminId?: string;
    customSlug?: string;
    companyName?: string;
    address?: string;
    companyLogo?: string;
  }) => {
    // If data is FormData, set appropriate headers
    if (data instanceof FormData) {
      return api.post('/super-admin/user', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    }
    return api.post('/super-admin/user', data);
  },
  
  getOps: () => api.get('/super-admin/ops'),
  
  getAdmins: () => api.get('/super-admin/admins'),
  
  getAdminDetails: (adminId: string) => api.get(`/super-admin/admins/${adminId}`),
  
  getAdminDashboardStats: (adminId: string) => api.get(`/super-admin/admins/${adminId}/dashboard`),
  
  getAdminCounselors: (adminId: string) => api.get(`/super-admin/admins/${adminId}/counselors`),
  
  getAdminLeads: (adminId: string, params?: {
    stage?: string;
    serviceTypes?: string;
    assigned?: string;
    search?: string;
  }) => api.get(`/super-admin/admins/${adminId}/leads`, { params }),
  
  getAdminStudents: (adminId: string) => api.get(`/super-admin/admins/${adminId}/students`),
  
  getAdminTeamMeets: (adminId: string, params?: {
    month?: number;
    year?: number;
  }) => api.get(`/super-admin/admins/${adminId}/team-meets`, { params }),
  
  // Counselor dashboard for super admin
  getCounselorDashboard: (counselorId: string) => api.get(`/super-admin/counselors/${counselorId}/dashboard`),
  getCounselorFollowUps: (counselorId: string) => api.get(`/super-admin/counselors/${counselorId}/follow-ups`),
  getCounselorFollowUpSummary: (counselorId: string) => api.get(`/super-admin/counselors/${counselorId}/follow-up-summary`),
  getCounselorTeamMeets: (counselorId: string) => api.get(`/super-admin/counselors/${counselorId}/team-meets`),
  
  // All leads for super admin
  getAllLeads: (params?: any) => api.get('/super-admin/leads', { params }),
  
  assignOps: (registrationId: string, data: {
    primaryOpsId?: string;
    secondaryOpsId?: string;
  }) => api.post(`/super-admin/students/registrations/${registrationId}/assign-ops`, data),
  
  switchActiveOps: (registrationId: string, activeOpsId: string) =>
    api.post(`/super-admin/students/registrations/${registrationId}/switch-active-ops`, { activeOpsId }),
};

// Admin Student API (read-only access to students for admin/counselor)
export const adminStudentAPI = {
  // Get all students under this admin
  getStudents: () => api.get('/admin/students'),
  
  // Get student by lead ID (for converted leads)
  getStudentByLeadId: (leadId: string) => api.get(`/admin/students/by-lead/${leadId}`),
  
  // Get student details
  getStudentDetails: (studentId: string) => api.get(`/admin/students/${studentId}`),
  
  // Get student form answers for a registration (read-only)
  getStudentFormAnswers: (studentId: string, registrationId: string) => 
    api.get(`/admin/students/${studentId}/registrations/${registrationId}/answers`),
};

// Service API
export const serviceAPI = {
  getAllServices: () => api.get('/services/services'),
  
  getMyServices: () => api.get('/services/my-services'),
  
  registerForService: (serviceId: string) => 
    api.post('/services/register', { serviceId }),
  
  getServiceForm: (serviceId: string) => 
    api.get(`/services/services/${serviceId}/form`),
  
  getRegistrationDetails: (registrationId: string) => 
    api.get(`/services/registrations/${registrationId}`),
};

// Form Answer API
export const formAnswerAPI = {
  saveFormAnswers: (data: {
    registrationId: string;
    partKey: string;
    sectionId?: string;
    answers: any;
    completed?: boolean;
  }) => api.post('/forms/save', data),
  
  getFormAnswers: (registrationId: string, partKey?: string) => 
    api.get(`/forms/registrations/${registrationId}/answers`, { 
      params: partKey ? { partKey } : undefined 
    }),
  
  getProgress: (registrationId: string) => 
    api.get(`/forms/registrations/${registrationId}/progress`),
  
  deleteFormAnswers: (answerId: string) => 
    api.delete(`/forms/answers/${answerId}`),
};

// Student API
export const studentAPI = {
  getProfile: () => api.get('/student/profile'),
  
  updateProfile: (data: any) => api.put('/student/profile', data),
  
  deleteProfile: () => api.delete('/student/profile'),
};

// Program API
export const programAPI = {
  getStudentPrograms: () => api.get('/programs/student/programs'),
  selectProgram: (data: { programId: string; priority: number; intake: string; year: string }) =>
    api.post('/programs/student/programs/select', data),
  removeProgram: (programId: string) => api.delete(`/programs/student/programs/${programId}`),
  createStudentProgram: (data: any) => api.post('/programs/student/programs/create', data),
  getOpsPrograms: () => api.get('/programs/ops/programs'),
  createProgram: (data: any) => api.post('/programs/ops/programs', data),
  uploadProgramsExcel: (file: File, studentId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (studentId) {
      formData.append('studentId', studentId);
    }
    return api.post('/programs/ops/programs/upload-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getOpsStudentPrograms: (studentId: string) => api.get(`/programs/ops/student/${studentId}/programs`),
  createOpsStudentProgram: (studentId: string, data: any) => api.post(`/programs/ops/student/${studentId}/programs`, data),
  uploadOpsStudentProgramsExcel: (studentId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('studentId', studentId);
    return api.post(`/programs/ops/student/${studentId}/programs/upload-excel`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  // Super Admin functions
  getSuperAdminStudentPrograms: (studentId: string, section?: string) => {
    const params = section ? { section } : {};
    return api.get(`/programs/super-admin/student/${studentId}/programs`, { params });
  },
  getStudentAppliedPrograms: (studentId: string) => api.get(`/programs/super-admin/student/${studentId}/applied-programs`),
  updateProgramSelection: (programId: string, data: { priority: number; intake: string; year: string }) => 
    api.put(`/programs/super-admin/programs/${programId}/selection`, data),
  createSuperAdminProgram: (studentId: string, data: any) => api.post('/programs/super-admin/programs/create', { ...data, studentId }),
  uploadSuperAdminProgramsExcel: (file: File, studentId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('studentId', studentId);
    return api.post('/programs/super-admin/programs/upload-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Admin API (for ADMIN role)
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),

  // User management
  getUsers: (params?: any) => api.get('/admin/users', { params }),
  getPendingApprovals: () => api.get('/admin/users/pending'),
  approveUser: (userId: string) => api.patch(`/admin/users/${userId}/approve`),
  rejectUser: (userId: string) => api.patch(`/admin/users/${userId}/reject`),
  toggleUserStatus: (userId: string) => api.patch(`/admin/users/${userId}/toggle-status`),
  deleteUser: (userId: string) => api.delete(`/admin/users/${userId}`),
  
  createCounselor: (data: {
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    mobileNumber?: string;
  }) => api.post('/admin/counselor', data),
  
  getCounselors: () => api.get('/admin/counselors'),
  
  toggleCounselorStatus: (counselorId: string) => 
    api.patch(`/admin/counselor/${counselorId}/toggle-status`),
  
  // Counselor detail endpoints
  getCounselorDetail: (counselorId: string) => 
    api.get(`/admin/counselor/${counselorId}`),
  
  getCounselorFollowUps: (counselorId: string) => 
    api.get(`/admin/counselor/${counselorId}/follow-ups`),
  
  getCounselorFollowUpSummary: (counselorId: string) => 
    api.get(`/admin/counselor/${counselorId}/follow-up-summary`),
};

// Lead API
export const leadAPI = {
  // Public endpoints (no auth required)
  getAdminInfoBySlug: (adminSlug: string) => 
    api.get(`/public/enquiry/${adminSlug}/info`),
  
  submitEnquiry: (adminSlug: string, data: {
    name: string;
    email: string;
    mobileNumber: string;
    city: string;
    serviceTypes: string[];
  }) => api.post(`/public/enquiry/${adminSlug}/submit`, data),
  
  // Admin endpoints
  getAdminLeads: (params?: {
    stage?: string;
    serviceTypes?: string;
    assignedCounselorId?: string;
  }) => api.get('/admin/leads', { params }),
  
  getEnquiryFormUrl: () => api.get('/admin/enquiry-form-url'),
  
  getAdminCounselors: () => api.get('/admin/counselors'),
  
  assignLeadToCounselor: (leadId: string, counselorId: string | null) => 
    api.post(`/admin/leads/${leadId}/assign`, { counselorId }),
  
  // Counselor endpoints
  getCounselorLeads: (params?: {
    stage?: string;
    serviceTypes?: string;
  }) => api.get('/counselor/leads', { params }),
  
  getCounselorEnquiryFormUrl: () => api.get('/counselor/enquiry-form-url'),
  
  // Shared endpoints (admin and counselor)
  getLeadDetail: (leadId: string) => api.get(`/leads/${leadId}`),
  
  updateLeadStage: (leadId: string, stage: string) => 
    api.patch(`/leads/${leadId}/stage`, { stage }),
  
  // Super Admin endpoints
  getAllLeads: (params?: {
    status?: string;
    serviceTypes?: string;
    adminId?: string;
  }) => api.get('/super-admin/leads', { params }),
};

// Follow-Up API
export const followUpAPI = {
  // Create a new follow-up
  createFollowUp: (data: {
    leadId: string;
    scheduledDate: string;
    scheduledTime: string;
    duration: number;
    meetingType: string;
    notes?: string;
  }) => api.post('/follow-ups', data),

  // Get all follow-ups (for calendar)
  getFollowUps: (params?: {
    startDate?: string;
    endDate?: string;
    status?: string;
  }) => api.get('/follow-ups', { params }),

  // Get follow-up summary (today, missed, upcoming)
  getFollowUpSummary: () => api.get('/follow-ups/summary'),

  // Get single follow-up by ID
  getFollowUpById: (followUpId: string) => api.get(`/follow-ups/${followUpId}`),

  // Update follow-up (complete/reschedule)
  updateFollowUp: (followUpId: string, data: {
    status?: string;
    stageChangedTo?: string;
    notes?: string;
    nextFollowUp?: {
      scheduledDate: string;
      scheduledTime: string;
      duration: number;
      meetingType: string;
    };
  }) => api.patch(`/follow-ups/${followUpId}`, data),

  // Get follow-up history for a lead
  getLeadFollowUpHistory: (leadId: string) => api.get(`/follow-ups/lead/${leadId}/history`),

  // Check time slot availability
  checkTimeSlotAvailability: (params: {
    date: string;
    time: string;
    duration: number;
    leadId?: string; // Required for admin to check assigned counselor's availability
  }) => api.get('/follow-ups/check-availability', { params }),
};

export const chatAPI = {
  // Get or create chat for a program
  getOrCreateChat: (programId: string, chatType: 'open' | 'private' = 'open') => 
    api.get(`/chat/program/${programId}/chat`, { params: { chatType } }),
  
  // Get all messages for a program
  getMessages: (programId: string, chatType: 'open' | 'private' = 'open') => 
    api.get(`/chat/program/${programId}/messages`, { params: { chatType } }),
  
  // Send a message
  sendMessage: (programId: string, message: string, chatType: 'open' | 'private' = 'open') => 
    api.post(`/chat/program/${programId}/messages`, { message, chatType }),
  
  // Get all chats for current user
  getMyChatsList: (chatType?: 'open' | 'private') => 
    api.get('/chat/my-chats', { params: chatType ? { chatType } : {} }),
};

// TeamMeet API
export const teamMeetAPI = {
  // Create a new team meeting request
  createTeamMeet: (data: {
    subject: string;
    scheduledDate: string;
    scheduledTime: string;
    duration: number;
    meetingType: string;
    description?: string;
    requestedTo: string;
  }) => api.post('/team-meets', data),

  // Get all team meetings for current user
  getTeamMeets: (params?: {
    status?: string;
    startDate?: string;
    endDate?: string;
  }) => api.get('/team-meets', { params }),

  // Get team meetings for calendar display
  getTeamMeetsForCalendar: (params?: {
    month?: number;
    year?: number;
  }) => api.get('/team-meets/calendar', { params }),

  // Get single team meeting details
  getTeamMeetById: (teamMeetId: string) => api.get(`/team-meets/${teamMeetId}`),

  // Accept a team meeting invitation
  acceptTeamMeet: (teamMeetId: string) => api.patch(`/team-meets/${teamMeetId}/accept`),

  // Reject a team meeting invitation with a message
  rejectTeamMeet: (teamMeetId: string, rejectionMessage: string) => 
    api.patch(`/team-meets/${teamMeetId}/reject`, { rejectionMessage }),

  // Cancel a team meeting
  cancelTeamMeet: (teamMeetId: string) => api.patch(`/team-meets/${teamMeetId}/cancel`),

  // Reschedule a team meeting
  rescheduleTeamMeet: (teamMeetId: string, data: {
    scheduledDate: string;
    scheduledTime: string;
    duration: number;
    subject?: string;
    description?: string;
  }) => api.patch(`/team-meets/${teamMeetId}/reschedule`, data),

  // Mark meeting as completed
  completeTeamMeet: (teamMeetId: string, data?: { description?: string }) => api.patch(`/team-meets/${teamMeetId}/complete`, data),

  // Check availability for a time slot
  checkAvailability: (params: {
    date: string;
    time: string;
    duration: number;
    participantId: string;
  }) => api.get('/team-meets/check-availability', { params }),

  // Get list of participants available for meetings
  getParticipants: () => api.get('/team-meets/participants'),

  // Admin-only: Get counselor's TeamMeets (read-only)
  getCounselorTeamMeets: (counselorId: string) => api.get(`/team-meets/counselor/${counselorId}`),
};

// OPS Schedule API
export const opsScheduleAPI = {
  // Get all schedules for current OPS
  getMySchedules: () => api.get('/ops-schedules'),
  
  // Get schedule summary (today, missed, tomorrow)
  getSummary: () => api.get('/ops-schedules/summary'),
  
  // Get students assigned to current OPS
  getMyStudents: () => api.get('/ops-schedules/students'),
  
  // Get single schedule by ID
  getScheduleById: (scheduleId: string) => api.get(`/ops-schedules/${scheduleId}`),
  
  // Create new schedule
  createSchedule: (data: {
    studentId?: string | null;
    scheduledDate: string;
    scheduledTime: string;
    description: string;
  }) => api.post('/ops-schedules', data),
  
  // Update schedule
  updateSchedule: (scheduleId: string, data: {
    studentId?: string | null;
    scheduledDate?: string;
    scheduledTime?: string;
    description?: string;
    status?: string;
    notes?: string;
  }) => api.put(`/ops-schedules/${scheduleId}`, data),
  
  // Delete schedule
  deleteSchedule: (scheduleId: string) => api.delete(`/ops-schedules/${scheduleId}`),
};

// Lead Student Conversion API
export const leadConversionAPI = {
  // Request conversion (Counselor)
  requestConversion: (leadId: string) => api.post(`/lead-conversions/request/${leadId}`),
  
  // Get pending conversions (Admin)
  getPendingConversions: () => api.get('/lead-conversions/pending'),
  
  // Approve conversion (Admin)
  approveConversion: (conversionId: string) => api.post(`/lead-conversions/approve/${conversionId}`),
  
  // Reject conversion (Admin)
  rejectConversion: (conversionId: string, reason?: string) => 
    api.post(`/lead-conversions/reject/${conversionId}`, { reason }),
  
  // Get conversion history for a lead
  getConversionHistory: (leadId: string) => api.get(`/lead-conversions/history/${leadId}`),
  
  // Get all conversions (Super Admin)
  getAllConversions: (status?: string) => api.get('/lead-conversions/all', { params: { status } }),
};

export default api;


