import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { getIcon } from '../utils/iconHelper';

const API_BASE_URL = 'http://localhost:8000/api';

interface WhyChooseUsReason {
  id: number;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  icon_code: string;
  gradient: string;
}

interface WhyChooseUsSectionData {
  title_en: string;
  title_ar: string;
  subtitle_en: string;
  subtitle_ar: string;
  reasons: WhyChooseUsReason[];
}

interface WhyChooseUsProps {
  onSignUpClick?: () => void;
}

const WhyChooseUs: React.FC<WhyChooseUsProps> = ({ onSignUpClick }) => {
  const { language, platformName } = useLanguage();
  const [sectionData, setSectionData] = useState<WhyChooseUsSectionData | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/why-choose-us-section/current/`)
      .then(res => res.json())
      .then(data => setSectionData(data))
      .catch(err => {
        console.error('Error fetching why choose us data:', err);
      });
  }, []);

  if (!sectionData) {
    return <div className="py-20 bg-gradient-to-br from-dark-50 to-dark-100"></div>; // Loading state
  }

  const getText = (en: string, ar: string) => language === 'ar' ? ar : en;
  const replacePlatformName = (text: string) => text.replace(/{PLATFORM_NAME}/g, platformName);

  const reasons = sectionData.reasons || [];

  return (
    <section id="why" className="py-20 bg-gradient-to-br from-dark-50 to-dark-100 relative overflow-hidden">
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
              {getText(sectionData.title_en, sectionData.title_ar)}
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            {replacePlatformName(getText(sectionData.subtitle_en, sectionData.subtitle_ar))}
          </p>
        </div>

        {/* Reasons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {reasons.map((reason, index) => (
            <div
              key={index}
              className="group relative bg-dark-200/80 backdrop-blur-sm rounded-2xl p-8 border border-dark-400 hover:border-primary-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary-500/20 transform hover:-translate-y-1"
            >
              {/* Icon */}
              <div className={`w-16 h-16 bg-gradient-to-br ${reason.gradient} rounded-xl flex items-center justify-center mb-6 text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                {getIcon(reason.icon_code)}
              </div>

              {/* Content */}
              <h3 className="text-2xl font-semibold text-white mb-4 group-hover:text-primary-400 transition-colors">
                {getText(reason.title_en, reason.title_ar)}
              </h3>
              <p className="text-gray-400 leading-relaxed text-lg">
                {getText(reason.description_en, reason.description_ar)}
              </p>

              {/* Decorative Line */}
              <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${reason.gradient} rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="mt-16 text-center">
          <button 
            onClick={onSignUpClick}
            className="px-10 py-4 bg-gradient-to-r from-primary-500 to-accent-purple text-white font-semibold rounded-xl hover:from-primary-600 hover:to-accent-purple/90 transition-all duration-300 shadow-2xl hover:shadow-primary-500/50 transform hover:scale-105 text-lg">
            {language === 'ar' ? 'إنشاء حساب' : 'Sign Up'}
          </button>
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;

