export enum USER_ROLE {
  STUDENT = 'STUDENT',
  PARENT = 'PARENT',
  OPS = 'OPS',
  COUNSELOR = 'COUNSELOR',
  EDUPLAN_COACH = 'EDUPLAN_COACH',
  IVY_EXPERT = 'IVY_EXPERT',
  ADMIN = 'ADMIN',
  ALUMNI = 'ALUMNI',
  SUPER_ADMIN = 'SUPER_ADMIN',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER',
}

export interface User {
  _id?: string;
  id?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  role: USER_ROLE | string;
  isVerified: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  // Admin-specific fields (populated when role is ADMIN)
  companyName?: string;
  companyLogo?: string;
}

export interface Student {
  _id: string;
  userId: string;
  mobileNumber: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    token?: string;
  };
}

// Service Types
export interface Service {
  _id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  icon?: string;
  learnMoreUrl?: string;
  isActive: boolean;
  order: number;
}

export interface OPS {
  _id: string;
  userId: string;
  email: string;
  mobileNumber?: string;
}

export interface StudentServiceRegistration {
  _id: string;
  studentId: string;
  serviceId: Service | string;
  primaryOpsId?: OPS | string;
  secondaryOpsId?: OPS | string;
  activeOpsId?: OPS | string;
  status: 'REGISTERED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  registeredAt: string;
  completedAt?: string;
  cancelledAt?: string;
  paymentStatus?: string;
  paymentAmount?: number;
  notes?: string;
}

// Form Types
export enum FormPartKey {
  PROFILE = 'PROFILE',
  APPLICATION = 'APPLICATION',
  DOCUMENT = 'DOCUMENT',
  PAYMENT = 'PAYMENT',
}

export enum FieldType {
  TEXT = 'TEXT',
  EMAIL = 'EMAIL',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  PHONE = 'PHONE',
  TEXTAREA = 'TEXTAREA',
  SELECT = 'SELECT',
  RADIO = 'RADIO',
  CHECKBOX = 'CHECKBOX',
  FILE = 'FILE',
  COUNTRY = 'COUNTRY',
  STATE = 'STATE',
  CITY = 'CITY',
}

export interface FormField {
  _id: string;
  subSectionId: string;
  label: string;
  key: string;
  type: FieldType;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  order: number;
  isActive: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  options?: Array<{
    label: string;
    value: string;
  }>;
  defaultValue?: any;
}

export interface FormSubSection {
  _id: string;
  sectionId: string;
  title: string;
  description?: string;
  order: number;
  isRepeatable: boolean;
  isActive: boolean;
  maxRepeat?: number;
  fields: FormField[];
}

export interface FormSection {
  _id: string;
  serviceId: string;
  partId: string;
  title: string;
  description?: string;
  order: number;
  isActive: boolean;
  subSections: FormSubSection[];
}

export interface FormPart {
  _id: string;
  key: FormPartKey;
  title: string;
  description?: string;
  order: number;
  isActive: boolean;
}

export interface FormStructure {
  part: FormPart;
  order: number;
  sections: FormSection[];
}

export interface StudentFormAnswer {
  _id: string;
  studentServiceId: string;
  partKey: string;
  sectionId?: string;
  answers: any;
  completed: boolean;
  lastSavedAt: string;
  completedAt?: string;
}

// Document Types
export enum DocumentCategory {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
}

export enum DocumentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface StudentDocument {
  _id: string;
  registrationId: string;
  studentId: string;
  documentCategory: DocumentCategory;
  documentName: string;
  documentKey: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
  };
  uploadedByRole: 'STUDENT' | 'OPS' | 'SUPER_ADMIN';
  status: DocumentStatus;
  approvedBy?: {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
  };
  approvedAt?: string;
  rejectedBy?: {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
  };
  rejectedAt?: string;
  rejectionMessage?: string;
  version: number;
  isCustomField: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentFieldConfig {
  documentKey: string;
  documentName: string;
  category: DocumentCategory;
  isCustomField: boolean;
  required?: boolean;
  helpText?: string;
}

// Lead Types
export enum SERVICE_TYPE {
  EDUCATION_PLANNING = "Education Planning",
  CARRER_FOCUS_STUDY_ABROAD = "Carrer Focus Study Abroad ",
  IVY_LEAGUE_ADMISSION = "Ivy League Admission",
  IELTS_GRE_LANGUAGE_COACHING = "IELTS/GRE/Language Coaching",
}

export enum LEAD_STAGE {
  NEW = 'New',
  HOT = 'Hot',
  WARM = 'Warm',
  COLD = 'Cold',
  CONVERTED = 'Converted to Student',
  CLOSED = 'Closed',
}

export interface Lead {
  _id: string;
  adminId: {
    _id: string;
    userId: {
      _id: string;
      firstName: string;
      middleName?: string;
      lastName: string;
      email: string;
    };
    enquiryFormSlug: string;
  };
  assignedCounselorId?: {
    _id: string;
    userId: {
      _id: string;
      firstName: string;
      middleName?: string;
      lastName: string;
      email: string;
    };
  };
  name: string;
  email: string;
  mobileNumber: string;
  city: string;
  serviceTypes: SERVICE_TYPE[];
  stage: LEAD_STAGE;
  conversionRequestId?: string;
  conversionStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}

export interface AdminInfo {
  adminName: string;
  companyName?: string;
  companyLogo?: string | null;
  services: string[];
}

// Follow-Up Types
export enum FOLLOWUP_STATUS {
  SCHEDULED = 'Scheduled',
  CALL_NOT_ANSWERED = 'Call Not Answered',
  PHONE_SWITCHED_OFF = 'Phone Switched Off',
  OUT_OF_COVERAGE = 'Out of Coverage Area',
  NUMBER_BUSY = 'Number Busy',
  CALL_DISCONNECTED = 'Call Disconnected',
  INVALID_NUMBER = 'Invalid / Wrong Number',
  INCOMING_BARRED = 'Incoming Calls Barred',
  CALL_REJECTED = 'Call Rejected / Declined',
  CALL_BACK_LATER = 'Asked to Call Back Later',
  BUSY_RESCHEDULE = 'Busy - Requested Reschedule',
  DISCUSS_WITH_PARENTS = 'Need time to discuss with parents',
  RESPONDING_VAGUELY = 'Responding Vaguely / Non-committal',
  INTERESTED_NEED_TIME = 'Interested - Need Time',
  INTERESTED_DISCUSSING = 'Interested - Discussing with Family',
  NOT_INTERESTED = 'Not Interested (Explicit)',
  NOT_REQUIRED = 'Not Required Anymore',
  REPEATEDLY_NOT_RESPONDING = 'Repeatedly Not Responding',
  FAKE_ENQUIRY = 'Fake / Test Enquiry',
  DUPLICATE_ENQUIRY = 'Duplicate Enquiry',
  CONVERTED_TO_STUDENT = 'Converted to Student',
}

export enum MEETING_TYPE {
  ONLINE = 'Online',
  FACE_TO_FACE = 'Face to Face',
}

export interface FollowUp {
  _id: string;
  leadId: Lead | string;
  counselorId: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  meetingType: MEETING_TYPE;
  zohoMeetingKey?: string;
  zohoMeetingUrl?: string;
  status: FOLLOWUP_STATUS;
  stageAtFollowUp: LEAD_STAGE;
  stageChangedTo?: LEAD_STAGE;
  followUpNumber: number; // Sequential number for this lead (1st, 2nd, 3rd follow-up)
  notes?: string;
  createdBy: {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
  };
  updatedBy?: {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
  };
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpSummary {
  today: FollowUp[];
  missed: FollowUp[];
  upcoming: FollowUp[];
  counts: {
    today: number;
    missed: number;
    upcoming: number;
  };
}

export interface CreateFollowUpData {
  leadId: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  meetingType: MEETING_TYPE;
  notes?: string;
}

export interface UpdateFollowUpData {
  status?: FOLLOWUP_STATUS;
  stageChangedTo?: LEAD_STAGE;
  notes?: string;
  nextFollowUp?: {
    scheduledDate: string;
    scheduledTime: string;
    duration: number;
  };
}

// TeamMeet Types
export enum TEAMMEET_STATUS {
  PENDING_CONFIRMATION = 'PENDING_CONFIRMATION',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum TEAMMEET_TYPE {
  ONLINE = 'ONLINE',
  FACE_TO_FACE = 'FACE_TO_FACE',
}

export interface TeamMeet {
  _id: string;
  subject: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  meetingType: TEAMMEET_TYPE;
  zohoMeetingKey?: string;
  zohoMeetingUrl?: string;
  description?: string;
  requestedBy: {
    _id: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    email: string;
    role: string;
  };
  requestedTo: {
    _id: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    email: string;
    role: string;
  };
  status: TEAMMEET_STATUS;
  rejectionMessage?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMeetParticipant {
  _id: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email: string;
  role: string;
}

export interface CreateTeamMeetData {
  subject: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  meetingType: TEAMMEET_TYPE;
  description?: string;
  requestedTo: string;
}

export interface RescheduleTeamMeetData {
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  subject?: string;
  description?: string;
}

export interface TeamMeetAvailability {
  isAvailable: boolean;
  senderAvailable: boolean;
  senderConflict?: {
    type: string;
    time: string;
    with: string;
  };
  recipientAvailable: boolean;
  recipientConflict?: {
    type: string;
    time: string;
    with: string;
  };
}

// OPS Schedule Types
export enum OPS_SCHEDULE_STATUS {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  MISSED = 'MISSED',
}

export interface OpsScheduleStudent {
  _id: string;
  userId: {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
  };
}

export interface OpsSchedule {
  _id: string;
  opsId: string;
  studentId?: OpsScheduleStudent | string | null; // Optional for "Me" tasks
  scheduledDate: string;
  scheduledTime: string;
  description: string;
  status: OPS_SCHEDULE_STATUS;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OpsScheduleSummary {
  today: OpsSchedule[];
  missed: OpsSchedule[];
  tomorrow: OpsSchedule[];
  counts: {
    today: number;
    missed: number;
    tomorrow: number;
    total: number;
  };
}

export interface CreateOpsScheduleData {
  studentId?: string | null; // Optional - null/undefined for "Me" tasks
  scheduledDate: string;
  scheduledTime: string;
  description: string;
  status?: OPS_SCHEDULE_STATUS;
}

// Lead Student Conversion Types
export enum CONVERSION_STATUS {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface LeadStudentConversion {
  _id: string;
  leadId: Lead | string;
  requestedBy: {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
  };
  adminId: {
    _id: string;
    userId: {
      _id: string;
      firstName: string;
      middleName?: string;
      lastName: string;
      email: string;
    };
  };
  status: CONVERSION_STATUS;
  rejectionReason?: string;
  approvedBy?: {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
  };
  approvedAt?: string;
  rejectedBy?: {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
  };
  rejectedAt?: string;
  createdStudentId?: string;
  createdAt: string;
  updatedAt: string;
}

// Extended Student type with admin and counselor info
export interface StudentWithDetails extends Student {
  adminId?: {
    _id: string;
    userId: {
      _id: string;
      firstName: string;
      middleName?: string;
      lastName: string;
      email: string;
    };
  };
  counselorId?: {
    _id: string;
    userId: {
      _id: string;
      firstName: string;
      middleName?: string;
      lastName: string;
      email: string;
    };
  };
  convertedFromLeadId?: string;
  conversionDate?: string;
  user?: {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
  };
}
