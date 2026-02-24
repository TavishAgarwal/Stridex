import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import LandingPage from './components/LandingPage';
import UploadLanding from './pages/UploadLanding';
import AnalysisDashboard from './pages/AnalysisDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CoachDashboard from './pages/CoachDashboard';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import SessionsPage from './pages/SessionsPage';
import ReportsPage from './pages/ReportsPage';
import ChatBot from './components/ChatBot';

// Must be logged in
function ProtectedRoute({ children }) {
  const { isLoggedIn, authLoading } = useAuth();
  if (authLoading) return null;
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

// Must be a coach
function CoachRoute({ children }) {
  const { isLoggedIn, isCoach, authLoading } = useAuth();
  if (authLoading) return null;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (!isCoach) return <Navigate to="/app" replace />;
  return children;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/app" element={<UploadLanding />} />
            <Route path="/analysis" element={<AnalysisDashboard />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/sessions" element={<ProtectedRoute><SessionsPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
            <Route path="/coach" element={<CoachRoute><CoachDashboard /></CoachRoute>} />
          </Routes>
          <ChatBot />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;