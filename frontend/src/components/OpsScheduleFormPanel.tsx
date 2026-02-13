'use client';

import { useState, useEffect } from 'react';
import { OpsSchedule, OPS_SCHEDULE_STATUS, OpsScheduleStudent } from '@/types';
import { format } from 'date-fns';
import { getFullName } from '@/utils/nameHelpers';

interface OpsScheduleFormPanelProps {
  schedule?: OpsSchedule | null;
  students: OpsScheduleStudent[];
  selectedDate?: Date | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    studentId?: string | null;
    scheduledDate: string;
    scheduledTime: string;
    description: string;
    status?: OPS_SCHEDULE_STATUS;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
  isLoading?: boolean;
  readOnly?: boolean;
}

export default function OpsScheduleFormPanel({
  schedule,
  students,
  selectedDate,
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  isLoading = false,
  readOnly = false,
}: OpsScheduleFormPanelProps) {
  const [assignTo, setAssignTo] = useState<string>('me'); // 'me' or studentId
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('10:00');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<OPS_SCHEDULE_STATUS>(OPS_SCHEDULE_STATUS.SCHEDULED);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isEditing = !!schedule;

  // Populate form when editing or new date selected
  useEffect(() => {
    if (schedule) {
      const student = schedule.studentId as OpsScheduleStudent;
      setAssignTo(student?._id || 'me');
      setScheduledDate(format(new Date(schedule.scheduledDate), 'yyyy-MM-dd'));
      setScheduledTime(schedule.scheduledTime);
      setDescription(schedule.description || '');
      setStatus(schedule.status);
    } else if (selectedDate) {
      setScheduledDate(format(selectedDate, 'yyyy-MM-dd'));
      setAssignTo('me');
      setScheduledTime('10:00');
      setDescription('');
      setStatus(OPS_SCHEDULE_STATUS.SCHEDULED);
    } else {
      setScheduledDate(format(new Date(), 'yyyy-MM-dd'));
      setAssignTo('me');
      setScheduledTime('10:00');
      setDescription('');
      setStatus(OPS_SCHEDULE_STATUS.SCHEDULED);
    }
  }, [schedule, selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setSaving(true);
    try {
      await onSubmit({
        studentId: assignTo === 'me' ? null : assignTo,
        scheduledDate,
        scheduledTime,
        description,
        status,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (onDelete) {
      setSaving(true);
      try {
        await onDelete();
      } finally {
        setSaving(false);
        setShowDeleteConfirm(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Slide-in Panel from Left */}
      <div 
        className={`fixed top-[140px] left-4 z-40 w-[380px] bg-white shadow-2xl rounded-xl border border-gray-200 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
        }`}
        style={{ maxHeight: 'calc(100vh - 220px)' }}
      >
        {/* Compact Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-3 rounded-t-xl flex items-center justify-between">
          <span className="text-white font-medium text-sm">
            {readOnly ? '📋 View Schedule' : isEditing ? '✏️ Edit Schedule' : '➕ New Schedule'}
          </span>
          <button
            onClick={onClose}
            className="text-white hover:text-indigo-200 transition-colors p-1 hover:bg-white/10 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
          <form onSubmit={handleSubmit} className="px-4 py-3 space-y-4">
            {/* Assign To Field */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Assign To <span className="text-red-500">*</span>
              </label>
              <select
                value={assignTo}
                onChange={(e) => setAssignTo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                required
                disabled={readOnly}
              >
                <option value="me">Me (Personal Task)</option>
                <optgroup label="Students">
                  {students.map((student) => (
                    <option key={student._id} value={student._id}>
                      {getFullName(student.userId) || 'Unknown'} - {student.userId?.email || ''}
                    </option>
                  ))}
                </optgroup>
              </select>
              {students.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">No students assigned to you</p>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                required
                disabled={readOnly}
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                required
                disabled={readOnly}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Enter task description or agenda..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                disabled={readOnly}
              />
            </div>

            {/* Status (show when editing or readOnly) */}
            {(isEditing || readOnly) && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as OPS_SCHEDULE_STATUS)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={readOnly}
                >
                  <option value={OPS_SCHEDULE_STATUS.SCHEDULED}>Scheduled</option>
                  <option value={OPS_SCHEDULE_STATUS.COMPLETED}>Completed</option>
                  <option value={OPS_SCHEDULE_STATUS.MISSED}>Missed</option>
                </select>
              </div>
            )}
          </form>
        </div>

        {/* Footer - Action Buttons (hidden in readOnly mode) */}
        {!readOnly && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={saving || isLoading}
              className="flex-1 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving || isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </span>
              ) : isEditing ? (
                'Update'
              ) : (
                'Create'
              )}
            </button>
            
            {isEditing && onDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={saving || isLoading}
                className="px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                Delete
              </button>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Schedule</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this schedule? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

