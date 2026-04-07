'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, servicePlanAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import CounselorLayout from '@/components/CounselorLayout';
import ServicePlanDetailsView from '@/components/ServicePlanDetailsView';
import CoachingClassCards from '@/components/CoachingClassCards';
import { getServicePlans, getServiceFeatures } from '@/config/servicePlans';
import toast, { Toaster } from 'react-hot-toast';

const availableServices = [
  {
    slug: 'study-abroad',
    name: 'Study Abroad',
    description: 'Comprehensive support for international education with expert guidance at every step.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    slug: 'coaching-classes',
    name: 'Coaching Classes',
    description: 'Expert coaching for IELTS, GRE, GMAT, SAT, PTE and language courses with study material and recordings.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
];

export default function CounselorServicePlansPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [pricing, setPricing] = useState<Record<string, number> | null>(null);
  const [pricingMessage, setPricingMessage] = useState('');
  const [loadingPlans, setLoadingPlans] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const profileRes = await authAPI.getProfile();
        const userData = profileRes.data.data.user;
        if (userData.role !== USER_ROLE.COUNSELOR) {
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
    setPricingMessage('');

    try {
      const pricingRes = await servicePlanAPI.getPricing(slug);
      const pricingData = pricingRes.data.data;
      if (pricingData.pricing) {
        setPricing(pricingData.pricing);
      } else {
        setPricingMessage(pricingData.message || 'Pricing not available yet');
      }
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
    <CounselorLayout user={user}>
      <Toaster position="top-right" />
      <div className="p-6 lg:p-8">
        {!selectedService && (
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Service Plans</h1>
            <p className="text-gray-500 mt-1">Browse available service plans and compare features across tiers with your admin&apos;s pricing.</p>
          </div>
        )}

        {!selectedService && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableServices.map((service) => (
              <button
                key={service.slug}
                onClick={() => handleSelectService(service.slug)}
                className="group relative bg-white rounded-2xl shadow-md hover:shadow-xl border border-gray-100 overflow-hidden transition-all duration-300 hover:-translate-y-1 text-left"
              >
                <div className="h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-amber-500" />
                <div className="p-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    {service.icon}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{service.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{service.description}</p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 group-hover:text-blue-700">
                    View Plans & Pricing
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </button>
            ))}
          </div>
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
                {/* Coaching Classes Header */}
                <div className="mb-8">
                  <h2 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">Coaching Classes</h2>
                  <p className="mt-1 text-gray-500 text-lg max-w-2xl">Compare features and pricing across all coaching classes.</p>
                </div>

                {!pricing && (
                  <div className="mb-8 bg-amber-50/80 backdrop-blur border border-amber-200 rounded-2xl p-5">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-amber-900">Pricing Not Available</p>
                        <p className="text-sm text-amber-700 mt-0.5">{pricingMessage || 'Your admin has not set pricing yet.'}</p>
                      </div>
                    </div>
                  </div>
                )}

                <CoachingClassCards
                  plans={getServicePlans(selectedService)}
                  pricing={pricing}
                />

                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-5">
                  <p className="text-sm text-blue-800">
                    <strong>All coaching classes include:</strong> Study Material, Session Recordings, and dedicated mock tests as listed per program.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white rounded-2xl p-8 mb-8 relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full" />
                  <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-indigo-500/10 rounded-full" />
                  <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight relative">{selectedServiceInfo?.name} Plans</h2>
                  <p className="mt-2 text-blue-200 text-lg max-w-2xl relative">Compare features and pricing across all plan tiers.</p>
                </div>

                <ServicePlanDetailsView
                  features={getServiceFeatures(selectedService)}
                  pricing={pricing}
                  plans={getServicePlans(selectedService)}
                  serviceName={selectedServiceInfo?.name || ''}
                  showPricing={true}
                  noPricingMessage={pricingMessage || 'Your admin has not set pricing yet.'}
                />
              </>
            )}
          </div>
        )}
      </div>
    </CounselorLayout>
  );
}
