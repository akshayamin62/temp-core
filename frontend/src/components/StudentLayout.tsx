'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import { BACKEND_URL } from '@/lib/ivyApi';
import { serviceAPI } from '@/lib/api';

interface StudentLayoutProps {
  children: React.ReactNode;
  formStructure: any[];
  currentPartIndex: number;
  currentSectionIndex: number;
  onPartChange: (index: number) => void;
  onSectionChange: (index: number) => void;
  serviceName?: string;
  showDashboard?: boolean;
  isDashboardActive?: boolean;
  onDashboardClick?: () => void;
  user?: { firstName?: string; middleName?: string; lastName?: string; email: string; profilePicture?: string } | null;
  isEducationPlanning?: boolean;
  activeEduPlanView?: string;
  onEduPlanViewChange?: (view: string) => void;
  onMyActivityClick?: () => void;
  isOuterNav?: boolean;
  isCoachingClasses?: boolean;
}

/* ─── Reusable Icons ─── */
const Icon = {
  dashboard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  profile: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  application: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  document: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  payment: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  activity: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  analytics: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  brainography: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  portfolio: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  ),
  parents: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  alumni: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  serviceProviders: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  servicePlans: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  logout: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
};

/* ─── Nav item configs ─── */
const studyAbroadItems = [
  { key: 'dashboard', label: 'Dashboard', icon: Icon.dashboard },
  { key: 'profile', label: 'Profile', icon: Icon.profile },
  { key: 'application', label: 'Application', icon: Icon.application },
  { key: 'documents', label: 'Documents', icon: Icon.document },
  { key: 'payment', label: 'Payment', icon: Icon.payment },
];

const eduPlanItems = [
  { key: 'dashboard', label: 'Dashboard', icon: Icon.dashboard },
  { key: 'my-activity', label: 'My Activity', icon: Icon.activity },
  { key: 'analytics', label: 'Activity Analysis', icon: Icon.analytics },
  { key: 'brainography', label: 'Brainography Analysis', icon: Icon.brainography },
  { key: 'portfolio', label: 'Portfolio Generator', icon: Icon.portfolio },
];

const commonItems = [
  { key: 'service-plans', label: 'Service Plans', path: '/student/service-plans', icon: Icon.servicePlans },
  { key: 'parents', label: 'Parents', path: '/student/parents', icon: Icon.parents },
  { key: 'alumni', label: 'Alumni', path: '/student/alumni', icon: Icon.alumni },
  { key: 'service-providers', label: 'Service Providers', path: '/student/service-providers', icon: Icon.serviceProviders },
];

/* ─── Helper: icon for a form part title ─── */
function getPartIcon(title: string) {
  const t = title.toLowerCase();
  if (t.includes('profile')) return Icon.profile;
  if (t.includes('application')) return Icon.application;
  if (t.includes('document')) return Icon.document;
  if (t.includes('payment')) return Icon.payment;
  return Icon.document;
}

export default function StudentLayout({
  children,
  formStructure,
  currentPartIndex,
  currentSectionIndex,
  onPartChange,
  onSectionChange,
  serviceName = 'Form',
  showDashboard = false,
  isDashboardActive = false,
  onDashboardClick,
  user,
  isEducationPlanning = false,
  activeEduPlanView,
  onEduPlanViewChange,
  onMyActivityClick,
  isOuterNav = false,
  isCoachingClasses = false,
}: StudentLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [registrations, setRegistrations] = useState<any[]>([]);

  // Fetch student registrations for outer pages (parents, alumni, service-providers)
  useEffect(() => {
    if (isOuterNav) {
      serviceAPI.getMyServices()
        .then(res => setRegistrations(res.data.data.registrations || []))
        .catch(() => {});
    }
  }, [isOuterNav]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  // No sidebar when there's nothing to show
  if (formStructure.length === 0 && !showDashboard && !isEducationPlanning && !isOuterNav && !isCoachingClasses) {
    return <div>{children}</div>;
  }

  // For outer pages: pick the registration the student last visited (stored in sessionStorage)
  const activeRegId = typeof window !== 'undefined' ? sessionStorage.getItem('activeRegistrationId') : null;
  const outerReg = isOuterNav
    ? registrations.find((r: any) => r._id === activeRegId) || registrations[0]
    : null;
  const outerService = outerReg && typeof outerReg.serviceId === 'object' ? outerReg.serviceId : null;
  const outerRegPath = outerReg ? `/student/registration/${outerReg._id}` : '';
  const headerTitle = isOuterNav && outerService ? outerService.name : serviceName;

  // ─── Reusable nav button renderer ───
  const navBtn = (key: string, label: string, icon: React.ReactNode, active: boolean, onClick: () => void) => (
    <div key={key} className="mb-1">
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
          active ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
        } ${!sidebarOpen ? 'justify-center' : ''}`}
        title={!sidebarOpen ? label : undefined}
      >
        {icon}
        {sidebarOpen && <span className="font-medium">{label}</span>}
      </button>
    </div>
  );

  // ─── Service-specific nav items ───
  const renderServiceNav = () => {
    // COACHING CLASSES: no service-specific nav items
    if (isCoachingClasses) return null;

    // OUTER PAGES: show nav items from fetched registration
    if (isOuterNav) {
      if (!outerReg) return null;
      const items = outerService?.slug === 'education-planning' ? eduPlanItems : studyAbroadItems;
      return items.map(item =>
        navBtn(item.key, item.label, item.icon, false, () => router.push(outerRegPath))
      );
    }

    // EDUCATION PLANNING (registration page)
    if (isEducationPlanning) {
      return (
        <>
          {eduPlanItems.map(item =>
            navBtn(item.key, item.label, item.icon, activeEduPlanView === item.key, () => {
              if (item.key === 'my-activity') {
                onMyActivityClick?.();
              } else {
                onEduPlanViewChange?.(item.key);
              }
            })
          )}
          {formStructure.map((part, i) =>
            navBtn(part.part.key, part.part.title, getPartIcon(part.part.title),
              currentPartIndex === i && activeEduPlanView === 'form',
              () => { onPartChange(i); onSectionChange(0); }
            )
          )}
        </>
      );
    }

    // STUDY ABROAD (registration page)
    return (
      <>
        {showDashboard &&
          navBtn('dashboard', 'Dashboard', Icon.dashboard, isDashboardActive, () => onDashboardClick?.())
        }
        {formStructure.map((part, i) =>
          navBtn(part.part.key, part.part.title, getPartIcon(part.part.title),
            currentPartIndex === i && !isDashboardActive,
            () => { onPartChange(i); onSectionChange(0); }
          )
        )}
      </>
    );
  };

  return (
    <div className="flex min-h-[calc(100vh-5rem)] bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col sticky top-20 h-[calc(100vh-5rem)]`}
      >
        {/* Sidebar Header */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4">
          {sidebarOpen && (
            <span className="font-semibold text-gray-900 truncate">{headerTitle}</span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {sidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              )}
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {renderServiceNav()}

          {/* Always: Parents, Alumni, Service Providers */}
          <div>
            {(isCoachingClasses ? commonItems.filter(i => i.key === 'service-plans') : commonItems).map(item =>
              navBtn(item.key, item.label, item.icon, pathname === item.path, () => router.push(item.path))
            )}
          </div>
        </nav>

        {/* User Info & Logout */}
        {user && (
          <div className="border-t border-gray-200 p-4">
            {sidebarOpen ? (
              <div className="mb-3 flex items-center gap-2">
                {user?.profilePicture ? (
                  <img src={`${BACKEND_URL}/uploads/${user.profilePicture}`} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-semibold text-sm">{getInitials(user)}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{getFullName(user)}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
              </div>
            ) : (
              <div className="mb-3 flex justify-center">
                {user?.profilePicture ? (
                  <img src={`${BACKEND_URL}/uploads/${user.profilePicture}`} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">{getInitials(user)}</span>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors ${!sidebarOpen ? 'justify-center' : ''}`}
              title={!sidebarOpen ? 'Logout' : undefined}
            >
              {Icon.logout}
              {sidebarOpen && <span className="font-medium">Logout</span>}
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
