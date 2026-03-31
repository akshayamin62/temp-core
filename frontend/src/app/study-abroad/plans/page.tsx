'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authAPI, servicePlanAPI } from '@/lib/api';
import { User } from '@/types';
import ServicePlanDetailsView from '@/components/ServicePlanDetailsView';
import { getServicePlans, getServiceFeatures } from '@/config/servicePlans';
import toast, { Toaster } from 'react-hot-toast';

function ViewStudyAbroadPlansContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const adminId = searchParams.get('a') || searchParams.get('adminId');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState<Record<string, number> | null>(null);
  const plans = getServicePlans('study-abroad');
  const features = getServiceFeatures('study-abroad');

  useEffect(() => {
    const init = async () => {
      try {
        const profileRes = await authAPI.getProfile();
        setUser(profileRes.data.data.user);

        const [pricingRes] = await Promise.all([
          adminId
            ? servicePlanAPI.getAdminPricingById('study-abroad', adminId)
            : Promise.resolve({ data: { data: { pricing: null } } }),
        ]);

        const p = pricingRes.data.data.pricing;
        if (p) setPricing(p);
      } catch {
        toast.error('Please login to continue');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [adminId, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading plans...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-blue-500/10 rounded-full" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-500/10 rounded-full" />
          <div className="max-w-7xl mx-auto px-6 py-10 lg:px-8 relative">
            <button onClick={() => router.back()} className="mb-4 inline-flex items-center gap-1.5 text-sm text-blue-200 hover:text-white transition-colors font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back
            </button>
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight">Study Abroad Plans</h1>
            <p className="mt-2 text-blue-200 text-lg max-w-2xl">Compare features and pricing across all plan tiers.</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
          <ServicePlanDetailsView
            features={features}
            pricing={pricing}
            plans={plans}
            serviceName="Study Abroad"
            showPricing={true}
            noPricingMessage={adminId ? 'Admin has not set pricing yet.' : 'No admin selected.'}
          />
        </div>
      </div>
    </>
  );
}

export default function ViewStudyAbroadPlansPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-center"><div className="spinner mx-auto mb-4"></div><p className="text-gray-600">Loading...</p></div></div>}>
      <ViewStudyAbroadPlansContent />
    </Suspense>
  );
}
