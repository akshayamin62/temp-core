'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import AdminLayout from '@/components/AdminLayout';
import toast, { Toaster } from 'react-hot-toast';

const services = [
  {
    name: 'Study Abroad',
    slug: 'study-abroad',
    description: 'Set pricing for Study Abroad PRO, PREMIUM, and PLATINUM plans for your students.',
    icon: '🌍',
    path: '/admin/service-pricing/study-abroad-pricing',
    color: 'blue',
  },
  {
    name: 'Coaching Classes',
    slug: 'coaching-classes',
    description: 'Set pricing for Coaching Classes PRO, PREMIUM, and PLATINUM plans — IELTS, GRE, GMAT, SAT, PTE & language courses.',
    icon: '📚',
    path: '/admin/service-pricing/coaching-classes-pricing',
    color: 'teal',
  },
  {
    name: 'Education Planning',
    slug: 'education-planning',
    description: 'Set pricing for Education Planning PRO, PREMIUM, and PLATINUM plans for your students.',
    icon: '🎓',
    path: '/admin/service-pricing/education-planning-pricing',
    color: 'purple',
  },
];

export default function ServicePricingIndexPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authAPI.getProfile();
        const userData = response.data.data.user;
        if (userData.role !== USER_ROLE.ADMIN) {
          toast.error('Access denied. Admin only.');
          router.push('/');
          return;
        }
        setUser(userData);
      } catch {
        toast.error('Please login to continue');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

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
    <AdminLayout user={user}>
      <Toaster position="top-right" />
      <div className="min-h-[calc(100vh-5rem)]">
        {/* Header Banner */}
        <div className="bg-gradient-to-br from-white via-blue-50 to-indigo-50 border-b border-blue-100">
          <div className="px-6 lg:px-8 py-10">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200/50">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-gray-900">Service Pricing</h1>
                <p className="text-gray-500 mt-1">Manage pricing for the services you offer to students.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {services.map((service) => (
              <button
                key={service.slug}
                onClick={() => router.push(service.path)}
                className="group relative bg-white rounded-2xl shadow-md hover:shadow-xl border border-gray-100 overflow-hidden transition-all duration-300 hover:-translate-y-1 text-left"
              >
                {/* Top accent */}
                <div className="h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-amber-500" />
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm">
                      <span className="text-3xl">{service.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {service.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{service.description}</p>
                    </div>
                  </div>
                  <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 group-hover:text-blue-700">
                      Manage Pricing
                      <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      <span className="w-2 h-2 rounded-full bg-purple-400" />
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
