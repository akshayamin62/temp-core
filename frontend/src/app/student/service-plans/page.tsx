'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, servicePlanAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import toast, { Toaster } from 'react-hot-toast';

const availableServices = [
  {
    slug: 'study-abroad',
    name: 'Study Abroad',
    description: 'Comprehensive support for international education with expert guidance at every step.',
    color: 'from-blue-500 via-blue-600 to-indigo-600',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    plansPage: '/student/study-abroad/plans',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    slug: 'education-planning',
    name: 'Education Planning',
    description: 'Personalized education planning with Brainography assessment, counseling sessions, and activity management.',
    color: 'from-purple-500 via-purple-600 to-indigo-600',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    plansPage: '/student/education-planning/plans',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
      </svg>
    ),
  },
  {
    slug: 'coaching-classes',
    name: 'Coaching Classes',
    description: 'Expert coaching for IELTS, GRE, GMAT, SAT, PTE and language courses.',
    color: 'from-teal-500 via-emerald-500 to-cyan-500',
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    plansPage: '/student/coaching-classes/plans',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
];

export default function StudentServicePlansPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pricingByService, setPricingByService] = useState<Record<string, Record<string, number> | null>>({});
  const [discountsByService, setDiscountsByService] = useState<Record<string, Record<string, { type: string; value: number; calculatedAmount: number; reason?: string }> | null>>({});

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authAPI.getProfile();
        const userData = response.data.data.user;
        if (userData.role !== USER_ROLE.STUDENT) {
          router.push('/');
          return;
        }
        setUser(userData);

        // Fetch pricing & discounts for all services (non-critical)
        try {
          const slugs = ['study-abroad', 'education-planning', 'coaching-classes'];
          const results = await Promise.allSettled(slugs.map(s => servicePlanAPI.getPricing(s)));
          const pMap: Record<string, Record<string, number> | null> = {};
          const dMap: Record<string, Record<string, { type: string; value: number; calculatedAmount: number; reason?: string }> | null> = {};
          slugs.forEach((slug, i) => {
            const r = results[i];
            if (r.status === 'fulfilled') {
              pMap[slug] = r.value.data.data.pricing || null;
              dMap[slug] = r.value.data.data.discounts || null;
            }
          });
          setPricingByService(pMap);
          setDiscountsByService(dMap);
        } catch {
          // Non-critical — page works without pricing data
        }
      } catch {
        toast.error('Please login to continue');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

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
      <div className="p-6 lg:p-8">
        <button onClick={() => router.back()} className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors">
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Return to Dashboard
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Service Plans</h1>
          <p className="text-gray-500 mt-1">Browse our services and choose the one that fits your goals.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableServices.map((service) => {
            const servicePricing = pricingByService[service.slug];
            const serviceDiscounts = discountsByService[service.slug];
            const prices = servicePricing ? Object.values(servicePricing).filter(v => v > 0) : [];
            const minPrice = prices.length > 0 ? Math.min(...prices) : null;
            const discountNotes = serviceDiscounts
              ? (Object.values(serviceDiscounts) as Array<{ type: string; value: number; calculatedAmount: number; reason?: string }>)
                  .filter(d => d?.reason)
                  .map(d => d.reason!)
              : [];
            return (
            <button
              key={service.slug}
              onClick={() => router.push(service.plansPage)}
              className="group relative bg-white rounded-2xl shadow-md hover:shadow-xl border border-gray-100 overflow-hidden transition-all duration-300 hover:-translate-y-1 text-left"
            >
              <div className={`h-1.5 bg-gradient-to-r ${service.color}`} />
              <div className="p-6">
                <div className={`w-12 h-12 ${service.iconBg} ${service.iconColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  {service.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{service.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                {minPrice != null && (
                  <p className="text-xs text-gray-500 font-medium mb-2">
                    From <span className="text-gray-700 font-semibold">₹{minPrice.toLocaleString('en-IN')}</span> <span className="text-gray-400">+ 18% GST</span>
                  </p>
                )}
                {discountNotes.length > 0 && (
                  <div className="mb-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs text-green-700 font-medium">★ {discountNotes[0]}</p>
                  </div>
                )}
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 group-hover:text-blue-700">
                  View Plans
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
