'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, serviceAPI, paymentAPI, invoiceAPI, ledgerAPI } from '@/lib/api';
import { USER_ROLE } from '@/types';
import { useRazorpay } from '@/hooks/useRazorpay';
import toast, { Toaster } from 'react-hot-toast';

// ===== Types =====
interface Registration {
  _id: string;
  serviceId: { _id: string; name: string; slug: string } | string;
  planTier?: string;
  paymentStatus?: string;
  paymentAmount?: number;
  paymentDate?: string;
  paymentModel?: string;
  totalAmount?: number;
  discountedAmount?: number;
  totalPaid?: number;
  paymentComplete?: boolean;
  installmentPlan?: {
    totalInstallments: number;
    completedInstallments: number;
    schedule: Array<{
      number: number;
      percentage: number;
      amount: number;
      status: string;
      label?: string;
      dueDate?: string;
      paidAt?: string;
      razorpayOrderId?: string;
    }>;
  };
  status?: string;
  createdAt?: string;
}

interface Payment {
  _id: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  amount: number;
  amountInr: number;
  type: string;
  installmentNumber: number;
  installmentPercentage: number;
  status: string;
  paidAt?: string;
  description?: string;
  createdAt?: string;
}

interface SummaryPayment {
  amountInr: number;
  status: string;
}

interface Invoice {
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
  _id?: string;
  date: string;
  type: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

interface Ledger {
  _id: string;
  totalServiceAmount: number;
  totalDiscount: number;
  netPayable: number;
  totalPaid: number;
  balance: number;
  entries: LedgerEntry[];
}

interface UserInfo {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  profilePicture?: string;
  role?: string;
}

// ===== Style Maps =====
const SERVICE_COLORS: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  'study-abroad': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', gradient: 'from-blue-600 to-indigo-600' },
  'education-planning': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', gradient: 'from-purple-600 to-indigo-600' },
  'coaching-classes': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', gradient: 'from-teal-600 to-cyan-600' },
};

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  paid: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  partial: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  captured: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  created: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  failed: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  refunded: { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' },
};

const INST_STATUS: Record<string, { bg: string; text: string }> = {
  paid: { bg: 'bg-green-100', text: 'text-green-700' },
  due: { bg: 'bg-amber-100', text: 'text-amber-700' },
  pending: { bg: 'bg-gray-100', text: 'text-gray-600' },
  failed: { bg: 'bg-red-100', text: 'text-red-700' },
};

function sStyle(s?: string) {
  return STATUS_STYLES[s?.toLowerCase() || ''] || { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400' };
}

function currency(n?: number) {
  if (n == null) return '—';
  return `₹${n.toLocaleString('en-IN')}`;
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ===== Main Page =====
type ActiveTab = 'overview' | 'payments' | 'invoices' | 'ledger';

export default function StudentPaymentPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);

  const refreshData = useCallback(async () => {
    if (!selectedReg) return;
    setTabLoading(true);
    try {
      const [payRes, invRes, ledRes] = await Promise.all([
        paymentAPI.getPaymentsByRegistration(selectedReg._id),
        invoiceAPI.getInvoicesByRegistration(selectedReg._id),
        ledgerAPI.getLedgerByRegistration(selectedReg._id).catch(() => null),
      ]);
      setPayments(payRes.data.data.payments || []);
      setInvoices(invRes.data.data.invoices || []);
      setLedger(ledRes?.data?.data?.ledger || null);
      // Refresh registration data
      const regRes = await serviceAPI.getMyServices();
      const regs: Registration[] = regRes.data.data.registrations || [];
      setRegistrations(regs);
      const updated = regs.find(r => r._id === selectedReg._id);
      if (updated) setSelectedReg(updated);
    } catch {
      // silent
    } finally {
      setTabLoading(false);
    }
  }, [selectedReg]);

  const { openCheckout, verifyingPayment } = useRazorpay({
    onSuccess: () => refreshData(),
    onFailure: () => refreshData(),
  });

  useEffect(() => {
    const init = async () => {
      try {
        const res = await authAPI.getProfile();
        const u = res.data.data.user;
        if (u.role !== USER_ROLE.STUDENT) { router.push('/dashboard'); return; }
        setUser(u);
        const regRes = await serviceAPI.getMyServices();
        const regs = regRes.data.data.registrations || [];
        setRegistrations(regs);
        if (regs.length > 0) setSelectedReg(regs[0]);
      } catch {
        toast.error('Please login to continue');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  useEffect(() => {
    if (selectedReg) refreshData();
  }, [selectedReg?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePayNow = async (reg: Registration, installmentNumber?: number) => {
    try {
      const res = await paymentAPI.createOrder(reg._id, installmentNumber);
      const d = res.data.data;
      openCheckout({
        orderId: d.orderId,
        amount: d.amount,
        amountInr: d.amountInr,
        currency: d.currency,
        keyId: d.keyId,
        prefill: { name: [user?.firstName, user?.lastName].filter(Boolean).join(' '), email: user?.email, contact: user?.phone },
        description: `Payment for ${getServiceName(reg)}`,
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create payment order');
    }
  };

  const getServiceName = (reg: Registration) => typeof reg.serviceId === 'object' ? reg.serviceId.name : 'Service';
  const getServiceSlug = (reg: Registration) => typeof reg.serviceId === 'object' ? reg.serviceId.slug : '';

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  const tabs: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" /> },
    { key: 'payments', label: 'Payments', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /> },
    { key: 'invoices', label: 'Invoices', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
    { key: 'ledger', label: 'Ledger', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
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
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">Payment Center</h1>
          <p className="mt-1 text-gray-500">Manage payments, view invoices, and track your financial history.</p>
        </div>

        {registrations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">No registrations found</p>
            <p className="text-gray-400 text-sm mt-1">Register for a service to see payment details here.</p>
            <button onClick={() => router.push('/student/service-plans')} className="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
              Browse Services
            </button>
          </div>
        ) : (
          <>
            {/* Service Selector */}
            {registrations.length > 1 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {registrations.map((reg) => {
                  const name = getServiceName(reg);
                  const slug = getServiceSlug(reg);
                  const colors = SERVICE_COLORS[slug] || SERVICE_COLORS['study-abroad'];
                  const active = selectedReg?._id === reg._id;
                  return (
                    <button
                      key={reg._id}
                      onClick={() => setSelectedReg(reg)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${active
                          ? `bg-gradient-to-r ${colors.gradient} text-white shadow-md`
                          : `${colors.bg} ${colors.text} border ${colors.border} hover:shadow-sm`
                        }`}
                    >
                      {name} {reg.planTier && `· ${reg.planTier}`}
                    </button>
                  );
                })}
              </div>
            )}

            {selectedReg && (
              <>
                {/* Summary Cards */}
                <SummaryCards reg={selectedReg} payments={payments} />

                {/* Tabs */}
                <div className="mt-6 border-b border-gray-200">
                  <nav className="flex gap-1 -mb-px">
                    {tabs.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === t.key
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{t.icon}</svg>
                        {t.label}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="mt-6">
                  {tabLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="animate-spin w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full" />
                    </div>
                  ) : (
                    <>
                      {activeTab === 'overview' && <OverviewTab reg={selectedReg} onPayNow={handlePayNow} />}
                      {activeTab === 'payments' && <PaymentsTab payments={payments} />}
                      {activeTab === 'invoices' && <InvoicesTab invoices={invoices} />}
                      {activeTab === 'ledger' && <LedgerTab ledger={ledger} />}
                    </>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ===== Summary Cards =====
function SummaryCards({ reg, payments }: { reg: Registration; payments: SummaryPayment[] }) {
  const GST_RATE = 18;
  const hasInstallments = (reg.installmentPlan?.schedule?.length ?? 0) > 0;
  let baseTotal = reg.discountedAmount ?? reg.totalAmount ?? reg.paymentAmount ?? 0;
  const paidFromPayments = payments
    .filter((p) => p.status === 'captured' || p.status === 'paid')
    .reduce((sum, p) => sum + (p.amountInr || 0), 0);
  const totalPaid = (reg.totalPaid && reg.totalPaid > 0) ? reg.totalPaid : paidFromPayments;

  // Fallback: if base fields are missing for one-time payments, derive from totalPaid
  if (baseTotal <= 0 && !hasInstallments && totalPaid > 0) {
    baseTotal = Math.round(totalPaid * 100 / (100 + GST_RATE));
  }

  const gstAmount = Math.round(baseTotal * GST_RATE / 100);
  // For installments: netPayable = sum of schedule amounts (GST-inclusive)
  // For one-time: netPayable = base + GST
  const netPayable = hasInstallments
    ? reg.installmentPlan!.schedule!.reduce((sum, s) => sum + s.amount, 0)
    : baseTotal + gstAmount;
  const balance = Math.max(0, netPayable - totalPaid);
  const pst = sStyle(reg.paymentStatus);
  const progress = netPayable > 0 ? Math.min(100, Math.round((totalPaid / netPayable) * 100)) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Amount</p>
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{currency(netPayable)}</p>
          <div className="mt-1 space-y-0.5">
            <p className="text-xs text-gray-500">Base: {currency(baseTotal)}</p>
            {reg.discountedAmount != null && reg.discountedAmount !== reg.totalAmount && (
              <p className="text-xs text-green-600">Discount applied: -{currency((reg.totalAmount || 0) - reg.discountedAmount)}</p>
            )}
            <p className="text-xs text-gray-500">GST (18%): +{currency(gstAmount)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Paid</p>
            <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{currency(totalPaid)}</p>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
            <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">{progress}% paid</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Balance</p>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${balance > 0 ? 'bg-amber-100' : 'bg-green-100'}`}>
              <svg className={`w-5 h-5 ${balance > 0 ? 'text-amber-600' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" /></svg>
            </div>
          </div>
          <p className={`text-2xl font-bold ${balance > 0 ? 'text-amber-600' : 'text-green-600'}`}>{currency(balance)}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2.5 h-2.5 rounded-full ${pst.dot}`} />
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${pst.bg} ${pst.text}`}>
              {reg.paymentComplete ? 'Fully Paid' : reg.paymentStatus ? reg.paymentStatus.charAt(0).toUpperCase() + reg.paymentStatus.slice(1) : 'Pending'}
            </span>
          </div>
          {reg.paymentModel && (
            <p className="text-xs text-gray-400 mt-2 capitalize">{reg.paymentModel === 'installment' ? 'Installment Plan' : 'One-time Payment'}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Overview Tab =====
function OverviewTab({ reg, onPayNow }: { reg: Registration; onPayNow: (r: Registration, inst?: number) => void }) {
  const GST_RATE = 18;

  if (reg.paymentModel === 'installment' && reg.installmentPlan) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Installment Schedule</h3>
            <p className="text-sm text-gray-500">{reg.installmentPlan.completedInstallments} of {reg.installmentPlan.totalInstallments} installments paid</p>
          </div>
          <div className="divide-y divide-gray-100">
            {reg.installmentPlan.schedule.map((inst) => {
              const ist = INST_STATUS[inst.status] || INST_STATUS.pending;
              const baseAmt = Math.round(inst.amount * 100 / (100 + GST_RATE));
              const gstAmt = inst.amount - baseAmt;
              const isUpgradeEntry = inst.number >= 100;
              const canPay = !isUpgradeEntry && (inst.status === 'due' || (inst.status === 'pending' && inst.number === 1));
              return (
                <div key={inst.number} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${inst.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {inst.status === 'paid' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      ) : inst.number}
                    </div>
                    <div>
                      {isUpgradeEntry ? (
                        <>
                          <p className="font-medium text-gray-900">Service Upgradation</p>
                          <p className="text-sm text-gray-500">{inst.label || 'Plan upgrade'}</p>
                        </>
                      ) : (
                        <>
                          <p className="font-medium text-gray-900">Installment #{inst.number}</p>
                          <p className="text-sm text-gray-500">{inst.percentage}% of total</p>
                        </>
                      )}
                      <p className="text-xs text-gray-400">Base: {currency(baseAmt)} + GST: {currency(gstAmt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{currency(inst.amount)}</p>
                      <p className="text-xs text-gray-400">(incl. 18% GST)</p>
                      {inst.paidAt && <p className="text-xs text-green-600">Paid on {fmtDate(inst.paidAt)}</p>}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${ist.bg} ${ist.text}`}>
                      {inst.status.charAt(0).toUpperCase() + inst.status.slice(1)}
                    </span>
                    {canPay && (
                      <button onClick={() => onPayNow(reg, inst.number)} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                        Pay Now
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div>
              <p className="text-sm font-medium text-blue-800">Installment Payment Plan</p>
              <p className="text-sm text-blue-600 mt-1">Your payments are split into 3 installments (50% / 30% / 20%). All amounts include 18% GST. Each installment must be completed before the next one becomes available.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  let effectiveAmount = reg.discountedAmount ?? reg.totalAmount ?? 0;
  // Fallback: derive from totalPaid if base fields missing
  if (effectiveAmount <= 0 && (reg.totalPaid ?? 0) > 0) {
    effectiveAmount = Math.round((reg.totalPaid ?? 0) * 100 / 118);
  }
  const isPaid = reg.paymentComplete || reg.paymentStatus === 'paid';

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Payment Details</h3></div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Service</p><p className="text-sm font-medium text-gray-900">{typeof reg.serviceId === 'object' ? reg.serviceId.name : 'Service'}</p></div>
            <div><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Plan</p><p className="text-sm font-medium text-gray-900">{reg.planTier || '—'}</p></div>
            <div><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Amount</p><p className="text-lg font-bold text-gray-900">{currency(effectiveAmount)}</p></div>
            <div><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Payment Date</p><p className="text-sm font-medium text-gray-900">{fmtDate(reg.paymentDate)}</p></div>
          </div>
          {!isPaid && effectiveAmount > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <button onClick={() => onPayNow(reg)} className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg">
                Pay {currency(effectiveAmount)}
              </button>
            </div>
          )}
          {isPaid && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center gap-2 text-green-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="font-medium">Payment completed</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Payments Tab =====
function PaymentsTab({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
        <p className="text-gray-500 font-medium">No payments yet</p>
        <p className="text-gray-400 text-sm mt-1">Payments will appear here after you make your first payment.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments.map((p) => {
              const st = sStyle(p.status);
              return (
                <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{fmtDate(p.paidAt || p.createdAt)}</td>
                  <td className="px-6 py-4"><p className="text-sm font-medium text-gray-900">{p.description || `Installment #${p.installmentNumber}`}</p><p className="text-xs text-gray-400">{p.type === 'miscellaneous' ? 'Miscellaneous' : `${p.installmentPercentage}%`}</p></td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">{currency(p.amountInr)}</td>
                  <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${st.bg} ${st.text}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{p.status.charAt(0).toUpperCase() + p.status.slice(1)}</span></td>
                  <td className="px-6 py-4 text-xs text-gray-400 font-mono">{p.razorpayPaymentId || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== Invoices Tab =====
function InvoicesTab({ invoices }: { invoices: Invoice[] }) {
  if (invoices.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        <p className="text-gray-500 font-medium">No invoices yet</p>
        <p className="text-gray-400 text-sm mt-1">Invoices will be generated after payments are processed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {invoices.map((inv) => {
        const isProforma = inv.type === 'proforma';
        return (
          <div key={inv._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isProforma ? 'bg-amber-100' : 'bg-blue-100'}`}>
                  <svg className={`w-5 h-5 ${isProforma ? 'text-amber-600' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{inv.invoiceNumber}</p>
                  <p className="text-sm text-gray-500">{isProforma ? 'Proforma Invoice' : 'Tax Invoice'} · {inv.serviceName} · {inv.planTier}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">{currency(inv.grandTotal)}</p>
                <p className="text-xs text-gray-400">{fmtDate(inv.issuedAt)}</p>
              </div>
            </div>
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs">
              <div><span className="text-gray-400">Subtotal</span><p className="font-medium text-gray-700">{currency(inv.totalAmount)}</p></div>
              {inv.discountAmount > 0 && <div><span className="text-gray-400">Discount</span><p className="font-medium text-green-600">-{currency(inv.discountAmount)}</p></div>}
              <div><span className="text-gray-400">Taxable</span><p className="font-medium text-gray-700">{currency(inv.taxableAmount)}</p></div>
              <div><span className="text-gray-400">GST ({inv.gstRate}%)</span><p className="font-medium text-gray-700">{currency(inv.gstAmount)}</p></div>
              <div><span className="text-gray-400">Status</span><p className={`font-medium ${inv.status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>{inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}</p></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ===== Ledger Tab =====
function LedgerTab({ ledger }: { ledger: Ledger | null }) {
  if (!ledger) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
        <p className="text-gray-500 font-medium">No ledger entries</p>
        <p className="text-gray-400 text-sm mt-1">Financial records will appear here after payments are made.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: 'Service Amount', value: ledger.totalServiceAmount, color: 'text-gray-900' },
          { label: 'Discount', value: ledger.totalDiscount, color: 'text-green-600' },
          { label: 'Net Payable', value: ledger.netPayable, color: 'text-blue-600' },
          { label: 'Total Paid', value: ledger.totalPaid, color: 'text-green-600' },
          { label: 'Balance', value: ledger.balance, color: ledger.balance > 0 ? 'text-amber-600' : 'text-green-600' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{item.label}</p>
            <p className={`text-lg font-bold mt-1 ${item.color}`}>{currency(item.value)}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Transaction History</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Debit</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Credit</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ledger.entries.map((e, i) => (
                <tr key={e._id || i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-sm text-gray-700 whitespace-nowrap">{fmtDate(e.date)}</td>
                  <td className="px-6 py-3 text-sm text-gray-900">{e.description}</td>
                  <td className="px-6 py-3 text-sm text-right font-medium text-red-600">{e.debit > 0 ? currency(e.debit) : ''}</td>
                  <td className="px-6 py-3 text-sm text-right font-medium text-green-600">{e.credit > 0 ? currency(e.credit) : ''}</td>
                  <td className="px-6 py-3 text-sm text-right font-semibold text-gray-900">{currency(e.runningBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
