const express = require("express");
const router = express.Router();

// GET /api/students
router.get("/", async (req, res) => {
  const { data, error } = await req.sb.from("students").select("*").order("name");
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// POST /api/students  { name, time_1, time_2, parent_whatsapp, branch_id }
router.post("/", async (req, res) => {
  const { name, time_1, time_2, parent_whatsapp, branch_id } = req.body || {};
  const { error } = await req.sb.from("students").insert({ name, time_1, time_2, parent_whatsapp, branch_id });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// POST /api/students/import  { rows: [{name,time_1,time_2,parent_whatsapp}], branchId }
// De-duping against existing students is done client-side (it already has the
// full list loaded) — this just inserts whatever it's handed, tagged with branchId.
router.post("/import", async (req, res) => {
  const { rows, branchId } = req.body || {};
  if (!Array.isArray(rows) || !rows.length) return res.json({ count: 0 });
  const payload = rows.map((r) => ({ ...r, branch_id: branchId }));
  const { error } = await req.sb.from("students").insert(payload);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ count: payload.length });
});

// PUT /api/students/:id  { name, time_1, time_2, parent_whatsapp, branch_id }
router.put("/:id", async (req, res) => {
  const { name, time_1, time_2, parent_whatsapp, branch_id } = req.body || {};
  const { error } = await req.sb.from("students")
    .update({ name, time_1, time_2, parent_whatsapp, branch_id }).eq("id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// DELETE /api/students/:id — refuses if the student has any tickets
router.delete("/:id", async (req, res) => {
  const { count, error: cErr } = await req.sb
    .from("tickets").select("id", { count: "exact", head: true }).eq("student_id", req.params.id);
  if (cErr) return res.status(400).json({ error: cErr.message });
  if (count > 0) return res.status(409).json({ error: `Can't delete — student has ${count} ticket(s)` });

  const { error } = await req.sb.from("students").delete().eq("id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;
