const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("SUPABASE_URL / SUPABASE_ANON_KEY missing — copy backend/.env.example to backend/.env and fill them in.");
}

// One client per request, scoped to that caller's access token — Postgres
// RLS then applies exactly as it did when the frontend talked to Supabase
// directly. No permission logic is duplicated here.
function clientForToken(accessToken) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Service-role client — bypasses RLS entirely. Only ever used for
// auth.admin.createUser() (routes/admin.js), which anon-key clients can't do.
const adminClient = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

module.exports = { clientForToken, adminClient };
