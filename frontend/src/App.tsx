import React, { useState } from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import WhyChooseUs from './components/WhyChooseUs';
import Footer from './components/Footer';
import SignUp from './components/SignUp';
import './App.css';

const App: React.FC = () => {
  const [showSignUp, setShowSignUp] = useState(false);

  return (
    <LanguageProvider>
      <div className="min-h-screen bg-dark-50 text-gray-100">
        {showSignUp ? (
          <SignUp onBack={() => setShowSignUp(false)} />
        ) : (
          <>
            <Header onSignUpClick={() => setShowSignUp(true)} />
            <main>
              <Hero onSignUpClick={() => setShowSignUp(true)} />
              <Features />
              <WhyChooseUs onSignUpClick={() => setShowSignUp(true)} />
            </main>
            <Footer />
          </>
        )}
      </div>
    </LanguageProvider>
  );
};

export default App;

