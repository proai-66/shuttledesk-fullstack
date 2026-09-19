const express = require("express");
const router = express.Router();

// GET /api/profiles/me — the caller's own profile
router.get("/me", async (req, res) => {
  const { data, error } = await req.sb.from("profiles").select("*").eq("id", req.userId).single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// GET /api/profiles — everyone (admin "Manage accounts" list; RLS decides who may see this)
router.get("/", async (req, res) => {
  const { data, error } = await req.sb.from("profiles").select("*").order("full_name");
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// PUT /api/profiles/:id  { full_name, role }
router.put("/:id", async (req, res) => {
  const { full_name, role } = req.body || {};
  const { data, error } = await req.sb.from("profiles").update({ full_name, role }).eq("id", req.params.id).select();
  if (error) return res.status(400).json({ error: error.message });
  if (!data || data.length === 0) return res.status(403).json({ error: "Blocked — you may lack permission to edit this account" });
  res.json({ ok: true });
});

module.exports = router;
