import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';

interface LoginProps {
  onBack?: () => void;
}

const Login: React.FC<LoginProps> = ({ onBack }) => {
  const { t, language } = useLanguage();
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already logged in
  if (user && !onBack) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      // Navigate to dashboard on successful login
      if (!onBack) {
        navigate('/dashboard');
      } else {
        // If used as modal, close it and let parent handle navigation
        onBack();
        setTimeout(() => navigate('/dashboard'), 100);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getText = (en: string, ar: string) => language === 'ar' ? ar : en;

  return (
    <div className="min-h-screen bg-dark-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center text-gray-400 hover:text-white transition-colors mb-4"
          >
            <svg
              className={`w-5 h-5 ${language === 'ar' ? 'ml-2' : 'mr-2'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={language === 'ar' ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"}
              />
            </svg>
            {getText('Back', 'رجوع')}
          </button>
        )}

        {/* Login Form Card */}
        <div className="bg-dark-100 rounded-2xl shadow-2xl p-8 border border-dark-300">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">
              {getText('Welcome Back', 'مرحباً بعودتك')}
            </h2>
            <p className="text-gray-400">
              {getText('Sign in to your account', 'سجل الدخول إلى حسابك')}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                {getText('Email', 'البريد الإلكتروني')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-dark-200 border border-dark-400 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder={getText('Enter your email', 'أدخل بريدك الإلكتروني')}
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                {getText('Password', 'كلمة المرور')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-dark-200 border border-dark-400 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder={getText('Enter your password', 'أدخل كلمة المرور')}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-primary-500 to-accent-purple text-white font-semibold rounded-xl hover:from-primary-600 hover:to-accent-purple/90 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {getText('Logging in...', 'جاري تسجيل الدخول...')}
                </span>
              ) : (
                getText('Log In', 'تسجيل الدخول')
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-400">
              {getText("Don't have an account? ", 'ليس لديك حساب؟ ')}
              <button
                onClick={onBack}
                className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
              >
                {getText('Sign Up', 'سجل الآن')}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

