/* ============================================================
   data.js
   Everything that talks to the backend API: loading students/
   tickets/profile, creating and updating tickets. (The backend then
   talks to Supabase — see ../../backend/src.)
============================================================ */

// Equipment tickets used to store one flat {item,type,size,quantity} — now
// it's {items:[...], requireDate}. Opening an OLD ticket for edit/resubmit
// needs to migrate it into the new shape so it shows up in the items list
// instead of silently vanishing.
function normalizeFieldsForEdit(category, details) {
  const d = { ...(details || {}) };
  if (category === "Equipment" && !d.items && d.item) {
    return { items: [{ item: d.item, type: d.type || "", size: d.size || "", quantity: d.quantity || 1 }], requireDate: d.requireDate || "" };
  }
  return d;
}

/* ---- LOADERS (read from the backend) ---- */
async function loadBranches() {
  try { return await apiGet("/branches"); }
  catch (e) { console.error("branches load", e); return []; }
}
async function loadProfile() {
  try { return await apiGet("/profiles/me"); }
  catch (e) { console.error("profile load", e); return null; }
}
async function loadProfiles() {
  try { return await apiGet("/profiles"); }
  catch (e) { console.error("profiles load", e); return []; }
}
async function loadStudents() {
  try { return await apiGet("/students"); }
  catch (e) { console.error("students load", e); return []; }
}
async function loadTickets() {
  try { return await apiGet("/tickets"); }
  catch (e) { console.error("tickets load", e); return []; }
}

// tickets aren't linked to a real student record anymore (coach just types a
// name) — this rebuilds a "student"-shaped object from the free-text name +
// branch actually stored on the ticket, so the rest of the views (which all
// read t.student.name / t.student.branch_id) don't need to change.
function hydrate(tickets) {
  return tickets.map(t => ({
    ...t,
    student: { name: t.student_name || "", branch_id: t.target_branch_id },
  }));
}

// reload branches + students + tickets, then repaint
async function refreshData() {
  state.dataLoading = true; render();        // top bar appears
  BRANCHES = await loadBranches();           // populate global branch list
  state.students = await loadStudents();
  state.users = await loadProfiles();
  const raw = await loadTickets();
  state.tickets = hydrate(raw);
  state.dataLoading = false; render();
}

// lighter reload used by the realtime subscription — just tickets, no top
// loading bar, so a change from someone else fades in quietly in the
// background instead of flashing the whole-page "reloading" indicator.
async function refreshTickets() {
  const raw = await loadTickets();
  state.tickets = hydrate(raw);
  render();
}

/* ---- AI-ASSISTED QUICK-CREATE (coach) ----
   Sends the coach's free-text description to the backend's /ai/parse-ticket
   route (which calls Gemini server-side — the API key never reaches this
   file). Only ever pre-fills the form; never submits on the coach's behalf. ---- */
async function parseTicketWithAI(text) {
  state.qc.aiParsing = true; state.qc.aiError = ""; renderQuickCreate();

  let data;
  try {
    data = await apiPost("/ai/parse-ticket", { text, branches: BRANCHES });
  } catch (e) {
    // full detail goes to console — the on-screen message stays friendly
    console.error("[parseTicketWithAI]", e);
    state.qc.aiParsing = false;
    state.qc.aiError = tr("qc_ai_error");
    renderQuickCreate();
    return;
  }

  state.qc.aiParsing = false;
  if (data.category && CATEGORIES[data.category]) state.qc.cat = data.category;
  if (data.studentName) state.qc.studentName = data.studentName;
  if (data.branchId && BRANCHES.some(b => b.id === data.branchId)) state.qc.branch = data.branchId;
  if (data.fields && typeof data.fields === "object") state.qc.fields = { ...state.qc.fields, ...data.fields };

  renderQuickCreate();
}

/* ---- TICKET WRITES (write via the backend) ---- */
async function createTicket(cat, studentName, branchId, details) {
  state.submittingTicket = true; render();

  let result;
  try {
    result = await apiPost("/tickets", { category: cat, studentName, branchId, details });
  } catch (e) {
    state.submittingTicket = false; render();
    showToast("Create failed: " + e.message, "error");
    return;
  }

  state.submittingTicket = false;
  await refreshData();
  showToast(`Ticket raised — routed to ${result.routed_to}`, "success");
}

async function advanceTicket(id, next) {
  state.busyTicket = id; render();           // this button → "Working…"
  try {
    await apiPatch(`/tickets/${id}/status`, { next });
  } catch (e) {
    state.busyTicket = null; render();
    showToast("Update failed: " + e.message, "error");
    return;
  }
  state.busyTicket = null;
  await refreshData();
  showToast(next === "New" ? "Ticket reopened" : `Marked ${next.replace("_"," ")}`, "success");
}

// coach-side edit: requires status "New" (their own restriction, backed by RLS).
// admin-side edit: allowed for anything not yet closed (Completed/Rejected) —
// admin has broader authority, but editing a closed record would rewrite history.
async function updateTicketFull(id, cat, studentName, branchId, details, opts = {}) {
  state.submittingTicket = true; render();

  let result;
  try {
    result = await apiPut(`/tickets/${id}`, { category: cat, studentName, branchId, details, requireNew: !!opts.requireNew });
  } catch (e) {
    state.submittingTicket = false; render();
    const msg = e.status === 409 ? e.message : "Update failed: " + e.message;
    showToast(msg, "error");
    return;
  }

  state.submittingTicket = false;
  await refreshData();
  showToast(`Ticket updated — routed to ${result.routed_to}`, "success");
}

// admin-side: reject with a reason.
async function rejectTicket(id, reason) {
  state.busyTicket = id; render();
  try {
    await apiPost(`/tickets/${id}/reject`, { reason });
  } catch (e) {
    state.busyTicket = null; render();
    showToast("Reject failed: " + e.message, "error");
    return;
  }
  state.busyTicket = null;
  await refreshData();
  showToast("Ticket rejected — coach notified", "success");
}

// admin-side: one-way note (admin writes, coach reads). Any status, any
// category — this is just a communication field, not part of the workflow.
async function updateTicketNote(id, note) {
  try {
    await apiPatch(`/tickets/${id}/note`, { note });
  } catch (e) {
    const msg = e.status === 403 ? e.message : "Note save failed: " + e.message;
    showToast(msg, "error");
    return;
  }
  await refreshData();
  showToast(note ? "Note saved" : "Note cleared", "success");
}

// coach-side undo: only ever deletes a ticket still in "New" status (nothing
// has acted on it yet). Backend re-checks status="New" too — this button is
// just the client-side guard, RLS (via the backend) is the real enforcement.
async function cancelTicket(id) {
  state.busyTicket = id; render();
  try {
    await apiDelete(`/tickets/${id}`);
  } catch (e) {
    state.busyTicket = null; render();
    const msg = e.status === 403 ? e.message : "Cancel failed: " + e.message;
    showToast(msg, "error");
    return;
  }
  state.busyTicket = null;
  await refreshData();
  showToast("Ticket cancelled", "success");
}

/* ---- STUDENT CSV IMPORT (admin) ----
   Reads a raw Google-Sheet CSV, auto-maps columns to our fields,
   ignores everything else. Column matching is case/space-insensitive.
============================================================ */

// normalise a header: lowercase, strip spaces/punctuation
function normHeader(h) { return String(h || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }

// which sheet headers map to which db field (normalised forms)
const IMPORT_MAP = {
  name:            ["playername", "name", "studentname", "player"],
  time_1:          ["time1", "timeone", "time"],
  time_2:          ["time2", "timetwo"],
  parent_whatsapp: ["phonenumber", "phone", "whatsapp", "contact", "parentphone", "hp"],
};

// parse a File object → array of {name, time_1, time_2, parent_whatsapp}
// (pure client-side parsing — no need to route this through the backend)
function parseStudentCSV(file, onDone) {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (res) => {
      const headers = res.meta.fields || [];
      // build: dbField -> actual header string in this file
      const found = {};
      for (const [dbField, aliases] of Object.entries(IMPORT_MAP)) {
        const hit = headers.find(h => aliases.includes(normHeader(h)));
        if (hit) found[dbField] = hit;
      }
      // must at least have a name column
      if (!found.name) { onDone({ error: "Couldn't find a student-name column (looked for 'Player Name'/'Name')." }); return; }

      const rows = res.data.map(r => ({
        name:            (r[found.name] || "").trim(),
        time_1:          found.time_1 ? (r[found.time_1] || "").trim() : "",
        time_2:          found.time_2 ? (r[found.time_2] || "").trim() : "",
        parent_whatsapp: found.parent_whatsapp ? (r[found.parent_whatsapp] || "").trim() : "",
      })).filter(r => r.name);   // drop rows with no name

      onDone({ rows, matched: Object.keys(found) });
    },
    error: (err) => onDone({ error: err.message }),
  });
}

// send the parsed rows to the backend, tagged with the chosen branch.
// Skips rows whose name already exists (case-insensitive) for that branch,
// so re-importing the same sheet doesn't create duplicate students.
async function importStudents(rows, branchId) {
  const existing = new Set(
    state.students.filter(s => s.branch_id === branchId).map(s => s.name.trim().toLowerCase())
  );
  const fresh = rows.filter(r => !existing.has(r.name.trim().toLowerCase()));
  const skipped = rows.length - fresh.length;
  if (!fresh.length) return { count: 0, skipped };

  try {
    const result = await apiPost("/students/import", { rows: fresh, branchId });
    return { count: result.count, skipped };
  } catch (e) {
    return { error: e.message };
  }
}

/* ============================================================ */

/* ---- STUDENT CRUD (admin) ---- */
async function createStudent(s) {
  try {
    await apiPost("/students", s);
    return { ok: true };
  } catch (e) { return { error: e.message }; }
}

async function updateStudent(id, s) {
  try {
    await apiPut(`/students/${id}`, s);
    return { ok: true };
  } catch (e) { return { error: e.message }; }
}

async function deleteStudent(id) {
  try {
    await apiDelete(`/students/${id}`);
  } catch (e) {
    showToast(e.status === 409 ? e.message : "Delete failed: " + e.message, "error");
    return;
  }
  await refreshData();
  showToast("Student deleted", "success");
}

/* ============================================================ */

/* ---- ACCOUNT MANAGEMENT (admin) ----
   Editing here only ever touches the `profiles` table (full_name, role).
   Creating a brand-new login (email/password) goes through the backend's
   /admin/users route, which uses the Supabase service-role key — that key
   must never live in this frontend. ---- */
async function updateUserProfile(id, full_name, role) {
  try {
    await apiPut(`/profiles/${id}`, { full_name, role });
    return { ok: true };
  } catch (e) { return { error: e.message }; }
}

/* ---- BRANCH MANAGEMENT (admin) ---- */
async function createBranch(id, name) {
  try {
    await apiPost("/branches", { id, name });
    return true;
  } catch (e) {
    state.newBranch.msg = "Error: " + e.message; render();
    return false;
  }
}

async function deleteBranch(id) {
  try {
    await apiDelete(`/branches/${id}`);
  } catch (e) {
    showToast(e.status === 409 ? e.message : "Delete failed: " + e.message, "error");
    return;
  }
  await refreshData();
  showToast("Branch deleted", "success");
}
