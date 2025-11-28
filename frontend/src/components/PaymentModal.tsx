import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { ensureCsrfToken } from '../utils/csrf';

const API_BASE_URL = 'http://localhost:8000/api';

interface Availability {
  id: number;
  date: string;
  start_hour: number;
  end_hour: number;
  title?: string;
  teacher: {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  availability: Availability | null;
  amount: number;
  currencySymbol?: string;
  onPaymentSuccess?: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  availability,
  amount,
  currencySymbol = 'JOD',
  onPaymentSuccess,
}) => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'credit_card' | 'wallet'>('bank_transfer');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getText = (en: string, ar: string) => (isArabic ? ar : en);

  const handlePayment = async () => {
    if (!availability) return;

    setIsProcessing(true);
    setError(null);

    try {
      const csrfToken = await ensureCsrfToken();
      // Amount is optional - backend will calculate if not provided
      const requestBody: any = {
        availability: availability.id,
        payment_method: paymentMethod,
      };
      
      // Only include amount if provided (backend will calculate if not)
      if (amount) {
        requestBody.amount = amount.toString();
      }
      
      const response = await fetch(`${API_BASE_URL}/payments/payments/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok) {
        // Payment successful!
        if (onPaymentSuccess) {
          onPaymentSuccess();
        }
        onClose();
        // Show success message (you can add a toast notification here)
        alert(getText('Payment successful! Booking confirmed.', 'تم الدفع بنجاح! تم تأكيد الحجز.'));
      } else {
        setError(data.error || getText('Payment failed. Please try again.', 'فشل الدفع. يرجى المحاولة مرة أخرى.'));
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(getText('An error occurred. Please try again.', 'حدث خطأ. يرجى المحاولة مرة أخرى.'));
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !availability) return null;

  const teacherName = availability.teacher.first_name && availability.teacher.last_name
    ? `${availability.teacher.first_name} ${availability.teacher.last_name}`
    : availability.teacher.email;

  const duration = availability.end_hour - availability.start_hour;
  const formattedDate = new Date(availability.date).toLocaleDateString(
    isArabic ? 'ar-SA' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' }
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-dark-100 rounded-lg border border-dark-300 p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {getText('Payment', 'الدفع')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isProcessing}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Booking Summary */}
        <div className="mb-6 p-4 bg-dark-200 rounded-lg border border-dark-300">
          <h3 className="text-lg font-semibold text-white mb-4">
            {getText('Booking Summary', 'ملخص الحجز')}
          </h3>
          <div className="space-y-2 text-gray-300">
            <div className="flex justify-between">
              <span>{getText('Teacher', 'المعلم')}:</span>
              <span className="text-white font-medium">{teacherName}</span>
            </div>
            <div className="flex justify-between">
              <span>{getText('Date', 'التاريخ')}:</span>
              <span className="text-white font-medium">{formattedDate}</span>
            </div>
            <div className="flex justify-between">
              <span>{getText('Time', 'الوقت')}:</span>
              <span className="text-white font-medium">
                {availability.start_hour}:00 - {availability.end_hour}:00
              </span>
            </div>
            <div className="flex justify-between">
              <span>{getText('Duration', 'المدة')}:</span>
              <span className="text-white font-medium">
                {duration} {getText('hour(s)', 'ساعة')}
              </span>
            </div>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="mb-6 p-4 bg-dark-200 rounded-lg border border-dark-300">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-300">{getText('Total Amount', 'المبلغ الإجمالي')}:</span>
            <span className="text-2xl font-bold text-white">
              {amount.toFixed(2)} {currencySymbol}
            </span>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            {getText('Payment Method', 'طريقة الدفع')}
          </label>
          <div className="space-y-2">
            <label className="flex items-center p-3 border border-dark-300 rounded-lg cursor-pointer hover:border-primary-500 transition-colors">
              <input
                type="radio"
                name="paymentMethod"
                value="bank_transfer"
                checked={paymentMethod === 'bank_transfer'}
                onChange={() => setPaymentMethod('bank_transfer')}
                className="mr-3 text-primary-500 focus:ring-primary-500"
                disabled={isProcessing}
              />
              <span className="text-white">{getText('Bank Transfer', 'تحويل بنكي')}</span>
            </label>
            <label className="flex items-center p-3 border border-dark-300 rounded-lg cursor-pointer hover:border-primary-500 transition-colors">
              <input
                type="radio"
                name="paymentMethod"
                value="credit_card"
                checked={paymentMethod === 'credit_card'}
                onChange={() => setPaymentMethod('credit_card')}
                className="mr-3 text-primary-500 focus:ring-primary-500"
                disabled={isProcessing}
              />
              <span className="text-white">{getText('Credit Card', 'بطاقة ائتمانية')}</span>
            </label>
            <label className="flex items-center p-3 border border-dark-300 rounded-lg cursor-pointer hover:border-primary-500 transition-colors">
              <input
                type="radio"
                name="paymentMethod"
                value="wallet"
                checked={paymentMethod === 'wallet'}
                onChange={() => setPaymentMethod('wallet')}
                className="mr-3 text-primary-500 focus:ring-primary-500"
                disabled={isProcessing}
              />
              <span className="text-white">{getText('Wallet', 'محفظة')}</span>
            </label>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Test Mode Notice */}
        <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
          <p className="text-yellow-400 text-xs">
            {getText('Test Mode: Payment will be automatically processed.', 'وضع الاختبار: سيتم معالجة الدفع تلقائياً.')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 py-2.5 px-4 border border-dark-300 hover:border-gray-400 text-gray-300 hover:text-white font-medium rounded-lg transition-all disabled:opacity-50"
          >
            {getText('Cancel', 'إلغاء')}
          </button>
          <button
            onClick={handlePayment}
            disabled={isProcessing}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-primary-500 to-accent-purple hover:from-primary-600 hover:to-accent-purple/90 text-white font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {getText('Processing...', 'جاري المعالجة...')}
              </>
            ) : (
              getText('Pay Now', 'ادفع الآن')
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;

