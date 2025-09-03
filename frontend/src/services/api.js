import axios from 'axios';

const API_BASE_URL = '/api/v1';

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
export const setAuthToken = (token) => {
  if (token) {
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axiosInstance.defaults.headers.common['Authorization'];
  }
};

// Get auth token from localStorage
export const getAuthToken = () => {
  return localStorage.getItem('auth_token');
};

// API service object
export const api = {
  // Dashboard
  getDashboard: () => axiosInstance.get('/dashboard'),
  
  // Employees
  getEmployees: (params = {}) => axiosInstance.get('/employees', { params }),
  getEmployeeDetails: (employeeId) => axiosInstance.get(`/employees/${employeeId}`),
  
  // Predictions
  runPrediction: (employeeId) => axiosInstance.post(`/employees/${employeeId}/predict`),
  runBatchPredictions: () => axiosInstance.post('/run-batch-predictions'),
  
  // Analytics
  getTrends: (days = 30) => axiosInstance.get('/analytics/trends', { params: { days } }),
  
  // Interventions
  updateIntervention: (predictionId, data) => 
    axiosInstance.post(`/interventions/${predictionId}/update`, data),
};

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);