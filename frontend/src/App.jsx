import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import EmployeeRiskList from './components/EmployeeRiskList';
import RiskAnalysis from './components/RiskAnalysis';
import InterventionSuggestions from './components/InterventionSuggestions';
import { getAuthToken, setAuthToken } from './services/api';
import { Users, TrendingUp, AlertCircle, Shield } from 'lucide-react';

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for authentication token
    const token = localStorage.getItem('auth_token');
    if (token) {
      setAuthToken(token);
      setIsAuthenticated(true);
    } else {
      // For demo purposes, set a mock token
      const mockToken = 'demo-token-' + Date.now();
      localStorage.setItem('auth_token', mockToken);
      setAuthToken(mockToken);
      setIsAuthenticated(true);
    }
  }, []);

  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
    setActiveView('analysis');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please authenticate to continue</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-primary-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">
                AI Retention Predictor
              </h1>
            </div>
            <nav className="flex space-x-4">
              <button
                onClick={() => setActiveView('dashboard')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  activeView === 'dashboard'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <TrendingUp className="w-4 h-4 mr-1" />
                Dashboard
              </button>
              <button
                onClick={() => setActiveView('employees')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  activeView === 'employees'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Users className="w-4 h-4 mr-1" />
                Employees
              </button>
              <button
                onClick={() => setActiveView('interventions')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  activeView === 'interventions'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <AlertCircle className="w-4 h-4 mr-1" />
                Interventions
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === 'dashboard' && <Dashboard onEmployeeSelect={handleEmployeeSelect} />}
        {activeView === 'employees' && <EmployeeRiskList onEmployeeSelect={handleEmployeeSelect} />}
        {activeView === 'analysis' && selectedEmployee && (
          <RiskAnalysis employee={selectedEmployee} />
        )}
        {activeView === 'interventions' && <InterventionSuggestions />}
      </main>
    </div>
  );
}

export default App;