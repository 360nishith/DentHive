import axios from 'axios';
import { supabase } from './supabase';

// Create a configured Axios instance to talk to the NestJS Backend
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
});

// ─── Token Cache ─────────────────────────────────────────────
// Avoids calling supabase.auth.getSession() on every single request.
// Refresh 60 seconds before expiry to stay ahead.
let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

async function getToken(): Promise<string | null> {
  const now = Date.now();
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && now < tokenExpiresAt - 60_000) {
    return cachedToken;
  }
  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (session?.access_token) {
      cachedToken = session.access_token;
      // session.expires_at is in seconds
      tokenExpiresAt = (session.expires_at ?? 0) * 1000;
      return cachedToken;
    }
  } catch (e) {
    console.error('Failed to get Supabase token', e);
  }
  return null;
}

// Listen for auth state changes to update cache instantly
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.access_token) {
    cachedToken = session.access_token;
    tokenExpiresAt = (session.expires_at ?? 0) * 1000;
  } else {
    cachedToken = null;
    tokenExpiresAt = 0;
  }
});

// ─── Request Interceptor ─────────────────────────────────────
api.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    const token = await getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ─── Response Interceptor ────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const msg = error.response?.data?.message || '';
    const status = error.response?.status;

    if (status === 403 && msg.includes('suspended')) {
      window.location.href = '/billing/suspended';
    }
    if (status === 401 && msg.includes('revoked')) {
      localStorage.removeItem('supabase.auth.token');
      window.location.href = '/login';
    }
    if (status === 401 && msg.includes('Tenant ID missing')) {
      window.location.href = '/onboarding';
    }

    return Promise.reject(error);
  }
);

export default api;
