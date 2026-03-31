'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, servicePlanAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import ServicePlanDetailsView from '@/components/ServicePlanDetailsView';
import { getServicePlans, getServiceFeatures } from '@/config/servicePlans';
import toast, { Toaster } from 'react-hot-toast';

export default function SuperAdminStudyAbroadPricingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pricing, setPricing] = useState<Record<string, number> | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const plans = getServicePlans('study-abroad');
  const features = getServiceFeatures('study-abroad');

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
      const res = await servicePlanAPI.getSuperAdminPricing('study-abroad');
      const p = res.data.data.pricing;
      if (p) {
        setPricing(p);
        const fd: Record<string, string> = {};
        for (const [key, val] of Object.entries(p)) fd[key] = String(val);
        setFormData(fd);
      }
    } catch (error: any) {
      console.error('Failed to fetch pricing:', error);
    }
  };

  const handleSave = async () => {
    const prices: Record<string, number> = {};
    for (const plan of plans) {
      const val = Number(formData[plan.key]);
      if (isNaN(val) || val < 0) {
        toast.error(`Invalid price for ${plan.name}. Must be a non-negative number.`);
        return;
      }
      prices[plan.key] = val;
    }

    setSaving(true);
    try {
      const res = await servicePlanAPI.setSuperAdminPricing('study-abroad', prices);
      setPricing(res.data.data.pricing);
      toast.success('Base pricing updated successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update pricing');
    } finally {
      setSaving(false);
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
          <div className="px-6 lg:px-8 py-8 relative">
            <button onClick={() => router.push('/super-admin/service-pricing')} className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back to Service Pricing
            </button>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">Study Abroad — Base Pricing</h1>
            <p className="text-gray-500 mt-1 max-w-2xl">Set the base (cost) price for each plan tier. Admins will see this when setting their own selling price.</p>
          </div>
        <div className="p-6 lg:p-8">
          {/* Current Pricing */}
          {pricing && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              {plans.map((plan) => (
                <div key={plan.key} className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 ${plan.borderColor} p-6 relative overflow-hidden`}>
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-amber-500" />
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-11 h-11 ${plan.iconBg} ${plan.iconText} rounded-xl flex items-center justify-center shadow-sm`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                    </div>
                    <span className={`text-xs font-bold ${plan.textColor} uppercase tracking-wider bg-white px-3 py-1 rounded-full border ${plan.borderColor}`}>{plan.name}</span>
                  </div>
                  <p className="text-4xl font-extrabold text-gray-900">₹{pricing[plan.key]?.toLocaleString('en-IN') ?? '—'}</p>
                  <p className="text-sm text-gray-500 mt-1 font-medium">Base price</p>
                </div>
              ))}
            </div>
          )}

          {/* Pricing Form */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 lg:p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-6">{pricing ? 'Update Base Pricing' : 'Set Base Pricing'}</h2>
            <div className="space-y-5">
              {plans.map((plan) => (
                <div key={plan.key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{plan.name} Plan Base Price (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                    <input type="number" min="0" step="1" value={formData[plan.key] || ''} onChange={(e) => setFormData({ ...formData, [plan.key]: e.target.value })} placeholder="Enter base price" className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button onClick={handleSave} disabled={saving || plans.some(p => !formData[p.key])} className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {saving ? 'Saving...' : pricing ? 'Update Base Pricing' : 'Save Base Pricing'}
              </button>
              {!pricing && <p className="text-sm text-amber-600">Admins will not see any base pricing until you set it here.</p>}
            </div>
          </div>

          {/* Info Notes */}
          <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 shadow-sm">
            <div className="flex gap-3">
              <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-800">How base pricing works</p>
                <p className="text-sm text-blue-700 mt-1">The base price you set here is shown to admins as their cost price. Admins set their own selling price (which must be at or above the base price). The difference is the admin&apos;s profit margin.</p>
              </div>
            </div>
          </div>

          {/* Plan Features */}
          {features.length > 0 && (
            <div className="mt-10">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Study Abroad Plan Details</h2>
                <p className="text-sm text-gray-500 mt-1">Complete feature comparison across all plan tiers.</p>
              </div>
              <ServicePlanDetailsView features={features} pricing={pricing} plans={plans} serviceName="Study Abroad" showPricing={false} />
            </div>
          )}
        </div>
      </div>
    </SuperAdminLayout>
  );
}
