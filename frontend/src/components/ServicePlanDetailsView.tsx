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
}

function renderValue(val: string) {
  if (val === '✗') {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 bg-red-50 rounded-full ring-1 ring-red-200">
        <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </span>
    );
  }
  if (val === '✓') {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 bg-emerald-50 rounded-full ring-1 ring-emerald-200">
        <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (val.startsWith('✓ ')) {
    return (
      <span className="flex items-center gap-1.5">
        <span className="inline-flex items-center justify-center w-5 h-5 bg-emerald-50 rounded-full ring-1 ring-emerald-200 shrink-0">
          <svg className="w-2.5 h-2.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <span className="text-sm text-gray-700">{val.slice(2)}</span>
      </span>
    );
  }
  if (val.startsWith('✗ ')) {
    return (
      <span className="flex items-center gap-1.5">
        <span className="inline-flex items-center justify-center w-5 h-5 bg-red-50 rounded-full ring-1 ring-red-200 shrink-0">
          <svg className="w-2.5 h-2.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
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
                className={`relative rounded-2xl border-2 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${plan.borderColor} bg-white shadow-lg ${plan.glowColor}`}
              >
                <div className={`${plan.headerGradient} px-5 py-5 text-center relative overflow-hidden`}>
                  <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full" />
                  {plan.subtitle && (
                    <p className="text-[10px] font-semibold text-white/70 uppercase tracking-widest mb-0.5">{plan.subtitle}</p>
                  )}
                  <h3 className="text-lg font-extrabold text-white tracking-wide">{plan.name}</h3>
                  <div className="mt-2">
                    {discountedPrice != null ? (
                      <>
                        <span className="text-lg text-white/50 line-through">₹{price!.toLocaleString('en-IN')}</span>
                        <span className="text-3xl font-black text-white ml-2">₹{discountedPrice.toLocaleString('en-IN')}</span>
                        <p className="text-xs text-white/80 mt-1 font-semibold">
                          {disc!.type === 'percentage' ? `${disc!.value}% off` : `₹${disc!.calculatedAmount.toLocaleString('en-IN')} off`}
                        </p>
                      </>
                    ) : (
                      <span className="text-3xl font-black text-white">
                        {price != null ? `₹${price.toLocaleString('en-IN')}` : '—'}
                      </span>
                    )}
                  </div>
                  {price == null && <p className="text-[11px] text-white/40 mt-1">Price not set yet</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Features Comparison Table — 4-column layout: Feature | Plan1 | Plan2 | Plan3 ... */}
      {features.length > 0 && (
        <div className="mb-8">
          <div className="mb-6">
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">What&apos;s Included</h2>
            <p className="text-sm text-gray-500 mt-1">Compare what each {serviceName} plan offers</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left px-5 py-4 bg-gray-50 min-w-[200px] border-r border-gray-200">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Feature</span>
                    </th>
                    {plans.map((plan, i) => (
                      <th key={plan.key} className={`text-center px-4 py-4 min-w-[140px] ${plan.cellBg} ${i < plans.length - 1 ? 'border-r border-gray-200' : ''}`}>
                        <span className={`inline-block px-4 py-1.5 ${plan.badgeBg} text-white rounded-full text-xs font-bold uppercase tracking-wider`}>
                          {plan.name}
                        </span>
                        {plan.subtitle && (
                          <p className="text-[10px] text-gray-400 mt-1 font-medium">{plan.subtitle}</p>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {features.map((feat, idx) => (
                    <tr key={idx} className={`border-b border-gray-100 last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-100'}`}>
                      <td className="px-5 py-4 align-top border-r border-gray-200">
                        <p className="text-sm font-semibold text-gray-900">{feat.area}</p>
                        {feat.description && (
                          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{feat.description}</p>
                        )}
                      </td>
                      {plans.map((plan, i) => (
                        <td key={plan.key} className={`px-4 py-4 text-center align-top ${plan.cellBg} ${i < plans.length - 1 ? 'border-r border-gray-200' : ''}`}>
                          {renderValue(feat.values?.[plan.key] || '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-center gap-5 text-xs">
              <span className="flex items-center gap-1.5 text-gray-500">
                <span className="inline-flex items-center justify-center w-4 h-4 bg-emerald-50 rounded-full ring-1 ring-emerald-200">
                  <svg className="w-2.5 h-2.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                Included
              </span>
              <span className="flex items-center gap-1.5 text-gray-500">
                <span className="inline-flex items-center justify-center w-4 h-4 bg-red-50 rounded-full ring-1 ring-red-200">
                  <svg className="w-2.5 h-2.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
