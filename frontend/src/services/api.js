import axios from 'axios';

// Create axios instance with base configuration
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    // Get token from localStorage or sessionStorage
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors globally
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized - clear storage and redirect to login
    if (error.response?.status === 401) {
      localStorage.clear();
      sessionStorage.clear();
      
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
    
    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message);
      // You might want to show a toast notification here
    }
    
    return Promise.reject(error);
  }
);

// API service object with all endpoints
const api = {
  // Instance for direct access if needed
  axios: axiosInstance,
  
  // Auth endpoints
  login: (credentials) => axiosInstance.post('/api/auth/login', credentials),
  signup: (userData) => axiosInstance.post('/api/auth/signup', userData),
  logout: () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
  },
  getCurrentUser: () => axiosInstance.get('/api/auth/me'),
  forgotPassword: (email) => axiosInstance.post('/api/auth/forgot-password', { email }),
  resetPassword: (token, password) => axiosInstance.post('/api/auth/reset-password', { token, password }),
  inviteUser: (email, role) => axiosInstance.post('/api/auth/invite-user', { email, role }),
  
  // Dashboard endpoints
  getDashboard: () => axiosInstance.get('/api/v1/dashboard'),
  getDashboardStats: () => axiosInstance.get('/api/v1/dashboard/stats'),
  getTrends: (days) => axiosInstance.get(`/api/v1/trends?days=${days}`),
  
  // Employee endpoints
  getEmployees: (params = {}) => axiosInstance.get('/api/v1/employees', { params }),
  getEmployee: (id) => axiosInstance.get(`/api/v1/employees/${id}`),
  getEmployeeDetails: (id) => axiosInstance.get(`/api/v1/employees/${id}/details`),
  createEmployee: (data) => axiosInstance.post('/api/v1/employees', data),
  updateEmployee: (id, data) => axiosInstance.put(`/api/v1/employees/${id}`, data),
  deleteEmployee: (id) => axiosInstance.delete(`/api/v1/employees/${id}`),
  
  // Prediction endpoints
  runPrediction: (employeeId) => axiosInstance.post(`/api/v1/predictions/run/${employeeId}`),
  runBatchPrediction: () => axiosInstance.post('/api/v1/predictions/batch'),
  getPredictionHistory: (employeeId) => axiosInstance.get(`/api/v1/predictions/history/${employeeId}`),
  
  // Intervention endpoints
  getInterventions: () => axiosInstance.get('/api/v1/interventions'),
  createIntervention: (data) => axiosInstance.post('/api/v1/interventions', data),
  updateIntervention: (id, data) => axiosInstance.put(`/api/v1/interventions/${id}`, data),
  
  // Upload endpoints
  uploadCSV: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosInstance.post('/api/v1/upload/csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // Settings endpoints
  getCompanySettings: () => axiosInstance.get('/api/v1/settings/company'),
  updateCompanySettings: (data) => axiosInstance.put('/api/v1/settings/company', data),
  getIntegrations: () => axiosInstance.get('/api/v1/settings/integrations'),
  updateIntegration: (id, data) => axiosInstance.put(`/api/v1/settings/integrations/${id}`, data)
};

// Export as default to match the import in Login.jsx
export default api;

// Also export as named export for components that use it that way
export { api };