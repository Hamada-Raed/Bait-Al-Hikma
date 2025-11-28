import React, { useState, useEffect } from 'react';
import { ensureCsrfToken } from '../utils/csrf';

const API_BASE_URL = 'http://localhost:8000/api';

interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
}

interface PaymentRecord {
  id: number;
  student: {
    first_name?: string;
    last_name?: string;
    email: string;
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
    title?: string;
  };
}

interface Earnings {
  total_earnings: string;
  pending_payouts: string;
  paid_payouts: string;
  available_for_payout: string;
  total_payments: number;
}

interface TeacherPaymentInfo {
  id?: number;
  bank_name?: string;
  account_number?: string;
  account_holder_name?: string;
  iban?: string;
  branch_name?: string;
  swift_code?: string;
  is_verified?: boolean;
}

interface TeacherPaymentRecordsProps {
  user: User;
  getText: (en: string, ar: string) => string;
}

const TeacherPaymentRecords: React.FC<TeacherPaymentRecordsProps> = ({ user, getText }) => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState<TeacherPaymentInfo | null>(null);
  const [showBankForm, setShowBankForm] = useState(false);
  const [bankFormData, setBankFormData] = useState<TeacherPaymentInfo>({
    bank_name: '',
    account_number: '',
    account_holder_name: '',
    iban: '',
    branch_name: '',
    swift_code: '',
  });
  const [savingBankInfo, setSavingBankInfo] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchPayments();
    fetchEarnings();
    fetchPaymentInfo();
  }, []);

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (showSuccessMessage) {
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessMessage]);

  const fetchPayments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/payments/`, {
        credentials: 'include',
      });
      const data = await response.json();
      setPayments(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEarnings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/payments/my_earnings/`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setEarnings(data);
      }
    } catch (error) {
      console.error('Error fetching earnings:', error);
    }
  };

  const fetchPaymentInfo = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/teacher-payment-info/`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        // Handle both array and object responses
        const paymentInfoData = Array.isArray(data) ? (data.length > 0 ? data[0] : null) : data;
        
        if (paymentInfoData) {
          setPaymentInfo(paymentInfoData);
          setBankFormData({
            bank_name: paymentInfoData.bank_name || '',
            account_number: paymentInfoData.account_number || '',
            account_holder_name: paymentInfoData.account_holder_name || '',
            iban: paymentInfoData.iban || '',
            branch_name: paymentInfoData.branch_name || '',
            swift_code: paymentInfoData.swift_code || '',
          });
        } else {
          // Reset form if no payment info exists
          setPaymentInfo(null);
          setBankFormData({
            bank_name: '',
            account_number: '',
            account_holder_name: '',
            iban: '',
            branch_name: '',
            swift_code: '',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching payment info:', error);
    }
  };

  const handleSaveBankInfo = async () => {
    // Validate required fields
    if (!bankFormData.bank_name || !bankFormData.bank_name.trim()) {
      setSuccessMessage(getText('Bank name is required.', 'اسم البنك مطلوب.'));
      setShowSuccessMessage(true);
      return;
    }
    if (!bankFormData.account_number || !bankFormData.account_number.trim()) {
      setSuccessMessage(getText('Account number is required.', 'رقم الحساب مطلوب.'));
      setShowSuccessMessage(true);
      return;
    }
    if (!bankFormData.account_holder_name || !bankFormData.account_holder_name.trim()) {
      setSuccessMessage(getText('Account holder name is required.', 'اسم صاحب الحساب مطلوب.'));
      setShowSuccessMessage(true);
      return;
    }

    setSavingBankInfo(true);
    try {
      const csrfToken = await ensureCsrfToken();
      // Always use POST - backend handles create/update automatically
      const url = `${API_BASE_URL}/teacher-payment-info/`;

      // Prepare data - ensure we send all required fields with trimmed values
      const dataToSend: any = {
        bank_name: bankFormData.bank_name.trim(),
        account_number: bankFormData.account_number.trim().replace(/\s/g, ''), // Remove spaces
        account_holder_name: bankFormData.account_holder_name.trim(),
      };
      
      // Add optional fields only if they have values
      if (bankFormData.iban && bankFormData.iban.trim()) {
        dataToSend.iban = bankFormData.iban.trim();
      }
      if (bankFormData.branch_name && bankFormData.branch_name.trim()) {
        dataToSend.branch_name = bankFormData.branch_name.trim();
      }
      if (bankFormData.swift_code && bankFormData.swift_code.trim()) {
        dataToSend.swift_code = bankFormData.swift_code.trim();
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        // Reload payment info from server to ensure we have the latest data
        await fetchPaymentInfo();
        setShowBankForm(false);
        // Show styled success message
        setSuccessMessage(getText('Bank information saved successfully!', 'تم حفظ معلومات البنك بنجاح!'));
        setShowSuccessMessage(true);
      } else {
        const errorData = await response.json();
        const errorMsg = errorData.error || errorData.detail || getText('Error saving bank information.', 'خطأ في حفظ معلومات البنك.');
        setSuccessMessage(errorMsg);
        setShowSuccessMessage(true);
        console.error('Error:', errorData);
      }
    } catch (error) {
      console.error('Error saving bank info:', error);
      setSuccessMessage(getText('An error occurred. Please try again.', 'حدث خطأ. يرجى المحاولة مرة أخرى.'));
      setShowSuccessMessage(true);
    } finally {
      setSavingBankInfo(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(
      getText('en-US', 'ar-SA') as 'en-US' | 'ar-SA',
      { year: 'numeric', month: 'short', day: 'numeric' }
    );
  };

  // Format account number with spaces every 4 digits
  const formatAccountNumber = (value: string): string => {
    if (!value) return '';
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    // Limit to 16 digits
    const limited = digits.slice(0, 16);
    // Add space every 4 digits using regex that only matches digits
    return limited.match(/.{1,4}/g)?.join(' ') || limited;
  };

  // Handle account number input change
  const handleAccountNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Remove all non-digit characters
    const digits = inputValue.replace(/\D/g, '');
    // Limit to 16 digits
    const rawDigits = digits.slice(0, 16);
    // Store raw digits (without spaces) for backend
    setBankFormData({ ...bankFormData, account_number: rawDigits });
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
      {/* Success/Error Message Modal */}
      {showSuccessMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm" onClick={() => setShowSuccessMessage(false)}>
          <div className="bg-dark-100 rounded-xl border border-dark-300 p-8 max-w-md w-full mx-4 shadow-2xl transform transition-all" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
                successMessage.includes('successfully') || successMessage.includes('نجاح')
                  ? 'bg-green-500/20' 
                  : 'bg-red-500/20'
              }`}>
                {successMessage.includes('successfully') || successMessage.includes('نجاح') ? (
                  <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <h3 className={`text-2xl font-bold mb-3 ${
                successMessage.includes('successfully') || successMessage.includes('نجاح')
                  ? 'text-green-400' 
                  : 'text-red-400'
              }`}>
                {successMessage.includes('successfully') || successMessage.includes('نجاح')
                  ? getText('Success', 'نجح')
                  : getText('Error', 'خطأ')}
              </h3>
              <p className="text-gray-300 mb-6 text-lg">
                {successMessage}
              </p>
              <button
                onClick={() => setShowSuccessMessage(false)}
                className={`px-8 py-3 rounded-lg transition-all font-semibold ${
                  successMessage.includes('successfully') || successMessage.includes('نجاح')
                    ? 'bg-primary-500 hover:bg-primary-600 text-white' 
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {getText('OK', 'موافق')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Message Section - Show when teacher has no payments yet */}
      {!loading && payments.length === 0 && (
        <div className="bg-gradient-to-r from-primary-500/20 to-accent-purple/20 rounded-xl p-8 border border-primary-500/30">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-500/20 mb-4">
              <svg
                className="w-8 h-8 text-primary-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              <span className="bg-gradient-to-r from-primary-400 to-accent-purple bg-clip-text text-transparent">
                {getText('Welcome to Payment Center', 'مرحباً بكم في مركز المدفوعات')}
              </span>
            </h2>
            <p className="text-gray-300 max-w-2xl mx-auto text-lg mb-2">
              {getText(
                'Manage your earnings and payment information all in one place.',
                'قم بإدارة أرباحك ومعلومات الدفع في مكان واحد.'
              )}
            </p>
            <p className="text-gray-400 max-w-xl mx-auto text-sm">
              {getText(
                paymentInfo 
                  ? 'Your payment records will appear here once students book and pay for your lessons.'
                  : 'Start by adding your bank information below to receive payments from students.',
                paymentInfo
                  ? 'ستظهر سجلات المدفوعات الخاصة بك هنا بمجرد حجز الطلاب ودفعهم لدروسك.'
                  : 'ابدأ بإضافة معلومات البنك الخاصة بك أدناه لتلقي المدفوعات من الطلاب.'
              )}
            </p>
          </div>
        </div>
      )}

      {/* Earnings Summary Cards */}
      {earnings && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-dark-200 rounded-lg p-4 border border-dark-300">
            <p className="text-gray-400 text-sm mb-1">{getText('Total Earnings', 'إجمالي الأرباح')}</p>
            <p className="text-2xl font-bold text-white">{parseFloat(earnings.total_earnings).toFixed(2)}</p>
          </div>
          <div className="bg-dark-200 rounded-lg p-4 border border-dark-300">
            <p className="text-gray-400 text-sm mb-1">{getText('Pending Payouts', 'المدفوعات المعلقة')}</p>
            <p className="text-2xl font-bold text-yellow-400">{parseFloat(earnings.pending_payouts).toFixed(2)}</p>
          </div>
          <div className="bg-dark-200 rounded-lg p-4 border border-dark-300">
            <p className="text-gray-400 text-sm mb-1">{getText('Paid Out', 'المدفوع')}</p>
            <p className="text-2xl font-bold text-green-400">{parseFloat(earnings.paid_payouts).toFixed(2)}</p>
          </div>
          <div className="bg-dark-200 rounded-lg p-4 border border-dark-300">
            <p className="text-gray-400 text-sm mb-1">{getText('Available', 'متاح')}</p>
            <p className="text-2xl font-bold text-primary-400">{parseFloat(earnings.available_for_payout).toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Bank Information Section */}
      <div className="bg-dark-100 rounded-lg border border-dark-300 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">
            {getText('Bank Information', 'معلومات البنك')}
          </h3>
          <button
            onClick={() => setShowBankForm(!showBankForm)}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            {showBankForm ? getText('Cancel', 'إلغاء') : paymentInfo ? getText('Edit', 'تعديل') : getText('Add', 'إضافة')}
          </button>
        </div>

        {showBankForm ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {getText('Bank Name', 'اسم البنك')}
                </label>
                <input
                  type="text"
                  value={bankFormData.bank_name || ''}
                  onChange={(e) => setBankFormData({ ...bankFormData, bank_name: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-200 border border-dark-300 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder={getText('Enter bank name', 'أدخل اسم البنك')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {getText('Account Number', 'رقم الحساب')} {getText('(16 digits)', '(16 رقم)')}
                </label>
                <input
                  type="text"
                  value={formatAccountNumber(bankFormData.account_number || '')}
                  onChange={handleAccountNumberChange}
                  maxLength={19} // 16 digits + 3 spaces
                  className="w-full px-3 py-2 bg-dark-200 border border-dark-300 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono tracking-wider"
                  placeholder={getText('1234 5678 9012 3456', '1234 5678 9012 3456')}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {getText('Format: 4 digits, space, 4 digits, space...', 'التنسيق: 4 أرقام، مسافة، 4 أرقام، مسافة...')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {getText('Account Holder Name', 'اسم صاحب الحساب')}
                </label>
                <input
                  type="text"
                  value={bankFormData.account_holder_name || ''}
                  onChange={(e) => setBankFormData({ ...bankFormData, account_holder_name: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-200 border border-dark-300 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder={getText('Enter account holder name', 'أدخل اسم صاحب الحساب')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {getText('IBAN', 'IBAN')} {getText('(Optional)', '(اختياري)')}
                </label>
                <input
                  type="text"
                  value={bankFormData.iban || ''}
                  onChange={(e) => setBankFormData({ ...bankFormData, iban: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-200 border border-dark-300 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder={getText('Enter IBAN', 'أدخل IBAN')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {getText('Branch Name', 'اسم الفرع')} {getText('(Optional)', '(اختياري)')}
                </label>
                <input
                  type="text"
                  value={bankFormData.branch_name || ''}
                  onChange={(e) => setBankFormData({ ...bankFormData, branch_name: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-200 border border-dark-300 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder={getText('Enter branch name', 'أدخل اسم الفرع')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {getText('SWIFT Code', 'رمز SWIFT')} {getText('(Optional)', '(اختياري)')}
                </label>
                <input
                  type="text"
                  value={bankFormData.swift_code || ''}
                  onChange={(e) => setBankFormData({ ...bankFormData, swift_code: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-200 border border-dark-300 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder={getText('Enter SWIFT code', 'أدخل رمز SWIFT')}
                />
              </div>
            </div>
            <button
              onClick={handleSaveBankInfo}
              disabled={savingBankInfo}
              className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {savingBankInfo ? getText('Saving...', 'جاري الحفظ...') : getText('Save', 'حفظ')}
            </button>
          </div>
        ) : (
          paymentInfo ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
              <div>
                <span className="text-gray-400">{getText('Bank:', 'البنك:')} </span>
                <span className="text-white">{paymentInfo.bank_name}</span>
              </div>
              <div>
                <span className="text-gray-400">{getText('Account Number:', 'رقم الحساب:')} </span>
                <span className="text-white">****{paymentInfo.account_number?.slice(-4)}</span>
              </div>
              <div>
                <span className="text-gray-400">{getText('Account Holder:', 'صاحب الحساب:')} </span>
                <span className="text-white">{paymentInfo.account_holder_name}</span>
              </div>
              {paymentInfo.iban && (
                <div>
                  <span className="text-gray-400">{getText('IBAN:', 'IBAN:')} </span>
                  <span className="text-white">{paymentInfo.iban}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-500/10 mb-4">
                <svg
                  className="w-8 h-8 text-primary-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {getText('No Bank Information', 'لا توجد معلومات بنكية')}
              </h3>
              <p className="text-gray-400 max-w-md mx-auto">
                {getText(
                  'Add your bank details to receive payments. Your information is kept secure and private.',
                  'أضف تفاصيل البنك الخاصة بك لتلقي المدفوعات. معلوماتك محفوظة بشكل آمن وسري.'
                )}
              </p>
            </div>
          )
        )}
      </div>

      {/* Payment Records Table */}
      <div className="bg-dark-100 rounded-lg border border-dark-300 overflow-hidden">
        <div className="p-4 border-b border-dark-300">
          <h3 className="text-lg font-semibold text-white">
            {getText('Payment Records', 'سجل المدفوعات')}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">{getText('Date', 'التاريخ')}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">{getText('Student', 'الطالب')}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">{getText('Lesson', 'الدرس')}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">{getText('Amount', 'المبلغ')}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">{getText('Commission', 'العمولة')}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">{getText('Your Share', 'حصتك')}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">{getText('Status', 'الحالة')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-300">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-500/10 mb-4">
                        <svg
                          className="w-8 h-8 text-primary-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        {getText('No Payment Records', 'لا توجد سجلات مدفوعات')}
                      </h3>
                      <p className="text-gray-400 max-w-md mx-auto">
                        {getText(
                          'Payment records will appear here once students book and pay for your lessons.',
                          'ستظهر سجلات المدفوعات هنا بمجرد حجز الطلاب ودفعهم لدروسك.'
                        )}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-dark-200">
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {formatDate(payment.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-white">
                      {payment.student.first_name && payment.student.last_name
                        ? `${payment.student.first_name} ${payment.student.last_name}`
                        : payment.student.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {payment.availability_details
                        ? `${payment.availability_details.date} ${payment.availability_details.start_hour}:00`
                        : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-white">
                      {parseFloat(payment.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-yellow-400">
                      {parseFloat(payment.commission_amount).toFixed(2)}
                    </td>
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeacherPaymentRecords;

