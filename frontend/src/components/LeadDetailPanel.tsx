'use client';

import { useState, useEffect } from 'react';
import { Lead, FollowUp, LEAD_STAGE, FOLLOWUP_STATUS, MEETING_TYPE, SERVICE_TYPE } from '@/types';
import { followUpAPI, leadAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { getFullName } from '@/utils/nameHelpers';

interface LeadDetailPanelProps {
  leadId: string;
  onClose: () => void;
  onFollowUpScheduled: () => void;
}

// Helper to get stage badge color
const getStageBadgeColor = (stage: LEAD_STAGE) => {
  switch (stage) {
    case LEAD_STAGE.NEW:
      return 'bg-blue-100 text-blue-800';
    case LEAD_STAGE.HOT:
      return 'bg-red-100 text-red-800';
    case LEAD_STAGE.WARM:
      return 'bg-yellow-100 text-yellow-800';
    case LEAD_STAGE.COLD:
      return 'bg-cyan-100 text-cyan-800';
    case LEAD_STAGE.CONVERTED:
      return 'bg-green-100 text-green-800';
    case LEAD_STAGE.CLOSED:
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Helper to get service color
const getServiceColor = (service: string) => {
  switch (service) {
    case SERVICE_TYPE.CARRER_FOCUS_STUDY_ABROAD:
      return 'bg-indigo-100 text-indigo-800';
    case SERVICE_TYPE.IVY_LEAGUE_ADMISSION:
      return 'bg-amber-100 text-amber-800';
    case SERVICE_TYPE.EDUCATION_PLANNING:
      return 'bg-teal-100 text-teal-800';
    case SERVICE_TYPE.IELTS_GRE_LANGUAGE_COACHING:
      return 'bg-rose-100 text-rose-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Helper to get status badge color
const getStatusBadgeColor = (status: FOLLOWUP_STATUS) => {
  switch (status) {
    case FOLLOWUP_STATUS.SCHEDULED:
      return 'bg-blue-100 text-blue-800';
    // Call Issues - Yellow/Orange
    case FOLLOWUP_STATUS.CALL_NOT_ANSWERED:
    case FOLLOWUP_STATUS.PHONE_SWITCHED_OFF:
    case FOLLOWUP_STATUS.OUT_OF_COVERAGE:
    case FOLLOWUP_STATUS.NUMBER_BUSY:
    case FOLLOWUP_STATUS.CALL_DISCONNECTED:
    case FOLLOWUP_STATUS.INCOMING_BARRED:
    case FOLLOWUP_STATUS.CALL_REJECTED:
      return 'bg-yellow-100 text-yellow-800';
    // Invalid - Red
    case FOLLOWUP_STATUS.INVALID_NUMBER:
    case FOLLOWUP_STATUS.FAKE_ENQUIRY:
    case FOLLOWUP_STATUS.DUPLICATE_ENQUIRY:
      return 'bg-red-100 text-red-800';
    // Reschedule - Orange
    case FOLLOWUP_STATUS.CALL_BACK_LATER:
    case FOLLOWUP_STATUS.BUSY_RESCHEDULE:
      return 'bg-orange-100 text-orange-800';
    // Interested - Green shades
    case FOLLOWUP_STATUS.DISCUSS_WITH_PARENTS:
    case FOLLOWUP_STATUS.RESPONDING_VAGUELY:
    case FOLLOWUP_STATUS.INTERESTED_NEED_TIME:
    case FOLLOWUP_STATUS.INTERESTED_DISCUSSING:
      return 'bg-green-100 text-green-800';
    // Not Interested - Gray
    case FOLLOWUP_STATUS.NOT_INTERESTED:
    case FOLLOWUP_STATUS.NOT_REQUIRED:
    case FOLLOWUP_STATUS.REPEATEDLY_NOT_RESPONDING:
      return 'bg-gray-200 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function LeadDetailPanel({
  leadId,
  onClose,
  onFollowUpScheduled,
}: LeadDetailPanelProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [hasActiveFollowUp, setHasActiveFollowUp] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showScheduleForm, setShowScheduleForm] = useState(false);

  // Schedule form state
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleDuration, setScheduleDuration] = useState(30);
  const [scheduleMeetingType, setScheduleMeetingType] = useState<MEETING_TYPE>(MEETING_TYPE.ONLINE);
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [checkingSlot, setCheckingSlot] = useState(false);
  const [slotAvailable, setSlotAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    fetchLeadData();
  }, [leadId]);

  // Check slot availability when schedule form changes
  useEffect(() => {
    if (showScheduleForm && scheduleDate && scheduleTime && scheduleDuration) {
      checkSlotAvailability();
    } else {
      setSlotAvailable(null);
    }
  }, [scheduleDate, scheduleTime, scheduleDuration, showScheduleForm]);

  const fetchLeadData = async () => {
    setLoading(true);
    try {
      const response = await followUpAPI.getLeadFollowUpHistory(leadId);
      setLead(response.data.data.lead);
      setFollowUps(response.data.data.followUps);
      setHasActiveFollowUp(response.data.data.hasActiveFollowUp);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch lead details');
    } finally {
      setLoading(false);
    }
  };

  const checkSlotAvailability = async () => {
    if (!scheduleDate || !scheduleTime) return;
    
    setCheckingSlot(true);
    try {
      const response = await followUpAPI.checkTimeSlotAvailability({
        date: scheduleDate,
        time: scheduleTime,
        duration: scheduleDuration,
      });
      setSlotAvailable(response.data.data.isAvailable);
    } catch (error) {
      console.error('Error checking slot:', error);
    } finally {
      setCheckingSlot(false);
    }
  };

  const handleScheduleFollowUp = async () => {
    if (!scheduleDate || !scheduleTime) {
      toast.error('Please select date and time');
      return;
    }

    if (slotAvailable === false) {
      toast.error('Selected time slot is not available');
      return;
    }

    setScheduling(true);
    try {
      await followUpAPI.createFollowUp({
        leadId,
        scheduledDate: scheduleDate,
        scheduledTime: scheduleTime,
        duration: scheduleDuration,
        meetingType: scheduleMeetingType,
        notes: scheduleNotes,
      });
      toast.success('Follow-up scheduled successfully');
      setShowScheduleForm(false);
      setScheduleDate('');
      setScheduleTime('');
      setScheduleDuration(30);
      setScheduleNotes('');
      fetchLeadData();
      onFollowUpScheduled();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to schedule follow-up');
    } finally {
      setScheduling(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading lead details...</span>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <p className="text-center text-gray-600">Lead not found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="text-white">
            <h3 className="text-xl font-semibold">{lead.name}</h3>
            <p className="text-blue-100 text-sm mt-1">{lead.email}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-blue-200 transition-colors p-2 hover:bg-white/10 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Lead Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-medium text-gray-500 uppercase">Mobile</p>
            <p className="text-gray-900 font-medium mt-1">{lead.mobileNumber}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-medium text-gray-500 uppercase">Services</p>
            <div className="flex flex-col gap-1 mt-1">
              {lead.serviceTypes?.map((service: string, idx: number) => (
                <span key={idx} className={`px-2 py-1 rounded-full text-xs font-medium ${getServiceColor(service)}`}>
                  {service}
                </span>
              )) || <span className="text-gray-900 font-medium text-sm">N/A</span>}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-medium text-gray-500 uppercase">Stage</p>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${getStageBadgeColor(lead.stage)}`}>
              {lead.stage}
            </span>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-medium text-gray-500 uppercase">Created</p>
            <p className="text-gray-900 font-medium mt-1 text-sm">
              {format(new Date(lead.createdAt), 'MMM d, yyyy')}
            </p>
          </div>
        </div>

        {/* Schedule Follow-Up Button/Form */}
        {!hasActiveFollowUp && !showScheduleForm && (
          <button
            onClick={() => setShowScheduleForm(true)}
            className="w-full mb-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Schedule Follow-Up
          </button>
        )}

        {hasActiveFollowUp && !showScheduleForm && (
          <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2 text-yellow-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm font-medium">This lead has an active follow-up scheduled</span>
          </div>
        )}

        {/* Schedule Form */}
        {showScheduleForm && (
          <div className="mb-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Schedule New Follow-Up
            </h4>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Time *</label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Duration</label>
              <select
                value={scheduleDuration}
                onChange={(e) => setScheduleDuration(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes (Optional)</label>
              <textarea
                value={scheduleNotes}
                onChange={(e) => setScheduleNotes(e.target.value)}
                rows={2}
                placeholder="Add any notes..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Slot Availability Status */}
            {checkingSlot && (
              <p className="text-sm text-gray-500 flex items-center gap-2 mb-4">
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Checking availability...
              </p>
            )}
            {!checkingSlot && slotAvailable === true && (
              <p className="text-sm text-green-600 flex items-center gap-2 mb-4">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Time slot is available
              </p>
            )}
            {!checkingSlot && slotAvailable === false && (
              <p className="text-sm text-red-600 flex items-center gap-2 mb-4">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Time slot conflicts with another follow-up
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowScheduleForm(false)}
                className="flex-1 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleFollowUp}
                disabled={scheduling || slotAvailable === false}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {scheduling ? 'Scheduling...' : 'Schedule'}
              </button>
            </div>
          </div>
        )}

        {/* Follow-Up History */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Follow-Up History ({followUps.length})
          </h4>

          {followUps.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="font-medium">No follow-ups yet</p>
              <p className="text-sm">Schedule your first follow-up with this lead</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {followUps.map((followUp, index) => (
                <div
                  key={followUp._id}
                  className={`border rounded-lg p-4 ${
                    followUp.status === FOLLOWUP_STATUS.SCHEDULED
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {format(new Date(followUp.scheduledDate), 'MMM d, yyyy')}
                      </span>
                      <span className="text-gray-500">at</span>
                      <span className="text-sm font-medium text-gray-900">
                        {followUp.scheduledTime}
                      </span>
                      <span className="text-gray-400 text-sm">({followUp.duration}min)</span>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(followUp.status as FOLLOWUP_STATUS)}`}>
                      {followUp.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                    <span>Stage: <span className="font-medium">{followUp.stageAtFollowUp}</span></span>
                    {followUp.stageChangedTo && (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <span className="font-medium text-blue-600">{followUp.stageChangedTo}</span>
                      </span>
                    )}
                  </div>

                  {followUp.notes && (
                    <p className="text-sm text-gray-600 bg-gray-100 rounded p-2 mt-2">
                      {followUp.notes}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                    <span>Created by: {getFullName(followUp.createdBy) || 'Unknown'}</span>
                    {followUp.updatedBy && (
                      <span>Updated by: {getFullName(followUp.updatedBy)}</span>
                    )}
                    {followUp.completedAt && (
                      <span>Completed: {format(new Date(followUp.completedAt), 'MMM d, yyyy HH:mm')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
