const TOKEN_KEY = 'lotse-token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode: the session simply won't survive a reload */
  }
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

export async function api(path, { method = 'GET', body, form, params, keepSession = false, anonymous = false } = {}) {
  const url = new URL(`/api${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (Array.isArray(v)) v.forEach((item) => url.searchParams.append(k, item));
      else if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
  }
  const headers = {};
  const token = anonymous ? null : getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(url, { method, headers, body: payload });
  if (res.status === 401 && token && !keepSession) onUnauthorized();
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = typeof data.detail === 'string' ? data.detail : data.detail?.[0]?.msg || detail;
    } catch { /* not JSON */ }
    throw new ApiError(res.status, detail);
  }
  return res.status === 204 ? null : JSON.parse(await res.text(), trimFraction);
}

// The API sends microseconds ("…T23:43:53.099682"); trim to milliseconds so every browser's Date parses it.
const ISO_MICRO = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3})\d+/;
function trimFraction(_key, value) {
  return typeof value === 'string' && ISO_MICRO.test(value) ? value.replace(ISO_MICRO, '$1') : value;
}

export async function uploadImage(file, path = '/images') {
  const form = new FormData();
  form.append('file', file);
  return api(path, { method: 'POST', form });
}

/** Download a file from a signed-in API endpoint (e.g. a CSV report) and save it in the browser. */
export async function downloadFile(path, filename) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(new URL(`/api${path}`, window.location.origin), { headers });
  if (!res.ok) throw new ApiError(res.status, res.statusText);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
