'use client';

import { OpsSchedule, OPS_SCHEDULE_STATUS, TeamMeet, TEAMMEET_STATUS, TEAMMEET_TYPE } from '@/types';
import { format, isToday, isTomorrow, isPast, startOfDay } from 'date-fns';
import { getFullName } from '@/utils/nameHelpers';

interface OpsScheduleOverviewProps {
  opsTasks: OpsSchedule[];
  teamMeets: TeamMeet[];
  onTaskClick: (task: OpsSchedule) => void;
  onTeamMeetClick: (teamMeet: TeamMeet) => void;
  onScheduleClick?: () => void;
  onScheduleTeamMeet?: () => void;
  currentUserId?: string;
}

// Helper to get user ID from populated object
const getUserId = (user: { _id?: string; id?: string }): string =>
  user?.id || user?._id || '';

// TeamMeet status badge
const getTeamMeetStatusColor = (status: TEAMMEET_STATUS) => {
  switch (status) {
    case TEAMMEET_STATUS.PENDING_CONFIRMATION: return 'bg-amber-100 text-amber-700';
    case TEAMMEET_STATUS.CONFIRMED: return 'bg-pink-100 text-pink-700';
    case TEAMMEET_STATUS.REJECTED: return 'bg-red-200 text-red-900';
    case TEAMMEET_STATUS.CANCELLED: return 'bg-slate-100 text-slate-600';
    case TEAMMEET_STATUS.COMPLETED: return 'bg-teal-100 text-teal-700';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getTeamMeetStatusLabel = (status: TEAMMEET_STATUS) =>
  status === TEAMMEET_STATUS.REJECTED ? 'RESCHEDULE REQ.' : status.replace(/_/g, ' ');

// OpsTask status badge
const getTaskStatusColor = (status: OPS_SCHEDULE_STATUS) => {
  switch (status) {
    case OPS_SCHEDULE_STATUS.SCHEDULED: return 'bg-indigo-100 text-indigo-700';
    case OPS_SCHEDULE_STATUS.COMPLETED: return 'bg-teal-100 text-teal-700';
    case OPS_SCHEDULE_STATUS.MISSED: return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// ── OPS Task Item ──
function OpsTaskItem({
  task,
  onClick,
  showDate = false,
  isMissed = false,
}: {
  task: OpsSchedule;
  onClick: () => void;
  showDate?: boolean;
  isMissed?: boolean;
}) {
  const student =
    task.studentId && typeof task.studentId === 'object' ? task.studentId : null;
  const label = student
    ? getFullName(student.userId) || 'Student Task'
    : 'Personal Task';

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg cursor-pointer transition-all hover:shadow-md ${
        isMissed
          ? 'bg-red-50 border border-red-200 hover:bg-red-100'
          : 'bg-white border border-gray-200 hover:border-indigo-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <p className={`font-medium text-sm truncate ${isMissed ? 'text-red-900' : 'text-gray-900'}`}>
              {label}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs font-medium ${isMissed ? 'text-red-700' : 'text-gray-600'}`}>
              {task.scheduledTime}
            </span>
            {showDate && (
              <span className="text-xs text-gray-500">
                {format(new Date(task.scheduledDate), 'd MMM')}
              </span>
            )}
            <span className={`px-1.5 py-0.5 text-xs rounded ${getTaskStatusColor(task.status)}`}>
              {task.status}
            </span>
          </div>
          {task.description && (
            <p className="text-xs text-gray-500 mt-1 truncate">{task.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── TeamMeet Item ──
function TeamMeetItem({
  teamMeet,
  onClick,
  showDate = false,
  currentUserId,
  isAction = false,
}: {
  teamMeet: TeamMeet;
  onClick: () => void;
  showDate?: boolean;
  currentUserId?: string;
  isAction?: boolean;
}) {
  const isSender = getUserId(teamMeet.requestedBy) === currentUserId;
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
            <svg className="w-3.5 h-3.5 text-violet-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className={`font-medium text-sm truncate ${isAction ? 'text-amber-900' : 'text-gray-900'}`}>
              {teamMeet.subject}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs font-medium ${isAction ? 'text-amber-700' : 'text-gray-600'}`}>
              {teamMeet.scheduledTime}
            </span>
            {showDate && (
              <span className="text-xs text-gray-500">
                {format(new Date(teamMeet.scheduledDate), 'd MMM')}
              </span>
            )}
            <span className={`px-1.5 py-0.5 text-xs rounded ${getTeamMeetStatusColor(teamMeet.status)}`}>
              {getTeamMeetStatusLabel(teamMeet.status)}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 truncate">
            {isSender ? 'To: ' : 'From: '}{getFullName(otherParty)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-xs px-2 py-1 rounded ${isAction ? 'bg-amber-200 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
            {teamMeet.duration}m
          </span>
          {teamMeet.meetingType === TEAMMEET_TYPE.ONLINE ? (
            <svg className="w-3.5 h-3.5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──
export default function OpsScheduleOverview({
  opsTasks,
  teamMeets,
  onTaskClick,
  onTeamMeetClick,
  onScheduleClick,
  onScheduleTeamMeet,
  currentUserId,
}: OpsScheduleOverviewProps) {
  // ── Categorize Tasks ──
  const todayTasks = opsTasks.filter(
    (t) => t.status === OPS_SCHEDULE_STATUS.SCHEDULED && isToday(new Date(t.scheduledDate))
  ).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  const missedTasks = opsTasks.filter(
    (t) =>
      t.status === OPS_SCHEDULE_STATUS.MISSED ||
      (t.status === OPS_SCHEDULE_STATUS.SCHEDULED &&
        isPast(startOfDay(new Date(t.scheduledDate))) &&
        !isToday(new Date(t.scheduledDate)))
  ).sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());

  const tomorrowTasks = opsTasks.filter(
    (t) => t.status === OPS_SCHEDULE_STATUS.SCHEDULED && isTomorrow(new Date(t.scheduledDate))
  ).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  // ── Categorize TeamMeets ──
  const activeStatuses = [TEAMMEET_STATUS.CONFIRMED, TEAMMEET_STATUS.PENDING_CONFIRMATION];

  const todayTMs = teamMeets.filter(
    (tm) => activeStatuses.includes(tm.status) && isToday(new Date(tm.scheduledDate))
  ).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  const missedTMs = teamMeets.filter(
    (tm) =>
      activeStatuses.includes(tm.status) &&
      isPast(startOfDay(new Date(tm.scheduledDate))) &&
      !isToday(new Date(tm.scheduledDate))
  ).sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());

  const tomorrowTMs = teamMeets.filter(
    (tm) => activeStatuses.includes(tm.status) && isTomorrow(new Date(tm.scheduledDate))
  ).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  // ── Pending (TeamMeets only) ──
  const pendingActions = teamMeets.filter(
    (tm) =>
      tm.status === TEAMMEET_STATUS.PENDING_CONFIRMATION &&
      getUserId(tm.requestedTo) === currentUserId
  );
  const waitingConfirmation = teamMeets.filter(
    (tm) =>
      tm.status === TEAMMEET_STATUS.PENDING_CONFIRMATION &&
      getUserId(tm.requestedBy) === currentUserId
  );
  const needsReschedule = teamMeets.filter(
    (tm) =>
      tm.status === TEAMMEET_STATUS.REJECTED &&
      getUserId(tm.requestedBy) === currentUserId
  );

  // Meetings where the user is only an invited participant (not sender or receiver)
  const invitedMeetings = teamMeets.filter(
    (tm) => {
      const isSender = getUserId(tm.requestedBy) === currentUserId;
      const isReceiver = getUserId(tm.requestedTo) === currentUserId;
      if (isSender || isReceiver) return false;
      return tm.invitedUsers?.some((u) => getUserId(u) === currentUserId) || false;
    }
  ).filter(
    (tm) => tm.status !== TEAMMEET_STATUS.CANCELLED && tm.status !== TEAMMEET_STATUS.COMPLETED
  );

  // ── Counts ──
  const todayCount = todayTasks.length + todayTMs.length;
  const missedCount = missedTasks.length + missedTMs.length;
  const tomorrowCount = tomorrowTasks.length + tomorrowTMs.length;
  const pendingCount = pendingActions.length + waitingConfirmation.length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-fit">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-violet-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="font-semibold text-gray-900 text-sm">Schedule Overview</h3>
        </div>
        <div className="flex items-center gap-1">
          {onScheduleClick && (
            <button
              onClick={onScheduleClick}
              title="New Task"
              className="p-1 rounded hover:bg-indigo-100 text-indigo-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
          {onScheduleTeamMeet && (
            <button
              onClick={onScheduleTeamMeet}
              title="New Team Meet"
              className="p-1 rounded hover:bg-violet-100 text-violet-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {/* ── Today ── */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <h4 className="text-sm font-semibold text-gray-700">Today</h4>
            <span className="ml-auto bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {todayCount}
            </span>
          </div>
          {todayCount === 0 ? (
            <p className="text-sm text-gray-500 italic">Nothing scheduled for today</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {todayTasks.map((t) => (
                <OpsTaskItem key={`task-${t._id}`} task={t} onClick={() => onTaskClick(t)} />
              ))}
              {todayTMs.map((tm) => (
                <TeamMeetItem key={`tm-${tm._id}`} teamMeet={tm} onClick={() => onTeamMeetClick(tm)} currentUserId={currentUserId} />
              ))}
            </div>
          )}
        </div>

        {/* ── Missed ── */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <h4 className="text-sm font-semibold text-gray-700">Missed</h4>
            <span className="ml-auto bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {missedCount}
            </span>
          </div>
          {missedCount === 0 ? (
            <p className="text-sm text-gray-500 italic">No missed items</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {missedTasks.map((t) => (
                <OpsTaskItem key={`task-${t._id}`} task={t} onClick={() => onTaskClick(t)} showDate isMissed />
              ))}
              {missedTMs.map((tm) => (
                <TeamMeetItem key={`tm-${tm._id}`} teamMeet={tm} onClick={() => onTeamMeetClick(tm)} showDate currentUserId={currentUserId} isAction />
              ))}
            </div>
          )}
        </div>

        {/* ── Tomorrow ── */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <h4 className="text-sm font-semibold text-gray-700">Tomorrow</h4>
            <span className="ml-auto bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {tomorrowCount}
            </span>
          </div>
          {tomorrowCount === 0 ? (
            <p className="text-sm text-gray-500 italic">Nothing scheduled for tomorrow</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {tomorrowTasks.map((t) => (
                <OpsTaskItem key={`task-${t._id}`} task={t} onClick={() => onTaskClick(t)} />
              ))}
              {tomorrowTMs.map((tm) => (
                <TeamMeetItem key={`tm-${tm._id}`} teamMeet={tm} onClick={() => onTeamMeetClick(tm)} currentUserId={currentUserId} />
              ))}
            </div>
          )}
        </div>

        {/* ── Pending (TeamMeet only) ── */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <h4 className="text-sm font-semibold text-gray-700">Pending</h4>
            <span className="ml-auto bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {pendingCount}
            </span>
          </div>
          {pendingCount === 0 ? (
            <p className="text-sm text-gray-500 italic">No pending responses</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {pendingActions.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs text-amber-600 font-medium mb-1">⚡ Needs your response</p>
                  {pendingActions.map((tm) => (
                    <TeamMeetItem key={`tm-${tm._id}`} teamMeet={tm} onClick={() => onTeamMeetClick(tm)} showDate currentUserId={currentUserId} isAction />
                  ))}
                </div>
              )}
              {waitingConfirmation.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">⏳ Awaiting response</p>
                  {waitingConfirmation.map((tm) => (
                    <TeamMeetItem key={`tm-${tm._id}`} teamMeet={tm} onClick={() => onTeamMeetClick(tm)} showDate currentUserId={currentUserId} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Needs Reschedule ── */}
        {needsReschedule.length > 0 && (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-red-700" />
              <h4 className="text-sm font-semibold text-gray-700">Needs Reschedule</h4>
              <span className="ml-auto bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
                {needsReschedule.length}
              </span>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {needsReschedule.map((tm) => (
                <TeamMeetItem key={`tm-${tm._id}`} teamMeet={tm} onClick={() => onTeamMeetClick(tm)} showDate currentUserId={currentUserId} />
              ))}
            </div>
          </div>
        )}

        {/* ── Invitations (meetings where user is invited, not sender/receiver) ── */}
        {invitedMeetings.length > 0 && (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#D97706' }} />
              <h4 className="text-sm font-semibold text-gray-700">Invitations</h4>
              <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FDE8CD', color: '#92400E' }}>
                {invitedMeetings.length}
              </span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {invitedMeetings.map((tm) => (
                <TeamMeetItem key={`tm-${tm._id}`} teamMeet={tm} onClick={() => onTeamMeetClick(tm)} showDate currentUserId={currentUserId} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
