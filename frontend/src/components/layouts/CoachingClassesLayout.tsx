'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import { BACKEND_URL } from '@/lib/ivyApi';

interface UserInfo {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email: string;
  profilePicture?: string;
}

interface CoachingClassesLayoutProps {
  children: React.ReactNode;
  user?: UserInfo | null;
  serviceName?: string;
}

/* ─── Icons ─── */
const Icon = {
  servicePlans: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
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
  payment: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  logout: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
};

const commonItems = [
  { key: 'service-plans', label: 'Service Plans', path: '/student/service-plans', icon: Icon.servicePlans },
  { key: 'parents', label: 'Parents', path: '/student/parents', icon: Icon.parents },
  { key: 'alumni', label: 'Alumni', path: '/student/alumni', icon: Icon.alumni },
  { key: 'service-providers', label: 'Service Providers', path: '/student/service-providers', icon: Icon.serviceProviders },
  { key: 'payment', label: 'Payment', path: '/student/payment', icon: Icon.payment },
];

export default function CoachingClassesLayout({
  children,
  user,
  serviceName = 'Coaching Classes',
}: CoachingClassesLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

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

  return (
    <div className="flex min-h-[calc(100vh-5rem)] bg-gray-50">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col sticky top-20 h-[calc(100vh-5rem)]`}>
        {/* Header */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4">
          {sidebarOpen && <span className="font-semibold text-gray-900 truncate">{serviceName}</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {sidebarOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />}
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {commonItems.map(item =>
            navBtn(item.key, item.label, item.icon, pathname === item.path, () => router.push(item.path))
          )}
        </nav>

        {/* User Info & Logout */}
        {user && (
          <div className="border-t border-gray-200 p-4">
            {sidebarOpen ? (
              <div className="mb-3 flex items-center gap-2">
                {user.profilePicture ? (
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
                {user.profilePicture ? (
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

      <main className="flex-1">{children}</main>
    </div>
  );
}
