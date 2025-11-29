import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import WhyChooseUs from './components/WhyChooseUs';
import PreviousExams from './components/PreviousExams';
import About from './components/About';
import Footer from './components/Footer';
import SignUp from './components/SignUp';
import Login from './components/Login';
import Contact from './components/Contact';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import CreateCourse from './components/CreateCourse';
import AvailabilityCalendar from './components/AvailabilityCalendar';
import ManageCourse from './components/ManageCourse';
import PreviewCourse from './components/PreviewCourse';
import StudentPreviewCourse from './components/StudentPreviewCourse';
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
            <Route path="/contact" element={<Contact />} />
            <Route path="/about" element={<About />} />
            <Route path="/previous-exams" element={<PreviousExams />} />
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
            <Route
              path="/create-course"
              element={
                <ProtectedRoute>
                  <CreateCourse />
                </ProtectedRoute>
              }
            />
            <Route
              path="/availability-calendar"
              element={
                <ProtectedRoute>
                  <AvailabilityCalendar />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage-course/:courseId"
              element={
                <ProtectedRoute>
                  <ManageCourse />
                </ProtectedRoute>
              }
            />
            <Route
              path="/preview-course/:courseId"
              element={
                <ProtectedRoute>
                  <PreviewCourse />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student-course/:courseId"
              element={
                <ProtectedRoute>
                  <StudentPreviewCourse />
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

