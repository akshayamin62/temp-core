import axios from 'axios';

// Base URL for the Ivy League API endpoints
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
export const IVY_API_URL = `${API_URL}/ivy`;

// Backend base URL for static file serving (uploads, documents)
export const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '')
  : 'http://localhost:5000';

const ivyApi = axios.create({
  baseURL: IVY_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Add auth token to requests
ivyApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Helper to construct full file URLs
export const getFileUrl = (path: string) => `${BACKEND_URL}${path}`;

export default ivyApi;
