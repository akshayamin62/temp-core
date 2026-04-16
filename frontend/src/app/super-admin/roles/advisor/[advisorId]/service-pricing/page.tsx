'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, servicePlanAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import ServicePlanDetailsView from '@/components/ServicePlanDetailsView';
import CoachingClassCards from '@/components/CoachingClassCards';
import { getServicePlans, getServiceFeatures } from '@/config/servicePlans';
import toast, { Toaster } from 'react-hot-toast';

const availableServices = [
  { slug: 'study-abroad', name: 'Study Abroad', description: 'View this advisor\'s pricing for Study Abroad plans.', icon: '🌍' },
  { slug: 'education-planning', name: 'Education Planning', description: 'View this advisor\'s pricing for Education Planning plans.', icon: '🎓' },
  { slug: 'coaching-classes', name: 'Coaching Classes', description: 'View this advisor\'s pricing for Coaching Classes.', icon: '📚' },
];

export default function SuperAdminViewAdvisorPricingPage() {
  const router = useRouter();
  const params = useParams();
  const advisorId = params.advisorId as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [pricing, setPricing] = useState<Record<string, number> | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authAPI.getProfile();
        const userData = response.data.data.user;
        if (userData.role !== USER_ROLE.SUPER_ADMIN) {
          toast.error('Access denied. Super Admin only.');
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

  const handleSelectService = async (slug: string) => {
    setSelectedService(slug);
    setLoadingPlans(true);
    setPricing(null);

    try {
      const pricingRes = await servicePlanAPI.getAdminPricingById(slug, advisorId);
      const p = pricingRes.data.data.pricing;
      if (p) setPricing(p);
    } catch {
      toast.error('Failed to load plan details');
    } finally {
      setLoadingPlans(false);
    }
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

  const selectedServiceInfo = availableServices.find((s) => s.slug === selectedService);

  return (
    <SuperAdminLayout user={user}>
      <Toaster position="top-right" />
      <div className="p-6 lg:p-8">
        <button onClick={() => router.push(`/super-admin/roles/advisor/${advisorId}`)} className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Advisor Dashboard
        </button>

        {!selectedService && (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Advisor Service Pricing</h1>
              <p className="text-gray-500 mt-1">View this advisor&apos;s selling prices for each service plan.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {availableServices.map((service) => (
                <button key={service.slug} onClick={() => handleSelectService(service.slug)} className="group relative bg-white rounded-2xl shadow-md hover:shadow-xl border border-gray-100 overflow-hidden transition-all duration-300 hover:-translate-y-1 text-left">
                  <div className="h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-amber-500" />
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm">
                        <span className="text-3xl">{service.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{service.name}</h3>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{service.description}</p>
                      </div>
                    </div>
                    <div className="mt-5 pt-4 border-t border-gray-100">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 group-hover:text-blue-700">
                        View Pricing
                        <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {selectedService && (
          <div>
            <button onClick={() => setSelectedService(null)} className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back to Services
            </button>

            {loadingPlans ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="spinner mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading plan details...</p>
                </div>
              </div>
            ) : selectedService === 'coaching-classes' ? (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">Coaching Fees — Advisor Pricing</h2>
                  <p className="mt-1 text-gray-500 text-lg max-w-2xl">This advisor&apos;s selling prices for each coaching class.</p>
                </div>

                {!pricing && (
                  <div className="mb-8 bg-amber-50/80 backdrop-blur border border-amber-200 rounded-2xl p-5">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-amber-900">Pricing Not Available</p>
                        <p className="text-sm text-amber-700 mt-0.5">This advisor has not set pricing yet.</p>
                      </div>
                    </div>
                  </div>
                )}

                <CoachingClassCards plans={getServicePlans(selectedService)} pricing={pricing} />

                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-5">
                  <p className="text-sm text-blue-800">
                    <strong>All coaching classes include:</strong> Study Material, Session Recordings, and dedicated mock tests as listed per program.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white rounded-2xl p-8 mb-8 relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full" />
                  <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-indigo-500/10 rounded-full" />
                  <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight relative">{selectedServiceInfo?.name} — Advisor Pricing</h2>
                  <p className="mt-2 text-blue-200 text-lg max-w-2xl relative">This advisor&apos;s selling prices for each plan.</p>
                </div>

                <ServicePlanDetailsView
                  features={getServiceFeatures(selectedService)}
                  pricing={pricing}
                  plans={getServicePlans(selectedService)}
                  serviceName={selectedServiceInfo?.name || ''}
                  showPricing={true}
                  noPricingMessage="This advisor has not set pricing yet."
                />
              </>
            )}
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
