'use client';

import { useState, useEffect } from 'react';
import { TeamMeet, TEAMMEET_STATUS, TEAMMEET_TYPE, TeamMeetParticipant, TeamMeetAvailability } from '@/types';
import { teamMeetAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { getFullName } from '@/utils/nameHelpers';

interface TeamMeetFormPanelProps {
  teamMeet: TeamMeet | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  selectedDate?: Date;
  mode: 'create' | 'view' | 'respond';
  currentUserId?: string;
  readOnly?: boolean; // If true, hides all action buttons (for admin viewing counselor's TeamMeets)
}

// TeamMeet theme colors (Updated theme)
const TEAMMEET_COLORS = {
  PENDING_CONFIRMATION: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-500' },
  CONFIRMED: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-500' },
  REJECTED: { bg: 'bg-red-200', text: 'text-red-900', border: 'border-red-800' },
  CANCELLED: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-500' },
  COMPLETED: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-500' },
};

export default function TeamMeetFormPanel({
  teamMeet,
  isOpen,
  onClose,
  onSave,
  selectedDate,
  mode,
  currentUserId,
  readOnly = false,
}: TeamMeetFormPanelProps) {
  // Form state
  const [subject, setSubject] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [duration, setDuration] = useState(30);
  const [meetingType, setMeetingType] = useState<TEAMMEET_TYPE>(TEAMMEET_TYPE.ONLINE);
  const [description, setDescription] = useState('');
  const [requestedTo, setRequestedTo] = useState('');
  const [rejectionMessage, setRejectionMessage] = useState('');
  
  // UI state
  const [participants, setParticipants] = useState<TeamMeetParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availability, setAvailability] = useState<TeamMeetAvailability | null>(null);
  const [showRejectInput, setShowRejectInput] = useState(false);

  // Fetch participants on open
  useEffect(() => {
    if (isOpen && mode === 'create') {
      fetchParticipants();
    }
  }, [isOpen, mode]);

  // Initialize form when teamMeet changes or mode changes
  useEffect(() => {
    if (isOpen) {
      if (teamMeet && (mode === 'view' || mode === 'respond')) {
        setSubject(teamMeet.subject);
        setScheduledDate(format(new Date(teamMeet.scheduledDate), 'yyyy-MM-dd'));
        setScheduledTime(teamMeet.scheduledTime);
        setDuration(teamMeet.duration);
        setMeetingType(teamMeet.meetingType);
        setDescription(teamMeet.description || '');
        setRequestedTo(teamMeet.requestedTo._id);
      } else if (mode === 'create') {
        // Reset form for create mode
        setSubject('');
        setScheduledDate(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '');
        setScheduledTime('');
        setDuration(30);
        setMeetingType(TEAMMEET_TYPE.ONLINE);
        setDescription('');
        setRequestedTo('');
        setRejectionMessage('');
        setAvailability(null);
        setShowRejectInput(false);
      }
    }
  }, [isOpen, teamMeet, mode, selectedDate]);

  // Check availability when date/time/duration/participant changes
  useEffect(() => {
    if (mode === 'create' && scheduledDate && scheduledTime && duration && requestedTo) {
      checkAvailability();
    } else {
      setAvailability(null);
    }
  }, [scheduledDate, scheduledTime, duration, requestedTo, mode]);

  const fetchParticipants = async () => {
    try {
      const response = await teamMeetAPI.getParticipants();
      setParticipants(response.data.data.participants);
    } catch (error) {
      console.error('Error fetching participants:', error);
      toast.error('Failed to load participants');
    }
  };

  const checkAvailability = async () => {
    if (!scheduledDate || !scheduledTime || !duration || !requestedTo) return;

    setCheckingAvailability(true);
    try {
      const response = await teamMeetAPI.checkAvailability({
        date: scheduledDate,
        time: scheduledTime,
        duration,
        participantId: requestedTo,
      });
      setAvailability(response.data.data);
    } catch (error) {
      console.error('Error checking availability:', error);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleCreate = async () => {
    if (!subject.trim()) {
      toast.error('Subject is required');
      return;
    }
    if (!scheduledDate || !scheduledTime) {
      toast.error('Date and time are required');
      return;
    }
    if (!requestedTo) {
      toast.error('Please select a participant');
      return;
    }
    if (availability && !availability.isAvailable) {
      toast.error('Selected time slot is not available');
      return;
    }

    setSaving(true);
    try {
      await teamMeetAPI.createTeamMeet({
        subject: subject.trim(),
        scheduledDate,
        scheduledTime,
        duration,
        meetingType,
        description: description.trim() || undefined,
        requestedTo,
      });
      toast.success('Meeting request sent!');
      onSave();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create meeting');
    } finally {
      setSaving(false);
    }
  };

  const handleAccept = async () => {
    if (!teamMeet) return;

    setSaving(true);
    try {
      await teamMeetAPI.acceptTeamMeet(teamMeet._id);
      toast.success('Meeting accepted!');
      onSave();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to accept meeting');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!teamMeet) return;

    if (!rejectionMessage.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setSaving(true);
    try {
      await teamMeetAPI.rejectTeamMeet(teamMeet._id, rejectionMessage.trim());
      toast.success('Meeting rejected');
      onSave();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject meeting');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!teamMeet) return;

    setSaving(true);
    try {
      await teamMeetAPI.cancelTeamMeet(teamMeet._id);
      toast.success('Meeting cancelled');
      onSave();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel meeting');
    } finally {
      setSaving(false);
    }
  };

  const handleReschedule = async () => {
    if (!teamMeet) return;

    if (!scheduledDate || !scheduledTime) {
      toast.error('Date and time are required');
      return;
    }

    setSaving(true);
    try {
      await teamMeetAPI.rescheduleTeamMeet(teamMeet._id, {
        scheduledDate,
        scheduledTime,
        duration,
        subject: subject.trim() || undefined,
        description: description.trim() || undefined,
      });
      toast.success('Meeting rescheduled!');
      onSave();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reschedule meeting');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!teamMeet) return;

    setSaving(true);
    try {
      await teamMeetAPI.completeTeamMeet(teamMeet._id, { description: description.trim() || undefined });
      toast.success('Meeting marked as completed');
      onSave();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to complete meeting');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  // Determine user role in this meeting
  const isSender = teamMeet && teamMeet.requestedBy._id === currentUserId;
  const isRecipient = teamMeet && teamMeet.requestedTo._id === currentUserId;
  const statusColors = teamMeet ? TEAMMEET_COLORS[teamMeet.status] : null;

  return (
    <>
      {/* Slide-in Panel from Left */}
      <div 
        className={`fixed top-[140px] left-4 z-40 w-[400px] bg-white shadow-2xl rounded-xl border border-gray-200 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
        }`}
        style={{ maxHeight: 'calc(100vh - 180px)' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-4 py-3 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-white font-semibold">
              {mode === 'create' ? 'Schedule TeamMeet' : mode === 'respond' ? 'Meeting Invitation' : 'Meeting Details'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          {/* Status Badge (for view/respond modes) */}
          {teamMeet && statusColors && (
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-4 ${statusColors.bg} ${statusColors.text}`}>
              {teamMeet.status.replace('_', ' ')}
            </div>
          )}

          {/* Meeting Info (for view/respond modes) */}
          {teamMeet && mode !== 'create' && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <span className="font-medium">From:</span>
                <span>{getFullName(teamMeet.requestedBy)} ({teamMeet.requestedBy.role})</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="font-medium">To:</span>
                <span>{getFullName(teamMeet.requestedTo)} ({teamMeet.requestedTo.role})</span>
              </div>
            </div>
          )}

          {/* Zoho Meeting Link */}
          {teamMeet && teamMeet.zohoMeetingUrl && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium text-green-700">Online Meeting</span>
              </div>
              <a
                href={teamMeet.zohoMeetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Join Zoho Meeting
              </a>
            </div>
          )}

          {/* Rejection Message Display */}
          {teamMeet && teamMeet.status === TEAMMEET_STATUS.REJECTED && teamMeet.rejectionMessage && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-rose-700 mb-1">Rejection Reason:</p>
              <p className="text-sm text-rose-600">{teamMeet.rejectionMessage}</p>
            </div>
          )}

          {/* Subject */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={mode !== 'create' && teamMeet?.status !== TEAMMEET_STATUS.REJECTED}
              placeholder="Enter meeting subject"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          {/* To (Participant) - Only for create mode */}
          {mode === 'create' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
              <select
                value={requestedTo}
                onChange={(e) => setRequestedTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="">Select participant...</option>
                {participants.map((p) => (
                  <option key={p._id} value={p._id}>
                    {getFullName(p)} ({p.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                disabled={mode !== 'create' && teamMeet?.status !== TEAMMEET_STATUS.REJECTED}
                min={format(new Date(), 'yyyy-MM-dd')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                disabled={mode !== 'create' && teamMeet?.status !== TEAMMEET_STATUS.REJECTED}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>
          </div>

          {/* Duration */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              disabled={mode !== 'create' && teamMeet?.status !== TEAMMEET_STATUS.REJECTED}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
          </div>

          {/* Meeting Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Meeting Type</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => mode === 'create' && setMeetingType(TEAMMEET_TYPE.ONLINE)}
                disabled={mode !== 'create'}
                className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                  meetingType === TEAMMEET_TYPE.ONLINE
                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                } ${mode !== 'create' ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-medium">Online</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => mode === 'create' && setMeetingType(TEAMMEET_TYPE.FACE_TO_FACE)}
                disabled={mode !== 'create'}
                className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                  meetingType === TEAMMEET_TYPE.FACE_TO_FACE
                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                } ${mode !== 'create' ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-sm font-medium">Face-to-Face</span>
                </div>
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={mode !== 'create' && teamMeet?.status !== TEAMMEET_STATUS.REJECTED && teamMeet?.status !== TEAMMEET_STATUS.CONFIRMED}
              placeholder="Add meeting details..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:bg-gray-100 resize-none"
            />
          </div>

          {/* Availability Status (for create mode) */}
          {mode === 'create' && (
            <div className="mb-4">
              {checkingAvailability ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Checking availability...
                </div>
              ) : availability ? (
                <div className={`flex items-center gap-2 text-sm ${availability.isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                  {availability.isAvailable ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Both parties are available
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <div>
                        {!availability.senderAvailable && availability.senderConflict && (
                          <p>You have a {availability.senderConflict.type} at {availability.senderConflict.time}</p>
                        )}
                        {!availability.recipientAvailable && availability.recipientConflict && (
                          <p>Recipient has a {availability.recipientConflict.type} at {availability.recipientConflict.time}</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* Rejection Input (for respond mode) */}
          {mode === 'respond' && showRejectInput && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Rejection</label>
              <textarea
                value={rejectionMessage}
                onChange={(e) => setRejectionMessage(e.target.value)}
                placeholder="Please provide a reason..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 bg-gray-50 rounded-b-xl border-t border-gray-200">
          {/* Create Mode Actions */}
          {!readOnly && mode === 'create' && (
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !availability?.isAvailable}
                className="flex-1 px-4 py-2 text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:bg-violet-300 transition-colors"
              >
                {saving ? 'Sending...' : 'Schedule Meeting'}
              </button>
            </div>
          )}

          {/* Respond Mode Actions (for recipient with pending status) */}
          {!readOnly && mode === 'respond' && isRecipient && teamMeet?.status === TEAMMEET_STATUS.PENDING_CONFIRMATION && (
            <div className="flex gap-2">
              {showRejectInput ? (
                <>
                  <button
                    onClick={() => setShowRejectInput(false)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={saving}
                    className="flex-1 px-4 py-2 text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:bg-rose-300 transition-colors"
                  >
                    {saving ? 'Rejecting...' : 'Confirm Reject'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowRejectInput(true)}
                    className="flex-1 px-4 py-2 text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={handleAccept}
                    disabled={saving}
                    className="flex-1 px-4 py-2 text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:bg-violet-300 transition-colors"
                  >
                    {saving ? 'Accepting...' : 'Accept'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* View Mode Actions (for sender with pending status) */}
          {!readOnly && mode === 'view' && isSender && teamMeet?.status === TEAMMEET_STATUS.PENDING_CONFIRMATION && (
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex-1 px-4 py-2 text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
              >
                {saving ? 'Cancelling...' : 'Cancel Meeting'}
              </button>
            </div>
          )}

          {/* Reschedule Actions (for sender with rejected status) */}
          {!readOnly && mode === 'view' && isSender && teamMeet?.status === TEAMMEET_STATUS.REJECTED && (
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleReschedule}
                disabled={saving}
                className="flex-1 px-4 py-2 text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:bg-violet-300 transition-colors"
              >
                {saving ? 'Rescheduling...' : 'Reschedule'}
              </button>
            </div>
          )}

          {/* Complete Action (for confirmed meetings) */}
          {!readOnly && mode === 'view' && teamMeet?.status === TEAMMEET_STATUS.CONFIRMED && (
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleComplete}
                disabled={saving}
                className="flex-1 px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors"
              >
                {saving ? 'Completing...' : 'Mark Completed'}
              </button>
            </div>
          )}

          {/* Close only for completed/cancelled meetings OR readOnly mode */}
          {(readOnly || (mode === 'view' && (teamMeet?.status === TEAMMEET_STATUS.COMPLETED || teamMeet?.status === TEAMMEET_STATUS.CANCELLED))) && (
            <button
              onClick={onClose}
              className="w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          )}

          {/* Close for recipient viewing non-pending meetings */}
          {!readOnly && mode === 'respond' && isRecipient && teamMeet?.status !== TEAMMEET_STATUS.PENDING_CONFIRMATION && (
            <button
              onClick={onClose}
              className="w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </>
  );
}
