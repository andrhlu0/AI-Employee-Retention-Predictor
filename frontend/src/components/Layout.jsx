// Alternative Layout.jsx with multiple sign out methods
// Save this as: frontend/src/components/Layout.jsx

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, Users, AlertTriangle, Brain, Settings, LogOut, 
  Menu, X, BarChart3, Upload 
} from 'lucide-react';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/employees', icon: Users, label: 'Employees' },
    { path: '/interventions', icon: AlertTriangle, label: 'Interventions' },
    { path: '/upload', icon: Upload, label: 'Upload Data' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const handleSignOut = (e) => {
    e.preventDefault();
    console.log('Sign out clicked - clearing auth and navigating');
    
    // MUST clear auth data, otherwise ProtectedRoute will redirect back to dashboard
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    
    // Force a hard refresh to login page to ensure clean state
    window.location.href = '/login';
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <div className="flex items-center">
            <Brain className="w-8 h-8 text-primary-600 mr-2" />
            <span className="text-xl font-bold text-gray-900">RetentionAI</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <nav className="mt-6 flex flex-col h-[calc(100%-4rem)]">
          <div className="px-3 flex-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center px-3 py-2 mt-1 rounded-md transition-colors
                    ${isActive(item.path) 
                      ? 'bg-primary-100 text-primary-700' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
                  `}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <div className="bg-white shadow-sm border-b">
          <div className="flex items-center justify-between h-16 px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
            >
              <Menu className="w-6 h-6 text-gray-500" />
            </button>

            <div className="flex items-center ml-auto space-x-4">
              <div className="flex items-center">
                <span className="text-sm text-gray-600 mr-2">Welcome back,</span>
                <span className="text-sm font-medium text-gray-900">Admin User</span>
              </div>
              
              {/* Sign out button styled like the sidebar version */}
              <button
                onClick={handleSignOut}
                className="flex items-center px-3 py-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;