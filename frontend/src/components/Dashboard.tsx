import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import StudentDashboard from './StudentDashboard';
import TeacherDashboard from './TeacherDashboard';
import AdminDashboard from './AdminDashboard';

const Dashboard: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getText = (en: string, ar: string) => language === 'ar' ? ar : en;

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-50 flex items-center justify-center">
        <div className="text-white text-xl">{getText('Loading...', 'جاري التحميل...')}</div>
      </div>
    );
  }

  if (!user) {
    navigate('/');
    return null;
  }

  // Check if teacher is not approved
  if (user.user_type === 'teacher' && !user.is_approved) {
    return (
      <div className="min-h-screen bg-dark-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-2xl w-full bg-dark-100 rounded-2xl shadow-2xl p-8 border border-dark-300 text-center">
          <div className="mb-6">
            <svg
              className="mx-auto h-16 w-16 text-yellow-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">
            {getText('Account Pending Approval', 'حسابك قيد الموافقة')}
          </h2>
          <p className="text-gray-400 mb-6">
            {getText(
              'Your teacher account is pending admin approval. You will be able to access your dashboard once an administrator approves your account.',
              'حسابك كمعلم قيد الموافقة من قبل الإدارة. ستتمكن من الوصول إلى لوحة التحكم بمجرد موافقة الإدارة على حسابك.'
            )}
          </p>
          <button
            onClick={handleLogout}
            className="px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-purple text-white font-semibold rounded-xl hover:from-primary-600 hover:to-accent-purple/90 transition-all"
          >
            {getText('Log Out', 'تسجيل الخروج')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-50">
      {/* Header - Render outside main for teachers to ensure full width */}
      {user.user_type === 'teacher' ? (
        <Header />
      ) : (
        /* Dashboard Header - Only for students */
        <header className="bg-dark-100 border-b border-dark-300 sticky top-0 z-50 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {getText('Dashboard', 'لوحة التحكم')}
                </h1>
                <p className="text-gray-400 text-sm">
                  {getText(
                    `Welcome, ${user.first_name || user.username}!`,
                    `مرحباً، ${user.first_name || user.username}!`
                  )}
                </p>
              </div>
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-dark-200 hover:bg-dark-300 text-gray-300 hover:text-white rounded-lg transition-colors"
                >
                  {getText('Log Out', 'تسجيل الخروج')}
                </button>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Dashboard Content */}
      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${user.user_type === 'teacher' || user.is_staff ? '' : 'py-8'}`}>
        {user.is_staff || user.is_superuser ? (
          <AdminDashboard />
        ) : user.user_type === 'school_student' || user.user_type === 'university_student' ? (
          <StudentDashboard user={user} />
        ) : user.user_type === 'teacher' ? (
          <TeacherDashboard user={user} />
        ) : (
          <div className="bg-dark-100 rounded-xl p-8 border border-dark-300 text-center">
            <p className="text-gray-400">
              {getText('Please complete your profile.', 'يرجى إكمال ملفك الشخصي.')}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;

