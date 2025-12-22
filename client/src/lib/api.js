// client/src/lib/api.js
const API_URL = import.meta.env.VITE_API_URL || 'https://api.prosperafinancas.com';

export function getToken() {
  return localStorage.getItem('pf_token') || '';
}

export async function apiFetch(path, opts = {}) {
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
    // auto-logout + redirect para /auth
    localStorage.removeItem('pf_token');
    localStorage.removeItem('pf_user');
    if (!location.pathname.startsWith('/auth')) {
      location.replace('/auth');
    }
  }

  return res;
}

// Devolve JSON e lança erro legível usando a mensagem { error } da sua API
export async function apiJson(path, opts = {}) {
  const res = await apiFetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}
