import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface HeroProps {
  onSignUpClick?: () => void;
}

const API_BASE_URL = 'http://localhost:8000/api';

interface HeroData {
  title_en: string;
  title_ar: string;
  subtitle_en: string;
  subtitle_ar: string;
  description_en: string;
  description_ar: string;
  cta_button_text_en: string;
  cta_button_text_ar: string;
}

const Hero: React.FC<HeroProps> = ({ onSignUpClick }) => {
  const { language, platformName, t } = useLanguage();
  const [heroData, setHeroData] = useState<HeroData | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/hero-section/current/`)
      .then(res => res.json())
      .then(data => setHeroData(data))
      .catch(err => {
        console.error('Error fetching hero data:', err);
        // Use defaults
        setHeroData({
          title_en: 'Transform Your Learning Journey',
          title_ar: 'حوّل رحلتك التعليمية',
          subtitle_en: `${platformName} is your gateway to quality education, connecting students with expert teachers in a personalized learning environment.`,
          subtitle_ar: `${platformName} هو بوابتك للتعليم الجيد، يربط الطلاب بالمعلمين الخبراء في بيئة تعليمية مخصصة.`,
          description_en: 'Whether you are a school student, university student, or an educator, our platform provides the tools and resources you need to excel in your academic journey.',
          description_ar: 'سواء كنت طالب مدرسة، طالب جامعة، أو معلم، منصتنا توفر الأدوات والموارد التي تحتاجها للتفوق في رحلتك الأكاديمية.',
          cta_button_text_en: 'Get Started',
          cta_button_text_ar: 'ابدأ الآن',
        });
      });
  }, [platformName]);

  if (!heroData) {
    return <div className="min-h-screen"></div>; // Loading state
  }

  const getText = (en: string, ar: string) => language === 'ar' ? ar : en;
  const replacePlatformName = (text: string) => text.replace(/{PLATFORM_NAME}/g, platformName);

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-dark-50">
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-dark-50 via-dark-100 to-dark-200">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(14,165,233,0.15),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(139,92,246,0.15),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_20%,rgba(20,184,166,0.1),transparent_50%)]"></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>

      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 bg-primary-500/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-[32rem] h-[32rem] bg-accent-purple/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[28rem] h-[28rem] bg-accent-teal/20 rounded-full blur-3xl"></div>
        
        {/* Geometric Shapes */}
        <div className="absolute top-1/4 right-1/4 w-64 h-64 border border-primary-500/20 rounded-3xl rotate-45"></div>
        <div className="absolute bottom-1/4 left-1/4 w-48 h-48 border border-accent-purple/20 rounded-full"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          {/* Main Title */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-primary-400 via-accent-purple to-accent-teal bg-clip-text text-transparent">
              {getText(heroData.title_en, heroData.title_ar)}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-gray-300 mb-4 max-w-3xl mx-auto leading-relaxed">
            {replacePlatformName(getText(heroData.subtitle_en, heroData.subtitle_ar))}
          </p>

          {/* Description */}
          <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            {getText(heroData.description_en, heroData.description_ar)}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onSignUpClick}
              className="px-8 py-4 bg-gradient-to-r from-primary-500 to-accent-purple text-white font-semibold rounded-xl hover:from-primary-600 hover:to-accent-purple/90 transition-all duration-300 shadow-2xl hover:shadow-primary-500/50 transform hover:scale-105 text-lg"
            >
              {getText(heroData.cta_button_text_en, heroData.cta_button_text_ar)}
            </button>
            <button 
              className="px-8 py-4 border-2 border-primary-500 text-primary-400 font-semibold rounded-xl hover:bg-primary-500/10 transition-all duration-300 text-lg"
            >
              {t('nav.courses')}
            </button>
          </div>

          {/* Decorative Elements */}
          <div className="mt-20 flex justify-center items-center space-x-8 rtl:space-x-reverse">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mb-2 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <span className="text-sm text-gray-400">Students</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-accent-purple to-purple-600 rounded-2xl flex items-center justify-center mb-2 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-sm text-gray-400">Teachers</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-accent-teal to-teal-600 rounded-2xl flex items-center justify-center mb-2 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <span className="text-sm text-gray-400">Courses</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

