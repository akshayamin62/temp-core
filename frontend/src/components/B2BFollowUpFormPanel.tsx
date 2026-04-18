'use client';

import { useState, useEffect } from 'react';
import { FOLLOWUP_STATUS, MEETING_TYPE, B2B_LEAD_STAGE } from '@/types';
import { b2bAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface B2BFollowUpFormPanelProps {
  followUp: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  readOnly?: boolean;
}

export default function B2BFollowUpFormPanel({
  followUp,
  isOpen,
  onClose,
  onSave,
  readOnly = false,
}: B2BFollowUpFormPanelProps) {
  const [status, setStatus] = useState<FOLLOWUP_STATUS>(FOLLOWUP_STATUS.SCHEDULED);
  const [stageChangedTo, setStageChangedTo] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [scheduleNext, setScheduleNext] = useState(false);
  const [nextDate, setNextDate] = useState('');
  const [nextTime, setNextTime] = useState('');
  const [nextDuration, setNextDuration] = useState(30);
  const [nextMeetingType, setNextMeetingType] = useState<MEETING_TYPE>(MEETING_TYPE.ONLINE);
  const [saving, setSaving] = useState(false);
  const [checkingSlot, setCheckingSlot] = useState(false);
  const [slotAvailable, setSlotAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [followUpData, setFollowUpData] = useState<any | null>(null);
  const [totalFollowUpsForLead, setTotalFollowUpsForLead] = useState<number>(0);
  const [nextFollowUpInfo, setNextFollowUpInfo] = useState<{
    scheduledDate: string;
    scheduledTime: string;
    duration: number;
    followUpNumber: number;
    meetingType?: MEETING_TYPE;
  } | null>(null);

  useEffect(() => {
    if (followUp && isOpen) {
      fetchFollowUpDetails();
    } else if (!isOpen) {
      setFollowUpData(null);
      setTotalFollowUpsForLead(0);
      setNextFollowUpInfo(null);
      setLoading(false);
    }
  }, [followUp, isOpen]);

  const fetchFollowUpDetails = async () => {
    if (!followUp) return;
    setLoading(true);
    try {
      const response = await b2bAPI.getFollowUpById(followUp._id);
      const data = response.data.data.followUp;
      const totalCount = response.data.data.totalFollowUpsForLead || 1;
      const nextInfo = response.data.data.nextFollowUpInfo || null;
      setFollowUpData(data);
      setTotalFollowUpsForLead(totalCount);
      setNextFollowUpInfo(nextInfo);
      setStatus(data.status as FOLLOWUP_STATUS);
      setStageChangedTo(data.stageChangedTo || '');
      setNotes(data.notes || '');
      setScheduleNext(false);
      setNextDate('');
      setNextTime('');
      setNextDuration(30);
      setNextMeetingType(MEETING_TYPE.ONLINE);
      setSlotAvailable(null);
    } catch (error: any) {
      console.error('Error fetching follow-up:', error);
      toast.error('Failed to load follow-up details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (scheduleNext && nextDate && nextTime && nextDuration) {
      checkSlotAvailability();
    } else {
      setSlotAvailable(null);
    }
  }, [nextDate, nextTime, nextDuration, scheduleNext]);

  useEffect(() => {
    if (status === FOLLOWUP_STATUS.SCHEDULED) {
      setScheduleNext(false);
    }
  }, [status]);

  const checkSlotAvailability = async () => {
    if (!nextDate || !nextTime) return;
    setCheckingSlot(true);
    try {
      const response = await b2bAPI.checkTimeSlotAvailability({
        date: nextDate,
        time: nextTime,
        duration: nextDuration,
      });
      const { isAvailable, conflictingTime, conflictingLead } = response.data.data;
      setSlotAvailable(isAvailable);
      if (!isAvailable) {
        toast.error(`Time conflicts with follow-up at ${conflictingTime}${conflictingLead ? ` for ${conflictingLead}` : ''}`);
      }
    } catch (error) {
      console.error('Error checking slot:', error);
    } finally {
      setCheckingSlot(false);
    }
  };

  const handleSave = async () => {
    if (!followUpData) return;
    if (scheduleNext) {
      if (!nextDate || !nextTime) {
        toast.error('Please select date and time for next follow-up');
        return;
      }
      if (slotAvailable === false) {
        toast.error('Selected time slot is not available');
        return;
      }
    }
    setSaving(true);
    try {
      const lead = followUpData?.b2bLeadId;
      const isLeadConverted = lead?.stage === B2B_LEAD_STAGE.CONVERTED;
      const updateData: any = {
        status: isLeadConverted ? FOLLOWUP_STATUS.CONVERTED : status,
        notes,
      };
      if (stageChangedTo && !isLeadConverted) {
        updateData.stageChangedTo = stageChangedTo;
      }
      if (scheduleNext && nextDate && nextTime) {
        updateData.nextFollowUp = {
          scheduledDate: nextDate,
          scheduledTime: nextTime,
          duration: nextDuration,
          meetingType: nextMeetingType,
        };
      }
      await b2bAPI.updateFollowUp(followUpData._id, updateData);
      toast.success('Follow-up updated successfully');
      onSave();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update follow-up');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const lead = followUpData?.b2bLeadId;
  const leadName = lead ? [lead.firstName, lead.middleName, lead.lastName].filter(Boolean).join(' ') : 'N/A';
  const currentStage = lead?.stage || followUpData?.stageAtFollowUp;
  const isPastFollowUp = followUpData && new Date(followUpData.scheduledDate) < new Date() &&
    new Date(followUpData.scheduledDate).toDateString() !== new Date().toDateString();
  const isLeadConverted = lead?.stage === B2B_LEAD_STAGE.CONVERTED;
  const currentFollowUpNumber = followUpData?.followUpNumber || 1;
  const isNotLatestFollowUp = currentFollowUpNumber < totalFollowUpsForLead;
  const isFullyLocked = isNotLatestFollowUp || readOnly;
  const isStageLocked = isFullyLocked || isLeadConverted;
  const isStatusLocked = isFullyLocked || isLeadConverted;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Franchise': return 'bg-indigo-100 text-indigo-800';
      case 'Institution': return 'bg-amber-100 text-amber-800';
      case 'Advisor': return 'bg-teal-100 text-teal-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <div
        className={`fixed top-[140px] left-4 z-40 w-[380px] bg-white shadow-2xl rounded-xl border border-gray-200 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
        }`}
        style={{ maxHeight: 'calc(100vh - 220px)' }}
      >
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 rounded-t-xl flex items-center justify-between">
          <span className="text-white font-medium text-sm">
            {isPastFollowUp ? '⚠️ Past Follow-Up' : '📅 Follow-Up'}
          </span>
          <button onClick={onClose} className="text-white hover:text-blue-200 transition-colors p-1 hover:bg-white/10 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600 text-xs">Loading...</p>
              </div>
            </div>
          ) : followUpData ? (
            <div className="px-4 py-3 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500">Date & Time</p>
                    <p className="text-sm font-medium text-gray-900">
                      {format(new Date(followUpData.scheduledDate), 'dd/MM/yyyy')} at {followUpData.scheduledTime}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                      #{currentFollowUpNumber}
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                      {followUpData.duration} min
                    </span>
                    {followUpData.meetingType && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1">
                        {followUpData.meetingType === MEETING_TYPE.ONLINE ? (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Online
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            F2F
                          </>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Zoho Meeting Link */}
                {followUpData.zohoMeetingUrl && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs font-medium text-green-700">Online Meeting</span>
                    </div>
                    {followUpData.zohoMeetingId && (
                      <p className="text-[11px] text-gray-600 mb-0.5"><span className="font-medium">Meeting ID:</span> {followUpData.zohoMeetingId}</p>
                    )}
                    {followUpData.zohoMeetingPassword && (
                      <p className="text-[11px] text-gray-600 mb-1.5"><span className="font-medium">Password:</span> {followUpData.zohoMeetingPassword}</p>
                    )}
                    <a
                      href={followUpData.zohoMeetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Join Zoho Meeting
                    </a>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500">Name</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{leadName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Type</p>
                    {lead?.type ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(lead.type)}`}>
                        {lead.type}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-gray-900">N/A</span>
                    )}
                  </div>
                </div>
              </div>

              {isFullyLocked && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
                  <div className="flex items-center gap-2 text-amber-800">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-xs font-medium">
                      {readOnly
                        ? 'View only mode.'
                        : 'This follow-up is locked. A newer follow-up has been scheduled.'}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  value={isLeadConverted ? FOLLOWUP_STATUS.CONVERTED : status}
                  onChange={(e) => setStatus(e.target.value as FOLLOWUP_STATUS)}
                  disabled={isStatusLocked}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {!isFullyLocked && <option value={FOLLOWUP_STATUS.SCHEDULED}>Scheduled</option>}
                  <optgroup label="Call Issues">
                    <option value={FOLLOWUP_STATUS.CALL_NOT_ANSWERED}>Call Not Answered</option>
                    <option value={FOLLOWUP_STATUS.PHONE_SWITCHED_OFF}>Phone Switched Off</option>
                    <option value={FOLLOWUP_STATUS.OUT_OF_COVERAGE}>Out of Coverage Area</option>
                    <option value={FOLLOWUP_STATUS.NUMBER_BUSY}>Number Busy</option>
                    <option value={FOLLOWUP_STATUS.CALL_DISCONNECTED}>Call Disconnected</option>
                    <option value={FOLLOWUP_STATUS.INVALID_NUMBER}>Invalid / Wrong Number</option>
                    <option value={FOLLOWUP_STATUS.INCOMING_BARRED}>Incoming Calls Barred</option>
                    <option value={FOLLOWUP_STATUS.CALL_REJECTED}>Call Rejected / Declined</option>
                  </optgroup>
                  <optgroup label="Reschedule">
                    <option value={FOLLOWUP_STATUS.CALL_BACK_LATER}>Asked to Call Back Later</option>
                    <option value={FOLLOWUP_STATUS.BUSY_RESCHEDULE}>Busy - Requested Reschedule</option>
                  </optgroup>
                  <optgroup label="Interested">
                    <option value={FOLLOWUP_STATUS.DISCUSS_NEED_TIME}>Need time to Discuss</option>
                    <option value={FOLLOWUP_STATUS.RESPONDING_VAGUELY}>Responding Vaguely / Non-committal</option>
                    <option value={FOLLOWUP_STATUS.INTERESTED_NEED_TIME}>Interested - Need Time</option>
                    <option value={FOLLOWUP_STATUS.INTERESTED_DISCUSSING}>Interested - Discussing with Family</option>
                  </optgroup>
                  <optgroup label="Closed">
                    <option value={FOLLOWUP_STATUS.NOT_INTERESTED}>Not Interested (Explicit)</option>
                    <option value={FOLLOWUP_STATUS.NOT_REQUIRED}>Not Required Anymore</option>
                    <option value={FOLLOWUP_STATUS.REPEATEDLY_NOT_RESPONDING}>Repeatedly Not Responding</option>
                    <option value={FOLLOWUP_STATUS.FAKE_ENQUIRY}>Fake / Test Enquiry</option>
                    <option value={FOLLOWUP_STATUS.DUPLICATE_ENQUIRY}>Duplicate Enquiry</option>
                  </optgroup>
                  <optgroup label="Conversion">
                    <option value={FOLLOWUP_STATUS.PROCEED_FOR_DOCUMENTATION}>Proceed for Documentation</option>
                    <option value={FOLLOWUP_STATUS.CONVERTED}>Converted</option>
                  </optgroup>
                </select>
                {isLeadConverted && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Status locked - Lead converted
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Change Stage (Optional)</label>
                <select
                  value={stageChangedTo}
                  onChange={(e) => setStageChangedTo(e.target.value)}
                  disabled={isStageLocked}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Keep current ({currentStage})</option>
                  <option value={B2B_LEAD_STAGE.NEW}>New</option>
                  <option value={B2B_LEAD_STAGE.HOT}>Hot</option>
                  <option value={B2B_LEAD_STAGE.WARM}>Warm</option>
                  <option value={B2B_LEAD_STAGE.COLD}>Cold</option>
                  <option value={B2B_LEAD_STAGE.CLOSED}>Closed</option>
                </select>
                {isLeadConverted && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Stage locked - Lead converted
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Add notes..."
                  disabled={isFullyLocked}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              {status !== FOLLOWUP_STATUS.SCHEDULED && !isFullyLocked && (
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="b2bScheduleNext"
                      checked={scheduleNext}
                      onChange={(e) => setScheduleNext(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="b2bScheduleNext" className="text-xs font-medium text-gray-700">
                      Schedule Next Follow-Up
                    </label>
                  </div>
                  {scheduleNext && (
                    <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Date</label>
                          <input
                            type="date"
                            value={nextDate}
                            onChange={(e) => setNextDate(e.target.value)}
                            min={format(new Date(), 'yyyy-MM-dd')}
                            lang="en-GB"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Time</label>
                          <input
                            type="time"
                            value={nextTime}
                            onChange={(e) => setNextTime(e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Duration</label>
                          <select
                            value={nextDuration}
                            onChange={(e) => setNextDuration(parseInt(e.target.value))}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value={15}>15 min</option>
                            <option value={30}>30 min</option>
                            <option value={45}>45 min</option>
                            <option value={60}>60 min</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Meeting Type</label>
                          <select
                            value={nextMeetingType}
                            onChange={(e) => setNextMeetingType(e.target.value as MEETING_TYPE)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value={MEETING_TYPE.ONLINE}>Online</option>
                            <option value={MEETING_TYPE.FACE_TO_FACE}>Face to Face</option>
                          </select>
                        </div>
                      </div>
                      {checkingSlot && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Checking...
                        </p>
                      )}
                      {!checkingSlot && slotAvailable === true && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Available
                        </p>
                      )}
                      {!checkingSlot && slotAvailable === false && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Conflict
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {isNotLatestFollowUp && nextFollowUpInfo && (
                <div className="border-t border-gray-200 pt-3">
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs font-medium text-teal-800">
                        Next Follow-Up (#{nextFollowUpInfo.followUpNumber})
                      </span>
                    </div>
                    <div className="text-sm text-teal-900">
                      <p className="font-medium">
                        {format(new Date(nextFollowUpInfo.scheduledDate), 'dd/MM/yyyy')} at {nextFollowUpInfo.scheduledTime}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-teal-700">Duration: {nextFollowUpInfo.duration} min</p>
                        {nextFollowUpInfo.meetingType && (
                          <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded flex items-center gap-1">
                            {nextFollowUpInfo.meetingType === MEETING_TYPE.ONLINE ? (
                              <>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Online
                              </>
                            ) : (
                              <>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                F2F
                              </>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-600 text-xs">No data</p>
              </div>
            </div>
          )}
        </div>

        {followUpData && !loading && (
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 rounded-b-xl flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              {isFullyLocked ? 'Close' : 'Cancel'}
            </button>
            {!isFullyLocked && (
              <button
                onClick={handleSave}
                disabled={saving || status === FOLLOWUP_STATUS.SCHEDULED || (scheduleNext && slotAvailable === false)}
                className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {saving ? (
                  <>
                    <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
