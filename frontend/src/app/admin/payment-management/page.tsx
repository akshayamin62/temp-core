'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, adminStudentAPI, paymentAPI, invoiceAPI, ledgerAPI } from '@/lib/api';
import { USER_ROLE, User } from '@/types';
import AdminLayout from '@/components/AdminLayout';
import toast, { Toaster } from 'react-hot-toast';

// ===== Types =====
interface StudentUser {
  _id: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email: string;
  phone?: string;
}

interface StudentEntry {
  _id: string;
  user: StudentUser;
  mobileNumber?: string;
  registrations?: Registration[];
}

interface Registration {
  _id: string;
  serviceId: { _id: string; name: string; slug: string } | string;
  planTier?: string;
  paymentStatus?: string;
  paymentAmount?: number;
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
      dueDate?: string;
      paidAt?: string;
    }>;
  };
  status?: string;
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

// ===== Helpers =====
function fullName(u?: StudentUser | User | null) {
  if (!u) return '—';
  return [u.firstName, u.middleName, u.lastName].filter(Boolean).join(' ') || u.email;
}

function currency(n?: number) {
  if (n == null) return '—';
  return `₹${n.toLocaleString('en-IN')}`;
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  paid: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  partial: { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  captured: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  created: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
  failed: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
  refunded: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
};

function sStyle(s?: string) {
  return STATUS_STYLES[s?.toLowerCase() || ''] || { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };
}

// ===== Main Page =====
type View = 'list' | 'detail';
type DetailTab = 'overview' | 'payments' | 'invoices' | 'ledger';

export default function AdminPaymentManagementPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Student list
  const [students, setStudents] = useState<StudentEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<View>('list');

  // Detail state
  const [selectedStudent, setSelectedStudent] = useState<StudentEntry | null>(null);
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Misc collection form
  const [showMiscForm, setShowMiscForm] = useState(false);
  const [miscAmount, setMiscAmount] = useState('');
  const [miscDescription, setMiscDescription] = useState('');
  const [miscNotes, setMiscNotes] = useState('');
  const [miscSubmitting, setMiscSubmitting] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await authAPI.getProfile();
        const userData = res.data.data.user;
        if (userData.role !== USER_ROLE.ADMIN) {
          toast.error('Access denied.');
          router.push('/');
          return;
        }
        setUser(userData);

        const stuRes = await adminStudentAPI.getStudents();
        setStudents(stuRes.data.data.students || []);
      } catch {
        toast.error('Please login to continue');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  const loadRegistrationDetails = useCallback(async (reg: Registration) => {
    setDetailLoading(true);
    try {
      const [payRes, invRes, ledRes] = await Promise.all([
        paymentAPI.getPaymentsByRegistration(reg._id),
        invoiceAPI.getInvoicesByRegistration(reg._id),
        ledgerAPI.getLedgerByRegistration(reg._id).catch(() => null),
      ]);
      setPayments(payRes.data.data.payments || []);
      setInvoices(invRes.data.data.invoices || []);
      setLedger(ledRes?.data?.data?.ledger || null);
    } catch {
      // silent
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleSelectStudent = (student: StudentEntry) => {
    setSelectedStudent(student);
    const regs = student.registrations || [];
    if (regs.length > 0) {
      setSelectedReg(regs[0]);
      loadRegistrationDetails(regs[0]);
    } else {
      setSelectedReg(null);
    }
    setDetailTab('overview');
    setView('detail');
  };

  const handleSelectReg = (reg: Registration) => {
    setSelectedReg(reg);
    loadRegistrationDetails(reg);
    setDetailTab('overview');
  };

  const handleInitializePayment = async () => {
    if (!selectedReg) return;
    try {
      const res = await paymentAPI.initializePayment(selectedReg._id);
      toast.success(res.data.message || 'Payment initialized');
      // Reload student data
      const stuRes = await adminStudentAPI.getStudents();
      const updatedStudents = stuRes.data.data.students || [];
      setStudents(updatedStudents);
      const updatedStudent = updatedStudents.find((s: StudentEntry) => s._id === selectedStudent?._id);
      if (updatedStudent) {
        setSelectedStudent(updatedStudent);
        const updatedReg = (updatedStudent.registrations || []).find((r: Registration) => r._id === selectedReg._id);
        if (updatedReg) {
          setSelectedReg(updatedReg);
          loadRegistrationDetails(updatedReg);
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to initialize payment');
    }
  };

  const handleRequestInstallment = async (installmentNumber: number) => {
    if (!selectedReg) return;
    try {
      const res = await paymentAPI.requestInstallment(selectedReg._id, installmentNumber);
      toast.success(res.data.message || 'Installment requested');
      loadRegistrationDetails(selectedReg);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to request installment');
    }
  };

  const handleMiscCollection = async () => {
    if (!selectedStudent || !miscAmount || !miscDescription) return;
    setMiscSubmitting(true);
    try {
      await paymentAPI.createMiscCollection({
        studentId: selectedStudent.user._id,
        amount: parseFloat(miscAmount),
        description: miscDescription,
        ...(miscNotes ? { notes: { note: miscNotes } } : {}),
      });
      toast.success('Miscellaneous collection created');
      setShowMiscForm(false);
      setMiscAmount('');
      setMiscDescription('');
      setMiscNotes('');
      if (selectedReg) loadRegistrationDetails(selectedReg);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create collection');
    } finally {
      setMiscSubmitting(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      fullName(s.user).toLowerCase().includes(q) ||
      s.user.email.toLowerCase().includes(q) ||
      (s.mobileNumber && s.mobileNumber.includes(q))
    );
  });

  const getServiceName = (reg: Registration) => typeof reg.serviceId === 'object' ? reg.serviceId.name : 'Service';

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <AdminLayout user={user}>
        <div className="p-6 lg:p-8">
          {view === 'list' ? (
            // ===== Student List View =====
            <>
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Payment Management</h1>
                  <p className="mt-1 text-gray-500">Manage student payments, discounts, and invoices.</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                {/* Search */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="relative max-w-md">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search by name, email, or phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Student</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Services</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Payment Status</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Total / Paid</th>
                        <th className="text-right px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                            <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            No students found
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((s) => {
                          const regs = s.registrations || [];
                          const totalAmount = regs.reduce((sum, r) => sum + (r.totalAmount || r.paymentAmount || 0), 0);
                          const totalPaid = regs.reduce((sum, r) => sum + (r.totalPaid || 0), 0);
                          const hasPaymentIssue = regs.some(r => !r.paymentModel);
                          return (
                            <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4">
                                <p className="text-sm font-medium text-gray-900">{fullName(s.user)}</p>
                                <p className="text-xs text-gray-400">{s.user.email}</p>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-1">
                                  {regs.map((r) => (
                                    <span key={r._id} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                                      {getServiceName(r)}
                                    </span>
                                  ))}
                                  {regs.length === 0 && <span className="text-xs text-gray-400">No registrations</span>}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {regs.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {regs.map((r) => {
                                      const st = sStyle(r.paymentComplete ? 'paid' : r.paymentStatus);
                                      return (
                                        <span key={r._id} className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.text}`}>
                                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                                          {r.paymentComplete ? 'Paid' : r.paymentStatus || 'Pending'}
                                        </span>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">—</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm font-medium text-gray-900">{currency(totalAmount)}</p>
                                <p className="text-xs text-gray-500">Paid: {currency(totalPaid)}</p>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => handleSelectStudent(s)}
                                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs"
                                  disabled={regs.length === 0}
                                >
                                  Manage
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            // ===== Detail View =====
            <>
              {/* Back & Student Info */}
              <div className="mb-6">
                <button onClick={() => { setView('list'); setSelectedStudent(null); setSelectedReg(null); }} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  Back to all students
                </button>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{fullName(selectedStudent?.user)}</h1>
                    <p className="text-gray-500 text-sm">{selectedStudent?.user.email} {selectedStudent?.mobileNumber ? `· ${selectedStudent.mobileNumber}` : ''}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowMiscForm(true)}
                      className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
                    >
                      Misc Collection
                    </button>
                  </div>
                </div>
              </div>

              {/* Registration Selector */}
              {selectedStudent && (selectedStudent.registrations || []).length > 1 && (
                <div className="mb-6 flex flex-wrap gap-2">
                  {(selectedStudent.registrations || []).map((reg) => (
                    <button
                      key={reg._id}
                      onClick={() => handleSelectReg(reg)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedReg?._id === reg._id
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      {getServiceName(reg)} {reg.planTier ? `· ${reg.planTier}` : ''}
                    </button>
                  ))}
                </div>
              )}

              {selectedReg && (
                <>
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Total</p>
                      <p className="text-lg font-bold text-gray-900 mt-1">{currency(selectedReg.totalAmount)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Discounted</p>
                      <p className="text-lg font-bold text-green-600 mt-1">{currency(selectedReg.discountedAmount ?? selectedReg.totalAmount)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Paid</p>
                      <p className="text-lg font-bold text-blue-600 mt-1">{currency(selectedReg.totalPaid)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Balance</p>
                      <p className={`text-lg font-bold mt-1 ${(selectedReg.discountedAmount ?? selectedReg.totalAmount ?? 0) - (selectedReg.totalPaid ?? 0) > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                        {currency(Math.max(0, (selectedReg.discountedAmount ?? selectedReg.totalAmount ?? 0) - (selectedReg.totalPaid ?? 0)))}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Model</p>
                      <p className="text-sm font-bold text-gray-900 mt-1 capitalize">{selectedReg.paymentModel || 'Not Set'}</p>
                      {!selectedReg.paymentModel && (
                        <button onClick={handleInitializePayment} className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium underline">
                          Initialize →
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Detail Tabs */}
                  <div className="border-b border-gray-200 mb-6">
                    <nav className="flex gap-1 -mb-px">
                      {[
                        { key: 'overview' as DetailTab, label: 'Overview' },
                        { key: 'payments' as DetailTab, label: 'Payments' },
                        { key: 'invoices' as DetailTab, label: 'Invoices' },
                        { key: 'ledger' as DetailTab, label: 'Ledger' },
                      ].map((t) => (
                        <button
                          key={t.key}
                          onClick={() => setDetailTab(t.key)}
                          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${detailTab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </nav>
                  </div>

                  {/* Tab Content */}
                  {detailLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="animate-spin w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full" />
                    </div>
                  ) : (
                    <>
                      {detailTab === 'overview' && <AdminOverviewTab reg={selectedReg} onRequestInstallment={handleRequestInstallment} />}
                      {detailTab === 'payments' && <AdminPaymentsTab payments={payments} />}
                      {detailTab === 'invoices' && <AdminInvoicesTab invoices={invoices} />}
                      {detailTab === 'ledger' && <AdminLedgerTab ledger={ledger} />}
                    </>
                  )}
                </>
              )}

              {/* No registration selected */}
              {!selectedReg && selectedStudent && (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <p className="text-gray-500">No registrations found for this student.</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ===== Misc Collection Modal ===== */}
        {showMiscForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Miscellaneous Collection</h3>
                <p className="text-sm text-gray-500">Create a manual payment entry for {fullName(selectedStudent?.user)}</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                  <input type="number" value={miscAmount} onChange={(e) => setMiscAmount(e.target.value)} min="1" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter amount" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <input type="text" value={miscDescription} onChange={(e) => setMiscDescription(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. Application fee, Document charges" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                  <textarea value={miscNotes} onChange={(e) => setMiscNotes(e.target.value)} rows={3} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none" placeholder="Additional notes..." />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button onClick={() => setShowMiscForm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                <button onClick={handleMiscCollection} disabled={miscSubmitting || !miscAmount || !miscDescription} className="px-4 py-2 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50">
                  {miscSubmitting ? 'Creating...' : 'Create Collection'}
                </button>
              </div>
            </div>
          </div>
        )}

      </AdminLayout>
    </>
  );
}

// ===== Admin Overview Tab =====
function AdminOverviewTab({ reg, onRequestInstallment }: { reg: Registration; onRequestInstallment: (n: number) => void }) {
  if (reg.paymentModel === 'installment' && reg.installmentPlan) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Installment Schedule</h3>
            <p className="text-sm text-gray-500">{reg.installmentPlan.completedInstallments} of {reg.installmentPlan.totalInstallments} completed</p>
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {reg.installmentPlan.schedule.map((inst) => (
            <div key={inst.number} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${inst.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {inst.status === 'paid' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  ) : inst.number}
                </div>
                <div>
                  <p className="font-medium text-gray-900">Installment #{inst.number} <span className="text-gray-400 font-normal">({inst.percentage}%)</span></p>
                  {inst.paidAt && <p className="text-xs text-gray-400">Paid: {fmtDate(inst.paidAt)}</p>}
                  {inst.dueDate && inst.status !== 'paid' && <p className="text-xs text-gray-400">Due: {fmtDate(inst.dueDate)}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-semibold text-gray-900">{currency(inst.amount)}</p>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${inst.status === 'paid' ? 'bg-green-100 text-green-700' : inst.status === 'due' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                  {inst.status.charAt(0).toUpperCase() + inst.status.slice(1)}
                </span>
                {inst.status === 'pending' && (
                  <button onClick={() => onRequestInstallment(inst.number)} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
                    Mark Due
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-4">Registration Details</h3>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Service</p>
          <p className="text-sm font-medium text-gray-900">{typeof reg.serviceId === 'object' ? reg.serviceId.name : '—'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Plan</p>
          <p className="text-sm font-medium text-gray-900">{reg.planTier || '—'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Payment Model</p>
          <p className="text-sm font-medium text-gray-900 capitalize">{reg.paymentModel || 'Not initialized'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Status</p>
          <p className={`text-sm font-semibold ${reg.paymentComplete ? 'text-green-600' : 'text-amber-600'}`}>{reg.paymentComplete ? 'Complete' : reg.paymentStatus || 'Pending'}</p>
        </div>
      </div>
    </div>
  );
}

// ===== Admin Payments Tab =====
function AdminPaymentsTab({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-gray-400">No payments recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Description</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Razorpay ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments.map((p) => {
              const st = sStyle(p.status);
              return (
                <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-sm text-gray-700 whitespace-nowrap">{fmtDate(p.paidAt || p.createdAt)}</td>
                  <td className="px-6 py-3 text-sm text-gray-900">{p.description || `Installment #${p.installmentNumber}`}</td>
                  <td className="px-6 py-3"><span className={`px-2 py-0.5 text-xs font-medium rounded-full ${p.type === 'miscellaneous' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>{p.type === 'miscellaneous' ? 'Misc' : 'Service'}</span></td>
                  <td className="px-6 py-3 text-sm font-semibold text-gray-900 text-right">{currency(p.amountInr)}</td>
                  <td className="px-6 py-3"><span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.text}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{p.status}</span></td>
                  <td className="px-6 py-3 text-xs text-gray-400 font-mono">{p.razorpayPaymentId || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== Admin Invoices Tab =====
function AdminInvoicesTab({ invoices }: { invoices: Invoice[] }) {
  if (invoices.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-gray-400">No invoices generated yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {invoices.map((inv) => (
        <div key={inv._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">{inv.invoiceNumber}</p>
              <p className="text-sm text-gray-500">{inv.type === 'proforma' ? 'Proforma' : 'Tax Invoice'} · {inv.serviceName} · {inv.planTier}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-900">{currency(inv.grandTotal)}</p>
              <p className="text-xs text-gray-400">{fmtDate(inv.issuedAt)}</p>
            </div>
          </div>
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 grid grid-cols-5 gap-4 text-xs">
            <div><span className="text-gray-400">Subtotal</span><p className="font-medium text-gray-700">{currency(inv.totalAmount)}</p></div>
            <div><span className="text-gray-400">Discount</span><p className="font-medium text-green-600">{inv.discountAmount > 0 ? `-${currency(inv.discountAmount)}` : '—'}</p></div>
            <div><span className="text-gray-400">Taxable</span><p className="font-medium text-gray-700">{currency(inv.taxableAmount)}</p></div>
            <div><span className="text-gray-400">GST ({inv.gstRate}%)</span><p className="font-medium text-gray-700">{currency(inv.gstAmount)}</p></div>
            <div><span className="text-gray-400">Status</span><p className={`font-medium ${inv.status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>{inv.status}</p></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ===== Admin Ledger Tab =====
function AdminLedgerTab({ ledger }: { ledger: Ledger | null }) {
  if (!ledger) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-gray-400">No ledger entries yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Service Amount', value: ledger.totalServiceAmount, color: 'text-gray-900' },
          { label: 'Discount', value: ledger.totalDiscount, color: 'text-green-600' },
          { label: 'Net Payable', value: ledger.netPayable, color: 'text-blue-600' },
          { label: 'Total Paid', value: ledger.totalPaid, color: 'text-green-600' },
          { label: 'Balance', value: ledger.balance, color: ledger.balance > 0 ? 'text-amber-600' : 'text-green-600' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{item.label}</p>
            <p className={`text-lg font-bold mt-1 ${item.color}`}>{currency(item.value)}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Description</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Debit</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Credit</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ledger.entries.map((e, i) => (
                <tr key={e._id || i} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm text-gray-700 whitespace-nowrap">{fmtDate(e.date)}</td>
                  <td className="px-6 py-3"><span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 capitalize">{e.type}</span></td>
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

