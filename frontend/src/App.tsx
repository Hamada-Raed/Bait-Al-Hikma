import React from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import WhyChooseUs from './components/WhyChooseUs';
import Footer from './components/Footer';
import './App.css';

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <div className="min-h-screen bg-dark-50 text-gray-100">
        <Header />
        <main>
          <Hero />
          <Features />
          <WhyChooseUs />
        </main>
        <Footer />
      </div>
    </LanguageProvider>
  );
};

export default App;

