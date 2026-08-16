const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

export const auth = {
  token: () => localStorage.getItem('eduscan.token'),
  role: () => localStorage.getItem('userRole'),
  name: () => localStorage.getItem('eduscan.fullName'),
  save(result) {
    localStorage.setItem('eduscan.token', result.access_token);
    localStorage.setItem('userRole', result.role);
    localStorage.setItem('eduscan.fullName', result.full_name);
  },
  clear() {
    localStorage.removeItem('eduscan.token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('eduscan.fullName');
  },
};

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = auth.token();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error('EduScan backend is not reachable. Start the API server and try again.');
  }
  if (response.status === 401) auth.clear();
  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const payload = await response.json();
      detail = typeof payload.detail === 'string' ? payload.detail : payload.detail?.message || JSON.stringify(payload.detail);
    } catch { /* preserve status message */ }
    throw new Error(detail);
  }
  if (response.status === 204) return null;
  return response.headers.get('content-type')?.includes('application/json') ? response.json() : response;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: body instanceof FormData ? body : JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path, body) => request(path, { method: 'DELETE', body: body === undefined ? undefined : JSON.stringify(body) }),
  download: async (path, fallbackName) => {
    const response = await request(path);
    const blob = await response.blob();
    const disposition = response.headers.get('content-disposition') || '';
    const filename = disposition.match(/filename="?([^";]+)"?/)?.[1] || fallbackName;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  },
};

export function captureVideoFrame(video, quality = 0.9) {
  if (!video?.videoWidth) throw new Error('Camera is not ready');
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  return new Promise((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error('Camera frame could not be captured')),
    'image/jpeg', quality,
  ));
}

export function localDate(value = new Date()) {
  const offset = value.getTimezoneOffset() * 60000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
}

export function displayTime(value) {
  if (!value) return '—';
  const [hours, minutes] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
}
