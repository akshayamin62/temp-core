'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getFullName } from '@/utils/nameHelpers';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token) {
      setIsLoggedIn(true);
      if (user) {
        try {
          const userData = JSON.parse(user);
          setUserName(getFullName(userData) || '');
          setUserRole(userData.role || '');
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
    } else {
      setIsLoggedIn(false);
      setUserName('');
      setUserRole('');
    }
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUserName('');
    setUserRole('');
    setMobileMenuOpen(false);
    router.push('/login');
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <nav className="bg-white sticky top-0 z-50 shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-1 lg:px-1">
        <div className="flex justify-between h-25 animate-fade-in">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center group">
              <div className="relative">
                {/* <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-300"></div> */}
                <img 
                  src="/logo1.png" 
                  alt="CORE Logo" 
                  className="relative h-20 w-auto object-contain"
                />
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            <Link
              href="/"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                isActive('/')
                  ? 'text-blue-600 bg-blue-50 shadow-md'
                  : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 hover:shadow-sm'
              }`}
            >
              Home
            </Link>

            {isLoggedIn ? (
              <>
                {/* Dashboard link - routes based on user role */}
                {(userRole?.toLowerCase() === 'super_admin' || userRole === 'SUPER_ADMIN') ? (
                  <Link
                    href="/super-admin/dashboard"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                      pathname.startsWith('/super-admin')
                        ? 'text-blue-600 bg-blue-50 shadow-md'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 hover:shadow-sm'
                    }`}
                  >
                    Dashboard
                  </Link>
                ) : (userRole?.toLowerCase() === 'admin' || userRole === 'ADMIN') ? (
                  <Link
                    href="/admin/dashboard"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                      pathname.startsWith('/admin')
                        ? 'text-blue-600 bg-blue-50 shadow-md'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 hover:shadow-sm'
                    }`}
                  >
                    Dashboard
                  </Link>
                ) : (userRole?.toLowerCase() === 'ops' || userRole === 'OPS') ? (
                  <Link
                    href="/ops/dashboard"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                      pathname.startsWith('/OPS')
                        ? 'text-blue-600 bg-blue-50 shadow-md'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 hover:shadow-sm'
                    }`}
                  >
                    Dashboard
                  </Link>
                ) : (userRole?.toLowerCase() === 'counselor' || userRole === 'COUNSELOR') ? (
                  <Link
                    href="/counselor/dashboard"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                      pathname.startsWith('/counselor')
                        ? 'text-blue-600 bg-blue-50 shadow-md'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 hover:shadow-sm'
                    }`}
                  >
                    Dashboard
                  </Link>
                ) : (
                  <Link
                    href="/dashboard"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                      isActive('/dashboard')
                        ? 'text-blue-600 bg-blue-50 shadow-md'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 hover:shadow-sm'
                    }`}
                  >
                    Dashboard
                  </Link>
                )}
                {/* Profile Dropdown */}
                <div className="relative ml-4">
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    aria-label="User menu"
                    aria-expanded={profileDropdownOpen}
                  >
                    {userName ? userName.charAt(0).toUpperCase() : 'U'}
                  </button>
                  
                  {/* Dropdown Menu */}
                  {profileDropdownOpen && (
                    <>
                      {/* Backdrop to close dropdown when clicking outside */}
                      <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setProfileDropdownOpen(false)}
                      ></div>
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50 animate-fade-in">
                        {/* User Info */}
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm font-semibold text-gray-900">{userName}</p>
                          <p className="text-xs text-gray-700 capitalize mt-1">{userRole?.replace('_', ' ')}</p>
                        </div>
                        
                        {/* My Profile Link */}
                        <Link
                          href="/profile"
                          onClick={(e) => {
                            e.preventDefault();
                            setProfileDropdownOpen(false);
                            router.push('/profile');
                          }}
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          My Profile
                        </Link>
                        
                        {/* Logout Button */}
                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            handleLogout();
                          }}
                          className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                        >
                          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Logout
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    isActive('/login')
                      ? 'text-blue-600 bg-blue-50 shadow-md'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 hover:shadow-sm'
                  }`}
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 btn-glow"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {!mobileMenuOpen ? (
                <svg
                  className="block h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                  />
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 animate-slide-in">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-white">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/')
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              Home
            </Link>

            {isLoggedIn ? (
              <>
                {/* Dashboard link - routes based on user role */}
                {(userRole?.toLowerCase() === 'super_admin' || userRole === 'SUPER_ADMIN') ? (
                  <Link
                    href="/super-admin/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-md text-base font-medium ${
                      pathname.startsWith('/super-admin')
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                    }`}
                  >
                    Dashboard
                  </Link>
                ) : (userRole?.toLowerCase() === 'admin' || userRole === 'ADMIN') ? (
                  <Link
                    href="/admin/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-md text-base font-medium ${
                      pathname.startsWith('/admin')
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                    }`}
                  >
                    Dashboard
                  </Link>
                ) : (userRole?.toLowerCase() === 'ops' || userRole === 'OPS') ? (
                  <Link
                    href="/ops/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-md text-base font-medium ${
                      pathname.startsWith('/OPS')
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                    }`}
                  >
                    Dashboard
                  </Link>
                ) : (userRole?.toLowerCase() === 'counselor' || userRole === 'COUNSELOR') ? (
                  <Link
                    href="/counselor/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-md text-base font-medium ${
                      pathname.startsWith('/counselor')
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                    }`}
                  >
                    Dashboard
                  </Link>
                ) : (userRole?.toLowerCase() === 'counselor' || userRole === 'COUNSELOR') ? (
                  <Link
                    href="/counselor/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-md text-base font-medium ${
                      pathname.startsWith('/counselor')
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                    }`}
                  >
                    Dashboard
                  </Link>
                ) : (
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-md text-base font-medium ${
                      isActive('/dashboard')
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                    }`}
                  >
                    Dashboard
                  </Link>
                )}
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50"
                >
                  My Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    isActive('/login')
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-blue-600 hover:bg-blue-50"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}


