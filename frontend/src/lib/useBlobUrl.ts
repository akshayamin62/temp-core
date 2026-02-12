'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '@/lib/ivyApi';

/**
 * Dedicated axios instance for fetching files from the backend.
 * Uses BACKEND_URL (e.g. http://localhost:5000) as base — NOT ivyApi
 * which has baseURL .../api/ivy and would prepend that to /uploads/... paths.
 */
const fileApi = axios.create({
  baseURL: BACKEND_URL,
  timeout: 60000,
});

fileApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

/**
 * Fetches a file from the backend as an authenticated blob and returns a local object URL.
 * This avoids cross-origin iframe/img issues on hosted deployments where X-Frame-Options blocks direct loading.
 *
 * @param path - The backend file path (e.g. `/uploads/abc/file.pdf`)
 * @returns { blobUrl, loading, error }
 */
export function useBlobUrl(path: string | null) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!path) {
      setBlobUrl(null);
      return;
    }

    let cancelled = false;
    const objectUrls: string[] = [];

    const fetchBlob = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fileApi.get(path, { responseType: 'blob' });
        if (!cancelled) {
          const url = URL.createObjectURL(res.data);
          objectUrls.push(url);
          setBlobUrl(url);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchBlob();

    return () => {
      cancelled = true;
      objectUrls.forEach(u => URL.revokeObjectURL(u));
    };
  }, [path]);

  return { blobUrl, loading, error };
}

/**
 * One-shot function to fetch a file as a blob URL.
 * Use this for imperative calls (e.g. onClick handlers) rather than in render.
 */
export async function fetchBlobUrl(path: string): Promise<string> {
  const res = await fileApi.get(path, { responseType: 'blob' });
  return URL.createObjectURL(res.data);
}

/** Exported for direct use in download functions */
export { fileApi };
