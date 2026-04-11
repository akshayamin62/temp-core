'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, servicePlanAPI, coachingBatchAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import AdvisoryLayout from '@/components/AdvisoryLayout';
import CoachingClassCards, { BatchData } from '@/components/CoachingClassCards';
import { getServicePlans } from '@/config/servicePlans';
import toast, { Toaster } from 'react-hot-toast';

export default function AdvisoryCoachingClassesPricingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState<Record<string, number> | null>(null);
  const [basePricing, setBasePricing] = useState<Record<string, number> | null>(null);
  const [batches, setBatches] = useState<BatchData[]>([]);
  const plans = getServicePlans('coaching-classes');

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;
      if (userData.role !== USER_ROLE.ADVISORY) { toast.error('Access denied.'); router.push('/'); return; }
      setUser(userData);
      await fetchPricing();
      await fetchBatches();
    } catch { toast.error('Please login to continue'); router.push('/login'); }
    finally { setLoading(false); }
  };

  const fetchPricing = async () => {
    try {
      const [pricingRes, baseRes] = await Promise.all([
        servicePlanAPI.getAdminPricing('coaching-classes'),
        servicePlanAPI.getBasePricingForAdmin('coaching-classes'),
      ]);
      const p = pricingRes.data.data.pricing;
      if (p) setPricing(p);
      const bp = baseRes.data.data.basePricing;
      if (bp) setBasePricing(bp);
    } catch (error: any) { console.error('Failed to fetch pricing:', error); }
  };

  const fetchBatches = async () => {
    try {
      const res = await coachingBatchAPI.getAllBatches();
      setBatches(res.data.data.batches || []);
    } catch { /* ignore */ }
  };

  const handlePriceEdit = async (planKey: string, price: number) => {
    const currentPrices = pricing ? { ...pricing } : {};
    currentPrices[planKey] = price;
    try {
      const res = await servicePlanAPI.setAdminPricing('coaching-classes', currentPrices);
      setPricing(res.data.data.pricing);
      toast.success('Price updated!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update price');
    }
  };

  if (loading || !user) {
    return (<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div><p className="text-gray-600">Loading...</p></div></div>);
  }

  return (
    <AdvisoryLayout user={user}>
      <Toaster position="top-right" />
      <div className="bg-gradient-to-b from-slate-50 via-white to-slate-50 min-h-[calc(100vh-5rem)]">
        <div className="px-6 lg:px-8 py-8">
          <button onClick={() => router.push('/advisory/service-pricing')} className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Service Pricing
          </button>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">Coaching Fees</h1>
          <p className="text-gray-500 mt-1 max-w-2xl">Set the selling prices for your students&apos; coaching classes.</p>
        </div>

        <div className="p-6 lg:p-8">
          <div>
            <CoachingClassCards
              plans={plans}
              pricing={pricing}
              batches={batches}
              onPriceEdit={handlePriceEdit}
              basePricing={basePricing}
            />
          </div>

          <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 shadow-sm">
            <div className="flex gap-3">
              <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-800">How pricing works</p>
                <p className="text-sm text-blue-700 mt-1">The <strong>base price</strong> is what you pay to the platform. The <strong>selling price</strong> you set is what your students see. The difference is your profit margin.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdvisoryLayout>
  );
}
