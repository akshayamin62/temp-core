'use client';

import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, setMonth, setYear, getMonth, getYear, addMonths, addWeeks, addDays } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { FollowUp, LEAD_STAGE, Lead, TeamMeet, TEAMMEET_STATUS } from '@/types';
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

// Type for calendar events - supports both FollowUp and TeamMeet
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'followup' | 'teammeet';
  resource: FollowUp | TeamMeet;
}

interface ScheduleCalendarProps {
  followUps: FollowUp[];
  teamMeets: TeamMeet[];
  onFollowUpSelect: (followUp: FollowUp) => void;
  onTeamMeetSelect: (teamMeet: TeamMeet) => void;
  onDateSelect?: (date: Date) => void;
  minimized?: boolean;
  onToggleMinimize?: () => void;
  hideHeader?: boolean;
  compact?: boolean;
  currentUserId?: string;
  leadName?: string;
  readOnly?: boolean;
}

// Stage colors for FollowUp events (Lead-based coloring)
const getStageColor = (stage: LEAD_STAGE) => {
  switch (stage) {
    case LEAD_STAGE.NEW:
      return { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF' }; // Blue
    case LEAD_STAGE.HOT:
      return { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' }; // Red
    case LEAD_STAGE.WARM:
      return { bg: '#FFEDD5', border: '#F97316', text: '#9A3412' }; // Orange
    case LEAD_STAGE.COLD:
      return { bg: '#CFFAFE', border: '#06B6D4', text: '#155E75' }; // Cyan
    case LEAD_STAGE.CONVERTED:
      return { bg: '#DCFCE7', border: '#22C55E', text: '#166534' }; // Green
    case LEAD_STAGE.CLOSED:
      return { bg: '#F3F4F6', border: '#9CA3AF', text: '#4B5563' }; // Gray
    default:
      return { bg: '#F3F4F6', border: '#9CA3AF', text: '#374151' };
  }
};

// TeamMeet status colors (Updated theme)
const getTeamMeetStatusColor = (status: TEAMMEET_STATUS) => {
  switch (status) {
    case TEAMMEET_STATUS.PENDING_CONFIRMATION:
      return { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' }; // Yellow/Amber
    case TEAMMEET_STATUS.CONFIRMED:
      return { bg: '#FCE7F3', border: '#EC4899', text: '#9D174D' }; // Pink
    case TEAMMEET_STATUS.REJECTED:
      return { bg: '#FEE2E2', border: '#991B1B', text: '#7F1D1D' }; // Dark Red
    case TEAMMEET_STATUS.CANCELLED:
      return { bg: '#F1F5F9', border: '#64748B', text: '#475569' }; // Slate (same)
    case TEAMMEET_STATUS.COMPLETED:
      return { bg: '#CCFBF1', border: '#14B8A6', text: '#115E59' }; // Teal
    default:
      return { bg: '#F3F4F6', border: '#9CA3AF', text: '#374151' };
  }
};

export default function ScheduleCalendar({
  followUps,
  teamMeets,
  onFollowUpSelect,
  onTeamMeetSelect,
  onDateSelect,
  minimized = false,
  onToggleMinimize,
  hideHeader = false,
  compact = false,
  currentUserId,
  leadName,
  readOnly = false,
}: ScheduleCalendarProps) {
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());

  // Convert follow-ups to calendar events
  const followUpEvents: CalendarEvent[] = useMemo(() => {
    return followUps.map((followUp) => {
      const lead = followUp.leadId as Lead;
      const displayName = leadName || lead?.name || 'Unknown';
      const [hours, minutes] = followUp.scheduledTime.split(':').map(Number);
      const startDate = new Date(followUp.scheduledDate);
      startDate.setHours(hours, minutes, 0, 0);

      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + followUp.duration);

      return {
        id: `followup-${followUp._id}`,
        title: `📋 ${displayName} - ${followUp.scheduledTime}`,
        start: startDate,
        end: endDate,
        type: 'followup' as const,
        resource: followUp,
      };
    });
  }, [followUps, leadName]);

  // Convert team meets to calendar events
  const teamMeetEvents: CalendarEvent[] = useMemo(() => {
    return teamMeets.map((teamMeet) => {
      const otherParty = teamMeet.requestedBy._id === currentUserId
        ? getFullName(teamMeet.requestedTo)
        : getFullName(teamMeet.requestedBy);
      
      const [hours, minutes] = teamMeet.scheduledTime.split(':').map(Number);
      const startDate = new Date(teamMeet.scheduledDate);
      startDate.setHours(hours, minutes, 0, 0);

      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + teamMeet.duration);

      return {
        id: `teammeet-${teamMeet._id}`,
        title: `👥 ${otherParty} - ${teamMeet.scheduledTime}`,
        start: startDate,
        end: endDate,
        type: 'teammeet' as const,
        resource: teamMeet,
      };
    });
  }, [teamMeets, currentUserId]);

  // Combine all events
  const events = useMemo(() => [...followUpEvents, ...teamMeetEvents], [followUpEvents, teamMeetEvents]);

  // Custom event styling based on type and status
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    if (event.type === 'followup') {
      const followUp = event.resource as FollowUp;
      const lead = followUp.leadId as Lead;
      const stage = lead?.stage || followUp.stageAtFollowUp;
      const colors = getStageColor(stage);
      
      // Check if it's a past event that's still scheduled (missed)
      const isPast = event.start < new Date() && followUp.status === 'Scheduled';
      
      return {
        style: {
          backgroundColor: isPast ? '#F3E8FF' : colors.bg,
          borderLeft: `4px solid ${isPast ? '#9333EA' : colors.border}`,
          color: isPast ? '#6B21A8' : colors.text,
          borderRadius: '4px',
          padding: '4px 8px',
          fontSize: '11px',
          fontWeight: 500,
          cursor: 'pointer',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minHeight: '22px',
          lineHeight: '1.3',
        },
      };
    } else {
      // TeamMeet
      const teamMeet = event.resource as TeamMeet;
      const colors = getTeamMeetStatusColor(teamMeet.status);
      
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
          whiteSpace: 'nowrap',
          minHeight: '22px',
          lineHeight: '1.3',
        },
      };
    }
  }, []);

  const handleEventSelect = useCallback((event: CalendarEvent) => {
    if (event.type === 'followup') {
      onFollowUpSelect(event.resource as FollowUp);
    } else {
      onTeamMeetSelect(event.resource as TeamMeet);
    }
  }, [onFollowUpSelect, onTeamMeetSelect]);

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

  // Handle slot selection (for creating new TeamMeets)
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
            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Combined Calendar</h3>
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
            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Schedule Calendar</h3>
              <p className="text-sm text-gray-500">
                {followUpEvents.length} follow-ups • {teamMeetEvents.length} team meets
                {readOnly && <span className="ml-2 text-amber-600 italic">(Read-only view)</span>}
              </p>
            </div>
          </div>
          
          {/* Combined Legend with Hover Tooltips */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* FollowUp Legend */}
            <div className="relative group">
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-lg cursor-help hover:bg-blue-50 transition-colors">
                <span className="text-xs text-gray-500 mr-1">📋</span>
                <span className="w-2 h-2 rounded bg-blue-500"></span>
                <span className="w-2 h-2 rounded bg-red-500"></span>
                <span className="w-2 h-2 rounded bg-orange-500"></span>
                <span className="w-2 h-2 rounded bg-cyan-400"></span>
                <span className="w-2 h-2 rounded bg-green-500"></span>
                <span className="w-2 h-2 rounded bg-purple-400"></span>
                <span className="text-xs text-gray-500 ml-1">Follow-ups</span>
              </div>
              {/* Tooltip */}
              <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <p className="text-xs font-semibold text-gray-700 mb-2">Follow-up Colors (Lead Stage)</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-blue-500"></span>
                    <span className="text-xs text-gray-600">New Lead</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-red-500"></span>
                    <span className="text-xs text-gray-600">Hot Lead</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-orange-500"></span>
                    <span className="text-xs text-gray-600">Warm Lead</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-cyan-400"></span>
                    <span className="text-xs text-gray-600">Cold Lead</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-green-500"></span>
                    <span className="text-xs text-gray-600">Converted Lead</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-purple-400"></span>
                    <span className="text-xs text-gray-600">Missed Follow-up</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* TeamMeet Legend */}
            <div className="relative group">
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-lg cursor-help hover:bg-pink-50 transition-colors">
                <span className="text-xs text-gray-500 mr-1">👥</span>
                <span className="w-2 h-2 rounded bg-amber-400"></span>
                <span className="w-2 h-2 rounded bg-pink-500"></span>
                <span className="w-2 h-2 rounded bg-red-800"></span>
                <span className="w-2 h-2 rounded bg-slate-400"></span>
                <span className="w-2 h-2 rounded bg-teal-500"></span>
                <span className="text-xs text-gray-500 ml-1">TeamMeets</span>
              </div>
              {/* Tooltip */}
              <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <p className="text-xs font-semibold text-gray-700 mb-2">TeamMeet Colors (Status)</p>
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
                    <span className="w-3 h-3 rounded bg-red-800"></span>
                    <span className="text-xs text-gray-600">Rejected</span>
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
                    ? 'bg-teal-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => handleViewChange('week')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  view === 'week'
                    ? 'bg-teal-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => handleViewChange('day')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  view === 'day'
                    ? 'bg-teal-600 text-white'
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
              className="px-3 py-1.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              {months.map((month, index) => (
                <option key={month} value={index}>{month}</option>
              ))}
            </select>
            
            <select
              value={currentYear}
              onChange={handleYearChange}
              className="px-3 py-1.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            
            <button
              onClick={() => handleNavigate(new Date())}
              className="px-3 py-1.5 text-sm font-medium text-teal-600 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
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
          onSelectSlot={!readOnly ? handleSelectSlot : undefined}
          selectable={!readOnly && !!onDateSelect}
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
