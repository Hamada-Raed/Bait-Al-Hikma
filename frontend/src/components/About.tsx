import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import Header from './Header';
import Footer from './Footer';

const API_BASE_URL = 'http://localhost:8000/api';

interface AboutSectionData {
  title_en: string;
  title_ar: string;
  subtitle_en: string;
  subtitle_ar: string;
  mission_title_en: string;
  mission_title_ar: string;
  mission_content_en: string;
  mission_content_ar: string;
  vision_title_en: string;
  vision_title_ar: string;
  vision_content_en: string;
  vision_content_ar: string;
  why_choose_us_title_en: string;
  why_choose_us_title_ar: string;
}

const About: React.FC = () => {
  const { language, platformName } = useLanguage();
  const [sectionData, setSectionData] = useState<AboutSectionData | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/about-section/current/`)
      .then(res => res.json())
      .then(data => setSectionData(data))
      .catch(err => {
        console.error('Error fetching about section data:', err);
      });
  }, []);

  if (!sectionData) {
    return (
      <div className="min-h-screen bg-dark-50 text-gray-100">
        <Header />
        <div className="py-20 bg-gradient-to-br from-dark-50 to-dark-100"></div>
        <Footer />
      </div>
    );
  }

  const getText = (en: string, ar: string) => language === 'ar' ? ar : en;
  const replacePlatformName = (text: string) => text.replace(/{PLATFORM_NAME}/g, platformName);

  return (
    <div className="min-h-screen bg-dark-50 text-gray-100">
      <Header />
      <section id="about" className="py-20 bg-gradient-to-br from-dark-50 to-dark-100 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-primary-400 to-accent-purple bg-clip-text text-transparent">
              {getText(sectionData.title_en, sectionData.title_ar)}
            </span>
          </h2>
        </div>

        {/* Introductory Paragraph */}
        <div className="max-w-4xl mx-auto mb-16">
          <p className="text-lg md:text-xl text-gray-300 leading-relaxed text-center">
            {replacePlatformName(getText(sectionData.subtitle_en, sectionData.subtitle_ar))}
          </p>
        </div>

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Mission Card */}
          <div className="bg-gradient-to-br from-dark-200 to-dark-300 rounded-2xl p-8 border border-primary-500/30 shadow-xl hover:shadow-2xl hover:border-primary-500/50 transition-all duration-300">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-purple rounded-xl flex items-center justify-center mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white mb-4">
                {getText(sectionData.mission_title_en, sectionData.mission_title_ar)}
              </h3>
            </div>
            <p className="text-gray-300 leading-relaxed text-center">
              {replacePlatformName(getText(sectionData.mission_content_en, sectionData.mission_content_ar))}
            </p>
          </div>

          {/* Vision Card */}
          <div className="bg-gradient-to-br from-dark-200 to-dark-300 rounded-2xl p-8 border border-primary-500/30 shadow-xl hover:shadow-2xl hover:border-primary-500/50 transition-all duration-300">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-purple rounded-xl flex items-center justify-center mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white mb-4">
                {getText(sectionData.vision_title_en, sectionData.vision_title_ar)}
              </h3>
            </div>
            <p className="text-gray-300 leading-relaxed text-center">
              {replacePlatformName(getText(sectionData.vision_content_en, sectionData.vision_content_ar))}
            </p>
          </div>

          {/* Why Choose Us Card */}
          <div className="bg-gradient-to-br from-dark-200 to-dark-300 rounded-2xl p-8 border border-primary-500/30 shadow-xl hover:shadow-2xl hover:border-primary-500/50 transition-all duration-300 md:col-span-2 lg:col-span-1">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-purple rounded-xl flex items-center justify-center mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white mb-6">
                {getText(sectionData.why_choose_us_title_en, sectionData.why_choose_us_title_ar)}
              </h3>
            </div>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3 rtl:space-x-reverse">
                <svg className="w-6 h-6 text-primary-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-300">
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
                <span className="text-gray-300">
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
                <span className="text-gray-300">
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
                <span className="text-gray-300">
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
      <Footer />
    </div>
  );
};

export default About;

