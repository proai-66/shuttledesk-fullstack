const express = require("express");
const router = express.Router();

// GET /api/categories — admin-added custom categories only (the 5 built-ins
// live in routing.js/config.js on both ends, not the DB)
router.get("/", async (req, res) => {
  const { data, error } = await req.sb.from("ticket_categories").select("*").order("label");
  if (error) return res.status(400).json({ error: error.message });
  res.json(data.map((c) => ({ key: c.key, label: c.label, desc: c.description, dept: c.dept, role: c.role, color: c.color, icon: c.icon })));
});

// POST /api/categories  { key, label, desc, dept, role, color, icon }
router.post("/", async (req, res) => {
  const { key, label, desc, dept, role, color, icon } = req.body || {};
  const { error } = await req.sb.from("ticket_categories").insert({ key, label, description: desc, dept, role, color, icon });
  if (error) {
    const message = error.code === "23505" ? `Code "${key}" is already used` : error.message;
    return res.status(400).json({ error: message, code: error.code });
  }
  res.json({ ok: true });
});

// DELETE /api/categories/:key
router.delete("/:key", async (req, res) => {
  const { count, error: cErr } = await req.sb
    .from("tickets").select("id", { count: "exact", head: true }).eq("category", req.params.key);
  if (cErr) return res.status(400).json({ error: cErr.message });
  if (count > 0) return res.status(409).json({ error: `Can't delete — ${count} ticket(s) use this category` });

  const { error } = await req.sb.from("ticket_categories").delete().eq("key", req.params.key);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;
