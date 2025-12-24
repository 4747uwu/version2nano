import axios from 'axios';
import sessionManager from '../../services/sessionManager';

// ✅ UPDATED: Use absolute backend URL instead of relative path
// This ensures all requests go to the main backend server
const API_URL = process.env.VITE_BACKEND_URL || 'http://64.227.187.164:5000/api';

console.log('🔍 API Service URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ Add request interceptor to include token from sessionManager
api.interceptors.request.use(
  async (config) => {
    await sessionManager.refreshTokenIfNeeded();
    
    const token = sessionManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ✅ Response interceptor for 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      sessionManager.clearSession();
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;