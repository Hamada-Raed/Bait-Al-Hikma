import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import Header from './Header';
import Footer from './Footer';

const API_BASE_URL = 'http://localhost:8000/api';

interface PreviousExamsSectionData {
  title_en: string;
  title_ar: string;
  subtitle_en: string;
  subtitle_ar: string;
  available_for_all_title_en: string;
  available_for_all_title_ar: string;
  available_for_all_content_en: string;
  available_for_all_content_ar: string;
  ai_prediction_title_en: string;
  ai_prediction_title_ar: string;
  ai_prediction_content_en: string;
  ai_prediction_content_ar: string;
  ai_note_en: string;
  ai_note_ar: string;
  real_time_practice_title_en: string;
  real_time_practice_title_ar: string;
  real_time_practice_content_en: string;
  real_time_practice_content_ar: string;
}

const PreviousExams: React.FC = () => {
  const { language, platformName } = useLanguage();
  const [sectionData, setSectionData] = useState<PreviousExamsSectionData | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/previous-exams-section/current/`)
      .then(res => res.json())
      .then(data => setSectionData(data))
      .catch(err => {
        console.error('Error fetching previous exams section data:', err);
      });
  }, []);

  if (!sectionData) {
    return (
      <div className="min-h-screen bg-dark-50 text-gray-100">
        <Header />
        <div className="py-20 bg-dark-100"></div>
        <Footer />
      </div>
    );
  }

  const getText = (en: string, ar: string) => language === 'ar' ? ar : en;

  return (
    <div className="min-h-screen bg-dark-50 text-gray-100">
      <Header />
      <section id="previous-exams" className="py-20 bg-dark-100 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-primary-400 to-accent-purple bg-clip-text text-transparent">
              {getText(sectionData.title_en, sectionData.title_ar)}
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            {getText(sectionData.subtitle_en, sectionData.subtitle_ar)}
          </p>
        </div>

        {/* Main Content Card */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-dark-200 to-dark-300 rounded-2xl p-8 md:p-12 border border-primary-500/30 shadow-xl">
            {/* Main Information */}
            <div className="space-y-6 mb-8">
              <div className="bg-dark-100 rounded-xl p-6 border border-dark-400">
                <div className="flex items-start space-x-4 rtl:space-x-reverse">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-purple rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-semibold text-white mb-2">
                      {getText(sectionData.available_for_all_title_en, sectionData.available_for_all_title_ar)}
                    </h4>
                    <p className="text-gray-300 leading-relaxed">
                      {getText(sectionData.available_for_all_content_en, sectionData.available_for_all_content_ar)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-dark-100 rounded-xl p-6 border border-primary-500/50">
                <div className="flex items-start space-x-4 rtl:space-x-reverse">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-purple rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-semibold text-white mb-2">
                      {getText(sectionData.ai_prediction_title_en, sectionData.ai_prediction_title_ar)}
                    </h4>
                    <p className="text-gray-300 leading-relaxed mb-3">
                      {getText(sectionData.ai_prediction_content_en, sectionData.ai_prediction_content_ar)}
                    </p>
                    <div className="bg-dark-200 rounded-lg p-4 mt-4">
                      <p className="text-sm text-gray-400">
                        <strong className="text-primary-400">{getText('Note:', 'ملاحظة:')}</strong>{' '}
                        {getText(sectionData.ai_note_en, sectionData.ai_note_ar)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-dark-100 rounded-xl p-6 border border-dark-400">
                <div className="flex items-start space-x-4 rtl:space-x-reverse">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-purple rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-semibold text-white mb-2">
                      {getText(sectionData.real_time_practice_title_en, sectionData.real_time_practice_title_ar)}
                    </h4>
                    <p className="text-gray-300 leading-relaxed">
                      {getText(sectionData.real_time_practice_content_en, sectionData.real_time_practice_content_ar)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Benefits List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="flex items-center space-x-3 rtl:space-x-reverse bg-dark-100 rounded-lg p-4 border border-dark-400">
                <svg className="w-5 h-5 text-primary-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-300">
                  {getText('All grades and university students', 'جميع الصفوف وطلاب الجامعة')}
                </span>
              </div>
              <div className="flex items-center space-x-3 rtl:space-x-reverse bg-dark-100 rounded-lg p-4 border border-dark-400">
                <svg className="w-5 h-5 text-primary-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-300">
                  {getText('Comprehensive exam preparation', 'تحضير شامل للامتحان')}
                </span>
              </div>
              <div className="flex items-center space-x-3 rtl:space-x-reverse bg-dark-100 rounded-lg p-4 border border-dark-400">
                <svg className="w-5 h-5 text-primary-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-300">
                  {getText('Actual exam timing', 'توقيت الامتحان الفعلي')}
                </span>
              </div>
              <div className="flex items-center space-x-3 rtl:space-x-reverse bg-dark-100 rounded-lg p-4 border border-dark-400">
                <svg className="w-5 h-5 text-primary-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-300">
                  {getText('Access in your dashboard', 'الوصول من لوحة التحكم')}
                </span>
              </div>
            </div>

            {/* Call to Action */}
            <div className="text-center pt-6 border-t border-dark-400">
              <p className="text-gray-300 mb-4">
                {getText(
                  'Ready to excel in your exams? Start practicing now!',
                  'مستعد للتفوق في امتحاناتك؟ ابدأ التدريب الآن!'
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
      <Footer />
    </div>
  );
};

export default PreviousExams;

