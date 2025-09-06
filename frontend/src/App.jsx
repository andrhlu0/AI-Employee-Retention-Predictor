// ============================================
// Fixed App.jsx with Proper Protected Routes
// Location: frontend/src/App.jsx
// ============================================

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './components/Dashboard';
import EmployeeRiskList from './components/EmployeeRiskList';
import RiskAnalysis from './components/RiskAnalysis';
import InterventionSuggestions from './components/InterventionSuggestions';
import Onboarding from './pages/Onboarding';
import Settings from './pages/Settings';
import Layout from './components/Layout';
import UploadData from './components/UploadData';

// Fixed Protected Route Component
const ProtectedRoute = ({ children }) => {
  // Check both localStorage and sessionStorage for token
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  
  console.log('ProtectedRoute check - Token exists:', !!token);
  
  if (!token) {
    console.log('No token found, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  // Token exists, render the protected content
  return <Layout>{children}</Layout>;
};

// Public Route Component (prevents logged-in users from accessing login/signup)
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  
  if (token) {
    console.log('User already logged in, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes - Redirect to dashboard if already logged in */}
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        <Route path="/signup" element={
          <PublicRoute>
            <Signup />
          </PublicRoute>
        } />
        
        {/* Root redirect */}
        <Route path="/" element={
          <Navigate to="/dashboard" replace />
        } />
        
        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/employees" element={
          <ProtectedRoute>
            <EmployeeRiskList />
          </ProtectedRoute>
        } />
        <Route path="/employees/:id" element={
          <ProtectedRoute>
            <RiskAnalysis />
          </ProtectedRoute>
        } />
        <Route path="/upload" element={
          <ProtectedRoute>
            <UploadData />
          </ProtectedRoute>
        } />
        <Route path="/interventions" element={
          <ProtectedRoute>
            <InterventionSuggestions />
          </ProtectedRoute>
        } />
        <Route path="/onboarding" element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />
        
        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={
          <Navigate to="/dashboard" replace />
        } />
      </Routes>
    </Router>
  );
}

export default App;

// ============================================
// Alternative: Simple App.jsx Without Protection (for testing)
// Use this temporarily to verify components work
// ============================================

/*
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './components/Dashboard';
import EmployeeRiskList from './components/EmployeeRiskList';
import RiskAnalysis from './components/RiskAnalysis';
import InterventionSuggestions from './components/InterventionSuggestions';
import Onboarding from './pages/Onboarding';
import Settings from './pages/Settings';
import Layout from './components/Layout';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        <Route path="/dashboard" element={
          <Layout>
            <Dashboard />
          </Layout>
        } />
        <Route path="/employees" element={
          <Layout>
            <EmployeeRiskList />
          </Layout>
        } />
        <Route path="/employees/:id" element={
          <Layout>
            <RiskAnalysis />
          </Layout>
        } />
        <Route path="/interventions" element={
          <Layout>
            <InterventionSuggestions />
          </Layout>
        } />
        <Route path="/onboarding" element={
          <Layout>
            <Onboarding />
          </Layout>
        } />
        <Route path="/settings" element={
          <Layout>
            <Settings />
          </Layout>
        } />
      </Routes>
    </Router>
  );
}

export default App;
*/