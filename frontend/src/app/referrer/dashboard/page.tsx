'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, referrerAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import ReferrerLayout from '@/components/ReferrerLayout';
import toast, { Toaster } from 'react-hot-toast';

interface DashboardStats {
  totalLeads: number;
  convertedLeads: number;
  totalStudents: number;
  referralSlug: string;
}

export default function ReferrerDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;

      if (userData.role !== USER_ROLE.REFERRER) {
        toast.error('Access denied. Referrer only.');
        router.push('/');
        return;
      }

      setUser(userData);
      fetchStats();
    } catch (error) {
      toast.error('Please login to continue');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await referrerAPI.getDashboardStats();
      setStats(response.data.data);
    } catch (error: any) {
      toast.error('Failed to fetch dashboard stats');
      console.error('Fetch stats error:', error);
    }
  };

  const copyReferralLink = () => {
    if (!stats?.referralSlug) return;
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${baseUrl}/referral/${stats.referralSlug}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Referral link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <ReferrerLayout user={user}>
        <div className="p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-gray-600 mt-2">Welcome back! Here&apos;s your referral overview.</p>
          </div>

          {/* Referral Link Card */}
          <div className="mb-8 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Your Referral Link</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 font-mono text-sm truncate">
                {typeof window !== 'undefined' ? window.location.origin : ''}/referral/{stats?.referralSlug || '...'}
              </div>
              <button
                onClick={copyReferralLink}
                className={`px-5 py-3 rounded-lg font-semibold transition-colors ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-white text-purple-600 hover:bg-gray-100'
                }`}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-purple-200 text-sm mt-2">Share this link to refer new students</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push('/referrer/leads')}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats?.totalLeads || 0}</p>
              <p className="text-gray-500 text-sm mt-1">Total Leads Referred</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats?.convertedLeads || 0}</p>
              <p className="text-gray-500 text-sm mt-1">Converted Leads</p>
            </div>

            <div
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push('/referrer/students')}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats?.totalStudents || 0}</p>
              <p className="text-gray-500 text-sm mt-1">Total Students</p>
            </div>
          </div>
        </div>
      </ReferrerLayout>
    </>
  );
}
