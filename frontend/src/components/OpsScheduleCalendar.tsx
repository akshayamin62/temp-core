'use client';

import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, setMonth, setYear, getMonth, getYear, addMonths, addWeeks, addDays, isPast, isToday } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { OpsSchedule, OPS_SCHEDULE_STATUS, OpsScheduleStudent, TeamMeet, TEAMMEET_STATUS } from '@/types';
import { useState, useCallback, useMemo } from 'react';
import { getFullName } from '@/utils/nameHelpers';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'schedule' | 'teamMeet';
  resource?: OpsSchedule;
  teamMeetResource?: TeamMeet;
}

interface OpsScheduleCalendarProps {
  schedules: OpsSchedule[];
  onScheduleSelect: (schedule: OpsSchedule) => void;
  onDateSelect?: (date: Date) => void;
  minimized?: boolean;
  onToggleMinimize?: () => void;
  hideHeader?: boolean;
  compact?: boolean;
  // TeamMeet integration
  teamMeets?: TeamMeet[];
  onTeamMeetSelect?: (teamMeet: TeamMeet) => void;
  currentUserId?: string;
}

// Status colors
const getStatusColor = (status: OPS_SCHEDULE_STATUS, isPastDate: boolean) => {
  if (isPastDate && status === OPS_SCHEDULE_STATUS.SCHEDULED) {
    return { bg: '#F3E8FF', border: '#9333EA', text: '#6B21A8' }; // Purple for missed
  }
  
  switch (status) {
    case OPS_SCHEDULE_STATUS.SCHEDULED:
      return { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF' }; // Blue
    case OPS_SCHEDULE_STATUS.COMPLETED:
      return { bg: '#DCFCE7', border: '#22C55E', text: '#166534' }; // Green
    case OPS_SCHEDULE_STATUS.MISSED:
      return { bg: '#F3E8FF', border: '#9333EA', text: '#6B21A8' }; // Purple
    default:
      return { bg: '#F3F4F6', border: '#9CA3AF', text: '#374151' };
  }
};

// TeamMeet status colors
const getTeamMeetStatusColor = (status: TEAMMEET_STATUS) => {
  switch (status) {
    case TEAMMEET_STATUS.PENDING_CONFIRMATION:
      return { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' }; // Amber
    case TEAMMEET_STATUS.CONFIRMED:
      return { bg: '#FCE7F3', border: '#EC4899', text: '#9D174D' }; // Pink
    case TEAMMEET_STATUS.REJECTED:
      return { bg: '#FEE2E2', border: '#991B1B', text: '#7F1D1D' }; // Red
    case TEAMMEET_STATUS.CANCELLED:
      return { bg: '#F1F5F9', border: '#64748B', text: '#475569' }; // Slate
    case TEAMMEET_STATUS.COMPLETED:
      return { bg: '#CCFBF1', border: '#14B8A6', text: '#115E59' }; // Teal
    default:
      return { bg: '#F3F4F6', border: '#9CA3AF', text: '#374151' };
  }
};

export default function OpsScheduleCalendar({
  schedules,
  onScheduleSelect,
  onDateSelect,
  minimized = false,
  onToggleMinimize,
  hideHeader = false,
  compact = false,
  teamMeets = [],
  onTeamMeetSelect,
  currentUserId,
}: OpsScheduleCalendarProps) {
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());

  // Convert schedules to calendar events
  const events: CalendarEvent[] = useMemo(() => {
    const scheduleEvents: CalendarEvent[] = schedules.map((schedule) => {
      const student = schedule.studentId as OpsScheduleStudent;
      const displayName = getFullName(student?.userId) || 'Me';
      
      const [hours, minutes] = schedule.scheduledTime.split(':').map(Number);
      const startDate = new Date(schedule.scheduledDate);
      startDate.setHours(hours, minutes, 0, 0);

      // Default duration of 30 minutes for display
      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + 30);

      return {
        id: schedule._id,
        title: `📋 ${displayName} - ${schedule.scheduledTime}`,
        start: startDate,
        end: endDate,
        type: 'schedule' as const,
        resource: schedule,
      };
    });

    // Convert team meets to calendar events
    const teamMeetEvents: CalendarEvent[] = teamMeets.map((tm) => {
      const otherPerson = currentUserId && (tm.requestedBy._id === currentUserId || (tm.requestedBy as any).id === currentUserId)
        ? tm.requestedTo
        : tm.requestedBy;
      const displayName = getFullName(otherPerson) || 'Team Meet';
      const tmDate = new Date(tm.scheduledDate);
      const [h, m] = (tm.scheduledTime || '10:00').split(':').map(Number);
      tmDate.setHours(h || 10, m || 0, 0, 0);
      const tmEnd = new Date(tmDate);
      tmEnd.setMinutes(tmEnd.getMinutes() + (tm.duration || 30));
      return {
        id: tm._id,
        title: `👥 ${displayName} - ${tm.scheduledTime || '10:00'}`,
        start: tmDate,
        end: tmEnd,
        type: 'teamMeet' as const,
        teamMeetResource: tm,
      };
    });

    return [...scheduleEvents, ...teamMeetEvents];
  }, [schedules, teamMeets, currentUserId]);

  // Custom event styling based on status
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    let colors;
    if (event.type === 'teamMeet' && event.teamMeetResource) {
      // If user is only an invited participant, show in light brown
      const tm = event.teamMeetResource;
      const isSender = tm.requestedBy._id === currentUserId || (tm.requestedBy as any).id === currentUserId;
      const isReceiver = tm.requestedTo._id === currentUserId || (tm.requestedTo as any).id === currentUserId;
      const isOnlyInvited = !isSender && !isReceiver && tm.invitedUsers?.some((u) => u._id === currentUserId);

      if (isOnlyInvited) {
        return {
          style: {
            backgroundColor: '#FDE8CD',
            borderLeft: '4px solid #D97706',
            color: '#92400E',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '11px',
            fontWeight: 500,
            cursor: 'pointer',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap' as const,
            minHeight: '22px',
            lineHeight: '1.3',
          },
        };
      }
      colors = getTeamMeetStatusColor(tm.status);
    } else if (event.resource) {
      const schedule = event.resource;
      const isPastDate = isPast(new Date(schedule.scheduledDate)) && !isToday(new Date(schedule.scheduledDate));
      colors = getStatusColor(schedule.status, isPastDate);
    } else {
      colors = { bg: '#F3F4F6', border: '#9CA3AF', text: '#374151' };
    }
    
    return {
      style: {
        backgroundColor: colors.bg,
        borderLeft: `4px solid ${colors.border}`,
        color: colors.text,
        borderRadius: '4px',
        padding: '4px 8px',
        fontSize: '11px',
        fontWeight: 500,
        cursor: 'pointer',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
        minHeight: '22px',
        lineHeight: '1.3',
      },
    };
  }, []);

  const handleEventSelect = useCallback((event: CalendarEvent) => {
    if (event.type === 'teamMeet' && event.teamMeetResource && onTeamMeetSelect) {
      onTeamMeetSelect(event.teamMeetResource);
    } else if (event.type === 'schedule' && event.resource) {
      onScheduleSelect(event.resource);
    }
  }, [onScheduleSelect, onTeamMeetSelect]);

  const handleNavigate = useCallback((newDate: Date) => {
    setDate(newDate);
  }, []);

  const handleViewChange = useCallback((newView: View) => {
    setView(newView);
  }, []);

  const handleMonthChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value);
    setDate(setMonth(date, newMonth));
  }, [date]);

  const handleYearChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value);
    setDate(setYear(date, newYear));
  }, [date]);

  // Handle slot selection (for creating new schedules)
  const handleSelectSlot = useCallback(({ start }: { start: Date }) => {
    if (onDateSelect) {
      onDateSelect(start);
    }
  }, [onDateSelect]);

  // Navigate Previous based on current view
  const handlePrevious = useCallback(() => {
    if (view === 'month') {
      setDate(addMonths(date, -1));
    } else if (view === 'week') {
      setDate(addWeeks(date, -1));
    } else if (view === 'day') {
      setDate(addDays(date, -1));
    }
  }, [date, view]);

  // Navigate Next based on current view
  const handleNext = useCallback(() => {
    if (view === 'month') {
      setDate(addMonths(date, 1));
    } else if (view === 'week') {
      setDate(addWeeks(date, 1));
    } else if (view === 'day') {
      setDate(addDays(date, 1));
    }
  }, [date, view]);

  const currentMonth = getMonth(date);
  const currentYear = getYear(date);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 11 }, (_, i) => 2020 + i);

  if (minimized) {
    return (
      <div 
        onClick={onToggleMinimize}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Ops Schedule</h3>
              <p className="text-sm text-gray-500">Click to expand</p>
            </div>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white ${hideHeader ? '' : 'rounded-xl shadow-sm border border-gray-200'} overflow-hidden`}>
      {/* Calendar Header */}
      {!hideHeader && (
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Schedule Calendar</h3>
              <p className="text-sm text-gray-500">{events.length} events</p>
            </div>
          </div>
          
          {/* Legend with Hover Tooltip */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg cursor-help hover:bg-indigo-50 transition-colors">
                <span className="text-xs text-gray-500">📋👥</span>
                <span className="w-2 h-2 rounded bg-blue-500"></span>
                <span className="w-2 h-2 rounded bg-green-500"></span>
                <span className="w-2 h-2 rounded bg-pink-500"></span>
                <span className="w-2 h-2 rounded bg-amber-500"></span>
                <span className="text-xs text-gray-500">Team Meet</span>
              </div>
              {/* Hover Tooltip */}
              <div className="absolute top-full right-0 mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <p className="text-xs font-semibold text-gray-700 mb-2">📋 Task</p>
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-blue-500"></span>
                    <span className="text-xs text-gray-600">Scheduled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-green-500"></span>
                    <span className="text-xs text-gray-600">Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-purple-500"></span>
                    <span className="text-xs text-gray-600">Missed</span>
                  </div>
                </div>
                <p className="text-xs font-semibold text-gray-700 mb-2">👥 Team Meet</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-amber-400"></span>
                    <span className="text-xs text-gray-600">Pending Confirmation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-pink-500"></span>
                    <span className="text-xs text-gray-600">Confirmed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-red-700"></span>
                    <span className="text-xs text-gray-600">Reschedule Requested</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-slate-400"></span>
                    <span className="text-xs text-gray-600">Cancelled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-teal-500"></span>
                    <span className="text-xs text-gray-600">Completed</span>
                  </div>
                </div>
              </div>
            </div>
            
            {onToggleMinimize && (
              <button
                onClick={onToggleMinimize}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Minimize calendar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Custom Navigation Bar */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ← Previous
          </button>
          
          <div className="flex items-center gap-3">
            {/* View Switcher Buttons */}
            <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg p-1">
              <button
                onClick={() => handleViewChange('month')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  view === 'month'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => handleViewChange('week')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  view === 'week'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => handleViewChange('day')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  view === 'day'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Day
              </button>
            </div>
            
            {/* Month/Year Dropdowns */}
            <select
              value={currentMonth}
              onChange={handleMonthChange}
              className="px-3 py-1.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {months.map((month, index) => (
                <option key={month} value={index}>{month}</option>
              ))}
            </select>
            
            <select
              value={currentYear}
              onChange={handleYearChange}
              className="px-3 py-1.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            
            <button
              onClick={() => handleNavigate(new Date())}
              className="px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              Today
            </button>
            
            {/* Show current date when in day view */}
            {view === 'day' && (
              <div className="px-3 py-1.5 text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded-lg">
                {format(date, 'EEEE, d')}
              </div>
            )}
          </div>
          
          <button
            onClick={handleNext}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className={compact ? 'p-2' : 'p-4'} style={{ height: compact ? '350px' : '600px' }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          date={date}
          onNavigate={handleNavigate}
          onView={handleViewChange}
          onSelectEvent={handleEventSelect}
          onSelectSlot={handleSelectSlot}
          selectable={!!onDateSelect}
          eventPropGetter={eventStyleGetter}
          views={['month', 'week', 'day']}
          defaultView="month"
          popup
          style={{ height: '100%' }}
          toolbar={false}
          formats={{
            timeGutterFormat: 'HH:mm',
            eventTimeRangeFormat: ({ start, end }) =>
              `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`,
          }}
        />
      </div>
    </div>
  );
}
