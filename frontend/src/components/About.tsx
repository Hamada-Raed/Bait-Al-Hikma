import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const About: React.FC = () => {
  const { language, platformName } = useLanguage();

  const getText = (en: string, ar: string) => language === 'ar' ? ar : en;
  const replacePlatformName = (text: string) => text.replace(/{PLATFORM_NAME}/g, platformName);

  return (
    <section id="about" className="py-20 bg-gradient-to-br from-dark-50 to-dark-100 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-primary-400 to-accent-purple bg-clip-text text-transparent">
              {getText('About Us', 'من نحن')}
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            {getText(
              'Learn more about our mission and vision',
              'تعرف على المزيد حول مهمتنا ورؤيتنا'
            )}
          </p>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="bg-dark-200 rounded-2xl p-8 border border-dark-400 hover:border-primary-500/50 transition-all duration-300">
            <h3 className="text-2xl font-semibold text-white mb-4">
              {getText('Our Mission', 'مهمتنا')}
            </h3>
            <p className="text-gray-400 leading-relaxed mb-6">
              {getText(
                'We are dedicated to providing quality education and connecting students with expert teachers in a personalized learning environment. Our platform empowers learners to excel in their academic journey through innovative tools and comprehensive resources.',
                'نحن ملتزمون بتقديم تعليم عالي الجودة وربط الطلاب بالمعلمين الخبراء في بيئة تعليمية مخصصة. تمكّن منصتنا المتعلمين من التفوق في رحلتهم الأكاديمية من خلال أدوات مبتكرة وموارد شاملة.'
              )}
            </p>
            <h3 className="text-2xl font-semibold text-white mb-4">
              {getText('Our Vision', 'رؤيتنا')}
            </h3>
            <p className="text-gray-400 leading-relaxed">
              {getText(
                'To become the leading educational platform that transforms how students learn and teachers teach, making quality education accessible to everyone.',
                'أن نصبح المنصة التعليمية الرائدة التي تحول طريقة تعلم الطلاب وطريقة تدريس المعلمين، مما يجعل التعليم عالي الجودة في متناول الجميع.'
              )}
            </p>
          </div>

          <div className="bg-dark-200 rounded-2xl p-8 border border-dark-400 hover:border-primary-500/50 transition-all duration-300">
            <h3 className="text-2xl font-semibold text-white mb-4">
              {getText('Why Choose Us', 'لماذا تختارنا')}
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3 rtl:space-x-reverse">
                <svg className="w-6 h-6 text-primary-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-400">
                  {getText(
                    'Expert teachers with years of experience',
                    'معلمون خبراء مع سنوات من الخبرة'
                  )}
                </span>
              </li>
              <li className="flex items-start space-x-3 rtl:space-x-reverse">
                <svg className="w-6 h-6 text-primary-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-400">
                  {getText(
                    'Personalized learning paths for every student',
                    'مسارات تعليمية مخصصة لكل طالب'
                  )}
                </span>
              </li>
              <li className="flex items-start space-x-3 rtl:space-x-reverse">
                <svg className="w-6 h-6 text-primary-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-400">
                  {getText(
                    'Interactive content and progress tracking',
                    'محتوى تفاعلي وتتبع التقدم'
                  )}
                </span>
              </li>
              <li className="flex items-start space-x-3 rtl:space-x-reverse">
                <svg className="w-6 h-6 text-primary-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-400">
                  {getText(
                    'Flexible scheduling and 24/7 access',
                    'جدولة مرنة ووصول على مدار الساعة'
                  )}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;

