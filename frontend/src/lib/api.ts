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
  signup: (data: { firstName: string; middleName?: string; lastName: string; email: string; mobileNumber?: string; role: string; captcha: string; captchaInput: string }) =>
    api.post('/auth/signup', data),
  
  verifySignupOTP: (data: { 
    email: string; 
    otp: string; 
    mobileNumber?: string;
    companyName?: string;
    businessType?: string;
    registrationNumber?: string;
    gstNumber?: string;
    businessPan?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
    website?: string;
    servicesOffered?: string;
    coachingTests?: string[];
  }) =>
    api.post('/auth/verify-signup-otp', data),
  
  login: (data: { email: string; captcha: string; captchaInput: string }) =>
    api.post('/auth/login', data),
  
  verifyOTP: (data: { email: string; otp: string }) =>
    api.post('/auth/verify-otp', data),
  
  getProfile: () =>
    api.get('/auth/profile'),

  updateSPProfile: (data: Record<string, string>) =>
    api.put('/auth/sp-profile', data),
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
  
  getUserWithProfile: (userId: string) =>
    api.get(`/super-admin/users/${userId}/profile`),

  editUserByRole: (userId: string, data: Record<string, any>) =>
    api.put(`/super-admin/users/${userId}/edit`, data),

  deleteUser: (userId: string) => api.delete(`/super-admin/users/${userId}`),
  
  createOps: (data: {
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    mobileNumber?: string;
  }) => api.post('/super-admin/ops', data),
  
  createAdmin: (data: {
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    mobileNumber?: string;
  }) => api.post('/super-admin/admin', data),
  
  createUserByRole: (data: FormData | {
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    mobileNumber?: string;
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
  
  // Service Provider details
  getServiceProviderDetail: (providerId: string) => api.get(`/super-admin/service-providers/${providerId}`),
  
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

// Parent Dashboard API (read-only access to linked students for parent)
export const parentAPI = {
  getMyStudents: () => api.get('/parents/my-students'),
  getStudentDetails: (studentId: string) => api.get(`/parents/my-students/${studentId}`),
  getStudentFormAnswers: (studentId: string, registrationId: string) =>
    api.get(`/parents/my-students/${studentId}/registrations/${registrationId}/answers`),
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

// Ivy League Registration API
export const ivyLeagueRegistrationAPI = {
  getPrefill: () => api.get('/ivy-league-registration/prefill'),
  
  submit: (data: {
    firstName: string;
    middleName?: string;
    lastName: string;
    parentFirstName: string;
    parentMiddleName?: string;
    parentLastName: string;
    parentMobile: string;
    parentEmail: string;
    schoolName: string;
    curriculum: string;
    currentGrade: string;
  }) => api.post('/ivy-league-registration', data),

  getStatus: () => api.get('/ivy-league-registration/status'),
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

  // Student profile (no registrationId needed)
  getStudentProfile: () =>
    api.get('/forms/student-profile'),
  
  saveStudentProfile: (answers: any) =>
    api.put('/forms/student-profile', { answers }),

  // View student profile data (for other roles)
  getStudentProfileById: (studentId: string) =>
    api.get(`/forms/student-profile/${studentId}`),

  // Save student profile data (for staff roles)
  saveStudentProfileById: (studentId: string, answers: any) =>
    api.put(`/forms/student-profile/${studentId}`, { answers }),
};

// Student API
export const studentAPI = {
  getProfile: () => api.get('/student/profile'),
  
  updateProfile: (data: any) => api.put('/student/profile', data),
  
  deleteProfile: () => api.delete('/student/profile'),
};

// Program API
export const programAPI = {
  getStudentPrograms: (registrationId?: string) => {
    const params: any = {};
    if (registrationId) params.registrationId = registrationId;
    return api.get('/programs/student/programs', { params });
  },
  selectProgram: (data: { programId: string; priority: number; intake: string; year: string; registrationId?: string }) =>
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
  getOpsStudentPrograms: (studentId: string, registrationId?: string) => {
    const params: any = {};
    if (registrationId) params.registrationId = registrationId;
    return api.get(`/programs/ops/student/${studentId}/programs`, { params });
  },
  // Fetch both available + applied programs for dashboard stats (works for all admin-like roles)
  getStudentProgramStats: (studentId: string, registrationId?: string) => {
    const baseParams: any = {};
    if (registrationId) baseParams.registrationId = registrationId;
    return Promise.all([
      api.get(`/programs/ops/student/${studentId}/programs`, { params: { ...baseParams } }),
      api.get(`/programs/ops/student/${studentId}/programs`, { params: { ...baseParams, section: 'applied' } }),
    ]);
  },
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
  getSuperAdminStudentPrograms: (studentId: string, section?: string, registrationId?: string) => {
    const params: any = {};
    if (section) params.section = section;
    if (registrationId) params.registrationId = registrationId;
    return api.get(`/programs/super-admin/student/${studentId}/programs`, { params });
  },
  getStudentAppliedPrograms: (studentId: string) => api.get(`/programs/super-admin/student/${studentId}/applied-programs`),
  updateProgramSelection: (programId: string, data: { priority: number; intake: string; year: string }) => 
    api.put(`/programs/super-admin/programs/${programId}/selection`, data),
  updateProgramStatusSuperAdmin: (programId: string, status: string, extra?: { applicationOpenDate?: string; scheduleTime?: string }) =>
    api.put(`/programs/super-admin/programs/${programId}/status`, { status, ...extra }),
  updateProgramStatusOps: (programId: string, status: string, extra?: { applicationOpenDate?: string; scheduleTime?: string }) =>
    api.put(`/programs/ops/programs/${programId}/status`, { status, ...extra }),
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
  uploadQsRankingExcel: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/programs/super-admin/upload-qs-ranking', formData, {
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
    intake?: string;
    year?: string;
    parentDetail?: {
      firstName: string;
      middleName?: string;
      lastName: string;
      relationship: string;
      mobileNumber: string;
      email: string;
      qualification: string;
      occupation: string;
    };
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
  
  // Upload document in chat (open chat)
  uploadDocument: (programId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/chat/program/${programId}/upload-document`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Save chat document to Extra Documents
  saveToExtra: (messageId: string, documentName: string, description: string) =>
    api.post(`/chat/messages/${messageId}/save-to-extra`, { documentName, description }),

  // Get all chats for current user
  getMyChatsList: (chatType?: 'open' | 'private') => 
    api.get('/chat/my-chats', { params: chatType ? { chatType } : {} }),
};

// TeamMeet API
export const teamMeetAPI = {
  // Create a new team meeting request (supports optional file attachment via FormData)
  createTeamMeet: (data: {
    subject: string;
    scheduledDate: string;
    scheduledTime: string;
    duration: number;
    meetingType: string;
    description?: string;
    requestedTo: string;
    attachmentFile?: File;
  }) => {
    if (data.attachmentFile) {
      const formData = new FormData();
      formData.append('subject', data.subject);
      formData.append('scheduledDate', data.scheduledDate);
      formData.append('scheduledTime', data.scheduledTime);
      formData.append('duration', String(data.duration));
      formData.append('meetingType', data.meetingType);
      if (data.description) formData.append('description', data.description);
      formData.append('requestedTo', data.requestedTo);
      formData.append('attachment', data.attachmentFile);
      return api.post('/team-meets', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    }
    const { attachmentFile, ...rest } = data;
    return api.post('/team-meets', rest);
  },

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
  completeTeamMeet: (teamMeetId: string, data?: { notes?: string }) => api.patch(`/team-meets/${teamMeetId}/complete`, data),

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

  // Get team meets for a specific student (for admin/counselor/super-admin/ops dashboard)
  getStudentTeamMeets: (studentId: string) => api.get(`/team-meets/student/${studentId}`),

  // Invite users to a team meeting
  inviteToTeamMeet: (teamMeetId: string, userIds: string[]) =>
    api.patch(`/team-meets/${teamMeetId}/invite`, { userIds }),

  // Remove an invited user from a team meeting
  removeInviteFromTeamMeet: (teamMeetId: string, invitedUserId: string) =>
    api.patch(`/team-meets/${teamMeetId}/remove-invite`, { invitedUserId }),
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

  // Student: get OPS tasks assigned to me
  getMyTasksAsStudent: () => api.get('/ops-schedules/my-tasks'),

  // Get OPS tasks for a specific student (for admin/counselor/super-admin/ops dashboard)
  getStudentTasks: (studentId: string) => api.get(`/ops-schedules/student/${studentId}`),
};

// Super Admin - OPS Dashboard API (read-only)
export const superAdminOpsAPI = {
  // Get ops user details
  getOpsDetail: (opsUserId: string) => api.get(`/super-admin/ops/${opsUserId}/detail`),

  // Get all schedules for an ops user
  getOpsSchedules: (opsUserId: string) => api.get(`/super-admin/ops/${opsUserId}/schedules`),

  // Get schedule summary for an ops user
  getOpsSummary: (opsUserId: string) => api.get(`/super-admin/ops/${opsUserId}/schedule-summary`),

  // Get students assigned to an ops user
  getOpsStudents: (opsUserId: string) => api.get(`/super-admin/ops/${opsUserId}/students`),

  // Get team meets for an ops user
  getOpsTeamMeets: (opsUserId: string, params?: { month?: number; year?: number }) => 
    api.get(`/super-admin/ops/${opsUserId}/team-meets`, { params }),
};

// Super Admin Eduplan Coach API (read-only dashboard)
export const superAdminEduplanCoachAPI = {
  // Get eduplan coach user details
  getCoachDetail: (coachUserId: string) => api.get(`/super-admin/eduplan-coaches/${coachUserId}/detail`),

  // Get students assigned to an eduplan coach
  getCoachStudents: (coachUserId: string) => api.get(`/super-admin/eduplan-coaches/${coachUserId}/students`),

  // Get team meets for an eduplan coach
  getCoachTeamMeets: (coachUserId: string, params?: { month?: number; year?: number }) => 
    api.get(`/super-admin/eduplan-coaches/${coachUserId}/team-meets`, { params }),
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

// Activity Management API
export const activityAPI = {
  // Monthly Focus
  getMonthlyFocus: (registrationId: string, month: string) =>
    api.get(`/activity/${registrationId}/monthly-focus`, { params: { month } }),
  upsertMonthlyFocus: (registrationId: string, data: any) =>
    api.put(`/activity/${registrationId}/monthly-focus`, data),

  // Daily Planner
  getDailyPlanner: (registrationId: string, date: string) =>
    api.get(`/activity/${registrationId}/planner`, { params: { date } }),
  upsertDailyPlanner: (registrationId: string, data: any) =>
    api.put(`/activity/${registrationId}/planner`, data),

  // Month summary for calendar
  getMonthSummary: (registrationId: string, month: string) =>
    api.get(`/activity/${registrationId}/month-summary`, { params: { month } }),

  // Analytics
  getActivityAnalytics: (registrationId: string, months?: number) =>
    api.get(`/activity/${registrationId}/analytics`, { params: { months: months || 3 } }),

  // Feedback
  getFeedback: (registrationId: string, type?: string, period?: string) =>
    api.get(`/activity/${registrationId}/feedback`, { params: { type, period } }),
  upsertFeedback: (registrationId: string, data: { type: 'monthly' | 'weekly'; period: string; periodEnd?: string; feedback: string }) =>
    api.put(`/activity/${registrationId}/feedback`, data),
  deleteFeedback: (registrationId: string, feedbackId: string) =>
    api.delete(`/activity/${registrationId}/feedback/${feedbackId}`),
};

// SP Service & Enquiry API
export const spServiceAPI = {
  // SP-facing
  createService: (data: any) => api.post('/sp-services/my-services', data),
  getMyServices: () => api.get('/sp-services/my-services'),
  updateService: (serviceId: string, data: any) => api.put(`/sp-services/my-services/${serviceId}`, data),
  deleteService: (serviceId: string) => api.delete(`/sp-services/my-services/${serviceId}`),
  uploadThumbnail: (serviceId: string, file: File) => {
    const formData = new FormData();
    formData.append('thumbnail', file);
    return api.post(`/sp-services/my-services/${serviceId}/thumbnail`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getMyEnquiries: () => api.get('/sp-services/my-enquiries'),
  updateEnquiryStatus: (enquiryId: string, status: string) => api.patch(`/sp-services/my-enquiries/${enquiryId}/status`, { status }),

  // Student-facing
  browseServices: (params?: { category?: string; search?: string }) => api.get('/sp-services/browse', { params }),
  sendEnquiry: (data: { spServiceId: string; serviceProviderId: string; message: string }) => api.post('/sp-services/enquiry', data),
  getStudentEnquiries: () => api.get('/sp-services/student-enquiries'),
};

export default api;


