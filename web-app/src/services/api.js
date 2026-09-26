const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5056/api';
const SESSION_KEY = 'microhelio_session';

function getToken() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY));
    return s?.token || null;
  } catch { return null; }
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  if (res.status === 401 && endpoint !== '/auth/login') {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = '/login';
    return null;
  }

  if (res.status === 404) return null;

  const data = res.headers.get('content-type')?.includes('application/json')
    ? await res.json()
    : await res.text();

  if (!res.ok) throw { status: res.status, message: data?.message || 'Request failed' };
  return data;
}

export const api = {
  get: (ep) => request(ep, { method: 'GET' }),
  post: (ep, body) => request(ep, { method: 'POST', body: JSON.stringify(body) }),
  put: (ep, body) => request(ep, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (ep, body = {}) => request(ep, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (ep) => request(ep, { method: 'DELETE' }),
};
