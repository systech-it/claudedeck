import type { AuthResponse, LoginRequest, RegisterRequest, SessionSummary, VersionInfo } from '@claudedeck/shared';

const BASE = '';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('cd_token');

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  auth: {
    login: (data: LoginRequest) =>
      request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    register: (data: RegisterRequest) =>
      request<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    me: () => request<{ id: string; username: string; isAdmin: boolean }>('/api/auth/me'),
  },

  sessions: {
    list: () => request<SessionSummary[]>('/api/sessions'),
    get: (id: string) => request<SessionSummary>(`/api/sessions/${id}`),
    create: (projectPath = '/tmp') =>
      request<SessionSummary>('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({ projectPath }),
      }),
    rename: (id: string, title: string) =>
      request<void>(`/api/sessions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title }),
      }),
    delete: (id: string) => request<void>(`/api/sessions/${id}`, { method: 'DELETE' }),
  },

  system: {
    version: () => request<{ version: string }>('/api/system/version'),
    updateCheck: () => request<VersionInfo>('/api/system/update-check'),
    forceUpdateCheck: () =>
      request<VersionInfo>('/api/system/update-check', { method: 'POST' }),
  },
};
