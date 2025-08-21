// client/src/lib/api.js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function getToken() {
  return localStorage.getItem('pf_token') || '';
}

export async function apiFetch(path, opts={}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 401) {
    // opcional: auto-logout
    localStorage.removeItem('pf_token');
    localStorage.removeItem('pf_user');
    // window.location.href = '/auth';
  }
  return res;
}
