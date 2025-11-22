import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { getIcon } from '../utils/iconHelper';

const API_BASE_URL = 'http://localhost:8000/api';

interface Feature {
  id: number;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  icon_code: string;
  gradient: string;
}

interface FeaturesSectionData {
  title_en: string;
  title_ar: string;
  subtitle_en: string;
  subtitle_ar: string;
  features: Feature[];
}

const Features: React.FC = () => {
  const { language, platformName } = useLanguage();
  const [sectionData, setSectionData] = useState<FeaturesSectionData | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/features-section/current/`)
      .then(res => res.json())
      .then(data => setSectionData(data))
      .catch(err => {
        console.error('Error fetching features data:', err);
      });
  }, []);

  if (!sectionData) {
    return <div className="py-20 bg-dark-100"></div>; // Loading state
  }

  const getText = (en: string, ar: string) => language === 'ar' ? ar : en;
  const replacePlatformName = (text: string) => text.replace(/{PLATFORM_NAME}/g, platformName);

  const features = sectionData.features || [];

  return (
    <section id="features" className="py-20 bg-dark-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative bg-dark-200 rounded-2xl p-8 hover:bg-dark-300 transition-all duration-300 border border-dark-400 hover:border-primary-500/50 hover:shadow-xl hover:shadow-primary-500/10 transform hover:-translate-y-2"
            >
              {/* Icon */}
              <div className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-6 text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                {getIcon(feature.icon_code)}
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-primary-400 transition-colors">
                {getText(feature.title_en, feature.title_ar)}
              </h3>
              <p className="text-gray-400 leading-relaxed">
                {getText(feature.description_en, feature.description_ar)}
              </p>

              {/* Decorative Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`}></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;

