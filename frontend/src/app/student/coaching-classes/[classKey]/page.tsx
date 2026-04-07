'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, servicePlanAPI, coachingBatchAPI, serviceAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import { CoachingClassesLayout } from '@/components/layouts';
import BatchSelectModal from '@/components/BatchSelectModal';
import { getServicePlans, PlanConfig } from '@/config/servicePlans';
import toast, { Toaster } from 'react-hot-toast';

function BlueCheck() {
  return (
    <svg className="w-5 h-5 text-blue-600 shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  );
}

export default function CoachingClassDetailPage() {
  const router = useRouter();
  const params = useParams();
  const classKey = params.classKey as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState<Record<string, number> | null>(null);
  const [registering, setRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [classTiming, setClassTiming] = useState<{ batchDate: string; timeFrom: string; timeTo: string } | null>(null);
  const [batchSelectOpen, setBatchSelectOpen] = useState(false);

  const plans = getServicePlans('coaching-classes');
  const plan = plans.find((p) => p.key === classKey);

  useEffect(() => {
    const init = async () => {
      try {
        const response = await authAPI.getProfile();
        const userData = response.data.data.user;
        if (userData.role !== USER_ROLE.STUDENT) {
          router.push('/');
          return;
        }
        setUser(userData);

        const [pricingRes, servicesRes] = await Promise.all([
          servicePlanAPI.getPricing('coaching-classes'),
          serviceAPI.getMyServices(),
        ]);

        const p = pricingRes.data.data.pricing;
        if (p) setPricing(p);

        const regs = servicesRes.data.data.registrations || [];
        for (const reg of regs) {
          const svc = typeof reg.serviceId === 'object' ? reg.serviceId : null;
          if (svc?.slug === 'coaching-classes' && reg.planTier === classKey) {
            setIsRegistered(true);
            setClassTiming(reg.classTiming || null);
            break;
          }
        }
      } catch {
        toast.error('Please login to continue');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [classKey, router]);

  const handleRegisterClick = async () => {
    try {
      const res = await coachingBatchAPI.getBatches(classKey);
      const batches = res.data.data.batches || [];
      if (batches.length > 0) {
        setBatchSelectOpen(true);
      } else {
        toast.error('No batches available for this class. Please check back later.');
      }
    } catch {
      toast.error('Failed to load batches. Please try again.');
    }
  };

  const handleRegister = async (timing: { batchDate: string; timeFrom: string; timeTo: string }) => {
    setRegistering(true);
    try {
      await servicePlanAPI.register('coaching-classes', classKey, timing);
      toast.success('Successfully registered!');
      setBatchSelectOpen(false);
      setIsRegistered(true);
      setClassTiming(timing);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center"><div className="spinner mx-auto mb-4"></div><p className="text-gray-600">Loading...</p></div>
      </div>
    );
  }

  if (!plan) {
    return (
      <CoachingClassesLayout user={user} serviceName="Coaching Classes">
        <div className="p-6 lg:p-8">
          <button onClick={() => router.back()} className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back
          </button>
          <p className="text-gray-500">Class not found.</p>
        </div>
      </CoachingClassesLayout>
    );
  }

  const price = pricing?.[plan.key];
  const parts = plan.subtitle?.split('\u2022').map(s => s.trim()) || [];
  const sessionInfo = parts[0] || '';
  const mockInfo = parts[1] ? `${parts[1]} Included` : '';

  const formatTimingDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <CoachingClassesLayout user={user} serviceName="Coaching Classes">
      <Toaster position="top-right" />
      <div className="bg-gradient-to-b from-slate-50 via-white to-slate-50 min-h-[calc(100vh-5rem)]">
        <div className="px-6 lg:px-8 py-8">
          <button onClick={() => router.push('/student/coaching-classes/plans')} className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to All Classes
          </button>
        </div>

        <div className="px-6 lg:px-8 pb-10 max-w-3xl">
          {/* Plan Header Card */}
          <div className={`rounded-2xl border-2 overflow-hidden shadow-lg ${plan.borderColor} bg-white`}>
            <div className={`${plan.headerGradient} px-8 py-8 text-white relative overflow-hidden`}>
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
              <h1 className="text-3xl font-extrabold tracking-tight">{plan.name}</h1>
              {price != null ? (
                <div className="mt-3">
                  <span className="text-4xl font-black">₹{price.toLocaleString('en-IN')}</span>
                </div>
              ) : (
                <p className="mt-3 text-white/50">Price not set yet</p>
              )}
            </div>

            <div className="p-8">
              {/* Features */}
              <h2 className="text-lg font-bold text-gray-900 mb-4">What&apos;s Included</h2>
              <ul className="space-y-3 mb-8">
                {sessionInfo && (
                  <li className="flex items-center gap-3 text-gray-700">
                    <BlueCheck /><span>{sessionInfo}</span>
                  </li>
                )}
                {mockInfo && (
                  <li className="flex items-center gap-3 text-gray-700">
                    <BlueCheck /><span>{mockInfo}</span>
                  </li>
                )}
                <li className="flex items-center gap-3 text-gray-700">
                  <BlueCheck /><span>Study Material</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <BlueCheck /><span>Session Recordings</span>
                </li>
              </ul>

              {/* Registration */}
              {isRegistered ? (
                <div>
                  <div className="w-full py-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-semibold text-center flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    Registered
                  </div>
                  {classTiming && (
                    <div className="mt-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-sm font-semibold text-gray-700">Your Batch Timing</p>
                      <p className="text-sm text-gray-500 mt-0.5">{formatTimingDate(classTiming.batchDate)} &bull; {classTiming.timeFrom} to {classTiming.timeTo}</p>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleRegisterClick}
                  disabled={registering || price == null}
                  className="w-full py-3.5 bg-blue-600 text-white rounded-full font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {registering ? (
                    <span className="inline-flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Registering...</span>
                  ) : 'Register Now'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {batchSelectOpen && (
        <BatchSelectModal
          isOpen={true}
          onClose={() => setBatchSelectOpen(false)}
          planKey={classKey}
          planName={plan.name}
          onSelectBatch={(timing) => handleRegister(timing)}
          registering={registering}
        />
      )}
    </CoachingClassesLayout>
  );
}
