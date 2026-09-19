/* ============================================================
   events.js
   All user interaction: clicks, typing, dropdown changes, Enter key.
   Each handler reads data-action / data-field attributes from the
   element and updates state, then re-renders.
============================================================ */

/* ---- CLICKS ---- */
document.addEventListener("click", async (e) => {
  // clicking the dimmed area behind a modal (not the card itself) closes it,
  // same effect as its own "X"/Cancel button — every modal-backdrop div
  // carries a data-close naming that action. e.target must BE the backdrop
  // (not just inside it), so clicks anywhere on the card don't bubble into this.
  const backdrop = e.target.matches(".modal-backdrop") ? e.target : null;
  const el = backdrop || e.target.closest("[data-action]");
  if (!el) return;
  const a = backdrop ? backdrop.dataset.close : el.dataset.action;
  if (!a) return;

  switch (a) {
    /* login screen */
    case "toggle-password": {
      const pw = document.getElementById("login-password");
      if (pw) state.login.password = pw.value;   // keep what's typed
      state.showPassword = !state.showPassword; render();
      break;
    }
    case "login":  await doLogin();  break;
    case "logout": await doLogout(); break;

    /* light/dark theme toggle — persisted so it sticks across visits/reloads */
    case "toggle-theme": {
      const dark = document.documentElement.classList.toggle("dark");
      try { localStorage.setItem("theme", dark ? "dark" : "light"); } catch (e) {}
      render();
      break;
    }

    /* language toggle (EN/中) — persisted so it sticks across visits/reloads */
    case "toggle-lang": setLang(LANG === "en" ? "zh" : "en"); render(); break;

    /* coach: quick-create modal open/close */
    case "open-modal":  state.modalOpen = true; state.qc = { branch:"", cat:null, fields:{}, editingId:null, aiText:"", aiParsing:false, aiError:"", eqDraft:{items:[],type:"",size:"",quantity:1} }; render(); break;
    case "close-modal": state.modalOpen = false; render(); break;

    /* edit a ticket (opens the same modal, pre-filled). Coach: only their own,
       only while "New". Admin: anything not yet Completed/Rejected. */
    case "edit-ticket": {
      const t = state.tickets.find(x => x.id === el.dataset.id);
      if (!t) break;
      const isAdmin = state.profile.role === "admin";
      const allowed = isAdmin ? (t.status !== "Completed" && t.status !== "Rejected") : t.status === "New";
      if (!allowed) break;
      state.modalOpen = true;
      state.qc = { branch:t.target_branch_id||"", cat:t.category, fields:normalizeFieldsForEdit(t.category, t.details), editingId:t.id, aiText:"", aiParsing:false, aiError:"", eqDraft:{items:[],type:"",size:"",quantity:1} };
      render();
      break;
    }

    /* coach: resubmit a rejected ticket — opens the same modal pre-filled with
       the old category/details, but as a brand-new ticket (editingId stays
       null), so submitting creates a fresh one instead of touching the old
       (still-Rejected) record. */
    case "resubmit-ticket": {
      const t = state.tickets.find(x => x.id === el.dataset.id);
      if (!t || t.status !== "Rejected" || t.created_by !== state.session.user.id) break;
      const { reject_reason, ...restDetails } = t.details || {};
      state.ticketDetail = null;   // in case this was triggered from the detail popup
      state.modalOpen = true;
      state.qc = { branch:t.target_branch_id||"", cat:t.category, fields:normalizeFieldsForEdit(t.category, restDetails), editingId:null, aiText:"", aiParsing:false, aiError:"", eqDraft:{items:[],type:"",size:"",quantity:1} };
      render();
      break;
    }

    /* admin: manage-accounts panel */
    case "open-users":  state.adminUserPanel = true; state.newUser = { editing:null, email:"", password:"", name:"", role:"coach", msg:"" }; render(); break;
    case "close-users": state.adminUserPanel = false; render(); break;
    case "create-user": await adminCreateUser(); break;

    /* admin: manage-accounts — switch to the create form */
    case "user-add": state.newUser = { editing:"new", email:"", password:"", name:"", role:"coach", msg:"" }; render(); break;
    /* admin: manage-accounts — switch to the edit form for one existing account */
    case "user-edit": {
      const u = state.users.find(x => x.id === el.dataset.id);
      if (!u) break;
      state.newUser = { editing:u.id, email:"", password:"", name:u.full_name||"", role:u.role||"coach", msg:"" };
      render();
      break;
    }
    case "user-cancel-edit": state.newUser = { editing:null, email:"", password:"", name:"", role:"coach", msg:"" }; render(); break;
    case "user-save": {
      const nu = state.newUser;
      if (nu.editing === "new") { await adminCreateUser(); break; }
      if (!nu.name.trim()) { nu.msg = "Name is required"; render(); break; }
      const res = await updateUserProfile(nu.editing, nu.name.trim(), nu.role);
      if (res.error) { nu.msg = "Error: " + res.error; render(); break; }
      state.newUser = { editing:null, email:"", password:"", name:"", role:"coach", msg:"" };
      await refreshData();
      showToast("Account updated", "success");
      break;
    }

    /* admin: manage-branches panel */
    case "open-branches":  state.branchPanel = true; state.newBranch = { id:"", name:"", msg:"" }; render(); break;
    case "close-branches": state.branchPanel = false; render(); break;
    case "add-branch": {
      const nb = state.newBranch;
      const id = (nb.id || "").trim().toUpperCase();
      const name = (nb.name || "").trim();
      if (!id || !name) { nb.msg = "Enter both a code and a name"; render(); break; }
      const ok = await createBranch(id, name);
      if (ok) { state.newBranch = { id:"", name:"", msg:`✓ Added ${name}` }; await refreshData(); showToast(`Branch added — ${name}`, "success"); }
      break;
    }
    case "delete-branch": await deleteBranch(el.dataset.id); break;

    /* admin: manage-categories panel */
    case "open-categories":  state.categoryPanel = true; state.newCategory = { key:"", label:"", desc:"", dept:"", role:"", color:"amber", icon:"package", msg:"" }; render(); break;
    case "close-categories": state.categoryPanel = false; render(); break;
    case "add-category": {
      const nc = state.newCategory;
      const key = (nc.key || "").trim();
      const label = (nc.label || "").trim();
      const dept = (nc.dept || "").trim();
      const role = (nc.role || "").trim();
      if (!key || !label || !dept || !role) { nc.msg = "Key, label, department and role are required"; render(); break; }
      if (CATEGORIES[key]) { nc.msg = `Code "${key}" is already used`; render(); break; }
      const ok = await createCategory(key, { label, desc: (nc.desc||"").trim(), dept, role, color: nc.color, icon: nc.icon });
      if (ok) { state.newCategory = { key:"", label:"", desc:"", dept:"", role:"", color:"amber", icon:"package", msg:`✓ Added ${label}` }; await refreshData(); showToast(`Category added — ${label}`, "success"); }
      break;
    }
    case "delete-category": await deleteCategory(el.dataset.key); break;

    /* admin: manage students */
    case "open-students":  state.studentPanel = true; state.stu = { q:"", branchFilter:"", editing:null, form:{name:"",time_1:"",time_2:"",parent_whatsapp:"",branch_id:""}, msg:"" }; render(); break;
    case "close-students": state.studentPanel = false; render(); break;
    case "stu-add": {
      state.stu.editing = "new";
      state.stu.form = { name:"", time_1:"", time_2:"", parent_whatsapp:"", branch_id: state.stu.branchFilter || "" };
      state.stu.msg = ""; render(); break;
    }
    case "stu-edit": {
      const s = state.students.find(x => x.id === el.dataset.id);
      if (!s) break;
      state.stu.editing = s.id;
      state.stu.form = { name:s.name||"", time_1:s.time_1||"", time_2:s.time_2||"", parent_whatsapp:s.parent_whatsapp||"", branch_id:s.branch_id||"" };
      state.stu.msg = ""; render(); break;
    }
    case "stu-cancel-edit": state.stu.editing = null; state.stu.msg = ""; render(); break;
    case "stu-save": {
      const f = state.stu.form;
      if (!f.name.trim()) { state.stu.msg = "Name is required"; render(); break; }
      let res;
      if (state.stu.editing === "new") res = await createStudent(f);
      else res = await updateStudent(state.stu.editing, f);
      if (res.error) { state.stu.msg = "Error: " + res.error; render(); break; }
      const wasNew = state.stu.editing === "new";
      state.stu.editing = null; state.stu.msg = "";
      await refreshData();
      showToast(wasNew ? "Student added" : "Student updated", "success");
      break;
    }
    case "stu-delete": await deleteStudent(el.dataset.id); break;

    /* admin: import students */
    case "open-import":  state.importPanel = true; state.imp = { branch:"", rows:[], fileName:"", msg:"", importing:false }; render(); break;
    case "close-import": state.importPanel = false; render(); break;
    case "run-import": {
      const im = state.imp;
      if (!im.rows.length || !im.branch) break;
      im.importing = true; render();
      const res = await importStudents(im.rows, im.branch);
      im.importing = false;
      if (res.error) { im.msg = "Import failed: " + res.error; render(); break; }
      const n = res.count;
      const skipNote = res.skipped ? ` (skipped ${res.skipped} already in this branch)` : "";
      const doneMsg = n
        ? `✓ Imported ${n} students into ${branchName(im.branch)}${skipNote}`
        : `All ${res.skipped} student(s) already exist in ${branchName(im.branch)} — nothing imported`;
      state.imp = { branch:"", rows:[], fileName:"", msg:doneMsg, importing:false };
      if (n) await refreshData();
      showToast(n ? `Imported ${n} students${skipNote}` : "No new students — all were duplicates", n ? "success" : "info");
      break;
    }

    /* ticket status actions (admin) */
    case "advance":       await advanceTicket(el.dataset.id, el.dataset.next); break;

    /* senior admin: sign off a FOC equipment request — hands it to any admin */
    case "approve-foc": await approveFocTicket(el.dataset.id); break;

    /* anyone: read-only detail popup — open or completed, doesn't matter */
    case "view-ticket":        state.ticketDetail = el.dataset.id; render(); break;
    case "close-ticket-detail": state.ticketDetail = null; render(); break;

    /* coach: cancel a not-yet-actioned ticket */
    case "cancel-ticket": await cancelTicket(el.dataset.id); break;

    /* admin: reject with a reason */
    case "open-reject":  state.rejectingId = el.dataset.id; state.rejectReason = ""; render(); break;
    case "close-reject": state.rejectingId = null; render(); break;
    case "confirm-reject": {
      const reason = (state.rejectReason || "").trim();
      if (!reason) break;
      const id = state.rejectingId;
      state.rejectingId = null; render();
      await rejectTicket(id, reason);
      break;
    }

    /* admin: add/edit a one-way note (admin writes, coach reads) */
    case "open-note": {
      const t = state.tickets.find(x => x.id === el.dataset.id);
      state.noteEditId = el.dataset.id;
      state.noteDraft = t?.admin_note || "";
      render();
      break;
    }
    case "close-note": state.noteEditId = null; render(); break;
    case "save-note": {
      const id = state.noteEditId;
      const note = state.noteDraft.trim();
      state.noteEditId = null; render();
      await updateTicketNote(id, note);
      break;
    }

    /* admin: collapse/expand the Closed (Completed/Rejected) archive */
    case "toggle-closed": state.closedCollapsed = !state.closedCollapsed; render(); break;

    /* coach: collapse/expand their own Closed archive */
    case "toggle-coach-closed": state.coachClosedCollapsed = !state.coachClosedCollapsed; render(); break;

    /* quick-create form steps */
    case "qc-pick-cat":     state.qc.cat = el.dataset.cat; state.qc.fields = {}; state.qc.eqDraft = {items:[],type:"",size:"",quantity:1}; renderQuickCreate(); break;
    case "qc-mock-receipt": state.qc.fields.receipt = "receipt_uploaded.jpg"; renderQuickCreate(); break;

    /* coach: Equipment can now hold several items on one ticket — check off
       everything wanted in this batch, set shared type/size/quantity, Add
       pushes one list entry per checked item (only carrying the fields that
       item actually needs — e.g. no "size" on a skipping rope). */
    case "eq-add-item": {
      const d = state.qc.eqDraft;
      if (!d.items.length) break;
      if (!Array.isArray(state.qc.fields.items)) state.qc.fields.items = [];
      for (const itemName of d.items) {
        state.qc.fields.items.push({
          item: itemName,
          type: EQUIPMENT_TYPE_ITEMS.includes(itemName) ? (d.type || "") : "",
          size: EQUIPMENT_SIZE_ITEMS.includes(itemName) ? (d.size || "") : "",
          quantity: d.quantity || 1,
        });
      }
      state.qc.eqDraft = { items:[], type:"", size:"", quantity:1 };
      renderQuickCreate();
      break;
    }
    case "eq-remove-item": {
      const i = Number(el.dataset.index);
      if (Array.isArray(state.qc.fields.items)) state.qc.fields.items.splice(i, 1);
      renderQuickCreate();
      break;
    }

    /* coach: AI-assisted fill — parses free text into category/fields, never auto-submits */
    case "qc-ai-parse": {
      const text = (state.qc.aiText || "").trim();
      if (!text || state.qc.aiParsing) break;
      await parseTicketWithAI(text);
      break;
    }
    case "qc-submit": {
      const { branch, cat, fields, editingId } = state.qc;
      const equipmentNeedsItems = cat === "Equipment" && !(fields.items || []).length;
      if (cat && !equipmentNeedsItems) {
        state.modalOpen = false; render();
        const br = branch || null;
        if (editingId) await updateTicketFull(editingId, cat, br, fields, { requireNew: state.profile.role !== "admin" });
        else await createTicket(cat, br, fields);
      }
      break;
    }
  }
});

/* ---- TYPING (input) — no full re-render, keeps focus ---- */
document.addEventListener("input", (e) => {
  const id = e.target.id;
  if (id === "login-email")         state.login.email = e.target.value;
  else if (id === "login-password") state.login.password = e.target.value;
  else if (id === "nu-name")        state.newUser.name = e.target.value;
  else if (id === "nu-email")       state.newUser.email = e.target.value;
  else if (id === "nu-password")    state.newUser.password = e.target.value;
  else if (id === "nb-id")          state.newBranch.id = e.target.value;
  else if (id === "nb-name")        state.newBranch.name = e.target.value;
  else if (id === "nc-key")         state.newCategory.key = e.target.value;
  else if (id === "nc-label")       state.newCategory.label = e.target.value;
  else if (id === "nc-desc")        state.newCategory.desc = e.target.value;
  else if (id === "nc-dept")        state.newCategory.dept = e.target.value;
  else if (id === "nc-role")        state.newCategory.role = e.target.value;
  else if (id === "stu-search")     { state.stu.q = e.target.value; renderStudentList(); }
  else if (id === "stu-name")       state.stu.form.name = e.target.value;
  else if (id === "stu-time1")      state.stu.form.time_1 = e.target.value;
  else if (id === "stu-time2")      state.stu.form.time_2 = e.target.value;
  else if (id === "stu-phone")      state.stu.form.parent_whatsapp = e.target.value;
  else if (id === "qc-ai-text")      state.qc.aiText = e.target.value;
  else if (id === "eq-draft-quantity") state.qc.eqDraft.quantity = Number(e.target.value) || 1;   // no re-render — nothing else depends on it
  else if (id === "reject-reason") {
    state.rejectReason = e.target.value;
    // toggle the Reject button live without a full re-render (would drop textarea focus)
    const btn = document.querySelector('[data-action="confirm-reject"]');
    if (btn) btn.disabled = !e.target.value.trim();
  }
  else if (id === "closed-search") { state.closedFilter.q = e.target.value; renderClosedList(); }
  else if (id === "open-search")   { state.openFilter.q = e.target.value; renderOpenList(); }
  else if (id === "coach-search")  { state.coachSearch = e.target.value; renderCoachTickets(); }
  else if (id === "note-draft") state.noteDraft = e.target.value;   // empty is valid (clears the note), so no button-gating needed
  else if (e.target.dataset.field)  state.qc.fields[e.target.dataset.field] = e.target.value;
  else if (id) console.warn(`[events] unhandled input id "${id}" — its value is not being saved to state`);
});

/* ---- DROPDOWN CHANGES ---- */
document.addEventListener("change", (e) => {
  if (e.target.id === "nu-role") state.newUser.role = e.target.value;
  else if (e.target.id === "nc-color") state.newCategory.color = e.target.value;
  else if (e.target.id === "nc-icon")  state.newCategory.icon = e.target.value;
  else if (e.target.id === "qc-branch") { state.qc.branch = e.target.value; renderQuickCreate(); }
  else if (e.target.id === "imp-branch") { state.imp.branch = e.target.value; render(); }
  else if (e.target.id === "stu-branch-filter") { state.stu.branchFilter = e.target.value; renderStudentList(); }
  else if (e.target.id === "stu-branch") { state.stu.form.branch_id = e.target.value; }
  else if (e.target.id === "closed-status-filter") { state.closedFilter.status = e.target.value; renderClosedList(); }
  else if (e.target.id === "closed-cat-filter")    { state.closedFilter.category = e.target.value; renderClosedList(); }
  else if (e.target.id === "open-status-filter") { state.openFilter.status = e.target.value; renderOpenList(); }
  else if (e.target.id === "open-cat-filter")    { state.openFilter.category = e.target.value; renderOpenList(); }
  else if (e.target.id === "open-branch-filter") { state.openFilter.branch = e.target.value; renderOpenList(); }
  else if (e.target.id === "imp-file") {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    state.imp.fileName = file.name; state.imp.msg = ""; render();
    parseStudentCSV(file, (result) => {
      if (result.error) { state.imp.rows = []; state.imp.msg = "Error: " + result.error; render(); return; }
      state.imp.rows = result.rows;
      state.imp.msg = result.rows.length ? "" : "No students found in that file.";
      render();
    });
  }
  else if (e.target.dataset.field) {
    state.qc.fields[e.target.dataset.field] = e.target.value;
    // these fields reveal conditional inputs, so re-render the modal body only
    if (["item","type","to"].includes(e.target.dataset.field)) renderQuickCreate();
  }
  // Equipment's shared type/size selects for the current batch — these configure
  // the *draft*, not a ticket-level field, so they go through eqDraft (see eq-add-item above)
  else if (e.target.dataset.eqfield) {
    state.qc.eqDraft[e.target.dataset.eqfield] = e.target.value;
    renderQuickCreate();
  }
  // Equipment's item checkboxes — multiple can be checked at once for one "Add" batch
  else if (e.target.dataset.eqItemToggle) {
    const v = e.target.dataset.eqItemToggle;
    const arr = state.qc.eqDraft.items;
    const i = arr.indexOf(v);
    if (e.target.checked && i === -1) arr.push(v);
    else if (!e.target.checked && i !== -1) arr.splice(i, 1);
    renderQuickCreate(); // which items are checked decides whether type/size show
  }
});

/* ---- ENTER KEY submits login / AI-fill ---- */
document.addEventListener("keydown", async (e) => {
  if (e.key === "Enter" && (e.target.id === "login-email" || e.target.id === "login-password")) doLogin();
  else if (e.key === "Enter" && e.target.id === "qc-ai-text") {
    const text = (state.qc.aiText || "").trim();
    if (text && !state.qc.aiParsing) await parseTicketWithAI(text);
  }
});

/* ---- update just the student search dropdown (keeps input focused) ---- */
/* ---- update just the student list rows (keeps search box focused) ---- */
/* ---- update ONLY the quick-create modal body (no page repaint = no flash) ---- */
function renderQuickCreate() {
  const body = document.getElementById("qc-body");
  if (!body) { render(); return; }   // modal not open for some reason → fall back
  body.innerHTML = quickCreateBody();
}

function renderOpenList() {
  const wrap = document.getElementById("open-list");
  if (!wrap) { render(); return; }
  const visible = state.tickets.filter(t => t.assigned_role !== "SeniorAdmin" || isSeniorAdmin());
  const open = visible.filter(t => !["Completed","Rejected"].includes(t.status));
  wrap.innerHTML = openListHtml(open);
}

function renderCoachTickets() {
  const activeWrap = document.getElementById("coach-active-list");
  const closedWrap = document.getElementById("coach-closed-list");
  if (!activeWrap && !closedWrap) { render(); return; }
  const mine = state.tickets.filter(t => t.created_by === state.session.user.id);
  const CLOSED = ["Completed", "Rejected"];
  if (activeWrap) activeWrap.innerHTML = coachActiveListHtml(mine.filter(t => !CLOSED.includes(t.status)));
  if (closedWrap) closedWrap.innerHTML = coachClosedListHtml(mine.filter(t => CLOSED.includes(t.status)));
}

function renderStudentList() {
  const st = state.stu;
  const listWrap = document.getElementById("stu-list");
  if (!listWrap) { render(); return; }

  const pool = st.branchFilter ? state.students.filter(s => s.branch_id === st.branchFilter) : state.students;
  const list = st.q ? pool.filter(s => (s.name||"").toLowerCase().includes(st.q.toLowerCase())) : pool;

  listWrap.innerHTML = list.length === 0
    ? `<div class="text-xs text-slate-400 py-8 text-center">No students${st.q||st.branchFilter?" match this filter":" yet"}</div>`
    : list.map(s => `
      <div class="flex items-center justify-between px-3 py-2 border border-slate-200 rounded-lg gap-2">
        <div class="min-w-0">
          <div class="text-sm font-medium text-slate-900 truncate">${s.name}</div>
          <div class="text-xs text-slate-400 truncate">${branchName(s.branch_id)} · ${[s.time_1,s.time_2].filter(Boolean).join(" / ")||"no time"} ${s.parent_whatsapp?"· "+s.parent_whatsapp:""}</div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button data-action="stu-edit" data-id="${s.id}" class="text-slate-400 hover:text-slate-900 p-1.5" title="Edit">${icon("edit","w-4 h-4")}</button>
          <button data-action="stu-delete" data-id="${s.id}" class="text-slate-300 hover:text-red-600 p-1.5" title="Delete">${icon("x","w-4 h-4")}</button>
        </div>
      </div>`).join("");
}

function renderClosedList() {
  const wrap = document.getElementById("closed-list");
  if (!wrap) { render(); return; }
  const visible = state.tickets.filter(t => t.assigned_role !== "SeniorAdmin" || isSeniorAdmin());
  const done = visible.filter(t => ["Completed","Rejected"].includes(t.status));
  wrap.innerHTML = closedListHtml(done);
}
