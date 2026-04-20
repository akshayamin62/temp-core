'use client';

import { useRouter, usePathname } from 'next/navigation';
import { User, USER_ROLE } from '@/types';
import { useState, useEffect } from 'react';
import { authAPI } from '@/lib/api';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import { BACKEND_URL } from '@/lib/ivyApi';
import AuthImage from '@/components/AuthImage';

interface AdvisorLayoutProps {
  children: React.ReactNode;
  user?: User;
}

interface AdvisorProfile {
  companyLogo?: string;
  companyName?: string;
}

export default function AdvisorLayout({ children, user: userProp }: AdvisorLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [advisorProfile, setAdvisorProfile] = useState<AdvisorProfile | null>(null);
  const [internalUser, setInternalUser] = useState<User | null>(null);

  const user = userProp || internalUser;

  const navigationItems = [
    {
      name: 'Leads',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      path: '/advisor/leads',
    },
    {
      name: 'Students',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
        </svg>
      ),
      path: '/advisor/students',
    },
    {
      name: 'Parents',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      path: '/advisor/parents',
    },
    {
      name: 'Service Pricing',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      path: '/advisor/service-pricing',
    },
  ];

  useEffect(() => {
    fetchAdvisorProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProp]);

  const fetchAdvisorProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      const profileData = response.data.data;

      if (!userProp && profileData.user) {
        setInternalUser(profileData.user);
      }

      // Redirect to onboarding if not verified
      if (profileData.user && !profileData.user.isVerified && !pathname.startsWith('/advisor/onboarding')) {
        router.replace('/advisor/onboarding');
        return;
      }

      if (profileData.advisor) {
        setAdvisorProfile({
          companyLogo: profileData.advisor.companyLogo,
          companyName: profileData.advisor.companyName,
        });
      }
    } catch (error) {
      console.error('Failed to fetch advisor profile:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  return (
    <div className="flex min-h-[calc(100vh-6.25rem)] bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col sticky top-25 h-[calc(100vh-6.25rem)]`}
      >
        {/* Sidebar Header */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              {advisorProfile?.companyLogo ? (
                <img
                  src={`${BACKEND_URL}/${advisorProfile.companyLogo.replace(/^\//, '')}`}
                  alt="Company Logo"
                  className="w-8 h-8 rounded-lg object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center ${advisorProfile?.companyLogo ? 'hidden' : ''}`}>
                <span className="text-white font-bold text-sm">
                  {advisorProfile?.companyName?.charAt(0) || 'A'}
                </span>
              </div>
              <span className="font-semibold text-gray-900">
                Advisor
              </span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
          {navigationItems.map((item) => {
            const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                } ${!sidebarOpen && 'justify-center'}`}
                title={!sidebarOpen ? item.name : undefined}
              >
                {item.icon}
                {sidebarOpen && (
                  <span className="font-medium">{item.name}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="border-t border-gray-200 p-4">
          {sidebarOpen ? (
            <div className="mb-3 flex items-center gap-2">
              <AuthImage
                path={user?.profilePicture}
                alt=""
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                fallback={
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-semibold text-sm">{user ? getInitials(user) : 'A'}</span>
                  </div>
                }
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user ? getFullName(user) : 'Advisor'}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
              </div>
            </div>
          ) : (
            <div className="mb-3 flex justify-center">
              <AuthImage
                path={user?.profilePicture}
                alt=""
                className="w-8 h-8 rounded-full object-cover"
                fallback={
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">{user ? getInitials(user) : 'A'}</span>
                  </div>
                }
              />
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors ${
              !sidebarOpen && 'justify-center'
            }`}
            title={!sidebarOpen ? 'Logout' : undefined}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            {sidebarOpen && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
