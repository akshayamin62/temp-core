'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { User } from '@/types';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName, getInitials } from '@/utils/nameHelpers';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      setUser(response.data.data.user);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch profile';
      toast.error(message);
      
      // Redirect to login if unauthorized
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      student: 'from-blue-500 to-cyan-500',
      OPS: 'from-green-500 to-emerald-500',
      alumni: 'from-purple-500 to-pink-500',
      service_provider: 'from-orange-500 to-red-500',
      admin: 'from-gray-700 to-gray-900',
    };
    return colors[role.toLowerCase() as keyof typeof colors] || colors.student;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="text-center animate-scale-in">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <Toaster position="top-right" />

      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl animate-float" style={{animationDelay: '1.5s'}}></div>
      </div>

      {/* Main Content */}
      <div className="relative max-w-4xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
              My Profile
            </h1>
            <p className="text-gray-600 text-lg">
              View and manage your account information
            </p>
          </div>

          {/* Profile Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 animate-fade-in">
            {/* Profile Header */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-t-2xl p-8">
              <div className="flex items-center">
                <div className={`w-20 h-20 rounded-2xl bg-white flex items-center justify-center text-3xl font-bold shadow-xl ${user?.role ? `bg-gradient-to-br ${getRoleBadgeColor(user.role)}` : 'bg-gradient-to-br from-blue-500 to-cyan-500'} text-white`}>
                  {getInitials(user)}
                </div>
                <div className="ml-6">
                  <h2 className="text-3xl font-bold text-white mb-1">{getFullName(user)}</h2>
                  <p className="text-blue-100 text-lg">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Profile Information */}
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div className="group">
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Full Name</label>
                  <div className="flex items-center p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl group-hover:shadow-md transition-shadow">
                    <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-gray-900 font-medium">{getFullName(user)}</span>
                  </div>
                </div>

                {/* Email Address */}
                <div className="group">
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Email Address</label>
                  <div className="flex items-center p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl group-hover:shadow-md transition-shadow">
                    <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-gray-900 font-medium">{user?.email}</span>
                  </div>
                </div>

                {/* Account Role */}
                <div className="group">
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Account Role</label>
                  <div className="flex items-center p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl group-hover:shadow-md transition-shadow">
                    <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-gray-900 font-medium capitalize">{user?.role?.replace('_', ' ')}</span>
                  </div>
                </div>

                {/* Account Status */}
                <div className="group">
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Account Status</label>
                  <div className="flex items-center p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl group-hover:shadow-md transition-shadow">
                    <div className={`w-3 h-3 rounded-full ${user?.isActive ? 'bg-green-500' : 'bg-red-500'} mr-3 animate-pulse`}></div>
                    <span className={`font-semibold ${user?.isActive ? 'text-green-600' : 'text-red-600'}`}>
                      {user?.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Verification Status */}
                <div className="group">
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Verification Status</label>
                  <div className="flex items-center p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl group-hover:shadow-md transition-shadow">
                    <div className={`w-3 h-3 rounded-full ${user?.isVerified ? 'bg-green-500' : 'bg-yellow-500'} mr-3 animate-pulse`}></div>
                    <span className={`font-semibold ${user?.isVerified ? 'text-green-600' : 'text-yellow-600'}`}>
                      {user?.isVerified ? 'Verified' : 'Pending Verification'}
                    </span>
                  </div>
                </div>

                {/* Member Since */}
                <div className="group">
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Member Since</label>
                  <div className="flex items-center p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl group-hover:shadow-md transition-shadow">
                    <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-gray-900 font-medium">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      }) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Verification Notice */}
            {!user?.isVerified && (
              <div className="mx-8 mb-8 bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 rounded-xl p-6">
                <div className="flex items-start">
                  <div className="shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                      <svg className="h-6 w-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-bold text-yellow-900 mb-2">Account Verification Required</h3>
                    <p className="text-yellow-800 leading-relaxed">
                      Your account is pending additional verification. You will be notified via email once approved. 
                      This helps us maintain a secure and trusted community.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


