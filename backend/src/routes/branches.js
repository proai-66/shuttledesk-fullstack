const express = require("express");
const router = express.Router();

// GET /api/branches
router.get("/", async (req, res) => {
  const { data, error } = await req.sb.from("branches").select("*").order("name");
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// POST /api/branches  { id, name }
router.post("/", async (req, res) => {
  const { id, name } = req.body || {};
  const { error } = await req.sb.from("branches").insert({ id, name });
  if (error) {
    const message = error.code === "23505" ? `Code "${id}" is already used` : error.message;
    return res.status(400).json({ error: message, code: error.code });
  }
  res.json({ ok: true });
});

// DELETE /api/branches/:id
router.delete("/:id", async (req, res) => {
  const { count, error: cErr } = await req.sb
    .from("students").select("id", { count: "exact", head: true }).eq("branch_id", req.params.id);
  if (cErr) return res.status(400).json({ error: cErr.message });
  if (count > 0) return res.status(409).json({ error: `Can't delete — ${count} student(s) still in this branch` });

  const { error } = await req.sb.from("branches").delete().eq("id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;
