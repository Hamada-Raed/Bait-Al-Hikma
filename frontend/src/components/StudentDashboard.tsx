import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface User {
  id: number;
  username: string;
  email: string;
  user_type: 'school_student' | 'university_student' | 'teacher' | null;
  first_name: string;
  last_name: string;
}

interface StudentDashboardProps {
  user: User;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ user }) => {
  const { t, language } = useLanguage();

  const getText = (en: string, ar: string) => language === 'ar' ? ar : en;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-500/20 to-accent-purple/20 rounded-xl p-6 border border-primary-500/30">
        <h2 className="text-2xl font-bold text-white mb-2">
          {getText('Welcome to Your Learning Dashboard', 'مرحباً بك في لوحة التعلم')}
        </h2>
        <p className="text-gray-300">
          {getText(
            'Start your learning journey and explore available courses.',
            'ابدأ رحلتك التعليمية واستكشف الدورات المتاحة.'
          )}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-dark-100 rounded-xl p-6 border border-dark-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">
              {getText('Enrolled Courses', 'الدورات المسجلة')}
            </h3>
            <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-white">0</p>
        </div>

        <div className="bg-dark-100 rounded-xl p-6 border border-dark-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">
              {getText('Completed', 'المكتملة')}
            </h3>
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-white">0</p>
        </div>

        <div className="bg-dark-100 rounded-xl p-6 border border-dark-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">
              {getText('In Progress', 'قيد التنفيذ')}
            </h3>
            <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-white">0</p>
        </div>
      </div>

      {/* Courses Section */}
      <div className="bg-dark-100 rounded-xl p-6 border border-dark-300">
        <h3 className="text-xl font-bold text-white mb-4">
          {getText('My Courses', 'دوراتي')}
        </h3>
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <p className="mt-4 text-gray-400">
            {getText('No courses enrolled yet.', 'لم يتم التسجيل في أي دورات بعد.')}
          </p>
        </div>
      </div>

      {/* Profile Info */}
      <div className="bg-dark-100 rounded-xl p-6 border border-dark-300">
        <h3 className="text-xl font-bold text-white mb-4">
          {getText('Profile Information', 'معلومات الملف الشخصي')}
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-dark-300">
            <span className="text-gray-400">{getText('Name', 'الاسم')}</span>
            <span className="text-white font-medium">
              {user.first_name} {user.last_name}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-dark-300">
            <span className="text-gray-400">{getText('Email', 'البريد الإلكتروني')}</span>
            <span className="text-white font-medium">{user.email}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-400">{getText('User Type', 'نوع المستخدم')}</span>
            <span className="text-white font-medium">
              {user.user_type === 'school_student'
                ? getText('School Student', 'طالب مدرسة')
                : getText('University Student', 'طالب جامعة')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;

