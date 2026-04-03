'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, serviceAPI, servicePlanAPI, paymentAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import ServicePlanDetailsView from '@/components/ServicePlanDetailsView';
import { getServicePlans, getServiceFeatures } from '@/config/servicePlans';
import toast, { Toaster } from 'react-hot-toast';

const PLAN_HIERARCHY: Record<string, number> = { PRO: 0, PREMIUM: 1, PLATINUM: 2 };

export default function StudentStudyAbroadPlansPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState<Record<string, number> | null>(null);
  const [discounts, setDiscounts] = useState<Record<string, { type: string; value: number; calculatedAmount: number; reason?: string }> | null>(null);
  const [registering, setRegistering] = useState<string | null>(null);
  const [currentPlanTier, setCurrentPlanTier] = useState<string | null>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  const plans = getServicePlans('study-abroad');
  const features = getServiceFeatures('study-abroad');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authAPI.getProfile();
        const userData = response.data.data.user;
        if (userData.role !== USER_ROLE.STUDENT) {
          router.push('/dashboard');
          return;
        }
        setUser(userData);
        await fetchData();
      } catch {
        toast.error('Please login to continue');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  const fetchData = async () => {
    try {
      const [pricingRes, servicesRes] = await Promise.all([
        servicePlanAPI.getPricing('study-abroad'),
        serviceAPI.getMyServices(),
      ]);
      const p = pricingRes.data.data.pricing;
      if (p) setPricing(p);
      if (pricingRes.data.data.discounts) setDiscounts(pricingRes.data.data.discounts);

      // Find current Study Abroad registration
      const regs = servicesRes.data.data.registrations || [];
      const saReg = regs.find((r: any) => {
        const svc = typeof r.serviceId === 'object' ? r.serviceId : null;
        return svc && (svc.slug === 'study-abroad');
      });
      if (saReg?.planTier) setCurrentPlanTier(saReg.planTier);
    } catch (error: any) {
      console.error('Failed to load plan data:', error);
    }
  };

  const handleRegister = async (planKey: string) => {
    setRegistering(planKey);
    try {
      const orderRes = await paymentAPI.createRegistrationOrder('study-abroad', planKey);
      const orderData = orderRes.data.data;

      if (!window.Razorpay) {
        toast.error('Payment gateway is loading. Please try again.');
        return;
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Kareer Studio',
        description: `Registration - Study Abroad ${planKey}`,
        order_id: orderData.orderId,
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          setVerifyingPayment(true);
          try {
            const verifyRes = await paymentAPI.verifyRegistrationPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (verifyRes.data.success) {
              toast.success('Payment successful! You are now registered.');
              await fetchData();
              router.push('/student/payment');
            } else {
              toast.error('Payment verification failed');
            }
          } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Payment verification failed');
          } finally {
            setVerifyingPayment(false);
          }
        },
        prefill: user ? { name: [user.firstName, user.lastName].filter(Boolean).join(' '), email: user.email } : {},
        theme: { color: '#2959ba' },
        modal: {
          ondismiss: () => {
            toast('Payment cancelled. Registration not completed.', { icon: '⚠️' });
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        toast.error(response.error?.description || 'Payment failed');
      });
      rzp.open();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to initiate payment');
    } finally {
      setRegistering(null);
    }
  };

  const handleUpgrade = async (planKey: string) => {
    setRegistering(planKey);
    try {
      const orderRes = await paymentAPI.createUpgradeOrder('study-abroad', planKey);
      const orderData = orderRes.data.data;

      if (!window.Razorpay) {
        toast.error('Payment gateway is loading. Please try again.');
        return;
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Kareer Studio',
        description: `Upgrade to ${planKey} - ₹${orderData.amountInr.toLocaleString('en-IN')} (difference)`,
        order_id: orderData.orderId,
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          setVerifyingPayment(true);
          try {
            const verifyRes = await paymentAPI.verifyUpgradePayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (verifyRes.data.success) {
              toast.success(`Successfully upgraded to ${planKey}! Payment received.`);
              await fetchData();
              router.push('/student/payment');
            } else {
              toast.error('Upgrade payment verification failed');
            }
          } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Upgrade payment verification failed');
          } finally {
            setVerifyingPayment(false);
          }
        },
        prefill: user ? { name: [user.firstName, user.lastName].filter(Boolean).join(' '), email: user.email } : {},
        theme: { color: '#2959ba' },
        modal: {
          ondismiss: () => {
            toast('Payment cancelled. Plan not upgraded.', { icon: '⚠️' });
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        toast.error(response.error?.description || 'Upgrade payment failed');
      });
      rzp.open();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to initiate upgrade payment');
    } finally {
      setRegistering(null);
    }
  };

  const getUpgradePriceDiff = (planKey: string): number | null => {
    if (!currentPlanTier || !pricing) return null;
    const currentBase = pricing[currentPlanTier];
    const targetBase = pricing[planKey];
    if (currentBase == null || targetBase == null) return null;
    const currentDiscount = discounts?.[currentPlanTier]?.calculatedAmount || 0;
    const targetDiscount = discounts?.[planKey]?.calculatedAmount || 0;
    const currentNet = currentBase - currentDiscount;
    const targetNet = targetBase - targetDiscount;
    return targetNet - currentNet;
  };

  const isUpgrade = (planKey: string): boolean => {
    if (!currentPlanTier) return false;
    return (PLAN_HIERARCHY[planKey] ?? -1) > (PLAN_HIERARCHY[currentPlanTier] ?? -1);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center"><div className="spinner mx-auto mb-4"></div><p className="text-gray-600">Loading...</p></div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      {verifyingPayment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 text-center shadow-2xl">
            <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-900">Verifying Payment...</p>
            <p className="text-sm text-gray-500 mt-1">Please wait while we confirm your payment.</p>
          </div>
        </div>
      )}
      <div className="bg-gradient-to-b from-slate-50 via-white to-slate-50 min-h-[calc(100vh-5rem)]">
        {/* Header */}
        <div className="px-6 lg:px-8 py-8">
          <button onClick={() => router.back()} className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back
          </button>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">Study Abroad Plans</h1>
          <p className="text-gray-500 mt-1 max-w-2xl">
            {currentPlanTier
              ? `You are on the ${currentPlanTier} plan. Upgrade to unlock more features.`
              : 'Choose the plan that fits your journey. Each plan includes expert guidance at every step.'}
          </p>
        </div>

        <div className="p-6 lg:p-8">
          {/* Installment plan notice */}
          <div className="mb-6 flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-3">
            <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-sm text-blue-700">Your payments are split into <strong>3 installments (50% / 30% / 20%)</strong>. All prices are exclusive of <strong>18% GST</strong>. First 50% is due at registration.</p>
          </div>

          {/* Plan Cards */}
          <div className={`grid gap-6 mb-10 ${plans.length <= 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
            {plans.map((plan) => {
              const isCurrent = currentPlanTier === plan.key;
              const canUpgrade = isUpgrade(plan.key);
              const priceDiff = getUpgradePriceDiff(plan.key);
              const isLowerPlan = currentPlanTier ? (PLAN_HIERARCHY[plan.key] ?? -1) < (PLAN_HIERARCHY[currentPlanTier] ?? -1) : false;

              return (
                <div key={plan.key} className={`relative rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border overflow-hidden ${isCurrent ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'}`}>
                  {!isCurrent && <div className={`h-1.5 ${plan.badgeBg}`} />}
                  {isCurrent && (
                    <div className="absolute top-4 right-4 z-10 px-3 py-1 bg-white text-blue-600 text-xs font-bold rounded-full shadow-md flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      Current Plan
                    </div>
                  )}
                  <div className="p-7">
                    <div className="mb-1">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isCurrent ? 'bg-white/20 text-white' : `${plan.badgeBg} text-white`}`}>{plan.name}</span>
                    </div>
                    {plan.subtitle && <p className={`text-xs uppercase font-semibold tracking-wide mb-4 ${isCurrent ? 'text-blue-200' : 'text-gray-400'}`}>{plan.subtitle}</p>}
                    {pricing?.[plan.key] != null ? (
                      <div className="mb-5">
                          {discounts?.[plan.key] ? (
                            <>
                              <p className={`text-lg line-through ${isCurrent ? 'text-blue-300' : 'text-gray-400'}`}>₹{pricing[plan.key].toLocaleString('en-IN')}</p>
                              <p className={`text-4xl font-extrabold ${isCurrent ? 'text-white' : 'text-gray-900'}`}>₹{(pricing[plan.key] - discounts[plan.key].calculatedAmount).toLocaleString('en-IN')}</p>
                              <p className={`text-xs font-semibold mt-1 ${isCurrent ? 'text-blue-200' : 'text-gray-600'}`}>
                                {discounts[plan.key].type === 'percentage' ? `${discounts[plan.key].value}% off` : `₹${discounts[plan.key].calculatedAmount.toLocaleString('en-IN')} off`}
                              </p>
                              {discounts[plan.key].reason && (
                                <p className={`text-xs mt-0.5 italic ${isCurrent ? 'text-blue-200' : 'text-gray-500'}`}>&ldquo;{discounts[plan.key].reason}&rdquo;</p>
                              )}
                            </>
                          ) : (
                            <p className={`text-4xl font-extrabold ${isCurrent ? 'text-white' : 'text-gray-900'}`}>₹{pricing[plan.key].toLocaleString('en-IN')}</p>
                          )}
                          <p className={`text-xs mt-1 ${isCurrent ? 'text-blue-200' : 'text-gray-400'}`}>+ 18% GST applicable</p>
                        {canUpgrade && priceDiff != null && priceDiff > 0 && (
                          <p className="text-sm text-emerald-600 font-semibold mt-2">
                            +₹{priceDiff.toLocaleString('en-IN')} upgrade difference
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="mb-5">
                        <p className={`text-lg font-medium ${isCurrent ? 'text-blue-200' : 'text-gray-400'}`}>Price not set</p>
                      </div>
                    )}

                    {/* Button logic */}
                    {isCurrent ? (
                      <button disabled className="w-full py-3 px-4 rounded-full font-bold text-blue-600 bg-white cursor-default">
                        Your Current Plan
                      </button>
                    ) : canUpgrade ? (
                      <button
                        onClick={() => handleUpgrade(plan.key)}
                        disabled={registering !== null || pricing?.[plan.key] == null}
                        className="w-full py-3 px-4 rounded-full font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700"
                      >
                        {registering === plan.key ? (
                          <span className="inline-flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Upgrading...</span>
                        ) : `Upgrade to ${plan.name}`}
                      </button>
                    ) : isLowerPlan ? (
                      <button disabled className="w-full py-3 px-4 rounded-full font-bold text-gray-400 bg-gray-100 cursor-not-allowed">
                        Lower Tier
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRegister(plan.key)}
                        disabled={registering !== null || pricing?.[plan.key] == null}
                        className="w-full py-3 px-4 rounded-full font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700"
                      >
                        {registering === plan.key ? (
                          <span className="inline-flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Registering...</span>
                        ) : 'Register Now'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Features Comparison */}
          {features.length > 0 && (
            <div>
              {/* <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Plan Features Comparison</h2>
                <p className="text-sm text-gray-500 mt-1">See what&apos;s included in each plan tier.</p>
              </div> */}
              <ServicePlanDetailsView features={features} pricing={pricing} plans={plans} serviceName="Study Abroad" showPricing={false} currentPlanTier={currentPlanTier} onRegister={handleRegister} onUpgrade={handleUpgrade} registeringPlan={registering} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
