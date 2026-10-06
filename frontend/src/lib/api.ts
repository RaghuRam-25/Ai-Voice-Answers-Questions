import axios from 'axios';

export const getApiBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (url) {
    const cleaned = url.replace(/\/+$/, '').replace(/\/api$/, '');
    return `${cleaned}/api`;
  }
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    console.warn('[AI] WARNING: NEXT_PUBLIC_API_URL is not set in production. Please set NEXT_PUBLIC_API_URL in Vercel environment variables.');
  }
  return 'http://localhost:5001/api';
};

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 60000, // 60s timeout to gracefully support Render free-tier cold starts
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const method = (config.method || 'GET').toUpperCase();
  const fullUrl = `${config.baseURL || ''}${config.url || ''}`;
  console.log(`[AI] Sending request: ${method} ${config.url || ''}`);
  console.log(`[AI] API URL: ${fullUrl}`);

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => {
  console.error('[AI] Request configuration error:', error);
  return Promise.reject(error);
});

apiClient.interceptors.response.use(
  (response) => {
    console.log(`[AI] HTTP status: ${response.status}`);
    const summary = typeof response.data === 'object' ? JSON.stringify(response.data).slice(0, 150) : String(response.data).slice(0, 150);
    console.log(`[AI] Response: ${summary}`);
    return response;
  },
  (error) => {
    const status = error.response ? error.response.status : 'NO_RESPONSE';
    const errorDetails = error.response?.data?.error || error.response?.data?.message || error.message;
    console.error(`[AI] HTTP status: ${status}`);
    console.error(`[AI] Error: ${errorDetails}`);
    return Promise.reject(error);
  }
);