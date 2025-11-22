import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import WhyChooseUs from './components/WhyChooseUs';
import Footer from './components/Footer';
import SignUp from './components/SignUp';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import './App.css';

const HomePage: React.FC = () => {
  const [showSignUp, setShowSignUp] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div className="min-h-screen bg-dark-50 text-gray-100">
      {showSignUp ? (
        <SignUp onBack={() => setShowSignUp(false)} />
      ) : showLogin ? (
        <Login onBack={() => setShowLogin(false)} />
      ) : (
        <>
          <Header 
            onSignUpClick={() => setShowSignUp(true)} 
            onLoginClick={() => setShowLogin(true)}
          />
          <main>
            <Hero onSignUpClick={() => setShowSignUp(true)} />
            <Features />
            <WhyChooseUs onSignUpClick={() => setShowSignUp(true)} />
          </main>
          <Footer />
        </>
      )}
    </div>
  );
};

const LoginPage: React.FC = () => {
  return <Login />;
};

const SignUpPage: React.FC = () => {
  return <SignUp />;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-50 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Router>
      <LanguageProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </Router>
  );
};

export default App;

