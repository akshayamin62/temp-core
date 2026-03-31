'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, servicePlanAPI, coachingBatchAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import CoachingClassCards, { BatchData } from '@/components/CoachingClassCards';
import { getServicePlans } from '@/config/servicePlans';
import toast, { Toaster } from 'react-hot-toast';

export default function SuperAdminCoachingClassesPricingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState<Record<string, number> | null>(null);
  const plans = getServicePlans('coaching-classes');

  // Batch management state
  const [batches, setBatches] = useState<BatchData[]>([]);

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
        await fetchPricing();
        await fetchBatches();
      } catch {
        toast.error('Please login to continue');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  const fetchPricing = async () => {
    try {
      const res = await servicePlanAPI.getSuperAdminPricing('coaching-classes');
      const p = res.data.data.pricing;
      if (p) setPricing(p);
    } catch (error: any) {
      console.error('Failed to fetch pricing:', error);
    }
  };

  const fetchBatches = async () => {
    try {
      const res = await coachingBatchAPI.getAllBatches();
      setBatches(res.data.data.batches || []);
    } catch (error: any) {
      console.error('Failed to fetch batches:', error);
    }
  };

  const handleAddBatch = async (planKey: string, data: { batchDate: string; timeFrom: string; timeTo: string }) => {
    await coachingBatchAPI.createBatch({ planKey, ...data });
    toast.success('Batch added!');
    await fetchBatches();
  };

  const handleEditBatch = async (batchId: string, data: { batchDate: string; timeFrom: string; timeTo: string }) => {
    await coachingBatchAPI.updateBatch(batchId, data);
    toast.success('Batch updated!');
    await fetchBatches();
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (!confirm('Delete this batch?')) return;
    await coachingBatchAPI.deleteBatch(batchId);
    toast.success('Batch deleted');
    await fetchBatches();
  };

  const handlePriceEdit = async (planKey: string, price: number) => {
    const currentPrices = pricing ? { ...pricing } : {};
    currentPrices[planKey] = price;
    try {
      const res = await servicePlanAPI.setSuperAdminPricing('coaching-classes', currentPrices);
      setPricing(res.data.data.pricing);
      toast.success('Price updated!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update price');
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

  return (
    <SuperAdminLayout user={user}>
      <Toaster position="top-right" />
      <div className="bg-gradient-to-b from-slate-50 via-white to-slate-50 min-h-[calc(100vh-5rem)]">
        {/* Header */}
        <div className="px-6 lg:px-8 py-8">
          <button onClick={() => router.push('/super-admin/service-pricing')} className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Service Pricing
          </button>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">Coaching Fees — Base Pricing</h1>
          <p className="text-gray-500 mt-1 max-w-2xl">Set the base (cost) price for each coaching class. Admins will see this when setting their selling prices.</p>
        </div>

        <div className="p-6 lg:p-8">
          {/* Plan Cards with Batch Management */}
          <div>
            <CoachingClassCards
              plans={plans}
              pricing={pricing}
              batches={batches}
              onAddBatch={handleAddBatch}
              onEditBatch={handleEditBatch}
              onDeleteBatch={handleDeleteBatch}
              onPriceEdit={handlePriceEdit}
            />
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
