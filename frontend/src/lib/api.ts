import axios from 'axios';

const getApiBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (url) {
    const cleaned = url.replace(/\/+$/, '').replace(/\/api$/, '');
    return `${cleaned}/api`;
  }
  return 'http://localhost:5001/api';
};

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});