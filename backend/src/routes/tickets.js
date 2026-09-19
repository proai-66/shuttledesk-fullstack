const express = require("express");
const router = express.Router();
const { routeTicket, loadCategories } = require("../routing");

function genTicketCode() {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TCK-${t}-${r}`;
}

async function getBranches(sb) {
  const { data, error } = await sb.from("branches").select("*");
  if (error) throw error;
  return data;
}

// GET /api/tickets
router.get("/", async (req, res) => {
  const { data, error } = await req.sb.from("tickets").select("*").order("created_at", { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// POST /api/tickets  { category, branchId, details }
router.post("/", async (req, res) => {
  const { category, branchId, details } = req.body || {};
  let branches, categories;
  try {
    branches = await getBranches(req.sb);
    categories = await loadCategories(req.sb);
  } catch (e) { return res.status(400).json({ error: e.message }); }
  if (!categories[category]) return res.status(400).json({ error: `Unknown category "${category}"` });
  const r = routeTicket(category, branchId, details, branches, categories);

  let error, data;
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = genTicketCode();
    ({ data, error } = await req.sb.from("tickets").insert({
      ticket_code: code, category,
      target_branch_id: r.target_branch_id, assigned_department: r.assigned_department,
      assigned_role: r.assigned_role, routed_to: r.routed_to,
      status: "New", priority: category === "SpecialCare" ? "High" : "Normal",
      details, notified_pic: false, created_by: req.userId,
    }).select().single());
    if (!error || error.code !== "23505") break;
  }
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ticket: data, routed_to: r.routed_to });
});

// PATCH /api/tickets/:id/status  { next }
router.patch("/:id/status", async (req, res) => {
  const { next } = req.body || {};
  const { error } = await req.sb.from("tickets").update({ status: next }).eq("id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// PUT /api/tickets/:id  { category, branchId, details, requireNew }
router.put("/:id", async (req, res) => {
  const { category, branchId, details, requireNew } = req.body || {};
  let branches, categories;
  try {
    branches = await getBranches(req.sb);
    categories = await loadCategories(req.sb);
  } catch (e) { return res.status(400).json({ error: e.message }); }
  if (!categories[category]) return res.status(400).json({ error: `Unknown category "${category}"` });
  const r = routeTicket(category, branchId, details, branches, categories);

  let q = req.sb.from("tickets").update({
    category,
    target_branch_id: r.target_branch_id, assigned_department: r.assigned_department,
    assigned_role: r.assigned_role, routed_to: r.routed_to,
    priority: category === "SpecialCare" ? "High" : "Normal",
    details,
  }).eq("id", req.params.id);
  q = requireNew ? q.eq("status", "New") : q.neq("status", "Completed").neq("status", "Rejected");

  const { data, error } = await q.select();
  if (error) return res.status(400).json({ error: error.message });
  if (!data || data.length === 0) {
    return res.status(409).json({ error: "Edit blocked — it may have already been closed, or you lack permission" });
  }
  res.json({ routed_to: r.routed_to });
});

// POST /api/tickets/:id/approve-foc — senior admin signs off a FOC equipment
// request. Resets assigned_role/routed_to to what a normal (non-FOC) ticket
// of this category would have gotten, so it falls out of the SeniorAdmin-only
// visibility filter and any admin can pick it up. Same permission model as
// every other route here: RLS decides whether this admin may update the row
// at all — "senior admin" is a frontend-only concept, so it's not re-checked here.
router.post("/:id/approve-foc", async (req, res) => {
  const { data: existing, error: gErr } = await req.sb.from("tickets")
    .select("category, target_branch_id").eq("id", req.params.id).single();
  if (gErr) return res.status(400).json({ error: gErr.message });

  let branches, categories;
  try {
    branches = await getBranches(req.sb);
    categories = await loadCategories(req.sb);
  } catch (e) { return res.status(400).json({ error: e.message }); }
  const branchName = (id) => branches.find((b) => b.id === id)?.name ?? "—";
  const rule = categories[existing.category];

  const patch = { assigned_role: rule.role, routed_to: `Front Desk — ${branchName(existing.target_branch_id)}` };
  const { error } = await req.sb.from("tickets").update(patch).eq("id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// POST /api/tickets/:id/reject  { reason }
router.post("/:id/reject", async (req, res) => {
  const { reason } = req.body || {};
  const { data: existing, error: gErr } = await req.sb.from("tickets").select("details").eq("id", req.params.id).single();
  if (gErr) return res.status(400).json({ error: gErr.message });

  const patch = { status: "Rejected", details: { ...(existing?.details || {}), reject_reason: reason } };
  const { error } = await req.sb.from("tickets").update(patch).eq("id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// PATCH /api/tickets/:id/note  { note }
router.patch("/:id/note", async (req, res) => {
  const { note } = req.body || {};
  const { data, error } = await req.sb.from("tickets").update({ admin_note: note }).eq("id", req.params.id).select();
  if (error) return res.status(400).json({ error: error.message });
  if (!data || data.length === 0) return res.status(403).json({ error: "Blocked — you may lack permission" });
  res.json({ ok: true });
});

// DELETE /api/tickets/:id — coach-side cancel, only while status is still "New"
router.delete("/:id", async (req, res) => {
  const { data, error } = await req.sb.from("tickets").delete().eq("id", req.params.id).eq("status", "New").select();
  if (error) return res.status(400).json({ error: error.message });
  if (!data || data.length === 0) {
    return res.status(403).json({ error: "Cancel blocked — ask your admin to enable ticket-cancel permission" });
  }
  res.json({ ok: true });
});

module.exports = router;
