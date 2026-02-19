'use client';

import { useEffect, useState } from 'react';
import { programAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import axios from 'axios';
import ProgramCard from './ProgramCard';
import ProgramFormModal from './ProgramFormModal';
import ProgramChatView from './ProgramChatView';
import { getFullName } from '@/utils/nameHelpers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const PROGRAM_STATUSES = [
  'Shortlisted',
  'Application not Open',
  'In Progress',
  'Applied',
  'Offer Received',
  'Offer Accepted',
  'Offer not Accepted',
  'Rejected / Declined',
  'Closed',
] as const;

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Shortlisted': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'Application not Open': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'In Progress': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  'Applied': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'Offer Received': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  'Offer Accepted': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  'Offer not Accepted': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  'Rejected / Declined': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  'Closed': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
};

interface Program {
  _id: string;
  university: string;
  universityRanking: {
    webometricsWorld?: number;
    webometricsNational?: number;
    usNews?: number;
    qs?: number;
  };
  programName: string;
  programUrl?: string;
  campus?: string;
  country: string;
  studyLevel: string;
  duration?: number;
  ieltsScore?: number;
  applicationFee?: string;
  yearlyTuitionFees?: string;
  priority?: number;
  intake?: string;
  year?: string;
  status?: string;
  applicationOpenDate?: string;
  registrationId?: string;
  isSelectedByStudent?: boolean;
  selectedAt?: string;
  createdBy?: {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    role: string;
  };
}

type UserRole = 'STUDENT' | 'OPS' | 'SUPER_ADMIN' | 'ADMIN' | 'COUNSELOR';
type SectionType = 'available' | 'applied';

interface ProgramSectionProps {
  userRole: UserRole;
  sectionType: SectionType;
  studentId?: string; // Required for OPS/ADMIN, optional for STUDENT
  registrationId?: string; // Service registration ID
  isReadOnly?: boolean;
}

export default function ProgramSection({
  userRole,
  sectionType,
  studentId,
  registrationId,
  isReadOnly = false,
}: ProgramSectionProps) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // For chat feature
  const [selectedChatProgram, setSelectedChatProgram] = useState<Program | null>(null);
  const [selectedChatType, setSelectedChatType] = useState<'open' | 'private'>('open');
  
  // For student selecting programs
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set());
  const [programFormData, setProgramFormData] = useState<{ [key: string]: { year: string; priority: number; intake: string } }>({});
  const [selectingProgram, setSelectingProgram] = useState<string | null>(null);
  
  // For admin/OPS editing applied programs
  const [editingProgram, setEditingProgram] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{ [key: string]: { priority: number; intake: string; year: string } }>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // For "Application not Open" modal
  const [showAppNotOpenModal, setShowAppNotOpenModal] = useState(false);
  const [pendingStatusProgramId, setPendingStatusProgramId] = useState<string | null>(null);
  const [appOpenDate, setAppOpenDate] = useState('');
  const [appScheduleTime, setAppScheduleTime] = useState('');

  const intakeOptions = [
    'Spring', 'Summer', 'Fall', 'Winter',
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 2050 - currentYear + 1 }, (_, i) => currentYear + i);

  const canAddPrograms = sectionType === 'available' && !isReadOnly;
  const canEditApplied = sectionType === 'applied' && userRole === 'SUPER_ADMIN';
  const canSelectPrograms = sectionType === 'available' && userRole === 'STUDENT' && !isReadOnly;
  const canChangeStatus = sectionType === 'applied' && (userRole === 'OPS' || userRole === 'SUPER_ADMIN') && !isReadOnly;

  useEffect(() => {
    fetchPrograms();
  }, [userRole, sectionType, studentId, registrationId]);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      let response;
      const regParam = registrationId ? `&registrationId=${registrationId}` : '';

      if (userRole === 'STUDENT') {
        response = await programAPI.getStudentPrograms(registrationId);
        if (sectionType === 'available') {
          setPrograms(response.data.data.availablePrograms || []);
        } else {
          setPrograms(response.data.data.appliedPrograms || []);
        }
      } else if (userRole === 'OPS' && studentId) {
        response = await axios.get(
          `${API_URL}/programs/ops/student/${studentId}/programs?section=${sectionType === 'applied' ? 'applied' : 'all'}${regParam}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setPrograms(response.data.data.programs || []);
      } else if (userRole === 'SUPER_ADMIN' && studentId) {
        response = await programAPI.getSuperAdminStudentPrograms(studentId, sectionType === 'applied' ? 'applied' : 'all', registrationId);
        setPrograms(response.data.data.programs || []);
      } else if ((userRole === 'ADMIN' || userRole === 'COUNSELOR') && studentId) {
        response = await axios.get(
          `${API_URL}/programs/ops/student/${studentId}/programs?section=${sectionType === 'applied' ? 'applied' : 'all'}${regParam}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setPrograms(response.data.data.programs || []);
      }
    } catch (error: any) {
      console.error('Failed to fetch programs:', error);
      if (!isReadOnly) {
        toast.error('Failed to load programs');
      }
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: any) => {
    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const programData: any = {
        university: formData.university,
        universityRanking: {
          webometricsWorld: formData.universityRanking.webometricsWorld ? parseInt(formData.universityRanking.webometricsWorld) : undefined,
          webometricsNational: formData.universityRanking.webometricsNational ? parseInt(formData.universityRanking.webometricsNational) : undefined,
          usNews: formData.universityRanking.usNews ? parseInt(formData.universityRanking.usNews) : undefined,
          qs: formData.universityRanking.qs ? parseInt(formData.universityRanking.qs) : undefined,
        },
        programName: formData.programName,
        programUrl: formData.programUrl,
        country: formData.country,
        studyLevel: formData.studyLevel,
      };

      if (studentId) programData.studentId = studentId;
      if (registrationId) programData.registrationId = registrationId;
      if (formData.campus) programData.campus = formData.campus;
      if (formData.duration) programData.duration = parseInt(formData.duration);
      if (formData.ieltsScore) programData.ieltsScore = parseFloat(formData.ieltsScore);
      if (formData.applicationFee) programData.applicationFee = formData.applicationFee;
      if (formData.yearlyTuitionFees) programData.yearlyTuitionFees = formData.yearlyTuitionFees;

      let endpoint = '';
      if (userRole === 'STUDENT') {
        endpoint = `${API_URL}/programs/student/programs/create`;
      } else if (userRole === 'OPS') {
        endpoint = `${API_URL}/programs/ops/programs`;
      } else if (userRole === 'SUPER_ADMIN') {
        endpoint = `${API_URL}/programs/super-admin/programs/create`;
      }

      await axios.post(endpoint, programData, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Program created successfully');
      setShowAddModal(false);
      fetchPrograms();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create program');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadSample = () => {
    const link = document.createElement('a');
    link.href = '/samples/program-upload-sample.xlsx';
    link.download = 'program-upload-sample.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Sample Excel file downloaded');
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      if (studentId) formData.append('studentId', studentId);
      if (registrationId) formData.append('registrationId', registrationId);

      let endpoint = '';
      if (userRole === 'OPS') {
        endpoint = `${API_URL}/programs/ops/programs/upload-excel`;
      } else if (userRole === 'SUPER_ADMIN') {
        endpoint = `${API_URL}/programs/super-admin/programs/upload-excel`;
      }

      const response = await axios.post(endpoint, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success(response.data.message || 'Programs uploaded successfully');
      fetchPrograms();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload Excel file');
    } finally {
      setSubmitting(false);
      e.target.value = '';
    }
  };

  // Student program selection handlers
  const handleSelectProgram = (programId: string) => {
    setExpandedPrograms(prev => new Set([...prev, programId]));
    if (!programFormData[programId]) {
      setProgramFormData(prev => ({
        ...prev,
        [programId]: { year: String(currentYear), priority: 1, intake: '' },
      }));
    }
  };

  const handleApplyProgram = async (programId: string) => {
    const formData = programFormData[programId];
    if (!formData || !formData.year || !formData.intake || !formData.priority) {
      toast.error('Please fill all fields: Year, Priority, and Intake');
      return;
    }

    setSelectingProgram(programId);
    try {
      await programAPI.selectProgram({
        programId,
        priority: formData.priority,
        intake: formData.intake,
        year: formData.year,
        registrationId: registrationId,
      });
      toast.success('Program added to applied list');
      setExpandedPrograms(prev => {
        const newSet = new Set(prev);
        newSet.delete(programId);
        return newSet;
      });
      setProgramFormData(prev => {
        const newData = { ...prev };
        delete newData[programId];
        return newData;
      });
      fetchPrograms();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to select program');
    } finally {
      setSelectingProgram(null);
    }
  };

  const handleCancelSelection = (programId: string) => {
    setExpandedPrograms(prev => {
      const newSet = new Set(prev);
      newSet.delete(programId);
      return newSet;
    });
    setProgramFormData(prev => {
      const newData = { ...prev };
      delete newData[programId];
      return newData;
    });
  };

  // Admin edit handlers
  const handleEdit = (programId: string, program: Program) => {
    setEditingProgram(programId);
    setEditFormData({
      [programId]: {
        priority: program.priority || 1,
        intake: program.intake || '',
        year: program.year || String(currentYear),
      },
    });
  };

  const handleCancelEdit = (programId: string) => {
    setEditingProgram(null);
    setEditFormData(prev => {
      const newData = { ...prev };
      delete newData[programId];
      return newData;
    });
  };

  const handleSave = async (programId: string) => {
    const formData = editFormData[programId];
    if (!formData || !formData.intake || !formData.year || !formData.priority) {
      toast.error('Please fill all fields: Year, Priority, and Intake');
      return;
    }

    setSaving(programId);
    try {
      await programAPI.updateProgramSelection(programId, {
        priority: formData.priority,
        intake: formData.intake,
        year: formData.year,
      });
      toast.success('Program updated successfully');
      setEditingProgram(null);
      setEditFormData(prev => {
        const newData = { ...prev };
        delete newData[programId];
        return newData;
      });
      fetchPrograms();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update program');
    } finally {
      setSaving(null);
    }
  };

  const handleStatusChange = async (programId: string, newStatus: string) => {
    // Intercept "Application not Open" to show date/time modal
    if (newStatus === 'Application not Open') {
      setPendingStatusProgramId(programId);
      setAppOpenDate('');
      setAppScheduleTime('');
      setShowAppNotOpenModal(true);
      return;
    }

    setUpdatingStatus(programId);
    try {
      if (userRole === 'SUPER_ADMIN') {
        await programAPI.updateProgramStatusSuperAdmin(programId, newStatus);
      } else if (userRole === 'OPS') {
        await programAPI.updateProgramStatusOps(programId, newStatus);
      }
      toast.success('Status updated successfully');
      // Update local state immediately
      setPrograms(prev => prev.map(p => p._id === programId ? { ...p, status: newStatus, applicationOpenDate: undefined } : p));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleAppNotOpenConfirm = async () => {
    if (!pendingStatusProgramId || !appOpenDate || !appScheduleTime) {
      toast.error('Please select both date and time');
      return;
    }
    setShowAppNotOpenModal(false);
    setUpdatingStatus(pendingStatusProgramId);
    try {
      const extra = { applicationOpenDate: appOpenDate, scheduleTime: appScheduleTime };
      if (userRole === 'SUPER_ADMIN') {
        await programAPI.updateProgramStatusSuperAdmin(pendingStatusProgramId, 'Application not Open', extra);
      } else if (userRole === 'OPS') {
        await programAPI.updateProgramStatusOps(pendingStatusProgramId, 'Application not Open', extra);
      }
      toast.success('Status updated & OPS schedule created');
      setPrograms(prev => prev.map(p => p._id === pendingStatusProgramId ? { ...p, status: 'Application not Open', applicationOpenDate: appOpenDate } : p));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(null);
      setPendingStatusProgramId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Render available programs
  if (sectionType === 'available') {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Available Programs</h3>
            {canAddPrograms && (
              <div className="flex gap-3">
                {(userRole === 'OPS' || userRole === 'SUPER_ADMIN') && (
                  <>
                    <button
                      onClick={handleDownloadSample}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
                    >
                      Sample Excel
                    </button>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleExcelUpload}
                      disabled={submitting}
                      className="hidden"
                      id="excel-upload-input"
                    />
                    <label
                      htmlFor="excel-upload-input"
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm cursor-pointer disabled:opacity-50"
                    >
                      {submitting ? 'Uploading...' : 'Upload Excel'}
                    </label>
                  </>
                )}
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  + Add Program
                </button>
              </div>
            )}
          </div>

          {programs.length > 0 ? (
            <div className="space-y-4">
              {programs.map((program, index) => (
                <div key={program._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  {canSelectPrograms ? (
                    <div className="flex items-start justify-between">
                      {/* Program Number Badge */}
                      <div className="flex items-start gap-3 flex-1">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
                              {index + 1}
                            </div>
                            <h4 className="font-semibold text-gray-900">{program.programName}</h4>
                          </div>
                        <p className="text-sm text-gray-600 mb-2">{program.university}</p>
                        {getFullName(program.createdBy) && (
                          <p className="text-xs text-blue-600 mb-2">
                            Created by: <span className="font-medium">{getFullName(program.createdBy)}</span>
                          </p>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          {program.campus && <div><span className="font-medium">Campus:</span> {program.campus}</div>}
                          <div><span className="font-medium">Country:</span> {program.country}</div>
                          <div><span className="font-medium">Study Level:</span> {program.studyLevel}</div>
                          {program.duration && <div><span className="font-medium">Duration:</span> {program.duration} months</div>}
                          {program.ieltsScore && <div><span className="font-medium">IELTS:</span> {program.ieltsScore}</div>}
                          {program.yearlyTuitionFees && <div><span className="font-medium">Tuition:</span> {program.yearlyTuitionFees}</div>}
                          {program.applicationFee && <div><span className="font-medium">App Fee:</span> {program.applicationFee}</div>}
                          {program.programUrl && (
                            <div>
                              <span className="font-medium">Program Link:</span>{' '}
                              <a href={program.programUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                View
                              </a>
                            </div>
                          )}
                        </div>
                        {program.universityRanking && (Object.keys(program.universityRanking).some(key => program.universityRanking[key as keyof typeof program.universityRanking])) && (
                          <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600">
                            <div className="flex flex-wrap gap-4">
                              {program.universityRanking.webometricsWorld && (
                                <span>Webometrics World: {program.universityRanking.webometricsWorld}</span>
                              )}
                              {program.universityRanking.webometricsNational && (
                                <span>Webometrics National: {program.universityRanking.webometricsNational}</span>
                              )}
                              {program.universityRanking.usNews && (
                                <span>US News: {program.universityRanking.usNews}</span>
                              )}
                              {program.universityRanking.qs && (
                                <span>QS: {program.universityRanking.qs}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      </div>
                      {!expandedPrograms.has(program._id) ? (
                        <button
                          onClick={() => handleSelectProgram(program._id)}
                          className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          Select
                        </button>
                      ) : (
                        <div className="ml-4 flex flex-col gap-2 max-w-[200px]">
                          <div className="space-y-2">
                            <select
                              value={programFormData[program._id]?.year || String(currentYear)}
                              onChange={(e) => setProgramFormData(prev => ({
                                ...prev,
                                [program._id]: { ...prev[program._id], year: e.target.value }
                              }))}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                            >
                              {yearOptions.map(year => (
                                <option key={year} value={String(year)}>{year}</option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min="1"
                              placeholder="Priority"
                              value={programFormData[program._id]?.priority || ''}
                              onChange={(e) => setProgramFormData(prev => ({
                                ...prev,
                                [program._id]: { ...prev[program._id], priority: parseInt(e.target.value) || 1 }
                              }))}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                            />
                            <select
                              value={programFormData[program._id]?.intake || ''}
                              onChange={(e) => setProgramFormData(prev => ({
                                ...prev,
                                [program._id]: { ...prev[program._id], intake: e.target.value }
                              }))}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                            >
                              <option value="">Select Intake</option>
                              {intakeOptions.map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApplyProgram(program._id)}
                              disabled={selectingProgram === program._id || !programFormData[program._id]?.intake}
                              className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium disabled:opacity-50"
                            >
                              {selectingProgram === program._id ? 'Applying...' : 'Apply'}
                            </button>
                            <button
                              onClick={() => handleCancelSelection(program._id)}
                              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-xs font-medium"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <ProgramCard program={program} showPriority={false} showActions={false} index={index} />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>
                {userRole === 'STUDENT'
                  ? 'No programs available. Your OPS will add programs for you.'
                  : 'No programs added yet. Click "Add Program" to get started.'}
              </p>
            </div>
          )}
        </div>

        <ProgramFormModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      </div>
    );
  }

  // Render applied programs
  return (
  <>
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Applied Programs</h3>
        {programs.length > 0 ? (
          <div className={`flex gap-4 ${selectedChatProgram ? '' : 'flex-col'}`}>
            {/* Programs List */}
            <div className={`space-y-4 ${selectedChatProgram ? 'w-1/2 overflow-y-auto max-h-[600px]' : 'w-full'}`}>
              {programs.map((program, index) => (
                <div key={program._id} className={selectedChatProgram?._id === program._id ? 'bg-gray-200 rounded-lg p-2' : ''}>
                  {canEditApplied && editingProgram === program._id ? (
                    <div className="border border-gray-200 rounded-lg p-4 bg-white">
                      {/* Program Number Badge */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
                          {index + 1}
                        </div>
                        <h4 className="font-semibold text-gray-900">{program.programName}</h4>
                      </div>
                      <div className="flex gap-2 items-center flex-wrap mb-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Priority *</label>
                          <input
                            type="number"
                            min="1"
                            value={editFormData[program._id]?.priority || 1}
                            onChange={(e) => setEditFormData(prev => ({
                              ...prev,
                              [program._id]: { ...prev[program._id], priority: parseInt(e.target.value) || 1 }
                            }))}
                            className="w-24 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Intake *</label>
                          <select
                            value={editFormData[program._id]?.intake || ''}
                            onChange={(e) => setEditFormData(prev => ({
                              ...prev,
                              [program._id]: { ...prev[program._id], intake: e.target.value }
                            }))}
                            className="w-32 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                          >
                            <option value="">Select Intake</option>
                            {intakeOptions.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Year *</label>
                          <select
                            value={editFormData[program._id]?.year || String(currentYear)}
                            onChange={(e) => setEditFormData(prev => ({
                              ...prev,
                              [program._id]: { ...prev[program._id], year: e.target.value }
                            }))}
                            className="w-28 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                          >
                            {yearOptions.map(year => (
                              <option key={year} value={String(year)}>{year}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2 items-end">
                          <button
                            onClick={() => handleSave(program._id)}
                            disabled={saving === program._id || !editFormData[program._id]?.intake}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium disabled:opacity-50"
                          >
                            {saving === program._id ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => handleCancelEdit(program._id)}
                            className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-xs font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                      <ProgramCard program={program} showPriority={true} showActions={false} index={index} />
                    </div>
                  ) : (
                    <div>
                      <ProgramCard
                        program={program}
                        showPriority={false}
                        showActions={false}
                        index={index}
                        topRow={
                          <div className="flex items-start justify-between gap-2">
                            <div className={`flex items-center gap-2 flex-wrap ${selectedChatProgram ? 'max-w-[55%]' : ''}`}>
                              {/* Status Dropdown for OPS / Super Admin */}
                              {canChangeStatus && (
                                <select
                                  value={program.status || ''}
                                  onChange={(e) => handleStatusChange(program._id, e.target.value)}
                                  disabled={updatingStatus === program._id}
                                  className={`px-3 py-1 text-xs font-semibold rounded-full border cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                                    program.status
                                      ? `${STATUS_COLORS[program.status]?.bg || 'bg-gray-50'} ${STATUS_COLORS[program.status]?.text || 'text-gray-700'} ${STATUS_COLORS[program.status]?.border || 'border-gray-200'}`
                                      : 'bg-gray-50 text-gray-500 border-gray-200'
                                  } ${updatingStatus === program._id ? 'opacity-50' : ''}`}
                                >
                                  <option value="">— Status —</option>
                                  {PROGRAM_STATUSES.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </select>
                              )}
                              {/* Read-only status badge for non-OPS/SuperAdmin */}
                              {!canChangeStatus && program.status && (
                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[program.status]?.bg || 'bg-gray-50'} ${STATUS_COLORS[program.status]?.text || 'text-gray-700'}`}>
                                  {program.status}
                                </span>
                              )}
                              {program.priority && (
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                                  Priority: {program.priority}
                                </span>
                              )}
                              {program.intake && (
                                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                                  Intake: {program.intake}
                                </span>
                              )}
                              {program.year && (
                                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">
                                  Year: {program.year}
                                </span>
                              )}
                              {program.applicationOpenDate && (
                                <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">
                                  App Opens: {new Date(program.applicationOpenDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                              )}
                            </div>
                            {/* Chat buttons on the right */}
                            <div className="flex gap-2 shrink-0">
                              {userRole === 'STUDENT' ? (
                                <button
                                  onClick={() => {
                                    setSelectedChatProgram(program);
                                    setSelectedChatType('open');
                                  }}
                                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs font-medium shadow flex items-center space-x-1"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                  </svg>
                                  <span>Chat</span>
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedChatProgram(program);
                                      setSelectedChatType('open');
                                    }}
                                    className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs font-medium shadow flex items-center space-x-1"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    <span>Open</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedChatProgram(program);
                                      setSelectedChatType('private');
                                    }}
                                    className="px-2 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors text-xs font-medium shadow flex items-center space-x-1"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <span>Private</span>
                                  </button>
                                </>
                              )}
                              {canEditApplied && !isReadOnly && (
                                <button
                                  onClick={() => handleEdit(program._id, program)}
                                  className="px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-md hover:shadow-lg"
                                >
                                  Edit
                                </button>
                              )}
                            </div>
                          </div>
                        }
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Chat View */}
            {selectedChatProgram && (
              <div className="w-1/2">
                <ProgramChatView
                  program={selectedChatProgram}
                  onClose={() => setSelectedChatProgram(null)}
                  userRole={userRole}
                  isReadOnly={false}
                  chatType={selectedChatType}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>
              {userRole === 'STUDENT'
                ? 'No programs applied yet. Select programs from "Apply to Program" section.'
                : 'No programs applied yet by the student.'}
            </p>
          </div>
        )}
      </div>
    </div>

    {/* Application not Open - Date & Time Modal */}
    {showAppNotOpenModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Application Opening Date</h3>
          <p className="text-sm text-gray-500 mb-5">Select the date the application opens and a time for the OPS schedule reminder.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Application Open Date</label>
              <input
                type="date"
                value={appOpenDate}
                onChange={(e) => setAppOpenDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Time</label>
              <input
                type="time"
                value={appScheduleTime}
                onChange={(e) => setAppScheduleTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => { setShowAppNotOpenModal(false); setPendingStatusProgramId(null); }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAppNotOpenConfirm}
              disabled={!appOpenDate || !appScheduleTime}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
}

