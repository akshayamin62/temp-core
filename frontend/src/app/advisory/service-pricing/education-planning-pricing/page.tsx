'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, servicePlanAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import AdvisoryLayout from '@/components/AdvisoryLayout';
import { getServicePlans, getServiceFeatures } from '@/config/servicePlans';
import toast, { Toaster } from 'react-hot-toast';

function BlueCheck() {
  return (
    <svg className="w-5 h-5 text-blue-600 shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-3.5 h-3.5"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

function getFeatureLabel(area: string, val: string): string | null {
  if (!val || val === '✗') return null;
  if (val === '✓') return area;
  if (val.startsWith('✓')) {
    const extra = val.replace(/^✓\s*\+?\s*/, '').trim();
    return extra ? `${area} — ${extra}` : area;
  }
  return val;
}

export default function AdvisoryEducationPlanningPricingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState<Record<string, number> | null>(null);
  const [basePricing, setBasePricing] = useState<Record<string, number> | null>(null);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [priceValue, setPriceValue] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);
  const plans = getServicePlans('education-planning');
  const features = getServiceFeatures('education-planning');

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
      const pricingRes = await servicePlanAPI.getAdminPricing('education-planning');
      const p = pricingRes.data.data.pricing;
      if (p) setPricing(p);
    } catch (error: any) { console.error('Failed to fetch pricing:', error); }
    try {
      const baseRes = await servicePlanAPI.getBasePricingForAdmin('education-planning');
      const bp = baseRes.data.data.basePricing;
      if (bp) setBasePricing(bp);
    } catch (error: any) { console.error('Failed to fetch base pricing:', error); }
  };

  const handlePriceEdit = async (planKey: string, price: number) => {
    const currentPrices = pricing ? { ...pricing } : {};
    currentPrices[planKey] = price;
    try {
      const res = await servicePlanAPI.setAdminPricing('education-planning', currentPrices);
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
          <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">Education Planning Pricing</h1>
          <p className="text-gray-500 mt-1 max-w-2xl">Set the selling prices for your students&apos; Education Planning plans.</p>
        </div>

        <div className="p-6 lg:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const price = pricing?.[plan.key];
              const basePrice = basePricing?.[plan.key];
              const planFeatures = features
                .map(f => getFeatureLabel(f.area, f.values[plan.key]))
                .filter((label): label is string => label !== null);

              return (
                <div key={plan.key} className="bg-white p-7 rounded-2xl shadow-sm flex flex-col hover:shadow-md transition-shadow border border-slate-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  {plan.subtitle && <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide mb-4">{plan.subtitle}</p>}

                  {editingPrice === plan.key ? (
                    <div className="mb-5">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={priceValue}
                            onChange={(e) => setPriceValue(e.target.value)}
                            className="w-full pl-7 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            autoFocus
                          />
                        </div>
                        <button
                          onClick={async () => {
                            const val = Number(priceValue);
                            if (isNaN(val) || val < 0) return;
                            setSavingPrice(true);
                            try {
                              await handlePriceEdit(plan.key, val);
                              setEditingPrice(null);
                            } finally {
                              setSavingPrice(false);
                            }
                          }}
                          disabled={savingPrice || !priceValue}
                          className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        </button>
                        <button
                          onClick={() => setEditingPrice(null)}
                          className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                      {basePrice != null && (
                        <p className="text-xs text-gray-500 mt-1.5">Base: ₹{basePrice.toLocaleString('en-IN')}</p>
                      )}
                    </div>
                  ) : price != null ? (
                    <div className="mb-5">
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-extrabold text-gray-900">₹{price.toLocaleString('en-IN')}</p>
                        <button
                          onClick={() => { setEditingPrice(plan.key); setPriceValue(String(price)); }}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit price"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                      </div>
                      {basePrice != null && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Base: ₹{basePrice.toLocaleString('en-IN')}
                          {price - basePrice >= 0
                            ? <span className="text-blue-600 font-semibold ml-2">+₹{(price - basePrice).toLocaleString('en-IN')} margin</span>
                            : <span className="text-red-600 font-semibold ml-2">-₹{Math.abs(price - basePrice).toLocaleString('en-IN')} margin</span>
                          }
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mb-5">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-400">Price not set</p>
                        <button
                          onClick={() => { setEditingPrice(plan.key); setPriceValue(''); }}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Set price"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                      </div>
                      {basePrice != null && (
                        <p className="text-xs text-gray-500 mt-0.5">Base: ₹{basePrice.toLocaleString('en-IN')}</p>
                      )}
                    </div>
                  )}

                  <ul className="space-y-2.5 grow">
                    {planFeatures.map((label, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                        <BlueCheck />
                        <span>{label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
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
