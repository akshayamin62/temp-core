'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, spServiceAPI } from '@/lib/api';
import { User, USER_ROLE, ServiceProviderProfile } from '@/types';
import { getFullName } from '@/utils/nameHelpers';
import ServiceProviderLayout from '@/components/ServiceProviderLayout';
import toast, { Toaster } from 'react-hot-toast';

export default function ServiceProviderDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [spProfile, setSpProfile] = useState<ServiceProviderProfile | null>(null);
  const [servicesCount, setServicesCount] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [contactedCount, setContactedCount] = useState(0);
  const [closedCount, setClosedCount] = useState(0);
  const [convertedCount, setConvertedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;

      if (userData.role !== USER_ROLE.SERVICE_PROVIDER) {
        router.push('/dashboard');
        return;
      }

      setUser(userData);
      if (response.data.data.serviceProvider) {
        setSpProfile(response.data.data.serviceProvider);
      }

      const [servicesRes, enquiriesRes] = await Promise.all([
        spServiceAPI.getMyServices(),
        spServiceAPI.getMyEnquiries(),
      ]);

      const services = servicesRes.data.data.services || [];
      const enquiries = enquiriesRes.data.data.enquiries || [];

      setServicesCount(services.length);
      setNewCount(enquiries.filter((e: any) => e.status === 'New').length);
      setContactedCount(enquiries.filter((e: any) => e.status === 'Contacted').length);
      setClosedCount(enquiries.filter((e: any) => e.status === 'Closed').length);
      setConvertedCount(enquiries.filter((e: any) => e.status === 'Converted').length);
    } catch (error: any) {
      toast.error('Please login to continue');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const stats = [
    {
      title: 'Services Listed',
      value: servicesCount.toString(),
      subtitle: servicesCount === 1 ? '1 active service' : `${servicesCount} active services`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      color: 'blue',
      link: '/service-provider/my-services',
    },
    {
      title: 'New Students',
      value: newCount.toString(),
      subtitle: newCount > 0 ? 'Awaiting response' : 'No new enquiries',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
      color: 'yellow',
      link: '/service-provider/students',
    },
    {
      title: 'Contacted',
      value: contactedCount.toString(),
      subtitle: contactedCount > 0 ? 'In conversation' : 'None yet',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      color: 'blue',
      link: '/service-provider/students',
    },
    {
      title: 'Closed',
      value: closedCount.toString(),
      subtitle: closedCount > 0 ? 'Closed enquiries' : 'None yet',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      color: 'gray',
      link: '/service-provider/students',
    },
    {
      title: 'Converted',
      value: convertedCount.toString(),
      subtitle: convertedCount > 0 ? 'Successful conversions' : 'None yet',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'green',
      link: '/service-provider/students',
    },
  ];

  const colorClasses: Record<string, { bg: string; text: string; icon: string }> = {
    green: { bg: 'bg-green-100', text: 'text-green-600', icon: 'bg-green-100' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', icon: 'bg-blue-100' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', icon: 'bg-yellow-100' },
    red: { bg: 'bg-red-100', text: 'text-red-600', icon: 'bg-red-100' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', icon: 'bg-purple-100' },
    gray: { bg: 'bg-gray-100', text: 'text-gray-600', icon: 'bg-gray-100' },
  };

  return (
    <ServiceProviderLayout user={user}>
      <Toaster position="top-right" />
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {getFullName(user)}
            </h1>
            <p className="text-gray-500 mt-1">
              Here&apos;s an overview of your service provider account
            </p>
          </div>
          {(() => { const t = new Date(); const d = Math.floor((t.getTime() - new Date(t.getFullYear(), 0, 0).getTime()) / 86400000); return (<div className="text-right"><p className="text-3xl font-extrabold text-gray-900">Day {d}</p><p className="text-sm text-gray-500">of {t.getFullYear()}</p></div>); })()}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {stats.map((stat) => {
            const colors = colorClasses[stat.color];
            return (
              <div
                key={stat.title}
                onClick={() => router.push(stat.link)}
                className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-5 transition-all cursor-pointer hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 ${colors.icon} ${colors.text} rounded-lg flex items-center justify-center`}>
                    {stat.icon}
                  </div>
                  <h3 className="text-3xl font-extrabold text-gray-900">{stat.value}</h3>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-sm font-semibold text-gray-700">{stat.title}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/service-provider/profile')}
              className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all"
            >
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Complete Profile</p>
                <p className="text-xs text-gray-500">Update company & bank details</p>
              </div>
            </button>
            <button
              onClick={() => router.push('/service-provider/my-services')}
              className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all"
            >
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Add New Service</p>
                <p className="text-xs text-gray-500">List a service for students</p>
              </div>
            </button>
            <button
              onClick={() => router.push('/service-provider/students')}
              className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all"
            >
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">View Enquiries</p>
                <p className="text-xs text-gray-500">Manage student enquiries</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </ServiceProviderLayout>
  );
}

