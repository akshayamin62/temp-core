'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authAPI, servicePlanAPI } from '@/lib/api';
import { User } from '@/types';
import CoachingClassCards from '@/components/CoachingClassCards';
import { getServicePlans } from '@/config/servicePlans';
import toast, { Toaster } from 'react-hot-toast';

function CoachingClassesPlansContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const adminId = searchParams.get('a') || searchParams.get('adminId');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState<Record<string, number> | null>(null);
  const plans = getServicePlans('coaching-classes');

  useEffect(() => {
    const init = async () => {
      try {
        const profileRes = await authAPI.getProfile();
        setUser(profileRes.data.data.user);

        const [pricingRes] = await Promise.all([
          adminId
            ? servicePlanAPI.getAdminPricingById('coaching-classes', adminId)
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
        <div className="max-w-7xl mx-auto px-6 py-8 lg:px-8">
          <button onClick={() => router.back()} className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back
          </button>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">Coaching Classes Plans</h1>
          <p className="mt-1 text-gray-500 text-lg max-w-2xl">Expert coaching for IELTS, GRE, GMAT, SAT, PTE &amp; language courses.</p>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
          {/* No pricing warning */}
          {!pricing && (
            <div className="mb-8 bg-amber-50/80 backdrop-blur border border-amber-200 rounded-2xl p-5">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-900">Pricing Not Available</p>
                  <p className="text-sm text-amber-700 mt-0.5">{adminId ? 'Admin has not set pricing yet.' : 'No admin selected.'} You can still browse plan details below.</p>
                </div>
              </div>
            </div>
          )}

          <CoachingClassCards plans={plans} pricing={pricing} />

          {/* Common inclusions note */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <p className="text-sm text-blue-800">
              <strong>All coaching classes include:</strong> Study Material, Session Recordings, and dedicated mock tests as listed per program.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default function CoachingClassesPlansPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-center"><div className="spinner mx-auto mb-4"></div><p className="text-gray-600">Loading...</p></div></div>}>
      <CoachingClassesPlansContent />
    </Suspense>
  );
}
