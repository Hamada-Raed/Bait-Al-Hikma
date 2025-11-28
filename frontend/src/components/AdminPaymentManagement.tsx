import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { ensureCsrfToken } from '../utils/csrf';

const API_BASE_URL = 'http://localhost:8000/api';

interface PaymentSummary {
  total_revenue: string;
  total_commission: string;
  total_pending_payouts: string;
  pending_count: number;
  teacher_summary: Array<{
    teacher__id: number;
    teacher__email: string;
    teacher__first_name?: string;
    teacher__last_name?: string;
    total_amount: string;
    count: number;
  }>;
}

interface Payment {
  id: number;
  student: {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  teacher: {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  amount: string;
  commission_amount: string;
  teacher_payout_amount: string;
  status: string;
  created_at: string;
  availability_details?: {
    id: number;
    date: string;
    start_hour: number;
    end_hour: number;
  };
}

interface PaymentReceipt extends Payment {
  student_info: {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  teacher_info: {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  payout_info?: {
    id: number;
    status: string;
    paid_at?: string;
    transfer_reference?: string;
    admin_notes?: string;
  };
}

interface TeacherPayoutSummary {
  teacher__id: number;
  teacher__email: string;
  teacher__first_name?: string;
  teacher__last_name?: string;
  total_amount: string;
  total_commission: string;
  total_payout: string;
  payment_count: number;
  pending_payout_amount: string;
  net_payout_due: string;
}

interface Payout {
  id: number;
  payment: number;
  teacher: {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  amount: string;
  status: string;
  paid_by?: number;
  paid_at?: string;
  transfer_reference?: string;
  admin_notes?: string;
  payment_details?: {
    id: number;
    amount: string;
    student: string;
    created_at: string;
  };
}

const AdminPaymentManagement: React.FC = () => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const getText = (en: string, ar: string) => (isArabic ? ar : en);

  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [teacherPayouts, setTeacherPayouts] = useState<TeacherPayoutSummary[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<number | null>(null);
  const [teacherPayoutDetails, setTeacherPayoutDetails] = useState<Payout[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'payouts'>('overview');
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [transferRef, setTransferRef] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [markingPaid, setMarkingPaid] = useState(false);

  useEffect(() => {
    fetchSummary();
    fetchAllPayments();
    fetchTeacherPayouts();
  }, []);

  useEffect(() => {
    if (selectedTeacher) {
      fetchTeacherPayoutDetails(selectedTeacher);
    }
  }, [selectedTeacher]);

  const fetchSummary = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/payment-management/summary/`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const fetchAllPayments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/payment-management/all_payments/`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setPayments(Array.isArray(data) ? data : data.results || []);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherPayouts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/payment-management/payout_by_teacher/`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setTeacherPayouts(data);
      }
    } catch (error) {
      console.error('Error fetching teacher payouts:', error);
    }
  };

  const fetchTeacherPayoutDetails = async (teacherId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/payouts/?teacher=${teacherId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setTeacherPayoutDetails(Array.isArray(data) ? data : data.results || []);
      }
    } catch (error) {
      console.error('Error fetching payout details:', error);
    }
  };

  const fetchReceipt = async (paymentId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/payments/${paymentId}/receipt/`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedReceipt(data);
      }
    } catch (error) {
      console.error('Error fetching receipt:', error);
    }
  };

  const handleMarkPaid = async () => {
    if (!selectedPayout) return;

    setMarkingPaid(true);
    try {
      const csrfToken = await ensureCsrfToken();
      const response = await fetch(`${API_BASE_URL}/payouts/${selectedPayout.id}/mark_as_paid/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
        body: JSON.stringify({
          transfer_reference: transferRef,
          admin_notes: adminNotes,
        }),
      });

      if (response.ok) {
        setShowMarkPaidModal(false);
        setTransferRef('');
        setAdminNotes('');
        fetchSummary();
        fetchTeacherPayouts();
        if (selectedTeacher) {
          fetchTeacherPayoutDetails(selectedTeacher);
        }
        alert(getText('Payout marked as paid successfully!', 'تم تحديد الدفع كمدفوع بنجاح!'));
      } else {
        const errorData = await response.json();
        alert(getText('Error marking payout as paid.', 'خطأ في تحديد الدفع كمدفوع.'));
        console.error('Error:', errorData);
      }
    } catch (error) {
      console.error('Error marking payout as paid:', error);
      alert(getText('An error occurred.', 'حدث خطأ.'));
    } finally {
      setMarkingPaid(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(
      isArabic ? 'ar-SA' : 'en-US',
      { year: 'numeric', month: 'short', day: 'numeric' }
    );
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-dark-400">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 font-medium text-sm transition-colors ${
            activeTab === 'overview'
              ? 'text-primary-400 border-b-2 border-primary-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          {getText('Overview', 'نظرة عامة')}
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-6 py-3 font-medium text-sm transition-colors ${
            activeTab === 'payments'
              ? 'text-primary-400 border-b-2 border-primary-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          {getText('All Payments', 'جميع المدفوعات')}
        </button>
        <button
          onClick={() => setActiveTab('payouts')}
          className={`px-6 py-3 font-medium text-sm transition-colors ${
            activeTab === 'payouts'
              ? 'text-primary-400 border-b-2 border-primary-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          {getText('Payouts', 'المدفوعات للمعلمين')}
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && summary && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-dark-200 rounded-lg p-4 border border-dark-300">
              <p className="text-gray-400 text-sm mb-1">{getText('Total Revenue', 'إجمالي الإيرادات')}</p>
              <p className="text-2xl font-bold text-white">{parseFloat(summary.total_revenue).toFixed(2)}</p>
            </div>
            <div className="bg-dark-200 rounded-lg p-4 border border-dark-300">
              <p className="text-gray-400 text-sm mb-1">{getText('Total Commission', 'إجمالي العمولة')}</p>
              <p className="text-2xl font-bold text-yellow-400">{parseFloat(summary.total_commission).toFixed(2)}</p>
            </div>
            <div className="bg-dark-200 rounded-lg p-4 border border-dark-300">
              <p className="text-gray-400 text-sm mb-1">{getText('Pending Payouts', 'المدفوعات المعلقة')}</p>
              <p className="text-2xl font-bold text-primary-400">{parseFloat(summary.total_pending_payouts).toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">{summary.pending_count} {getText('payouts', 'مدفوعات')}</p>
            </div>
          </div>

          {/* Teacher Summary */}
          {summary.teacher_summary.length > 0 && (
            <div className="bg-dark-100 rounded-lg border border-dark-300 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                {getText('Teachers with Pending Payouts', 'المعلمون مع مدفوعات معلقة')}
              </h3>
              <div className="space-y-2">
                {summary.teacher_summary.map((teacher) => (
                  <div
                    key={teacher.teacher__id}
                    className="flex justify-between items-center p-3 bg-dark-200 rounded border border-dark-300"
                  >
                    <div>
                      <p className="text-white font-medium">
                        {teacher.teacher__first_name && teacher.teacher__last_name
                          ? `${teacher.teacher__first_name} ${teacher.teacher__last_name}`
                          : teacher.teacher__email}
                      </p>
                      <p className="text-sm text-gray-400">{teacher.teacher__email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-primary-400 font-semibold">{parseFloat(teacher.total_amount).toFixed(2)}</p>
                      <p className="text-xs text-gray-400">{teacher.count} {getText('payouts', 'مدفوعات')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* All Payments Tab */}
      {activeTab === 'payments' && (
        <div className="bg-dark-100 rounded-lg border border-dark-300 overflow-hidden">
          <div className="p-4 border-b border-dark-300">
            <h3 className="text-lg font-semibold text-white">{getText('All Payments', 'جميع المدفوعات')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">{getText('Date', 'التاريخ')}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">{getText('Student', 'الطالب')}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">{getText('Teacher', 'المعلم')}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">{getText('Amount', 'المبلغ')}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">{getText('Commission', 'العمولة')}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">{getText('Teacher Payout', 'دفع المعلم')}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">{getText('Status', 'الحالة')}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">{getText('Actions', 'الإجراءات')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-300">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      {getText('No payments found.', 'لا توجد مدفوعات.')}
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-dark-200">
                      <td className="px-4 py-3 text-sm text-gray-300">{formatDate(payment.created_at)}</td>
                      <td className="px-4 py-3 text-sm text-white">
                        {payment.student.first_name && payment.student.last_name
                          ? `${payment.student.first_name} ${payment.student.last_name}`
                          : payment.student.email}
                      </td>
                      <td className="px-4 py-3 text-sm text-white">
                        {payment.teacher.first_name && payment.teacher.last_name
                          ? `${payment.teacher.first_name} ${payment.teacher.last_name}`
                          : payment.teacher.email}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-white">{parseFloat(payment.amount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right text-yellow-400">{parseFloat(payment.commission_amount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right text-green-400 font-semibold">
                        {parseFloat(payment.teacher_payout_amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            payment.status === 'completed'
                              ? 'bg-green-500/20 text-green-400'
                              : payment.status === 'pending'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => fetchReceipt(payment.id)}
                          className="px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white rounded text-xs transition-colors"
                        >
                          {getText('Receipt', 'الإيصال')}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payouts Tab */}
      {activeTab === 'payouts' && (
        <div className="space-y-6">
          <div className="bg-dark-100 rounded-lg border border-dark-300 overflow-hidden">
            <div className="p-4 border-b border-dark-300">
              <h3 className="text-lg font-semibold text-white">{getText('Teacher Payout Summary', 'ملخص مدفوعات المعلمين')}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-dark-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">{getText('Teacher', 'المعلم')}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">{getText('Total Payments', 'إجمالي المدفوعات')}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">{getText('Total Commission', 'إجمالي العمولة')}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">{getText('Total Payout', 'إجمالي الدفع')}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">{getText('Pending', 'معلق')}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">{getText('Net Due', 'الصافي المستحق')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">{getText('Actions', 'الإجراءات')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-300">
                  {teacherPayouts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                        {getText('No payouts found.', 'لا توجد مدفوعات.')}
                      </td>
                    </tr>
                  ) : (
                    teacherPayouts.map((item) => (
                      <tr key={item.teacher__id} className="hover:bg-dark-200">
                        <td className="px-4 py-3 text-sm text-white">
                          {item.teacher__first_name && item.teacher__last_name
                            ? `${item.teacher__first_name} ${item.teacher__last_name}`
                            : item.teacher__email}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-300">{item.payment_count}</td>
                        <td className="px-4 py-3 text-sm text-right text-yellow-400">{parseFloat(item.total_commission).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-right text-white">{parseFloat(item.total_payout).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-right text-yellow-400">{parseFloat(item.pending_payout_amount).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-right text-green-400 font-semibold">{parseFloat(item.net_payout_due).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelectedTeacher(item.teacher__id)}
                            className="px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white rounded text-xs transition-colors"
                          >
                            {getText('View Details', 'عرض التفاصيل')}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Teacher Payout Details */}
          {selectedTeacher && teacherPayoutDetails.length > 0 && (
            <div className="bg-dark-100 rounded-lg border border-dark-300 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">
                  {getText('Pending Payouts', 'المدفوعات المعلقة')}
                </h3>
                <button
                  onClick={() => setSelectedTeacher(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-2">
                {teacherPayoutDetails
                  .filter((p) => p.status === 'pending')
                  .map((payout) => (
                    <div
                      key={payout.id}
                      className="flex justify-between items-center p-3 bg-dark-200 rounded border border-dark-300"
                    >
                      <div>
                        <p className="text-white">
                          {getText('Payment #', 'الدفع #')}
                          {payout.payment} - {parseFloat(payout.amount).toFixed(2)}
                        </p>
                        {payout.payment_details && (
                          <p className="text-sm text-gray-400">
                            {getText('From:', 'من:')} {payout.payment_details.student}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setSelectedPayout(payout);
                          setShowMarkPaidModal(true);
                        }}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                      >
                        {getText('Mark as Paid', 'تحديد كمدفوع')}
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-dark-100 rounded-lg border border-dark-300 p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">{getText('Payment Receipt', 'إيصال الدفع')}</h2>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-gray-400">{getText('Receipt #', 'رقم الإيصال')}: PAY-{selectedReceipt.id}</p>
                <p className="text-gray-400">{getText('Date:', 'التاريخ:')} {formatDate(selectedReceipt.created_at)}</p>
              </div>
              <div className="border-t border-dark-300 pt-4">
                <h3 className="font-semibold text-white mb-2">{getText('Student Information', 'معلومات الطالب')}</h3>
                <p className="text-gray-300">
                  {selectedReceipt.student_info.first_name} {selectedReceipt.student_info.last_name}
                </p>
                <p className="text-gray-400 text-sm">{selectedReceipt.student_info.email}</p>
              </div>
              <div className="border-t border-dark-300 pt-4">
                <h3 className="font-semibold text-white mb-2">{getText('Teacher Information', 'معلومات المعلم')}</h3>
                <p className="text-gray-300">
                  {selectedReceipt.teacher_info.first_name} {selectedReceipt.teacher_info.last_name}
                </p>
                <p className="text-gray-400 text-sm">{selectedReceipt.teacher_info.email}</p>
              </div>
              <div className="border-t border-dark-300 pt-4">
                <h3 className="font-semibold text-white mb-2">{getText('Payment Breakdown', 'تفاصيل الدفع')}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">{getText('Lesson Fee:', 'رسوم الدرس:')}</span>
                    <span className="text-white">{parseFloat(selectedReceipt.amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">{getText('Platform Commission:', 'عمولة المنصة:')}</span>
                    <span className="text-yellow-400">-{parseFloat(selectedReceipt.commission_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-dark-300 pt-2">
                    <span className="text-white font-semibold">{getText('Teacher Payout:', 'دفع المعلم:')}</span>
                    <span className="text-green-400 font-bold">{parseFloat(selectedReceipt.teacher_payout_amount).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              {selectedReceipt.payout_info && (
                <div className="border-t border-dark-300 pt-4">
                  <h3 className="font-semibold text-white mb-2">{getText('Payout Status', 'حالة الدفع')}</h3>
                  <p className="text-gray-300">
                    {getText('Status:', 'الحالة:')} <span className="capitalize">{selectedReceipt.payout_info.status}</span>
                  </p>
                  {selectedReceipt.payout_info.paid_at && (
                    <p className="text-gray-300 text-sm">
                      {getText('Paid at:', 'تم الدفع في:')} {formatDate(selectedReceipt.payout_info.paid_at)}
                    </p>
                  )}
                  {selectedReceipt.payout_info.transfer_reference && (
                    <p className="text-gray-300 text-sm">
                      {getText('Transfer Reference:', 'رقم التحويل:')} {selectedReceipt.payout_info.transfer_reference}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mark as Paid Modal */}
      {showMarkPaidModal && selectedPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-dark-100 rounded-lg border border-dark-300 p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-white mb-4">{getText('Mark Payout as Paid', 'تحديد الدفع كمدفوع')}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {getText('Transfer Reference', 'رقم التحويل')} {getText('(Optional)', '(اختياري)')}
                </label>
                <input
                  type="text"
                  value={transferRef}
                  onChange={(e) => setTransferRef(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-200 border border-dark-300 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder={getText('Enter transfer reference', 'أدخل رقم التحويل')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {getText('Notes', 'ملاحظات')} {getText('(Optional)', '(اختياري)')}
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-dark-200 border border-dark-300 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder={getText('Add notes about the transfer', 'أضف ملاحظات حول التحويل')}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowMarkPaidModal(false);
                    setTransferRef('');
                    setAdminNotes('');
                  }}
                  className="flex-1 py-2 border border-dark-300 text-gray-300 rounded-lg hover:bg-dark-200 transition-colors"
                >
                  {getText('Cancel', 'إلغاء')}
                </button>
                <button
                  onClick={handleMarkPaid}
                  disabled={markingPaid}
                  className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {markingPaid ? getText('Saving...', 'جاري الحفظ...') : getText('Mark as Paid', 'تحديد كمدفوع')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPaymentManagement;

