// Question Types
export enum QuestionType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  SELECT = 'select',
  MULTISELECT = 'multiselect',
}

export enum EditPolicy {
  STUDENT = 'STUDENT',
  COUNSELOR = 'COUNSELOR',
  ADMIN = 'ADMIN',
}

export interface Question {
  _id: string;
  label: string;
  type: QuestionType;
  options?: string[];
  editPolicy: EditPolicy;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Service Types
export interface Service {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Section Types
export interface SectionQuestion {
  question: string | Question;
  isIncluded: boolean;
  isRequired: boolean;
  isEditable: boolean;
  order: number;
}

export interface FormSection {
  _id: string;
  title: string;
  description?: string;
  isRepeatable: boolean;
  minRepeats: number;
  maxRepeats?: number;
  questions: SectionQuestion[];
  isActive: boolean;
  isGlobal: boolean;
  createdBy: string;
  usedInServices: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceSection {
  _id: string;
  service: string | Service;
  section: string | FormSection;
  order: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Enrollment Types
export enum EnrollmentStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  COMPLETED = 'completed',
}

export interface Enrollment {
  _id: string;
  student: string;
  service: string | Service;
  assignedCounselor?: string;
  status: EnrollmentStatus;
  startedAt?: string;
  submittedAt?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Answer Types
export interface UpdateHistory {
  value: any;
  updatedAt: string;
  updatedBy: 'STUDENT' | 'COUNSELOR' | 'ADMIN';
  updatedByUser: string;
}

export interface QuestionValue {
  question: string;
  value: any;
  updateHistory: UpdateHistory[];
}

export interface SectionAnswer {
  section: string;
  sectionInstanceId: string;
  values: QuestionValue[];
}

export interface Answer {
  _id: string;
  student: string;
  answers: SectionAnswer[];
  createdAt?: string;
  updatedAt?: string;
}

// Edit Request Types
export enum EditRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface EditRequest {
  _id: string;
  student: string;
  service: string | Service;
  section: string | FormSection;
  sectionInstanceId: string;
  question: string | Question;
  currentValue: any;
  requestedValue: any;
  requestedBy: 'STUDENT' | 'COUNSELOR';
  requestedByUser: string;
  status: EditRequestStatus;
  approvedBy?: 'COUNSELOR' | 'ADMIN';
  approvedByUser?: string;
  reason?: string;
  rejectionReason?: string;
  resolvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

