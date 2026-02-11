'use client';

import { FollowUp, FOLLOWUP_STATUS, Lead, LEAD_STAGE, MEETING_TYPE } from '@/types';
import { format } from 'date-fns';
import Link from 'next/link';

interface FollowUpSidebarProps {
  today: FollowUp[];
  missed: FollowUp[];
  upcoming: FollowUp[];
  onFollowUpClick: (followUp: FollowUp) => void;
  hideHeader?: boolean;
  leadName?: string; // Override lead name for single-lead views
  onLeadClick?: (leadId: string) => void;
  showLeadLink?: boolean; // Explicitly control whether to show links
  basePath?: string; // Base path for links (e.g., '/admin/leads' or '/counselor/leads')
}

// Helper to get stage badge color - matching the standard color mapping
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

  const handleNameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Let the Link handle navigation
  };

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
          {showLeadLink && leadId ? (
            <Link 
              href={`${basePath}/${leadId}`}
              onClick={handleNameClick}
              className={`font-medium truncate block hover:underline ${isMissed ? 'text-purple-900' : 'text-gray-900'}`}
            >
              {displayName}
            </Link>
          ) : (
            <p className={`font-medium truncate ${isMissed ? 'text-purple-900' : 'text-gray-900'}`}>
              {displayName}
            </p>
          )}
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
          <div className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
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

export default function FollowUpSidebar({
  today,
  missed,
  upcoming,
  onFollowUpClick,
  hideHeader = false,
  leadName,
  onLeadClick,
  showLeadLink: showLeadLinkProp,
  basePath = '/counselor/leads',
}: FollowUpSidebarProps) {
  // Show links by default unless leadName is provided (single-lead view)
  const showLeadLink = showLeadLinkProp !== undefined ? showLeadLinkProp : !leadName;
  
  return (
    <div className={`bg-white overflow-hidden h-fit ${hideHeader ? '' : 'rounded-xl shadow-sm border border-gray-200'}`}>
      {/* Header - conditionally shown */}
      {!hideHeader && (
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-900">Follow-Up Overview</h3>
      </div>
      )}

      <div className="divide-y divide-gray-100">
        {/* Today Section */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <h4 className="text-sm font-semibold text-gray-700">Today</h4>
            <span className="ml-auto bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {today.length}
            </span>
          </div>
          
          {today.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No follow-ups today</p>
          ) : (
            <div className="space-y-2">
              {today.map((followUp) => (
                <FollowUpItem
                  key={followUp._id}
                  followUp={followUp}
                  onClick={() => onFollowUpClick(followUp)}
                  leadName={leadName}
                  showLeadLink={showLeadLink}
                  basePath={basePath}
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
              {missed.length}
            </span>
          </div>
          
          {missed.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No missed follow-ups</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {missed.map((followUp) => (
                <FollowUpItem
                  key={followUp._id}
                  followUp={followUp}
                  onClick={() => onFollowUpClick(followUp)}
                  showDate
                  isMissed
                  leadName={leadName}
                  showLeadLink={showLeadLink}
                  basePath={basePath}
                />
              ))}
            </div>
          )}
        </div>

        {/* Upcoming (Tomorrow) Section */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <h4 className="text-sm font-semibold text-gray-700">Tomorrow</h4>
            <span className="ml-auto bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {upcoming.length}
            </span>
          </div>
          
          {upcoming.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No follow-ups tomorrow</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {upcoming.map((followUp) => (
                <FollowUpItem
                  key={followUp._id}
                  followUp={followUp}
                  onClick={() => onFollowUpClick(followUp)}
                  leadName={leadName}
                  showLeadLink={showLeadLink}
                  basePath={basePath}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
