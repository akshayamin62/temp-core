'use client';

import Link from 'next/link';
import { OpsSchedule, OPS_SCHEDULE_STATUS, OpsScheduleSummary, OpsScheduleStudent } from '@/types';
import { format, isToday, isTomorrow } from 'date-fns';
import { getFullName } from '@/utils/nameHelpers';

interface OpsScheduleSidebarProps {
  summary: OpsScheduleSummary;
  onScheduleClick: (schedule: OpsSchedule) => void;
}

interface ScheduleItemProps {
  schedule: OpsSchedule;
  onClick: () => void;
  showDate?: boolean;
}

const ScheduleItem = ({ schedule, onClick, showDate = false }: ScheduleItemProps) => {
  const student = schedule.studentId as OpsScheduleStudent;
  const displayName = getFullName(student?.userId) || 'Me';

  const getStatusStyles = () => {
    switch (schedule.status) {
      case OPS_SCHEDULE_STATUS.SCHEDULED:
        return 'border-blue-200 bg-blue-50 hover:border-blue-300';
      case OPS_SCHEDULE_STATUS.COMPLETED:
        return 'border-green-200 bg-green-50 hover:border-green-300';
      case OPS_SCHEDULE_STATUS.MISSED:
        return 'border-purple-200 bg-purple-50 hover:border-purple-300';
      default:
        return 'border-gray-200 bg-gray-50 hover:border-gray-300';
    }
  };

  const getStatusBadge = () => {
    switch (schedule.status) {
      case OPS_SCHEDULE_STATUS.SCHEDULED:
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
            Scheduled
          </span>
        );
      case OPS_SCHEDULE_STATUS.COMPLETED:
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
            Completed
          </span>
        );
      case OPS_SCHEDULE_STATUS.MISSED:
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
            Missed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg border cursor-pointer transition-all ${getStatusStyles()}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {displayName === 'Me' ? (
            <p className="font-medium text-gray-900 text-sm truncate">
              {displayName}
            </p>
          ) : (
            <Link
              href={`/ops/students/${student?._id}`}
              onClick={(e) => e.stopPropagation()}
              className="font-medium text-gray-900 hover:text-indigo-600 text-sm truncate block hover:underline"
            >
              {displayName}
            </Link>
          )}
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {schedule.scheduledTime}
            </span>
            {showDate && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {format(new Date(schedule.scheduledDate), 'MMM d')}
              </span>
            )}
          </div>

        </div>
        <div className="flex-shrink-0">
          {getStatusBadge()}
        </div>
      </div>
    </div>
  );
};

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  schedules: OpsSchedule[];
  onScheduleClick: (schedule: OpsSchedule) => void;
  showDate?: boolean;
  emptyMessage: string;
}

const Section = ({ title, icon, iconBg, schedules, onScheduleClick, showDate = false, emptyMessage }: SectionProps) => {
  return (
    <div className="pb-6 border-b border-gray-300 last:pb-0 last:border-b-0 mt-5">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        <h4 className="font-semibold text-gray-900 text-sm">{title}</h4>
        <span className="ml-auto px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
          {schedules.length}
        </span>
      </div>
      
      {schedules.length > 0 ? (
        <div className="space-y-2">
          {schedules.map((schedule) => (
            <ScheduleItem
              key={schedule._id}
              schedule={schedule}
              onClick={() => onScheduleClick(schedule)}
              showDate={showDate}
            />
          ))}
        </div>
      ) : (
        <div className="p-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <p className="text-xs text-gray-500 text-center">{emptyMessage}</p>
        </div>
      )}
    </div>
  );
};

export default function OpsScheduleSidebar({
  summary,
  onScheduleClick,
}: OpsScheduleSidebarProps) {
  const { today, missed, tomorrow } = summary;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Schedule Overview</h3>
              <p className="text-xs text-gray-500">Your upcoming tasks</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-lg font-bold text-blue-600">{today.length}</p>
            <p className="text-xs text-gray-500">Today</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-purple-600">{missed.length}</p>
            <p className="text-xs text-gray-500">Missed</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-amber-600">{tomorrow.length}</p>
            <p className="text-xs text-gray-500">Tomorrow</p>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* Today's Schedules */}
        <Section
          title="Today"
          icon={
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          iconBg="bg-blue-100"
          schedules={today}
          onScheduleClick={onScheduleClick}
          emptyMessage="No schedules for today"
        />

        {/* Missed Schedules */}
        <Section
          title="Missed"
          icon={
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
          iconBg="bg-purple-100"
          schedules={missed}
          onScheduleClick={onScheduleClick}
          showDate={true}
          emptyMessage="No missed schedules"
        />

        {/* Tomorrow's Schedules */}
        <Section
          title="Tomorrow"
          icon={
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          iconBg="bg-amber-100"
          schedules={tomorrow}
          onScheduleClick={onScheduleClick}
          emptyMessage="No schedules for tomorrow"
        />
      </div>
    </div>
  );
}
