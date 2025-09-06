import React, { useEffect, useState } from 'react';

const DebugDashboard = () => {
  const [debugInfo, setDebugInfo] = useState({});
  
  useEffect(() => {
    // Check what's in storage
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const user = localStorage.getItem('user') || sessionStorage.getItem('user');
    const company = localStorage.getItem('company') || sessionStorage.getItem('company');
    
    setDebugInfo({
      hasToken: !!token,
      token: token ? token.substring(0, 20) + '...' : 'None',
      user: user ? JSON.parse(user) : null,
      company: company ? JSON.parse(company) : null,
      apiUrl: import.meta.env.VITE_API_URL || 'Not set - using default',
    });
    
    // Try to fetch dashboard data
    testApiCall();
  }, []);
  
  const testApiCall = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        console.error('API Response Status:', response.status);
        const text = await response.text();
        console.error('API Response:', text);
      } else {
        const data = await response.json();
        console.log('Dashboard data received:', data);
      }
    } catch (error) {
      console.error('API call failed:', error);
    }
  };
  
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Debug Dashboard</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h2 className="text-lg font-semibold mb-4">Storage Info</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h2 className="text-lg font-semibold mb-4">Test Actions</h2>
          <button 
            onClick={() => window.location.href = '/login'}
            className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
          >
            Go to Login
          </button>
          <button 
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.href = '/login';
            }}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Clear Storage & Logout
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Check Console</h2>
          <p>Open browser DevTools (F12) and check the Console tab for errors.</p>
          <p className="mt-2">Common issues to look for:</p>
          <ul className="list-disc ml-6 mt-2">
            <li>401 Unauthorized - Token issue</li>
            <li>404 Not Found - Wrong API endpoint</li>
            <li>CORS errors - Backend not running or CORS misconfigured</li>
            <li>Network errors - Backend not reachable</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DebugDashboard;