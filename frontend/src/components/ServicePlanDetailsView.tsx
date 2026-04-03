'use client';

import { PlanConfig, ServiceFeature } from '@/config/servicePlans';

interface ServicePlanDetailsViewProps {
  features: ServiceFeature[];
  pricing?: Record<string, number> | null;
  plans: PlanConfig[];
  serviceName: string;
  showPricing?: boolean;
  noPricingMessage?: string;
  discounts?: Record<string, { type: string; value: number; calculatedAmount: number }>;
  // Optional registration actions for the comparison table
  currentPlanTier?: string | null;
  onRegister?: (planKey: string) => void;
  onUpgrade?: (planKey: string) => void;
  registeringPlan?: string | null;
}

function renderValue(val: string) {
  if (val === '✗') {
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 bg-red-100 rounded-full shadow-sm">
        <svg className="w-4.5 h-4.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </span>
    );
  }
  if (val === '✓') {
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full shadow-sm">
        <svg className="w-4.5 h-4.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (val.startsWith('✓ ')) {
    return (
      <span className="flex items-center gap-2 justify-center">
        <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full shrink-0 shadow-sm">
          <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <span className="text-sm text-gray-700 font-medium">{val.slice(2)}</span>
      </span>
    );
  }
  if (val.startsWith('✗ ')) {
    return (
      <span className="flex items-center gap-2 justify-center">
        <span className="inline-flex items-center justify-center w-6 h-6 bg-red-100 rounded-full shrink-0 shadow-sm">
          <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </span>
        <span className="text-sm text-gray-400">{val.slice(2)}</span>
      </span>
    );
  }
  return <span className="text-sm text-gray-700 font-medium">{val}</span>;
}

export default function ServicePlanDetailsView({
  features,
  pricing,
  plans,
  serviceName,
  showPricing = true,
  noPricingMessage,
  discounts,
  currentPlanTier,
  onRegister,
  onUpgrade,
  registeringPlan,
}: ServicePlanDetailsViewProps) {
  const gridCols = plans.length <= 3
    ? 'grid-cols-1 md:grid-cols-3'
    : plans.length <= 4
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

  return (
    <div className="w-full">
      {/* No pricing warning */}
      {showPricing && !pricing && (
        <div className="mb-8 bg-amber-50/80 backdrop-blur border border-amber-200 rounded-2xl p-5">
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">Pricing Not Available</p>
              <p className="text-sm text-amber-700 mt-0.5">{noPricingMessage || 'Pricing has not been set yet.'} You can still browse plan features below.</p>
            </div>
          </div>
        </div>
      )}

      {/* Plan Pricing Cards */}
      {showPricing && (
        <div className={`grid ${gridCols} gap-5 lg:gap-6 mb-10`}>
          {plans.map((plan) => {
            const price = pricing?.[plan.key];
            const disc = discounts?.[plan.key];
            const discountedPrice = price != null && disc ? price - disc.calculatedAmount : null;
            return (
              <div
                key={plan.key}
                className="relative rounded-2xl border border-slate-200 overflow-hidden transition-all duration-300 hover:shadow-md bg-white shadow-sm"
              >
                <div className={`h-1.5 ${plan.badgeBg}`} />
                <div className="px-5 py-5 text-center">
                  <span className={`inline-block px-3.5 py-1 ${plan.badgeBg} text-white rounded-full text-xs font-bold uppercase tracking-wider mb-1`}>
                    {plan.name}
                  </span>
                  {plan.subtitle && (
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">{plan.subtitle}</p>
                  )}
                  <div className="mt-2">
                    {discountedPrice != null ? (
                      <>
                        <span className="text-lg text-gray-400 line-through">₹{price!.toLocaleString('en-IN')}</span>
                        <span className="text-3xl font-extrabold text-gray-900 ml-2">₹{discountedPrice.toLocaleString('en-IN')}</span>
                        <p className="text-xs text-blue-600 mt-1 font-semibold">
                          {disc!.type === 'percentage' ? `${disc!.value}% off` : `₹${disc!.calculatedAmount.toLocaleString('en-IN')} off`}
                        </p>
                      </>
                    ) : (
                      <span className="text-3xl font-extrabold text-gray-900">
                        {price != null ? `₹${price.toLocaleString('en-IN')}` : '—'}
                      </span>
                    )}
                  </div>
                  {price == null && <p className="text-[11px] text-gray-400 mt-1">Price not set yet</p>}
                  {price != null && <p className="text-xs text-gray-400 mt-1">+ 18% GST applicable</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Features Comparison Table */}
      {features.length > 0 && (
        <div className="mb-8">
          <div className="mb-6">
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">What&apos;s Included</h2>
            <p className="text-sm text-gray-500 mt-1">Compare what each {serviceName} plan offers</p>
          </div>

          <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-600 to-blue-700">
                    <th className="text-left px-6 py-5 min-w-[220px]">
                      <span className="text-sm font-bold text-white uppercase tracking-wider">Features</span>
                    </th>
                    {plans.map((plan) => (
                      <th key={plan.key} className="text-center px-4 py-5 min-w-[160px]">
                        <p className="text-base font-bold text-white">{plan.name}</p>
                        {plan.subtitle && (
                          <p className="text-[11px] text-blue-200 mt-0.5 font-medium">{plan.subtitle}</p>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {features.map((feat, idx) => (
                    <tr key={idx} className={`border-b border-gray-100 last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'} hover:bg-blue-50/50 transition-colors`}>
                      <td className="px-6 py-4.5 align-top">
                        <p className="text-sm font-semibold text-gray-900">{feat.area}</p>
                        {feat.description && (
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{feat.description}</p>
                        )}
                      </td>
                      {plans.map((plan) => (
                        <td key={plan.key} className="px-4 py-4.5 text-center align-middle">
                          {renderValue(feat.values?.[plan.key] || '—')}
                        </td>
                      ))}
                    </tr>
                  ))}

                  {/* Register/Upgrade buttons as last table row */}
                  {onRegister && (
                    <tr className="bg-slate-50 border-t-2 border-gray-200">
                      <td className="px-6 py-5 align-middle">
                        <p className="text-sm font-bold text-gray-700">Get Started</p>
                      </td>
                      {plans.map((plan) => {
                        const PLAN_HIERARCHY: Record<string, number> = { PRO: 0, PREMIUM: 1, PLATINUM: 2 };
                        const isCurrent = currentPlanTier === plan.key;
                        const isUpgradePlan = currentPlanTier ? (PLAN_HIERARCHY[plan.key] ?? -1) > (PLAN_HIERARCHY[currentPlanTier] ?? -1) : false;
                        const isLowerPlan = currentPlanTier ? (PLAN_HIERARCHY[plan.key] ?? -1) < (PLAN_HIERARCHY[currentPlanTier] ?? -1) : false;
                        const isLoading = registeringPlan === plan.key;

                        return (
                          <td key={plan.key} className="px-4 py-5 text-center align-middle">
                            {isCurrent ? (
                              <span className="inline-block px-5 py-2.5 rounded-full font-bold text-sm text-white bg-blue-600">
                                Current Plan
                              </span>
                            ) : isUpgradePlan && onUpgrade ? (
                              <button
                                onClick={() => onUpgrade(plan.key)}
                                disabled={registeringPlan !== null || pricing?.[plan.key] == null}
                                className="px-5 py-2.5 rounded-full font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isLoading ? (
                                  <span className="inline-flex items-center gap-2"><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Upgrading...</span>
                                ) : `Upgrade`}
                              </button>
                            ) : isLowerPlan ? (
                              <span className="inline-block px-5 py-2.5 rounded-full font-bold text-sm text-gray-400 bg-gray-200">
                                Lower Tier
                              </span>
                            ) : (
                              <button
                                onClick={() => onRegister(plan.key)}
                                disabled={registeringPlan !== null || pricing?.[plan.key] == null}
                                className="px-5 py-2.5 rounded-full font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isLoading ? (
                                  <span className="inline-flex items-center gap-2"><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Registering...</span>
                                ) : 'Register Now'}
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-gray-200 flex items-center justify-center gap-8 text-xs">
              <span className="flex items-center gap-2 text-gray-600 font-medium">
                <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 rounded-full shadow-sm">
                  <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                Included
              </span>
              <span className="flex items-center gap-2 text-gray-600 font-medium">
                <span className="inline-flex items-center justify-center w-5 h-5 bg-red-100 rounded-full shadow-sm">
                  <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
                Not included
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Additional Notes — Study Abroad only */}
      {serviceName === 'Study Abroad' && (
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 border border-slate-200 rounded-2xl p-5 text-center">
          <p className="text-xs text-gray-500 leading-relaxed">
            <strong className="text-gray-700">Please note:</strong> An additional fee of Rs. 7,500 applies for each additional country search,
            Rs. 500 for additional university search, and Rs. 3,500 for each additional university application
            submitted beyond the specified limit.
          </p>
        </div>
      )}
    </div>
  );
}
