/* ============================================================
   api.js
   Thin wrapper around fetch() for talking to the backend API.
   Attaches the current Supabase session's access token so the
   backend can build an RLS-scoped Supabase client per request.
============================================================ */

async function apiFetch(path, opts = {}) {
  const token = state.session?.access_token;
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { ...opts, headers });

  let body = null;
  try { body = await res.json(); } catch { /* empty body, e.g. 204 */ }

  if (!res.ok) {
    const err = new Error(body?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = body?.code;
    throw err;
  }
  return body;
}

const apiGet    = (path)          => apiFetch(path);
const apiPost   = (path, body)    => apiFetch(path, { method: "POST",   body: JSON.stringify(body) });
const apiPut    = (path, body)    => apiFetch(path, { method: "PUT",    body: JSON.stringify(body) });
const apiPatch  = (path, body)    => apiFetch(path, { method: "PATCH",  body: JSON.stringify(body) });
const apiDelete = (path)          => apiFetch(path, { method: "DELETE" });
