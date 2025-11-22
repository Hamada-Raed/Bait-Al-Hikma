import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface WhyChooseUsProps {
  onSignUpClick?: () => void;
}

const WhyChooseUs: React.FC<WhyChooseUsProps> = ({ onSignUpClick }) => {
  const { t } = useLanguage();

  const reasons = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: t('why1.title'),
      description: t('why1.desc'),
      gradient: 'from-primary-500 to-primary-600',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: t('why2.title'),
      description: t('why2.desc'),
      gradient: 'from-accent-purple to-purple-600',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      title: t('why3.title'),
      description: t('why3.desc'),
      gradient: 'from-accent-teal to-teal-600',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      title: t('why4.title'),
      description: t('why4.desc'),
      gradient: 'from-primary-500 to-accent-purple',
    },
  ];

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
              {t('why.title')}
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            {t('why.subtitle')}
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
                {reason.icon}
              </div>

              {/* Content */}
              <h3 className="text-2xl font-semibold text-white mb-4 group-hover:text-primary-400 transition-colors">
                {reason.title}
              </h3>
              <p className="text-gray-400 leading-relaxed text-lg">
                {reason.description}
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
            {t('auth.signup')}
          </button>
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;

