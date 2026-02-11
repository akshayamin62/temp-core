'use client';

import { FollowUp, FOLLOWUP_STATUS, Lead, LEAD_STAGE, TeamMeet, TEAMMEET_STATUS, TEAMMEET_TYPE, MEETING_TYPE } from '@/types';
import { format, isToday, isTomorrow, isPast, startOfDay } from 'date-fns';
import Link from 'next/link';
import { getFullName } from '@/utils/nameHelpers';

interface ScheduleOverviewProps {
  // FollowUp data
  followUps: FollowUp[];
  // TeamMeet data
  teamMeets: TeamMeet[];
  // Click handlers
  onFollowUpClick: (followUp: FollowUp) => void;
  onTeamMeetClick: (teamMeet: TeamMeet) => void;
  onScheduleClick?: () => void;
  // Options
  hideHeader?: boolean;
  currentUserId?: string;
  leadName?: string;
  showLeadLink?: boolean;
  basePath?: string;
  readOnly?: boolean;
}

// Helper to get user ID from populated object
const getUserId = (user: { _id?: string; id?: string }): string => {
  return user?.id || user?._id || '';
};

// Stage colors for FollowUps (Lead-based)
const getStageBadgeColor = (stage: LEAD_STAGE) => {
  switch (stage) {
    case LEAD_STAGE.NEW:
      return 'bg-blue-100 text-blue-800';
    case LEAD_STAGE.HOT:
      return 'bg-red-100 text-red-800';
    case LEAD_STAGE.WARM:
      return 'bg-orange-100 text-orange-800';
    case LEAD_STAGE.COLD:
      return 'bg-cyan-100 text-cyan-800';
    case LEAD_STAGE.CONVERTED:
      return 'bg-green-100 text-green-800';
    case LEAD_STAGE.CLOSED:
      return 'bg-gray-100 text-gray-600';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// TeamMeet status colors (Updated theme)
const getTeamMeetStatusBadgeColor = (status: TEAMMEET_STATUS) => {
  switch (status) {
    case TEAMMEET_STATUS.PENDING_CONFIRMATION:
      return 'bg-amber-100 text-amber-700'; // Yellow
    case TEAMMEET_STATUS.CONFIRMED:
      return 'bg-pink-100 text-pink-700'; // Pink
    case TEAMMEET_STATUS.REJECTED:
      return 'bg-red-200 text-red-900'; // Dark Red
    case TEAMMEET_STATUS.CANCELLED:
      return 'bg-slate-100 text-slate-600'; // Same
    case TEAMMEET_STATUS.COMPLETED:
      return 'bg-teal-100 text-teal-700'; // Teal
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// FollowUp Item Component
interface FollowUpItemProps {
  followUp: FollowUp;
  onClick: () => void;
  showDate?: boolean;
  isMissed?: boolean;
  leadName?: string;
  showLeadLink?: boolean;
  basePath?: string;
}

function FollowUpItem({ followUp, onClick, showDate = false, isMissed = false, leadName, showLeadLink = true, basePath = '/counselor/leads' }: FollowUpItemProps) {
  const lead = followUp.leadId as Lead;
  const stage = lead?.stage || followUp.stageAtFollowUp;
  const displayName = leadName || lead?.name || 'Unknown Lead';
  const leadId = typeof followUp.leadId === 'string' ? followUp.leadId : lead?._id;

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg cursor-pointer transition-all hover:shadow-md ${
        isMissed 
          ? 'bg-purple-50 border border-purple-200 hover:bg-purple-100' 
          : 'bg-white border border-gray-200 hover:border-blue-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-xs">📋</span>
            {showLeadLink && leadId ? (
              <Link 
                href={`${basePath}/${leadId}`}
                onClick={(e) => e.stopPropagation()}
                className={`font-medium truncate block hover:underline ${isMissed ? 'text-purple-900' : 'text-gray-900'}`}
              >
                {displayName}
              </Link>
            ) : (
              <p className={`font-medium truncate ${isMissed ? 'text-purple-900' : 'text-gray-900'}`}>
                {displayName}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-medium ${isMissed ? 'text-purple-700' : 'text-gray-600'}`}>
              {followUp.scheduledTime}
            </span>
            {showDate && (
              <span className="text-xs text-gray-500">
                {format(new Date(followUp.scheduledDate), 'MMM d')}
              </span>
            )}
            <span className={`px-1.5 py-0.5 text-xs rounded ${getStageBadgeColor(stage)}`}>
              {stage}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {followUp.meetingType && (
            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-1 rounded whitespace-nowrap">
              {followUp.meetingType === MEETING_TYPE.ONLINE ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </span>
          )}
          <div className={`text-xs px-2 py-1 rounded ${
          isMissed 
            ? 'bg-purple-200 text-purple-800' 
            : 'bg-gray-100 text-gray-600'
        }`}>
          {followUp.duration}m
        </div>
      </div>
    </div>
    </div>
  );
}

// TeamMeet Item Component
interface TeamMeetItemProps {
  teamMeet: TeamMeet;
  onClick: () => void;
  showDate?: boolean;
  currentUserId?: string;
  isAction?: boolean;
}

function TeamMeetItem({ teamMeet, onClick, showDate = false, currentUserId, isAction = false }: TeamMeetItemProps) {
  const isSender = teamMeet.requestedBy._id === currentUserId;
  const otherParty = isSender ? teamMeet.requestedTo : teamMeet.requestedBy;

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg cursor-pointer transition-all hover:shadow-md ${
        isAction 
          ? 'bg-amber-50 border border-amber-200 hover:bg-amber-100' 
          : 'bg-white border border-gray-200 hover:border-pink-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-xs">👥</span>
            <p className={`font-medium truncate ${isAction ? 'text-amber-900' : 'text-gray-900'}`}>
              {teamMeet.subject}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-medium ${isAction ? 'text-amber-700' : 'text-gray-600'}`}>
              {teamMeet.scheduledTime}
            </span>
            {showDate && (
              <span className="text-xs text-gray-500">
                {format(new Date(teamMeet.scheduledDate), 'MMM d')}
              </span>
            )}
            <span className={`px-1.5 py-0.5 text-xs rounded ${getTeamMeetStatusBadgeColor(teamMeet.status)}`}>
              {teamMeet.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 truncate">
            {isSender ? 'To: ' : 'From: '}{getFullName(otherParty)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className={`text-xs px-2 py-1 rounded ${
            isAction 
              ? 'bg-amber-200 text-amber-800' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            {teamMeet.duration}m
          </div>
          {teamMeet.meetingType === TEAMMEET_TYPE.ONLINE ? (
            <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ScheduleOverview({
  followUps,
  teamMeets,
  onFollowUpClick,
  onTeamMeetClick,
  onScheduleClick,
  hideHeader = false,
  currentUserId,
  leadName,
  showLeadLink: showLeadLinkProp,
  basePath = '/counselor/leads',
  readOnly = false,
}: ScheduleOverviewProps) {
  const showLeadLink = showLeadLinkProp !== undefined ? showLeadLinkProp : !leadName;

  // Categorize FollowUps
  const todayFollowUps = followUps.filter(
    (f) => f.status === FOLLOWUP_STATUS.SCHEDULED && isToday(new Date(f.scheduledDate))
  ).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  const missedFollowUps = followUps.filter(
    (f) => f.status === FOLLOWUP_STATUS.SCHEDULED && isPast(startOfDay(new Date(f.scheduledDate))) && !isToday(new Date(f.scheduledDate))
  ).sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());

  const tomorrowFollowUps = followUps.filter(
    (f) => f.status === FOLLOWUP_STATUS.SCHEDULED && isTomorrow(new Date(f.scheduledDate))
  ).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  // Categorize TeamMeets
  const todayTeamMeets = teamMeets.filter(
    (tm) => (tm.status === TEAMMEET_STATUS.CONFIRMED || tm.status === TEAMMEET_STATUS.PENDING_CONFIRMATION) && 
            isToday(new Date(tm.scheduledDate))
  ).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  const missedTeamMeets = teamMeets.filter(
    (tm) => (tm.status === TEAMMEET_STATUS.CONFIRMED || tm.status === TEAMMEET_STATUS.PENDING_CONFIRMATION) && 
            isPast(startOfDay(new Date(tm.scheduledDate))) && 
            !isToday(new Date(tm.scheduledDate))
  ).sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());

  const tomorrowTeamMeets = teamMeets.filter(
    (tm) => (tm.status === TEAMMEET_STATUS.CONFIRMED || tm.status === TEAMMEET_STATUS.PENDING_CONFIRMATION) && 
            isTomorrow(new Date(tm.scheduledDate))
  ).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  // Pending Response - TeamMeets that need current user's response OR are awaiting response
  const pendingActions = teamMeets.filter(
    (tm) => tm.status === TEAMMEET_STATUS.PENDING_CONFIRMATION && getUserId(tm.requestedTo) === currentUserId
  );
  
  const waitingConfirmation = teamMeets.filter(
    (tm) => tm.status === TEAMMEET_STATUS.PENDING_CONFIRMATION && getUserId(tm.requestedBy) === currentUserId
  );

  // Needs Reschedule - Rejected TeamMeets (only show if current user is sender)
  const needsReschedule = teamMeets.filter(
    (tm) => tm.status === TEAMMEET_STATUS.REJECTED && getUserId(tm.requestedBy) === currentUserId
  );

  // Combined counts
  const todayCount = todayFollowUps.length + todayTeamMeets.length;
  const missedCount = missedFollowUps.length + missedTeamMeets.length;
  const tomorrowCount = tomorrowFollowUps.length + tomorrowTeamMeets.length;
  const pendingResponseCount = pendingActions.length + waitingConfirmation.length;
  const needsRescheduleCount = needsReschedule.length;

  return (
    <div className={`bg-white overflow-hidden h-fit ${hideHeader ? '' : 'rounded-xl shadow-sm border border-gray-200'}`}>
      {/* Header */}
      {!hideHeader && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-teal-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <div>
              <h3 className="font-semibold text-gray-900">Schedule Overview</h3>
              {readOnly && <p className="text-xs text-amber-600 italic">Read-only view</p>}
            </div>
          </div>
          {onScheduleClick && !readOnly && (
            <button
              onClick={onScheduleClick}
              className="text-sm font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Schedule
            </button>
          )}
        </div>
      )}

      <div className="divide-y divide-gray-300">
        {/* Today Section */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <h4 className="text-sm font-semibold text-gray-700">Today</h4>
            <span className="ml-auto bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {todayCount}
            </span>
          </div>
          
          {todayCount === 0 ? (
            <p className="text-sm text-gray-500 italic">Nothing scheduled for today</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {todayFollowUps.map((followUp) => (
                <FollowUpItem
                  key={`followup-${followUp._id}`}
                  followUp={followUp}
                  onClick={() => onFollowUpClick(followUp)}
                  leadName={leadName}
                  showLeadLink={showLeadLink}
                  basePath={basePath}
                />
              ))}
              {todayTeamMeets.map((teamMeet) => (
                <TeamMeetItem
                  key={`teammeet-${teamMeet._id}`}
                  teamMeet={teamMeet}
                  onClick={() => onTeamMeetClick(teamMeet)}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          )}
        </div>

        {/* Missed Section */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <h4 className="text-sm font-semibold text-gray-700">Missed</h4>
            <span className="ml-auto bg-purple-100 text-purple-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {missedCount}
            </span>
          </div>
          
          {missedCount === 0 ? (
            <p className="text-sm text-gray-500 italic">No missed items</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {missedFollowUps.map((followUp) => (
                <FollowUpItem
                  key={`followup-${followUp._id}`}
                  followUp={followUp}
                  onClick={() => onFollowUpClick(followUp)}
                  showDate
                  isMissed
                  leadName={leadName}
                  showLeadLink={showLeadLink}
                  basePath={basePath}
                />
              ))}
              {missedTeamMeets.map((teamMeet) => (
                <TeamMeetItem
                  key={`teammeet-${teamMeet._id}`}
                  teamMeet={teamMeet}
                  onClick={() => onTeamMeetClick(teamMeet)}
                  showDate
                  currentUserId={currentUserId}
                  isAction
                />
              ))}
            </div>
          )}
        </div>

        {/* Tomorrow Section */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <h4 className="text-sm font-semibold text-gray-700">Tomorrow</h4>
            <span className="ml-auto bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {tomorrowCount}
            </span>
          </div>
          
          {tomorrowCount === 0 ? (
            <p className="text-sm text-gray-500 italic">Nothing scheduled for tomorrow</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {tomorrowFollowUps.map((followUp) => (
                <FollowUpItem
                  key={`followup-${followUp._id}`}
                  followUp={followUp}
                  onClick={() => onFollowUpClick(followUp)}
                  leadName={leadName}
                  showLeadLink={showLeadLink}
                  basePath={basePath}
                />
              ))}
              {tomorrowTeamMeets.map((teamMeet) => (
                <TeamMeetItem
                  key={`teammeet-${teamMeet._id}`}
                  teamMeet={teamMeet}
                  onClick={() => onTeamMeetClick(teamMeet)}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pending Response Section */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
            <h4 className="text-sm font-semibold text-gray-700">Pending Response</h4>
            <span className="ml-auto bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {pendingResponseCount}
            </span>
          </div>
          
          {pendingResponseCount === 0 ? (
            <p className="text-sm text-gray-500 italic">No pending responses</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {/* Needs your response (higher priority) */}
              {pendingActions.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs text-amber-600 font-medium mb-1">⚡ Needs your response</p>
                  {pendingActions.map((teamMeet) => (
                    <TeamMeetItem
                      key={`teammeet-${teamMeet._id}`}
                      teamMeet={teamMeet}
                      onClick={() => onTeamMeetClick(teamMeet)}
                      showDate
                      currentUserId={currentUserId}
                      isAction
                    />
                  ))}
                </div>
              )}
              {/* Awaiting response */}
              {waitingConfirmation.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">⏳ Awaiting response</p>
                  {waitingConfirmation.map((teamMeet) => (
                    <TeamMeetItem
                      key={`teammeet-${teamMeet._id}`}
                      teamMeet={teamMeet}
                      onClick={() => onTeamMeetClick(teamMeet)}
                      showDate
                      currentUserId={currentUserId}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Needs Reschedule Section */}
        {needsRescheduleCount > 0 && (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-red-700"></div>
              <h4 className="text-sm font-semibold text-gray-700">Needs Reschedule</h4>
              <span className="ml-auto bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
                {needsRescheduleCount}
              </span>
            </div>
            
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {needsReschedule.map((teamMeet) => (
                <TeamMeetItem
                  key={`teammeet-${teamMeet._id}`}
                  teamMeet={teamMeet}
                  onClick={() => onTeamMeetClick(teamMeet)}
                  showDate
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
