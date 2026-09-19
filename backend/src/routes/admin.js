const express = require("express");
const router = express.Router();
const { adminClient } = require("../supabaseClient");

// POST /api/admin/users  { email, password, name, role }
// Creates a coach/admin login. Needs the service-role key (regular anon-key
// clients can't create Auth users), so this route double-checks the caller is
// actually an admin itself before touching anything — the RLS-scoped req.sb
// can only ever see the caller's own profile, so this read is safe to trust.
router.post("/users", async (req, res) => {
  if (!adminClient) return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY not set on the backend" });

  const { data: me, error: meErr } = await req.sb.from("profiles").select("role").eq("id", req.userId).single();
  if (meErr || me?.role !== "admin") return res.status(403).json({ error: "Admin only" });

  const { email, password, name, role } = req.body || {};
  if (!email || !password || !name) return res.status(400).json({ error: "Fill all fields" });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

  const { data, error } = await adminClient.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) return res.status(400).json({ error: error.message });

  const { error: pErr } = await adminClient.from("profiles").insert({ id: data.user.id, full_name: name, role });
  if (pErr) return res.status(400).json({ error: `Account made but profile failed: ${pErr.message}` });

  res.json({ ok: true, email, role });
});

module.exports = router;
