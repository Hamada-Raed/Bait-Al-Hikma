import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onSignUpClick?: () => void;
  onLoginClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSignUpClick, onLoginClick }) => {
  const { language, setLanguage, t, isRTL, platformName } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleDashboardClick = () => {
    navigate('/dashboard');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  return (
    <header className="bg-dark-100 border-b border-dark-300 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo and Platform Name */}
          <a 
            href="#home" 
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center space-x-3 rtl:space-x-reverse cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-purple rounded-xl flex items-center justify-center shadow-lg">
                <svg
                  className="w-8 h-8 text-white"
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
              </div>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-accent-purple bg-clip-text text-transparent">
              {platformName}
            </h1>
          </a>

          {/* Navigation Links - Desktop */}
          <nav className="hidden md:flex items-center space-x-8 rtl:space-x-reverse">
            <a
              href="#courses"
              className="text-gray-300 hover:text-primary-400 transition-colors duration-200 font-medium px-3 py-2 rounded-lg hover:bg-dark-200"
            >
              {t('nav.courses')}
            </a>
            <a
              href="#teachers"
              className="text-gray-300 hover:text-primary-400 transition-colors duration-200 font-medium px-3 py-2 rounded-lg hover:bg-dark-200"
            >
              {t('nav.teachers')}
            </a>
            <a
              href="#about"
              className="text-gray-300 hover:text-primary-400 transition-colors duration-200 font-medium px-3 py-2 rounded-lg hover:bg-dark-200"
            >
              {t('nav.about')}
            </a>
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 rounded-lg bg-dark-200 hover:bg-dark-300 text-gray-300 hover:text-white transition-all duration-200 border border-dark-400 hover:border-primary-500"
              aria-label="Toggle language"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                />
              </svg>
              <span className="font-medium">{language === 'en' ? 'AR' : 'EN'}</span>
            </button>

            {/* Auth Buttons - Desktop */}
            {user ? (
              <div className="hidden md:flex items-center space-x-3 rtl:space-x-reverse">
                <button
                  onClick={handleDashboardClick}
                  className="px-6 py-2.5 text-gray-300 hover:text-white font-medium transition-colors duration-200 rounded-lg hover:bg-dark-200"
                >
                  {language === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
                </button>
                <button
                  onClick={handleLogout}
                  className="px-6 py-2.5 bg-dark-200 hover:bg-dark-300 text-gray-300 hover:text-white font-medium rounded-lg transition-all duration-200"
                >
                  {language === 'ar' ? 'تسجيل الخروج' : 'Log Out'}
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center space-x-3 rtl:space-x-reverse">
                <button
                  onClick={onLoginClick}
                  className="px-6 py-2.5 text-gray-300 hover:text-white font-medium transition-colors duration-200 rounded-lg hover:bg-dark-200"
                >
                  {t('auth.login')}
                </button>
                <button 
                  onClick={onSignUpClick}
                  className="px-6 py-2.5 bg-gradient-to-r from-primary-500 to-accent-purple text-white font-medium rounded-lg hover:from-primary-600 hover:to-accent-purple/90 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  {t('auth.signup')}
                </button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-300 hover:text-white hover:bg-dark-200 transition-colors"
              aria-label="Toggle menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-dark-300">
            <nav className="flex flex-col space-y-3">
              <a
                href="#courses"
                className="text-gray-300 hover:text-primary-400 transition-colors px-4 py-2 rounded-lg hover:bg-dark-200"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('nav.courses')}
              </a>
              <a
                href="#teachers"
                className="text-gray-300 hover:text-primary-400 transition-colors px-4 py-2 rounded-lg hover:bg-dark-200"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('nav.teachers')}
              </a>
              <a
                href="#about"
                className="text-gray-300 hover:text-primary-400 transition-colors px-4 py-2 rounded-lg hover:bg-dark-200"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('nav.about')}
              </a>
              <div className="pt-4 border-t border-dark-300 flex flex-col space-y-3">
                {user ? (
                  <>
                    <button
                      onClick={handleDashboardClick}
                      className="w-full px-4 py-2.5 text-gray-300 hover:text-white font-medium transition-colors rounded-lg hover:bg-dark-200 text-left rtl:text-right"
                    >
                      {language === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2.5 bg-dark-200 hover:bg-dark-300 text-gray-300 hover:text-white font-medium rounded-lg transition-all duration-200"
                    >
                      {language === 'ar' ? 'تسجيل الخروج' : 'Log Out'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={onLoginClick}
                      className="w-full px-4 py-2.5 text-gray-300 hover:text-white font-medium transition-colors rounded-lg hover:bg-dark-200 text-left rtl:text-right"
                    >
                      {t('auth.login')}
                    </button>
                    <button 
                      onClick={onSignUpClick}
                      className="w-full px-4 py-2.5 bg-gradient-to-r from-primary-500 to-accent-purple text-white font-medium rounded-lg hover:from-primary-600 hover:to-accent-purple/90 transition-all duration-200"
                    >
                      {t('auth.signup')}
                    </button>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;

