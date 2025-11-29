import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const PreviousExams: React.FC = () => {
  const { language, platformName } = useLanguage();

  const getText = (en: string, ar: string) => language === 'ar' ? ar : en;

  return (
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
              {getText('Previous Exams', 'الامتحانات السابقة')}
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            {getText(
              'Prepare for your exams with AI-powered predictions',
              'استعد لامتحاناتك مع توقعات مدعومة بالذكاء الاصطناعي'
            )}
          </p>
        </div>

        {/* Main Content Card */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-dark-200 to-dark-300 rounded-2xl p-8 md:p-12 border border-primary-500/30 shadow-xl">
            {/* Grade 12 Highlight */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-accent-purple rounded-full mb-4 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {getText('Grade 12 Students', 'طلاب الصف الثاني عشر')}
              </h3>
              <p className="text-lg text-gray-300 mb-2">
                {getText('All Tracks', 'جميع المسارات')}
              </p>
            </div>

            {/* AI Model Information */}
            <div className="space-y-6 mb-8">
              <div className="bg-dark-100 rounded-xl p-6 border border-dark-400">
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
                      {getText('AI-Powered Question Prediction', 'التنبؤ بالأسئلة المدعوم بالذكاء الاصطناعي')}
                    </h4>
                    <p className="text-gray-300 leading-relaxed">
                      {getText(
                        'Our advanced AI model analyzes past exam patterns and curriculum to predict the most likely questions for all your subjects. Get ahead of your exams with intelligent question forecasting tailored to your track.',
                        'يحلل نموذج الذكاء الاصطناعي المتقدم لدينا أنماط الامتحانات السابقة والمنهج الدراسي للتنبؤ بالأسئلة الأكثر احتمالاً لجميع موادك. تقدم في امتحاناتك مع التنبؤ الذكي بالأسئلة المصمم خصيصاً لمسارك.'
                      )}
                    </p>
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
                      {getText('Real-Time Exam Simulation', 'محاكاة الامتحان في الوقت الفعلي')}
                    </h4>
                    <p className="text-gray-300 leading-relaxed">
                      {getText(
                        'Test your knowledge with actual exam conditions. Our platform provides timed exams that simulate the real testing environment, helping you build confidence and improve your time management skills. Practice under exam conditions to ensure you\'re well-prepared for the actual test day.',
                        'اختبر معرفتك في ظروف الامتحان الفعلية. توفر منصتنا امتحانات مؤقتة تحاكي بيئة الاختبار الحقيقية، مما يساعدك على بناء الثقة وتحسين مهارات إدارة الوقت. تدرب في ظروف الامتحان لضمان استعدادك الجيد ليوم الاختبار الفعلي.'
                      )}
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
                  {getText('All subjects covered', 'جميع المواد مغطاة')}
                </span>
              </div>
              <div className="flex items-center space-x-3 rtl:space-x-reverse bg-dark-100 rounded-lg p-4 border border-dark-400">
                <svg className="w-5 h-5 text-primary-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-300">
                  {getText('Track-specific predictions', 'تنبؤات خاصة بالمسار')}
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
                  {getText('Comprehensive preparation', 'تحضير شامل')}
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
  );
};

export default PreviousExams;

