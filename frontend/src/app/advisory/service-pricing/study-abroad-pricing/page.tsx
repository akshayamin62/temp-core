'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, servicePlanAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import AdvisoryLayout from '@/components/AdvisoryLayout';
import ServicePlanDetailsView from '@/components/ServicePlanDetailsView';
import { getServicePlans, getServiceFeatures } from '@/config/servicePlans';
import toast, { Toaster } from 'react-hot-toast';

export default function AdvisoryStudyAbroadPricingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pricing, setPricing] = useState<Record<string, number> | null>(null);
  const [basePricing, setBasePricing] = useState<Record<string, number> | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const plans = getServicePlans('study-abroad');
  const features = getServiceFeatures('study-abroad');

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;
      if (userData.role !== USER_ROLE.ADVISORY) { toast.error('Access denied.'); router.push('/'); return; }
      setUser(userData);
      await fetchPricing();
    } catch { toast.error('Please login to continue'); router.push('/login'); }
    finally { setLoading(false); }
  };

  const fetchPricing = async () => {
    try {
      const pricingRes = await servicePlanAPI.getAdminPricing('study-abroad');
      const p = pricingRes.data.data.pricing;
      if (p) {
        setPricing(p);
        const fd: Record<string, string> = {};
        for (const [key, val] of Object.entries(p)) fd[key] = String(val);
        setFormData(fd);
      }
    } catch (error: any) { console.error('Failed to fetch pricing:', error); }
    try {
      const baseRes = await servicePlanAPI.getBasePricingForAdmin('study-abroad');
      const bp = baseRes.data.data.basePricing;
      if (bp) setBasePricing(bp);
    } catch (error: any) { console.error('Failed to fetch base pricing:', error); }
  };

  const handleSave = async () => {
    const prices: Record<string, number> = {};
    for (const plan of plans) {
      const val = Number(formData[plan.key]);
      if (isNaN(val) || val < 0) { toast.error(`Invalid price for ${plan.name}.`); return; }
      prices[plan.key] = val;
    }
    setSaving(true);
    try {
      const res = await servicePlanAPI.setAdminPricing('study-abroad', prices);
      setPricing(res.data.data.pricing);
      toast.success('Pricing updated successfully!');
    } catch (error: any) { toast.error(error.response?.data?.message || 'Failed to update pricing'); }
    finally { setSaving(false); }
  };

  if (loading || !user) {
    return (<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div><p className="text-gray-600">Loading...</p></div></div>);
  }

  return (
    <AdvisoryLayout user={user}>
      <Toaster position="top-right" />
      <div className="bg-gradient-to-b from-slate-50 via-white to-slate-50 min-h-[calc(100vh-5rem)]">
        <div className="px-6 lg:px-8 py-8 relative">
          <button onClick={() => router.push('/advisory/service-pricing')} className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Service Pricing
          </button>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">Study Abroad Pricing</h1>
          <p className="text-gray-500 mt-1 max-w-2xl">Set the selling prices for your students&apos; Study Abroad plans.</p>
        </div>

        <div className="p-6 lg:p-8">
          {basePricing && (
            <div className="mb-6 bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">CORE Platform Base Price</h3>
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${plans.length}, minmax(0, 1fr))` }}>
                {plans.map((plan) => (
                  <div key={plan.key} className="text-center">
                    <p className={`text-xs font-bold ${plan.textColor} uppercase mb-1`}>{plan.name}</p>
                    <p className="text-xl font-extrabold text-slate-800">₹{basePricing[plan.key]?.toLocaleString('en-IN') ?? '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pricing && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              {plans.map((plan) => {
                const sellingPrice = pricing[plan.key] ?? 0;
                const basePrice = basePricing ? (basePricing[plan.key] ?? 0) : 0;
                const profit = basePricing ? sellingPrice - basePrice : null;
                return (
                  <div key={plan.key} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-slate-200 p-6 relative overflow-hidden">
                    <div className={`absolute top-0 left-0 right-0 h-1.5 ${plan.badgeBg}`} />
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-11 h-11 ${plan.iconBg} ${plan.iconText} rounded-xl flex items-center justify-center shadow-sm`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                      </div>
                      <span className={`text-xs font-bold ${plan.textColor} uppercase tracking-wider bg-white px-3 py-1 rounded-full border ${plan.borderColor}`}>{plan.name}</span>
                    </div>
                    <p className="text-4xl font-extrabold text-gray-900">₹{sellingPrice.toLocaleString('en-IN')}</p>
                    <p className="text-sm text-gray-500 mt-1">Your selling price</p>
                    {profit !== null && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className={`text-sm font-semibold ${profit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                          {profit >= 0 ? '↑' : '↓'} Your Margin: ₹{Math.abs(profit).toLocaleString('en-IN')}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 lg:p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-6">{pricing ? 'Update Selling Price' : 'Set Selling Price'}</h2>
            <div className="space-y-5">
              {plans.map((plan) => {
                const inputVal = Number(formData[plan.key]) || 0;
                const basePrice = basePricing ? (basePricing[plan.key] ?? null) : null;
                const profit = basePrice !== null && inputVal > 0 ? inputVal - basePrice : null;
                return (
                  <div key={plan.key}>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{plan.name} Plan Selling Price (₹)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                      <input type="number" min="0" step="1" value={formData[plan.key] || ''} onChange={(e) => setFormData({ ...formData, [plan.key]: e.target.value })} placeholder="Enter selling price" className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900" />
                    </div>
                    {basePrice !== null && (
                      <div className="mt-1.5 flex items-center gap-3 text-xs">
                        <span className="text-gray-500">Base: ₹{basePrice.toLocaleString('en-IN')}</span>
                        {profit !== null && (
                          <span className={`font-semibold ${profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            Your Margin: {profit >= 0 ? '+' : ''}₹{profit.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button onClick={handleSave} disabled={saving || plans.some(p => !formData[p.key])} className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {saving ? 'Saving...' : pricing ? 'Update Pricing' : 'Save Pricing'}
              </button>
              {!pricing && <p className="text-sm text-amber-600">Students will not see any pricing until you set it here.</p>}
            </div>
          </div>

          <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 shadow-sm">
            <div className="flex gap-3">
              <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-800">How pricing works</p>
                <p className="text-sm text-blue-700 mt-1">The <strong>base price</strong> is what you pay to the platform (set by Super Admin). The <strong>selling price</strong> you set here is what your students see. The difference is your profit margin.</p>
              </div>
            </div>
          </div>

          {features.length > 0 && (
            <div className="mt-10">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Study Abroad Plan Details</h2>
                <p className="text-sm text-gray-500 mt-1">This is what your students will see when browsing plans.</p>
              </div>
              <ServicePlanDetailsView features={features} pricing={pricing} plans={plans} serviceName="Study Abroad" showPricing={false} />
            </div>
          )}
        </div>
      </div>
    </AdvisoryLayout>
  );
}
