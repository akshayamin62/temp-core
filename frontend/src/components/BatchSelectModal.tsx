'use client';

import { useEffect, useState } from 'react';
import { coachingBatchAPI } from '@/lib/api';

interface Batch {
  _id: string;
  planKey: string;
  batchDate: string;
  timeFrom: string;
  timeTo: string;
}

interface BatchSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  planKey: string;
  planName: string;
  onSelectBatch: (classTiming: { batchDate: string; timeFrom: string; timeTo: string }) => void;
  registering: boolean;
}

export default function BatchSelectModal({ isOpen, onClose, planKey, planName, onSelectBatch, registering }: BatchSelectModalProps) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setSelectedId(null);
    coachingBatchAPI.getBatches(planKey)
      .then((res) => setBatches(res.data.data.batches || []))
      .catch(() => setBatches([]))
      .finally(() => setLoading(false));
  }, [isOpen, planKey]);

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Select a Batch</h2>
              <p className="text-sm text-gray-500 mt-0.5">{planName} — Choose your preferred batch</p>
            </div>
            <button onClick={onClose} disabled={registering} className="p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="spinner mr-3"></div>
              <p className="text-gray-500 text-sm">Loading batches...</p>
            </div>
          ) : batches.length === 0 ? (
            <div className="text-center py-10">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500 text-sm">No batches available. Please check back later.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {batches.map((batch) => (
                <button
                  key={batch._id}
                  onClick={() => setSelectedId(batch._id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                    selectedId === batch._id
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedId === batch._id ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                  }`}>
                    {selectedId === batch._id && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{formatDate(batch.batchDate)}</p>
                    <p className="text-sm text-gray-500">{batch.timeFrom} to {batch.timeTo}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} disabled={registering} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={() => {
              const batch = batches.find(b => b._id === selectedId);
              if (batch) onSelectBatch({ batchDate: batch.batchDate, timeFrom: batch.timeFrom, timeTo: batch.timeTo });
            }}
            disabled={!selectedId || registering}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {registering ? (
              <span className="inline-flex items-center gap-2 justify-center"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Registering...</span>
            ) : 'Confirm & Register'}
          </button>
        </div>
      </div>
    </div>
  );
}
