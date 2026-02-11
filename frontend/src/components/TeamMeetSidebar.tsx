'use client';

import { TeamMeet, TEAMMEET_STATUS, TEAMMEET_TYPE } from '@/types';
import { format, isToday, isTomorrow, isPast, isFuture, startOfDay } from 'date-fns';
import { getFullName } from '@/utils/nameHelpers';

interface TeamMeetSidebarProps {
  teamMeets: TeamMeet[];
  onTeamMeetClick: (teamMeet: TeamMeet) => void;
  onScheduleClick?: () => void;
  hideHeader?: boolean;
  currentUserId?: string;
}

// Helper to get user ID from populated object (handles both _id and id)
const getUserId = (user: { _id?: string; id?: string }): string => {
  return user?.id || user?._id || '';
};

// Helper to get status badge color - TeamMeet theme (Updated)
const getStatusBadgeColor = (status: TEAMMEET_STATUS) => {
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
          : 'bg-white border border-gray-200 hover:border-violet-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={`font-medium truncate ${isAction ? 'text-amber-900' : 'text-gray-900'}`}>
            {teamMeet.subject}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-medium ${isAction ? 'text-amber-700' : 'text-gray-600'}`}>
              {teamMeet.scheduledTime}
            </span>
            {showDate && (
              <span className="text-xs text-gray-500">
                {format(new Date(teamMeet.scheduledDate), 'MMM d')}
              </span>
            )}
            <span className={`px-1.5 py-0.5 text-xs rounded ${getStatusBadgeColor(teamMeet.status)}`}>
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

export default function TeamMeetSidebar({
  teamMeets,
  onTeamMeetClick,
  onScheduleClick,
  hideHeader = false,
  currentUserId,
}: TeamMeetSidebarProps) {
  // Categorize team meets with proper ID comparison
  const pendingActions = teamMeets.filter(
    (tm) => tm.status === TEAMMEET_STATUS.PENDING_CONFIRMATION && getUserId(tm.requestedTo) === currentUserId
  );
  
  const waitingConfirmation = teamMeets.filter(
    (tm) => tm.status === TEAMMEET_STATUS.PENDING_CONFIRMATION && getUserId(tm.requestedBy) === currentUserId
  );
  
  // Today's confirmed meetings
  const todayConfirmed = teamMeets.filter(
    (tm) => tm.status === TEAMMEET_STATUS.CONFIRMED && isToday(new Date(tm.scheduledDate))
  ).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  
  // Future confirmed meetings (excluding today)
  const upcomingConfirmed = teamMeets.filter(
    (tm) => tm.status === TEAMMEET_STATUS.CONFIRMED && 
            isFuture(startOfDay(new Date(tm.scheduledDate))) && 
            !isToday(new Date(tm.scheduledDate))
  ).sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  
  const rejectedMeetings = teamMeets.filter(
    (tm) => tm.status === TEAMMEET_STATUS.REJECTED && getUserId(tm.requestedBy) === currentUserId
  );

  return (
    <div className={`bg-white overflow-hidden h-fit ${hideHeader ? '' : 'rounded-xl shadow-sm border border-gray-200'}`}>
      {/* Header - conditionally shown */}
      {!hideHeader && (
        <div className="px-4 py-3 border-b border-gray-200 bg-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="font-semibold text-gray-900">TeamMeet Overview</h3>
          </div>
          {onScheduleClick && (
            <button
              onClick={onScheduleClick}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Schedule
            </button>
          )}
        </div>
      )}

      <div className="divide-y divide-gray-300\">
        {/* Pending Actions Section (Needs Response) */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
            <h4 className="text-sm font-semibold text-gray-700">Needs Your Response</h4>
            <span className="ml-auto bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {pendingActions.length}
            </span>
          </div>
          
          {pendingActions.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No pending invitations</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {pendingActions.map((teamMeet) => (
                <TeamMeetItem
                  key={teamMeet._id}
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

        {/* Waiting Confirmation Section */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-blue-400"></div>
            <h4 className="text-sm font-semibold text-gray-700">Awaiting Response</h4>
            <span className="ml-auto bg-pink-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {waitingConfirmation.length}
            </span>
          </div>
          
          {waitingConfirmation.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No pending requests</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {waitingConfirmation.map((teamMeet) => (
                <TeamMeetItem
                  key={teamMeet._id}
                  teamMeet={teamMeet}
                  onClick={() => onTeamMeetClick(teamMeet)}
                  showDate
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          )}
        </div>

        {/* Today's Meetings Section */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <h4 className="text-sm font-semibold text-gray-700">Today&apos;s Meetings</h4>
            <span className="ml-auto bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {todayConfirmed.length}
            </span>
          </div>
          
          {todayConfirmed.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No meetings today</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {todayConfirmed.map((teamMeet) => (
                <TeamMeetItem
                  key={teamMeet._id}
                  teamMeet={teamMeet}
                  onClick={() => onTeamMeetClick(teamMeet)}
                  showDate={false}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Confirmed Section */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <h4 className="text-sm font-semibold text-gray-700">Upcoming Meetings</h4>
            <span className="ml-auto bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {upcomingConfirmed.length}
            </span>
          </div>
          
          {upcomingConfirmed.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No upcoming meetings</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {upcomingConfirmed.slice(0, 5).map((teamMeet) => (
                <TeamMeetItem
                  key={teamMeet._id}
                  teamMeet={teamMeet}
                  onClick={() => onTeamMeetClick(teamMeet)}
                  showDate
                  currentUserId={currentUserId}
                />
              ))}
              {upcomingConfirmed.length > 5 && (
                <p className="text-xs text-gray-500 text-center py-1">
                  +{upcomingConfirmed.length - 5} more meetings
                </p>
              )}
            </div>
          )}
        </div>

        {/* Rejected Section (Only show if there are rejected meetings from current user) */}
        {rejectedMeetings.length > 0 && (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-rose-500"></div>
              <h4 className="text-sm font-semibold text-gray-700">Needs Reschedule</h4>
              <span className="ml-auto bg-rose-100 text-rose-700 text-xs font-medium px-2 py-0.5 rounded-full">
                {rejectedMeetings.length}
              </span>
            </div>
            
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {rejectedMeetings.map((teamMeet) => (
                <TeamMeetItem
                  key={teamMeet._id}
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
