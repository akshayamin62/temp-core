'use client';

import { PlanConfig } from '@/config/servicePlans';
import { ReactNode, useState } from 'react';
import ViewBatchesModal from './ViewBatchesModal';

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

export interface ClassTiming {
  batchDate: string;
  timeFrom: string;
  timeTo: string;
}

export interface BatchData {
  _id: string;
  planKey: string;
  batchDate: string;
  timeFrom: string;
  timeTo: string;
  isActive: boolean;
}

interface CoachingClassCardsProps {
  plans: PlanConfig[];
  pricing: Record<string, number> | null;
  renderAction?: (plan: PlanConfig) => ReactNode;
  currentPlanKey?: string | null;
  registeredClasses?: Record<string, ClassTiming | null>;
  // Batch management props (for super-admin/admin)
  batches?: BatchData[];
  onAddBatch?: (planKey: string, data: { batchDate: string; timeFrom: string; timeTo: string }) => Promise<void>;
  onEditBatch?: (batchId: string, data: { batchDate: string; timeFrom: string; timeTo: string }) => Promise<void>;
  onDeleteBatch?: (batchId: string) => Promise<void>;
  // Inline price editing (for admin/super-admin)
  onPriceEdit?: (planKey: string, price: number) => Promise<void>;
  basePricing?: Record<string, number> | null;
  // Discounts
  discounts?: Record<string, { type: string; value: number; calculatedAmount: number; reason?: string }>;
}

export default function CoachingClassCards({ plans, pricing, renderAction, currentPlanKey, registeredClasses, batches, onAddBatch, onEditBatch, onDeleteBatch, onPriceEdit, basePricing, discounts }: CoachingClassCardsProps) {
  const [batchModal, setBatchModal] = useState<{ planKey: string; planName: string } | null>(null);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [priceValue, setPriceValue] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);
  const showBatchManagement = !!(batches && onAddBatch);
  const showBatchList = !!batches;

  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {plans.map((plan) => {
        const parts = plan.subtitle?.split('\u2022').map(s => s.trim()) || [];
        const sessionInfo = parts[0] || '';
        const mockInfo = parts[1] ? `${parts[1]} Included` : '';
        const price = pricing?.[plan.key];
        const isPopular = plan.key === 'IELTS_PREMIUM';
        const isCurrent = currentPlanKey === plan.key;
        const regTiming = registeredClasses?.[plan.key];
        const isRegistered = registeredClasses ? plan.key in registeredClasses : false;
        const planBatches = batches?.filter(b => b.planKey === plan.key) || [];
        const disc = discounts?.[plan.key];
        const discountedPrice = price != null && disc ? price - disc.calculatedAmount : null;

        const formatTimingDate = (dateStr: string) => {
          const d = new Date(dateStr);
          return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        };

        return (
          <div key={plan.key} className="flex flex-col gap-4">
            <div className={`bg-white p-7 rounded-2xl shadow-sm flex flex-col hover:shadow-md transition-shadow relative ${
              isRegistered ? 'ring-2 ring-green-500 border-2 border-green-200' :
              isCurrent ? 'ring-2 ring-green-500 border-2 border-green-200' :
              isPopular ? 'border-2 border-blue-200' : 'border border-slate-100'
            }`}>
              {isRegistered && (
                <div className="absolute top-4 right-4 px-3 py-1 bg-green-500 text-white text-[10px] uppercase font-extrabold rounded-md flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  Registered
                </div>
              )}
              {isPopular && !isCurrent && !isRegistered && (
                <span className="absolute top-4 right-4 bg-blue-600 text-white text-[10px] uppercase font-extrabold px-2.5 py-1 rounded-md">Popular</span>
              )}
              <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              {editingPrice === plan.key && onPriceEdit ? (
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
                        className="w-full pl-7 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        autoFocus
                      />
                    </div>
                    <button
                      onClick={async () => {
                        const val = Number(priceValue);
                        if (isNaN(val) || val < 0) return;
                        setSavingPrice(true);
                        try {
                          await onPriceEdit(plan.key, val);
                          setEditingPrice(null);
                        } finally {
                          setSavingPrice(false);
                        }
                      }}
                      disabled={savingPrice || !priceValue}
                      className="p-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
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
                  {basePricing && basePricing[plan.key] != null && (
                    <p className="text-xs text-gray-500 mt-1.5">Base: ₹{basePricing[plan.key].toLocaleString('en-IN')}</p>
                  )}
                </div>
              ) : price != null ? (
                <div className="mb-5">
                  <div className="flex items-center gap-2">
                    {discountedPrice != null ? (
                      <div>
                        <p className="text-sm text-gray-400 line-through">₹{price.toLocaleString('en-IN')}</p>
                        <p className="text-2xl font-extrabold text-green-600">₹{discountedPrice.toLocaleString('en-IN')}</p>
                        <p className="text-xs text-green-600 font-semibold mt-0.5">
                          {disc!.type === 'percentage' ? `${disc!.value}% off` : `₹${disc!.calculatedAmount.toLocaleString('en-IN')} off`}
                        </p>                        {disc!.reason && (
                          <p className="text-xs text-blue-600 mt-0.5 italic">"{disc!.reason}"</p>
                        )}                      </div>
                    ) : (
                      <p className="text-2xl font-extrabold text-gray-900">₹{price.toLocaleString('en-IN')}</p>
                    )}
                    {onPriceEdit && (
                      <button
                        onClick={() => { setEditingPrice(plan.key); setPriceValue(String(price)); }}
                        className="p-1 text-gray-400 hover:text-teal-600 transition-colors"
                        title="Edit price"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {basePricing && basePricing[plan.key] != null && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Base: ₹{basePricing[plan.key].toLocaleString('en-IN')}
                      {price - basePricing[plan.key] >= 0
                        ? <span className="text-green-600 font-semibold ml-2">+₹{(price - basePricing[plan.key]).toLocaleString('en-IN')} margin</span>
                        : <span className="text-red-600 font-semibold ml-2">-₹{Math.abs(price - basePricing[plan.key]).toLocaleString('en-IN')} margin</span>
                      }
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">+ 18% GST applicable</p>
                </div>
              ) : (
                <div className="mb-5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-400">Price not set</p>
                    {onPriceEdit && (
                      <button
                        onClick={() => { setEditingPrice(plan.key); setPriceValue(''); }}
                        className="p-1 text-gray-400 hover:text-teal-600 transition-colors"
                        title="Set price"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {basePricing && basePricing[plan.key] != null && (
                    <p className="text-xs text-gray-500 mt-0.5">Base: ₹{basePricing[plan.key].toLocaleString('en-IN')}</p>
                  )}
                </div>
              )}
              <ul className="space-y-2.5 grow">
                {sessionInfo && (
                  <li className="flex items-center gap-2.5 text-sm text-gray-600">
                    <BlueCheck />{sessionInfo}
                  </li>
                )}
                {mockInfo && (
                  <li className="flex items-center gap-2.5 text-sm text-gray-600">
                    <BlueCheck />{mockInfo}
                  </li>
                )}
                <li className="flex items-center gap-2.5 text-sm text-gray-600">
                  <BlueCheck />Study Material
                </li>
                <li className="flex items-center gap-2.5 text-sm text-gray-600">
                  <BlueCheck />Session Recordings
                </li>
              </ul>
              {isRegistered ? (
                <div className="mt-7">
                  <div className="w-full py-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-semibold text-center">
                    Registered
                  </div>
                  {regTiming && (
                    <div className="mt-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-xs font-semibold text-gray-700">Your Batch Timing</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatTimingDate(regTiming.batchDate)} &bull; {regTiming.timeFrom} to {regTiming.timeTo}</p>
                    </div>
                  )}
                </div>
              ) : (
                renderAction && <div className="mt-7">{renderAction(plan)}</div>
              )}
              {!showBatchList && (
                <button
                  onClick={() => setBatchModal({ planKey: plan.key, planName: plan.name })}
                  className="mt-4 w-full py-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
                >
                  View Batches
                </button>
              )}
            </div>

            {/* Inline Batch Management Section (editable) */}
            {showBatchManagement && (
              <BatchManagementInline
                planKey={plan.key}
                planBatches={planBatches}
                onAddBatch={onAddBatch!}
                onEditBatch={onEditBatch}
                onDeleteBatch={onDeleteBatch}
              />
            )}

            {/* Inline Batch Read-only Section */}
            {showBatchList && !showBatchManagement && (
              <BatchListReadonly planBatches={planBatches} />
            )}
          </div>
        );
      })}
    </div>

    {batchModal && (
      <ViewBatchesModal
        isOpen={true}
        onClose={() => setBatchModal(null)}
        planKey={batchModal.planKey}
        planName={batchModal.planName}
      />
    )}
    </>
  );
}

function BatchManagementInline({
  planKey,
  planBatches,
  onAddBatch,
  onEditBatch,
  onDeleteBatch,
}: {
  planKey: string;
  planBatches: BatchData[];
  onAddBatch: (planKey: string, data: { batchDate: string; timeFrom: string; timeTo: string }) => Promise<void>;
  onEditBatch?: (batchId: string, data: { batchDate: string; timeFrom: string; timeTo: string }) => Promise<void>;
  onDeleteBatch?: (batchId: string) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ batchDate: '', timeFrom: '', timeTo: '' });
  const [saving, setSaving] = useState(false);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleSave = async () => {
    if (!form.batchDate || !form.timeFrom || !form.timeTo) return;
    setSaving(true);
    try {
      if (editingId && onEditBatch) {
        await onEditBatch(editingId, form);
      } else {
        await onAddBatch(planKey, form);
      }
      setForm({ batchDate: '', timeFrom: '', timeTo: '' });
      setEditingId(null);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (batch: BatchData) => {
    setEditingId(batch._id);
    setForm({ batchDate: batch.batchDate.split('T')[0], timeFrom: batch.timeFrom, timeTo: batch.timeTo });
    setShowForm(true);
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ batchDate: '', timeFrom: '', timeTo: '' });
    setShowForm(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Batches ({planBatches.length})</p>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm({ batchDate: '', timeFrom: '', timeTo: '' }); }}
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors"
          >
            + Add
          </button>
        )}
      </div>

      {/* Batch list */}
      {planBatches.length === 0 && !showForm && (
        <p className="text-xs text-gray-400 text-center py-2">No batches yet</p>
      )}
      {planBatches.map((batch) => (
        <div key={batch._id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
          <div>
            <p className="text-xs font-medium text-gray-800">{formatDate(batch.batchDate)}</p>
            <p className="text-xs text-gray-500">{batch.timeFrom} — {batch.timeTo}</p>
          </div>
          <div className="flex items-center gap-2">
            {onEditBatch && (
              <button onClick={() => handleEdit(batch)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
            )}
            {onDeleteBatch && (
              <button onClick={() => onDeleteBatch(batch._id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
            )}
          </div>
        </div>
      ))}

      {/* Add/Edit form */}
      {showForm && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          <input type="date" value={form.batchDate} onChange={(e) => setForm({ ...form, batchDate: e.target.value })} className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-900 focus:ring-1 focus:ring-teal-500" />
          <div className="flex gap-2">
            <input type="time" value={form.timeFrom} onChange={(e) => setForm({ ...form, timeFrom: e.target.value })} className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-900 focus:ring-1 focus:ring-teal-500" />
            <input type="time" value={form.timeTo} onChange={(e) => setForm({ ...form, timeTo: e.target.value })} className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-900 focus:ring-1 focus:ring-teal-500" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !form.batchDate || !form.timeFrom || !form.timeTo} className="flex-1 py-1.5 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : editingId ? 'Update' : 'Add Batch'}
            </button>
            <button onClick={handleCancel} className="py-1.5 px-3 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BatchListReadonly({ planBatches }: { planBatches: BatchData[] }) {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">Batches ({planBatches.length})</p>
      {planBatches.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-2">No batches scheduled</p>
      ) : (
        planBatches.map((batch) => (
          <div key={batch._id} className="py-2 border-b border-gray-50 last:border-0">
            <p className="text-xs font-medium text-gray-800">{formatDate(batch.batchDate)}</p>
            <p className="text-xs text-gray-500">{batch.timeFrom} — {batch.timeTo}</p>
          </div>
        ))
      )}
    </div>
  );
}
