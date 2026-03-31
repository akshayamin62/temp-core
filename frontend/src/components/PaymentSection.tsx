'use client';

import { useEffect, useState, useCallback } from 'react';
import { paymentAPI, invoiceAPI, ledgerAPI } from '@/lib/api';

interface PaymentSectionProps {
  registrationId?: string;
  studentId?: string;
  paymentStatus?: string;
  paymentAmount?: number;
  paymentDate?: string;
  planTier?: string;
  serviceName?: string;
  totalAmount?: number;
  discountedAmount?: number;
  paymentModel?: string;
  installmentPlan?: {
    totalInstallments: number;
    completedInstallments: number;
    schedule: Array<{
      number: number;
      percentage: number;
      amount: number;
      status: string;
      dueDate?: string;
      paidAt?: string;
    }>;
  };
  totalPaid?: number;
  paymentComplete?: boolean;
  readOnly?: boolean;
  onStatusChange?: (status: string) => void;
  onAmountChange?: (amount: number) => void;
}

interface PaymentRecord {
  _id: string;
  razorpayPaymentId?: string;
  amountInr: number;
  installmentNumber: number;
  installmentPercentage: number;
  status: string;
  paidAt?: string;
  description?: string;
  createdAt?: string;
}

interface InvoiceRecord {
  _id: string;
  invoiceNumber: string;
  type: string;
  serviceName: string;
  planTier: string;
  totalAmount: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  gstAmount: number;
  grandTotal: number;
  installmentNumber?: number;
  status: string;
  issuedAt?: string;
  paidAt?: string;
}

interface LedgerEntry {
  date: string;
  type: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

interface LedgerRecord {
  totalServiceAmount: number;
  totalDiscount: number;
  netPayable: number;
  totalPaid: number;
  balance: number;
  entries: LedgerEntry[];
}

const GST_RATE = 18;

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  paid: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  partial: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  captured: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  created: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  failed: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  refunded: { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' },
};

function sStyle(s?: string) {
  return STATUS_STYLES[s?.toLowerCase() || ''] || { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400' };
}

function fmt(n?: number) {
  if (n == null) return '—';
  return `₹${n.toLocaleString('en-IN')}`;
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

type Tab = 'overview' | 'payments' | 'invoices' | 'ledger';

export default function PaymentSection({
  registrationId,
  paymentStatus,
  paymentAmount,
  paymentDate,
  planTier,
  serviceName,
  totalAmount,
  discountedAmount,
  paymentModel,
  installmentPlan,
  totalPaid: regTotalPaid,
  paymentComplete,
  readOnly = true,
}: PaymentSectionProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [ledger, setLedger] = useState<LedgerRecord | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!registrationId) return;
    setDataLoading(true);
    try {
      const [payRes, invRes, ledRes] = await Promise.all([
        paymentAPI.getPaymentsByRegistration(registrationId),
        invoiceAPI.getInvoicesByRegistration(registrationId),
        ledgerAPI.getLedgerByRegistration(registrationId).catch(() => null),
      ]);
      setPayments(payRes.data.data.payments || []);
      setInvoices(invRes.data.data.invoices || []);
      setLedger(ledRes?.data?.data?.ledger || null);
    } catch { /* silent */ }
    finally { setDataLoading(false); }
  }, [registrationId]);

  useEffect(() => { if (registrationId) fetchData(); }, [registrationId, fetchData]);

  const hasInstallments = (installmentPlan?.schedule?.length ?? 0) > 0;
  let baseTotal = discountedAmount ?? totalAmount ?? paymentAmount ?? 0;
  const capturedPayments = payments.filter(p => p.status === 'captured');
  const totalPaid = (regTotalPaid && regTotalPaid > 0) ? regTotalPaid : capturedPayments.reduce((s, p) => s + p.amountInr, 0);

  // Fallback: if base fields are missing for one-time payments, derive from totalPaid
  if (baseTotal <= 0 && !hasInstallments && totalPaid > 0) {
    baseTotal = Math.round(totalPaid * 100 / (100 + GST_RATE));
  }

  const gstAmount = Math.round(baseTotal * GST_RATE / 100);
  // For installments: netPayable = sum of schedule amounts (GST-inclusive)
  // For one-time: netPayable = base + GST
  const netPayable = hasInstallments
    ? installmentPlan!.schedule!.reduce((sum, s) => sum + s.amount, 0)
    : baseTotal + gstAmount;
  const balance = Math.max(0, netPayable - totalPaid);
  const progress = netPayable > 0 ? Math.min(100, Math.round((totalPaid / netPayable) * 100)) : 0;
  const pst = sStyle(paymentStatus);
  const isInstallment = paymentModel === 'installment' && hasInstallments;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'payments', label: `Payments${payments.length ? ` (${payments.length})` : ''}` },
    { key: 'invoices', label: `Invoices${invoices.length ? ` (${invoices.length})` : ''}` },
    { key: 'ledger', label: 'Ledger' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Payment Information</h3>
              {serviceName && <p className="text-blue-100 text-sm">{serviceName} {planTier && `· ${planTier}`}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isInstallment && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white">
                Installment Plan
              </span>
            )}
            {readOnly && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white">
                Read Only
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Net Payable</p>
            <p className="text-xl font-bold text-gray-900">{fmt(netPayable)}</p>
            <div className="mt-1 space-y-0.5">
              <p className="text-[10px] text-gray-400">Base: {fmt(baseTotal)}</p>
              {discountedAmount != null && discountedAmount !== totalAmount && (
                <p className="text-[10px] text-green-600">Discount: -{fmt((totalAmount || 0) - discountedAmount)}</p>
              )}
              <p className="text-[10px] text-gray-400">GST (18%): +{fmt(gstAmount)}</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Paid</p>
            <p className="text-xl font-bold text-green-600">{fmt(totalPaid)}</p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{progress}% paid</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Balance</p>
            <p className={`text-xl font-bold ${balance > 0 ? 'text-amber-600' : 'text-green-600'}`}>{fmt(balance)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Status</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${pst.dot}`} />
              <span className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${pst.bg} ${pst.text}`}>
                {paymentComplete ? 'Fully Paid' : paymentStatus ? paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1) : 'Pending'}
              </span>
            </div>
            {paymentDate && <p className="text-[10px] text-gray-400 mt-1">Last: {fmtDate(paymentDate)}</p>}
          </div>
        </div>

        {/* Tabs */}
        {registrationId && (
          <>
            <div className="border-b border-gray-200 mb-4">
              <nav className="flex gap-1 -mb-px">
                {tabs.map(t => (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    {t.label}
                  </button>
                ))}
              </nav>
            </div>

            {dataLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : (
              <>
                {/* Overview */}
                {tab === 'overview' && isInstallment && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700">Installment Schedule ({installmentPlan!.completedInstallments}/{installmentPlan!.totalInstallments} paid)</h4>
                    <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                      {installmentPlan!.schedule.map(inst => {
                        const ist = STATUS_STYLES[inst.status] || STATUS_STYLES.pending;
                        const baseAmt = Math.round(inst.amount * 100 / (100 + GST_RATE));
                        const gst = inst.amount - baseAmt;
                        return (
                          <div key={inst.number} className="px-4 py-3 flex items-center justify-between bg-white hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${inst.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                {inst.status === 'paid' ? '✓' : inst.number}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">Installment #{inst.number} ({inst.percentage}%)</p>
                                <p className="text-xs text-gray-400">Base: {fmt(baseAmt)} + GST: {fmt(gst)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-sm font-semibold text-gray-900">{fmt(inst.amount)}</p>
                                {inst.paidAt && <p className="text-xs text-green-600">{fmtDate(inst.paidAt)}</p>}
                              </div>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${ist.bg} ${ist.text}`}>
                                {inst.status.charAt(0).toUpperCase() + inst.status.slice(1)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {tab === 'overview' && !isInstallment && (
                  <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="text-gray-400">Service</span><p className="font-medium text-gray-900">{serviceName || '—'}</p></div>
                      <div><span className="text-gray-400">Plan</span><p className="font-medium text-gray-900">{planTier || '—'}</p></div>
                      <div><span className="text-gray-400">Amount (incl. GST)</span><p className="font-medium text-gray-900">{fmt(netPayable)}</p></div>
                      <div><span className="text-gray-400">Payment Date</span><p className="font-medium text-gray-900">{fmtDate(paymentDate)}</p></div>
                    </div>
                  </div>
                )}

                {/* Payments Tab */}
                {tab === 'payments' && (
                  payments.length === 0 ? (
                    <p className="text-center text-gray-400 py-8 text-sm">No payment records yet.</p>
                  ) : (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead><tr className="bg-gray-50 border-b">
                          <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Date</th>
                          <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Description</th>
                          <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                          <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Status</th>
                          <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Razorpay ID</th>
                        </tr></thead>
                        <tbody className="divide-y divide-gray-100">
                          {payments.map(p => {
                            const st = sStyle(p.status);
                            return (
                              <tr key={p._id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{fmtDate(p.paidAt || p.createdAt)}</td>
                                <td className="px-4 py-3 text-gray-900">{p.description || `Installment #${p.installmentNumber}`}</td>
                                <td className="px-4 py-3 font-semibold text-gray-900">{fmt(p.amountInr)}</td>
                                <td className="px-4 py-3"><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.text}`}>{p.status}</span></td>
                                <td className="px-4 py-3 text-xs text-gray-400 font-mono">{p.razorpayPaymentId || '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                )}

                {/* Invoices Tab */}
                {tab === 'invoices' && (
                  invoices.length === 0 ? (
                    <p className="text-center text-gray-400 py-8 text-sm">No invoices generated yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {invoices.map(inv => {
                        const isProforma = inv.type === 'proforma';
                        return (
                          <div key={inv._id} className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="px-4 py-3 flex items-center justify-between bg-white">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isProforma ? 'bg-amber-100' : 'bg-blue-100'}`}>
                                  <svg className={`w-4 h-4 ${isProforma ? 'text-amber-600' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">{inv.invoiceNumber}</p>
                                  <p className="text-xs text-gray-500">{isProforma ? 'Proforma' : 'Tax Invoice'} · {fmtDate(inv.issuedAt)}</p>
                                </div>
                              </div>
                              <p className="text-sm font-bold text-gray-900">{fmt(inv.grandTotal)}</p>
                            </div>
                            <div className="px-4 py-2 bg-gray-50 border-t grid grid-cols-4 gap-2 text-xs">
                              <div><span className="text-gray-400">Taxable</span><p className="font-medium">{fmt(inv.taxableAmount)}</p></div>
                              <div><span className="text-gray-400">GST ({inv.gstRate}%)</span><p className="font-medium">{fmt(inv.gstAmount)}</p></div>
                              <div><span className="text-gray-400">Total</span><p className="font-medium">{fmt(inv.grandTotal)}</p></div>
                              <div><span className="text-gray-400">Status</span><p className={`font-medium ${inv.status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>{inv.status}</p></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}

                {/* Ledger Tab */}
                {tab === 'ledger' && (
                  !ledger ? (
                    <p className="text-center text-gray-400 py-8 text-sm">No ledger entries yet.</p>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-5 gap-3">
                        {[
                          { l: 'Service Amt', v: ledger.totalServiceAmount, c: 'text-gray-900' },
                          { l: 'Discount', v: ledger.totalDiscount, c: 'text-green-600' },
                          { l: 'Net Payable', v: ledger.netPayable, c: 'text-blue-600' },
                          { l: 'Paid', v: ledger.totalPaid, c: 'text-green-600' },
                          { l: 'Balance', v: ledger.balance, c: ledger.balance > 0 ? 'text-amber-600' : 'text-green-600' },
                        ].map(i => (
                          <div key={i.l} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                            <p className="text-[10px] text-gray-400 uppercase font-semibold">{i.l}</p>
                            <p className={`text-sm font-bold ${i.c}`}>{fmt(i.v)}</p>
                          </div>
                        ))}
                      </div>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead><tr className="bg-gray-50 border-b">
                            <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Date</th>
                            <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Description</th>
                            <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Debit</th>
                            <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Credit</th>
                            <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Balance</th>
                          </tr></thead>
                          <tbody className="divide-y divide-gray-100">
                            {ledger.entries.map((e, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{fmtDate(e.date)}</td>
                                <td className="px-4 py-2 text-gray-900">{e.description}</td>
                                <td className="px-4 py-2 text-right font-medium text-red-600">{e.debit > 0 ? fmt(e.debit) : ''}</td>
                                <td className="px-4 py-2 text-right font-medium text-green-600">{e.credit > 0 ? fmt(e.credit) : ''}</td>
                                <td className="px-4 py-2 text-right font-semibold text-gray-900">{fmt(e.runningBalance)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                )}
              </>
            )}
          </>
        )}

        {/* Fallback: no registrationId → simple display */}
        {!registrationId && (
          <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-400">Amount</span><p className="font-medium text-gray-900">{fmt(totalAmount || paymentAmount)}</p></div>
              <div><span className="text-gray-400">Status</span><p className={`font-medium ${pst.text}`}>{paymentStatus || 'Pending'}</p></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
