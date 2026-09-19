/* ============================================================
   views.js
   Every screen and reusable piece of UI, as functions that
   return HTML strings. No data fetching here — just rendering.

   Sections:
     1. Login
     2. Header
     3. Shared card bits (badges, ticket card, buttons)
     4. Coach view (build tickets + notifications)
     5. Admin view (all tickets + actions)
     6. Admin "create account" panel
     7. Quick-create modal + dynamic fields
============================================================ */

/* ===== 0. LOADING / FEEDBACK HELPERS ===== */

// thin animated bar at the very top of the screen while data reloads
function topLoadingBar() {
  if (!state.dataLoading) return "";
  return `<div class="fixed top-0 left-0 right-0 h-0.5 z-[60] overflow-hidden bg-slate-200">
    <div class="h-full w-1/3 bg-slate-900 animate-[loadingbar_1s_ease-in-out_infinite]"></div>
  </div>`;
}

// transient message at bottom-center (success / error)
function toastView() {
  if (!state.toast) return "";
  const t = state.toast;
  const styles = {
    success: "bg-emerald-600 text-white",
    error:   "bg-red-600 text-white",
    info:    "bg-slate-900 text-white",
  };
  const ic = t.type === "success" ? "check" : t.type === "error" ? "x" : "bell";
  return `<div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] ${styles[t.type]||styles.info}
      px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 animate-[toastin_0.2s_ease-out]">
    ${icon(ic,"w-4 h-4")}${t.msg}</div>`;
}

// keyframes (injected once). animate-spin is built into Tailwind CDN.
function feedbackStyles() {
  return `<style>
    @keyframes loadingbar { 0%{transform:translateX(-100%)} 100%{transform:translateX(400%)} }
    @keyframes toastin { from{opacity:0;transform:translate(-50%,8px)} to{opacity:1;transform:translate(-50%,0)} }
    @keyframes fadein { from{opacity:0} to{opacity:1} }
    @keyframes modalpop { from{opacity:0;transform:translateY(12px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
    @keyframes sheetup { from{transform:translateY(100%)} to{transform:translateY(0)} }
    /* backdrop fades in; card pops (desktop) or slides up (mobile) */
    .modal-backdrop { animation: fadein .18s ease-out; }
    .modal-card { animation: modalpop .22s cubic-bezier(.16,1,.3,1); }
    @media (max-width: 640px) {
      .modal-card { animation: sheetup .28s cubic-bezier(.16,1,.3,1); }
    }
    /* gentle polish: buttons and cards ease their hover/press states */
    button { transition: transform .08s ease, background-color .15s ease, opacity .15s ease; }
    button:active { transform: scale(.97); }
  </style>`;
}

/* ===== 1. LOGIN ===== */
function LoginView() {
  return `
  <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 w-full max-w-sm relative">
      <button data-action="toggle-lang" title="${tr("nav_toggle_lang")}" class="absolute top-4 right-4 text-xs font-medium text-slate-400 hover:text-slate-700 border border-slate-200 rounded-lg px-2 py-1 flex items-center gap-1">${icon("globe","w-3.5 h-3.5")}${LANG==="en"?"中":"EN"}</button>
      <div class="flex items-center gap-2 mb-1">
        <img src="img/as.png" alt="Art Sport Badminton" class="h-9 w-auto object-contain" />
        <h1 class="text-lg font-semibold text-slate-900">ShuttleDesk</h1>
      </div>
      <p class="text-sm text-slate-500 mb-6">${tr("login_subtitle")}</p>
      <div class="space-y-3">
        <div>
          <label class="text-xs font-medium text-slate-500 mb-1 block">${tr("login_email")}</label>
          <div class="relative">
            <span class="absolute left-3 top-2.5 text-slate-400">${icon("mail")}</span>
            <input id="login-email" type="email" value="${state.login.email}" placeholder="${tr("login_email_placeholder")}"
              class="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label class="text-xs font-medium text-slate-500 mb-1 block">${tr("login_password")}</label>
          <div class="relative">
            <span class="absolute left-3 top-2.5 text-slate-400">${icon("lock")}</span>
            <input id="login-password" type="${state.showPassword ? "text" : "password"}" value="${state.login.password}" placeholder="••••••••"
              class="w-full border border-slate-200 rounded-lg pl-9 pr-10 py-2 text-sm" />
            <button data-action="toggle-password" type="button" class="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700">
              ${icon(state.showPassword ? "eyeoff" : "eye")}</button>
          </div>
        </div>
        ${state.authError ? `<div class="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">${state.authError}</div>` : ""}
        <button data-action="login" ${state.loggingIn ? "disabled" : ""}
          class="w-full bg-slate-900 text-white rounded-lg py-2.5 font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-70 transition">
          ${state.loggingIn ? `${icon("spinner","w-4 h-4 animate-spin")} ${tr("login_signingin")}` : `${icon("login")} ${tr("login_signin")}`}</button>
      </div>
      <p class="text-xs text-slate-400 mt-4 text-center">${tr("login_footer")}</p>
    </div>
  </div>`;
}

/* ===== 2. HEADER ===== */
function HeaderView() {
  const isAdmin = state.profile.role === "admin";

  // Admin action buttons: full labels on desktop, icon-only on mobile
  const right = isAdmin ? `
    <button data-action="open-students" class="text-sm text-slate-600 hover:text-slate-900 p-2 sm:px-3 sm:py-2 rounded-lg border border-slate-200 flex items-center gap-1.5" title="${tr("nav_students")}">
      ${icon("cap")}<span class="hidden sm:inline">${tr("nav_students")}</span></button>
    <button data-action="open-categories" class="text-sm text-slate-600 hover:text-slate-900 p-2 sm:px-3 sm:py-2 rounded-lg border border-slate-200 flex items-center gap-1.5" title="${tr("nav_categories")}">
      ${icon("grid")}<span class="hidden sm:inline">${tr("nav_categories")}</span></button>
    <button data-action="open-import" class="text-sm text-slate-600 hover:text-slate-900 p-2 sm:px-3 sm:py-2 rounded-lg border border-slate-200 flex items-center gap-1.5" title="${tr("nav_import")}">
      ${icon("upload")}<span class="hidden sm:inline">${tr("nav_import")}</span></button>
    <button data-action="open-branches" class="text-sm text-slate-600 hover:text-slate-900 p-2 sm:px-3 sm:py-2 rounded-lg border border-slate-200 flex items-center gap-1.5" title="${tr("nav_branches")}">
      ${icon("building")}<span class="hidden sm:inline">${tr("nav_branches")}</span></button>
    <button data-action="open-users" class="text-sm text-slate-600 hover:text-slate-900 p-2 sm:px-3 sm:py-2 rounded-lg border border-slate-200 flex items-center gap-1.5" title="${tr("nav_accounts")}">
      ${icon("users")}<span class="hidden sm:inline">${tr("nav_accounts")}</span></button>` : `
    <button data-action="open-modal" class="bg-slate-900 text-white p-2 sm:px-3 sm:py-2 rounded-lg text-sm font-medium flex items-center gap-1.5">
      ${icon("plus")}<span class="hidden sm:inline">${tr("nav_new_ticket")}</span></button>`;

  return `
  <header class="bg-white border-b border-slate-200 sticky top-0 z-20">
    <div class="max-w-6xl mx-auto px-3 sm:px-4 h-14 flex items-center gap-2 sm:gap-3">
      <img src="img/as.png" alt="Art Sport Badminton" class="h-9 sm:h-10 w-auto object-contain shrink-0" />
      <span class="font-semibold text-slate-900 hidden sm:inline">ShuttleDesk</span>
      <span class="text-xs px-2 py-1 rounded-full ${isAdmin ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"} font-medium truncate max-w-[8rem] sm:max-w-none">
        ${isAdmin ? tr("role_admin") : tr("role_coach")}<span class="hidden sm:inline"> · ${state.profile.full_name || state.session.user.email}</span></span>
      <div class="ml-auto flex items-center gap-1.5 sm:gap-2">
        ${right}
        <button data-action="toggle-lang" class="text-xs font-medium text-slate-500 hover:text-slate-900 p-2 rounded-lg border border-slate-200 flex items-center gap-1" title="${tr("nav_toggle_lang")}">
          ${icon("globe","w-4 h-4")}${LANG==="en"?"中":"EN"}</button>
        <button data-action="toggle-theme" class="text-slate-500 hover:text-slate-900 p-2 rounded-lg border border-slate-200" title="${tr("nav_toggle_theme")}">
          ${icon(document.documentElement.classList.contains("dark") ? "sun" : "moon", "w-4 h-4")}</button>
        <button data-action="logout" class="text-sm text-slate-500 hover:text-slate-900 p-2 sm:px-2 flex items-center gap-1" title="${tr("nav_signout")}">${icon("logout")}<span class="hidden sm:inline">${tr("nav_signout")}</span></button>
      </div>
    </div>
  </header>`;
}

/* ===== 3. SHARED CARD BITS ===== */
// the 5 built-in categories have i18n entries (cat_X_label/desc); an
// admin-added custom category won't, so fall back to what's stored on the
// category itself instead of showing a raw "cat_X_label" key.
function catLabel(key){ const k="cat_"+key+"_label"; return STRINGS.en[k]!==undefined ? tr(k) : (CATEGORIES[key]?.label || key); }
function catDesc(key){ const k="cat_"+key+"_desc"; return STRINGS.en[k]!==undefined ? tr(k) : (CATEGORIES[key]?.desc || ""); }
function catBadge(cat){ const c=CATEGORIES[cat]; return `<span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${CAT_STYLE[c.color]}">${icon(c.icon,"w-3.5 h-3.5")}${catLabel(cat)}</span>`; }
function statusBadge(s){ return `<span class="text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[s]}">${tr("status_"+s)}</span>`; }
// field key -> translated label, for the free-form {key: value} details object (values themselves stay as stored, only the key label is translated)
function detailRows(d){
  const rows = Object.entries(d||{}).map(([k,v]) => {
    // Equipment's multi-item list — one row per item instead of a raw stringified array
    if (k === "items" && Array.isArray(v)) {
      return v.map(it => `<div><span class="text-slate-400">${tr("fld_item")}:</span> <span class="text-slate-700">${optLabel(it.item)}${it.type?` (${optLabel(it.type)})`:""}${it.size?` · ${it.size}`:""}${it.quantity?` ×${it.quantity}`:""}</span></div>`).join("");
    }
    return `<div><span class="text-slate-400">${tr("fld_"+k)}:</span> <span class="text-slate-700">${v}</span></div>`;
  }).join("");
  return `<div class="text-xs text-slate-500 space-y-0.5 mt-1">${rows}</div>`;
}

// coarse "3h ago"-style relative time. Doesn't tick on its own — only updates
// on the next render() — which is frequent enough here (data refreshes, toasts).
function timeAgo(dateStr){
  if (!dateStr) return "";
  const sec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(day / 365)}y ago`;
}

// exact clock time the ticket was raised, e.g. "Sep 5, 3:14 PM"
function exactTime(dateStr){
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString(undefined, { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" });
}

// how long a ticket has been sitting since it was raised, e.g. "2d 3h"
function agingDuration(dateStr){
  if (!dateStr) return "";
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  const remHrs = hrs % 24;
  return remHrs ? `${days}d ${remHrs}h` : `${days}d`;
}

// aging badge — only meaningful while a ticket is still open; there's no
// closed_at column, so we can't show a turnaround time once it's Completed/Rejected
function agingBadge(t){
  if (t.status === "Completed" || t.status === "Rejected") return "";
  const hrs = (Date.now() - new Date(t.created_at).getTime()) / 3600000;
  const stale = hrs >= 48; // flag anything open 2+ days
  return `<span class="text-[10px] px-1.5 py-0.5 rounded font-medium ${stale?"bg-red-100 text-red-700":"bg-slate-100 text-slate-500"}">${tr("aging_prefix")} ${agingDuration(t.created_at)}</span>`;
}

function ticketCard(t, actionHtml=""){
  return `<div data-action="view-ticket" data-id="${t.id}" class="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition cursor-pointer">
    <div class="flex items-start justify-between gap-2 mb-2">
      <div><div class="flex items-center gap-2">
        ${t.priority==="High"?`<span class="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded font-medium">${tr("badge_high")}</span>`:""}
        ${t.assigned_role==="SeniorAdmin"?`<span class="text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded font-medium">${tr("badge_foc_senior")}</span>`:""}
        ${t.admin_note?`<span class="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium inline-flex items-center gap-1">${icon("note","w-2.5 h-2.5")}${tr("badge_note")}</span>`:""}
        ${agingBadge(t)}
      </div>
      <div class="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
        <span>${t.ticket_code}</span>·<span class="flex items-center gap-1">${icon("building","w-3 h-3")}${branchName(t.student.branch_id)}</span>·<span title="${timeAgo(t.created_at)}">${exactTime(t.created_at)}</span>
      </div></div>${statusBadge(t.status)}
    </div>
    <div class="flex items-center gap-2 mb-1">${catBadge(t.category)}</div>
    ${detailRows(t.details)}
    <div class="text-xs text-slate-400 mt-2 flex items-center gap-1">${icon("chevron","w-3 h-3")} ${tr("routed_to")} <span class="text-slate-600 font-medium">${t.routed_to}</span></div>
    ${actionHtml?`<div class="mt-3 pt-3 border-t border-slate-100">${actionHtml}</div>`:""}
  </div>`;
}

function sectionTitle(ic,text,count){ return `<h2 class="flex items-center gap-2 text-slate-900 font-semibold mb-3">${icon(ic,"w-5 h-5")}${text}${count!==undefined?`<span class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">${count}</span>`:""}</h2>`; }
function empty(text){ return `<div class="text-center text-slate-400 text-sm py-16 border border-dashed border-slate-200 rounded-xl">${text}</div>`; }
function actionBtn(id,next,label,ic,tone="dark"){
  const tones={dark:"bg-slate-900 text-white",green:"bg-emerald-600 text-white",red:"bg-red-100 text-red-700",amber:"bg-amber-500 text-white",ghost:"bg-slate-100 text-slate-500 hover:bg-slate-200"};
  const busy = state.busyTicket === id;
  return `<button data-action="advance" data-id="${id}" data-next="${next}" ${busy?"disabled":""}
    class="text-xs font-medium px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 ${tones[tone]} disabled:opacity-60">
    ${busy ? `${icon("spinner","w-3.5 h-3.5 animate-spin")}Working…` : `${icon(ic,"w-3.5 h-3.5")}${label}`}</button>`;
}
// admin: send a ticket back to "New" — undoes an accidental status click
function reopenBtn(id){ return actionBtn(id,"New","Reopen","undo","ghost"); }
// coach: withdraw a ticket that's still untouched (status "New")
function cancelBtn(id){
  const busy = state.busyTicket === id;
  return `<button data-action="cancel-ticket" data-id="${id}" ${busy?"disabled":""}
    class="text-xs font-medium px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-60">
    ${busy ? `${icon("spinner","w-3.5 h-3.5 animate-spin")}${tr("working")}` : `${icon("x","w-3.5 h-3.5")}${tr("btn_cancel_ticket")}`}</button>`;
}
// reopens the quick-create modal, pre-filled, for editing (coach: own New tickets; admin: any not-yet-closed ticket)
function editBtn(id){
  return `<button data-action="edit-ticket" data-id="${id}"
    class="text-xs font-medium px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200">
    ${icon("edit","w-3.5 h-3.5")}${tr("btn_edit")}</button>`;
}
// senior admin: sign off a FOC equipment request — once approved, it drops
// the "SeniorAdmin" gate and becomes visible/actionable to any admin
function approveFocBtn(id){
  const busy = state.busyTicket === id;
  return `<button data-action="approve-foc" data-id="${id}" ${busy?"disabled":""}
    class="text-xs font-medium px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60">
    ${busy ? `${icon("spinner","w-3.5 h-3.5 animate-spin")}Working…` : `${icon("check","w-3.5 h-3.5")}Approve FOC`}</button>`;
}
// admin: opens the reject-reason modal
function rejectBtn(id){
  return `<button data-action="open-reject" data-id="${id}"
    class="text-xs font-medium px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 bg-red-50 text-red-600 hover:bg-red-100">
    ${icon("x","w-3.5 h-3.5")}Reject</button>`;
}
// admin: opens the note editor. Filled/empty look different so admin can tell at a glance.
function noteBtn(t){
  const has = !!t.admin_note;
  return `<button data-action="open-note" data-id="${t.id}" title="${has?"Edit note":"Add note"}"
    class="text-xs font-medium px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 ${has?"bg-amber-100 text-amber-700 hover:bg-amber-200":"bg-slate-100 text-slate-500 hover:bg-slate-200"}">
    ${icon("note","w-3.5 h-3.5")}${has?"Note":"Add note"}</button>`;
}
// coach: re-raises a rejected ticket as a fresh one, pre-filled with the same category/details
function resubmitBtn(id){
  return `<button data-action="resubmit-ticket" data-id="${id}"
    class="text-xs font-medium px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 bg-slate-900 text-white hover:bg-slate-800">
    ${icon("plus","w-3.5 h-3.5")}${tr("btn_resubmit")}</button>`;
}
// one-line summary row for the Completed archive — full ticketCard detail isn't
// needed once a ticket is done, so this keeps that section scannable instead of
// stacking full cards indefinitely.
function completedRow(t){
  const c = CATEGORIES[t.category];
  return `<div data-action="view-ticket" data-id="${t.id}" class="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer">
    <div class="flex items-center gap-2 min-w-0">
      ${icon(c.icon,"w-4 h-4 text-slate-300 shrink-0")}
      ${statusBadge(t.status)}
      <span class="text-xs text-slate-400 truncate hidden sm:inline">${c.label} · ${branchName(t.student.branch_id)}</span>
    </div>
    <div class="flex items-center gap-2 shrink-0">
      <span class="text-xs text-slate-300 hidden sm:inline" title="${timeAgo(t.created_at)}">${t.ticket_code} · ${exactTime(t.created_at)}</span>
      ${noteBtn(t)}
      ${reopenBtn(t.id)}
    </div>
  </div>`;
}

// filter bar shown above the Closed archive when expanded
function closedFilterBar(){
  const cf = state.closedFilter;
  return `<div class="flex flex-wrap gap-2 mb-3">
    <select id="closed-status-filter" class="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white">
      <option value="">All statuses</option>
      <option value="Completed" ${cf.status==="Completed"?"selected":""}>Completed</option>
      <option value="Rejected" ${cf.status==="Rejected"?"selected":""}>Rejected</option>
    </select>
    <select id="closed-cat-filter" class="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white">
      <option value="">All categories</option>
      ${Object.entries(CATEGORIES).map(([key,c])=>`<option value="${key}" ${cf.category===key?"selected":""}>${c.label}</option>`).join("")}
    </select>
    <input id="closed-search" value="${cf.q}" placeholder="Search ticket code…" class="border border-slate-200 rounded-lg px-2 py-1.5 text-xs flex-1 min-w-[160px]" />
  </div>`;
}

// applies state.closedFilter to the given (already role-visible) closed tickets
function closedListHtml(done){
  const cf = state.closedFilter;
  let list = done;
  if (cf.status) list = list.filter(t => t.status === cf.status);
  if (cf.category) list = list.filter(t => t.category === cf.category);
  if (cf.q) {
    const q = cf.q.toLowerCase();
    list = list.filter(t => t.ticket_code.toLowerCase().includes(q));
  }
  if (!list.length) return `<div class="text-center text-slate-400 text-xs py-8 border border-dashed border-slate-200 rounded-xl">No closed tickets match this filter</div>`;
  return `<div class="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">${list.map(t=>completedRow(t)).join("")}</div>`;
}

// read-only detail popup — opened by clicking any ticket, open or completed
function TicketDetailModal(){
  const t = state.tickets.find(x => x.id === state.ticketDetail);
  if (!t) return "";
  const c = CATEGORIES[t.category];
  const when = t.created_at ? new Date(t.created_at).toLocaleString() : "—";
  return `<div class="modal-backdrop fixed inset-0 bg-black/40 flex items-end sm:items-start justify-center p-0 sm:p-4 z-50 overflow-y-auto" data-close="close-ticket-detail">
    <div class="modal-card bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg mt-0 sm:mt-10 shadow-xl max-h-[92vh] sm:max-h-none overflow-y-auto">
      <div class="flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <h2 class="font-semibold text-slate-900 flex items-center gap-2">${icon(c.icon,"w-5 h-5")}${tr("detail_title")}</h2>
        <button data-action="close-ticket-detail" class="text-slate-400 hover:text-slate-700">${icon("x","w-5 h-5")}</button>
      </div>
      <div class="p-5 space-y-3">
        <div class="flex items-center gap-1.5">${statusBadge(t.status)}${t.priority==="High"?`<span class="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded font-medium">${tr("badge_high")}</span>`:""}</div>
        <div class="flex items-center gap-2 flex-wrap">${catBadge(t.category)}${t.assigned_role==="SeniorAdmin"?`<span class="text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded font-medium">${tr("badge_foc_senior")}</span>`:""}</div>
        <div class="text-xs text-slate-500 space-y-1.5 bg-slate-50 rounded-lg p-3">
          <div class="flex justify-between gap-3"><span>${tr("detail_ticket_code")}</span><span class="text-slate-800 font-medium text-right">${t.ticket_code}</span></div>
          <div class="flex justify-between gap-3"><span>${tr("detail_branch")}</span><span class="text-slate-800 font-medium text-right">${branchName(t.student.branch_id)}</span></div>
          <div class="flex justify-between gap-3"><span>${tr("routed_to")}</span><span class="text-slate-800 font-medium text-right">${t.routed_to}</span></div>
          <div class="flex justify-between gap-3"><span>${tr("detail_department")}</span><span class="text-slate-800 font-medium text-right">${t.assigned_department}</span></div>
          <div class="flex justify-between gap-3"><span>${tr("detail_raised")}</span><span class="text-slate-800 font-medium text-right">${when}</span></div>
          ${t.status!=="Completed"&&t.status!=="Rejected" ? `<div class="flex justify-between gap-3"><span>${tr("aging_prefix")}</span><span class="text-slate-800 font-medium text-right">${agingDuration(t.created_at)}</span></div>` : ""}
        </div>
        ${Object.keys(t.details||{}).length ? `<div><div class="text-xs font-medium text-slate-500 mb-1">${tr("detail_request_details")}</div>${detailRows(t.details)}</div>` : ""}
        ${t.admin_note ? `<div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div class="text-xs font-medium text-amber-700 mb-1 flex items-center gap-1.5">${icon("note","w-3.5 h-3.5")}${tr("detail_note_from_admin")}</div>
          <div class="text-sm text-amber-900 whitespace-pre-wrap">${t.admin_note}</div>
        </div>` : ""}
      </div>
      ${(t.status==="Rejected" && t.created_by===state.session.user.id) ? `<div class="px-5 py-4 border-t border-slate-200 flex justify-end">${resubmitBtn(t.id)}</div>` : ""}
    </div>
  </div>`;
}

// admin: reject-with-reason popup
function RejectModal(){
  const t = state.tickets.find(x => x.id === state.rejectingId);
  if (!t) return "";
  const reason = state.rejectReason || "";
  return `<div class="modal-backdrop fixed inset-0 bg-black/40 flex items-end sm:items-start justify-center p-0 sm:p-4 z-50 overflow-y-auto" data-close="close-reject">
    <div class="modal-card bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md mt-0 sm:mt-16 shadow-xl">
      <div class="flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <h2 class="font-semibold text-slate-900 flex items-center gap-2">${icon("x","w-5 h-5 text-red-600")}Reject ticket</h2>
        <button data-action="close-reject" class="text-slate-400 hover:text-slate-700">${icon("x","w-5 h-5")}</button>
      </div>
      <div class="p-5 space-y-3">
        <p class="text-sm text-slate-600">Rejecting this ${CATEGORIES[t.category].label} request. The coach will be notified with your reason and will need to raise a new ticket if it's still needed.</p>
        <div>
          <label class="text-xs font-medium text-slate-500 mb-1 block">Reason</label>
          <textarea id="reject-reason" rows="3" placeholder="Why is this being rejected?" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">${reason}</textarea>
        </div>
      </div>
      <div class="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
        <button data-action="close-reject" class="text-sm text-slate-500 px-4 py-2">Cancel</button>
        <button data-action="confirm-reject" ${reason.trim()?"":"disabled"} class="bg-red-600 disabled:opacity-40 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-1.5">${icon("x","w-4 h-4")} Reject</button>
      </div>
    </div>
  </div>`;
}

// admin: add/edit a one-way note (admin writes, coach reads via the detail modal)
function NoteModal(){
  const t = state.tickets.find(x => x.id === state.noteEditId);
  if (!t) return "";
  const note = state.noteDraft || "";
  return `<div class="modal-backdrop fixed inset-0 bg-black/40 flex items-end sm:items-start justify-center p-0 sm:p-4 z-50 overflow-y-auto" data-close="close-note">
    <div class="modal-card bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md mt-0 sm:mt-16 shadow-xl">
      <div class="flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <h2 class="font-semibold text-slate-900 flex items-center gap-2">${icon("note","w-5 h-5")}Note</h2>
        <button data-action="close-note" class="text-slate-400 hover:text-slate-700">${icon("x","w-5 h-5")}</button>
      </div>
      <div class="p-5 space-y-3">
        <p class="text-sm text-slate-600">Visible to the coach on this ticket's detail view. One-way — they can't reply here.</p>
        <textarea id="note-draft" rows="4" placeholder="e.g. Called the parent, waiting on confirmation…" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">${note}</textarea>
      </div>
      <div class="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
        <button data-action="close-note" class="text-sm text-slate-500 px-4 py-2">Cancel</button>
        <button data-action="save-note" class="bg-slate-900 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-1.5">${icon("check","w-4 h-4")} Save</button>
      </div>
    </div>
  </div>`;
}

/* ===== 4. COACH VIEW ===== */
// coach-side search across their own tickets — by name, ticket code, or category
function applyCoachSearch(list){
  const q = (state.coachSearch||"").trim().toLowerCase();
  if (!q) return list;
  return list.filter(t =>
    t.ticket_code.toLowerCase().includes(q) ||
    CATEGORIES[t.category].label.toLowerCase().includes(q) ||
    tr("cat_"+t.category+"_label").toLowerCase().includes(q)
  );
}

function coachActiveListHtml(allActive){
  if (!allActive.length) return empty(tr("no_tickets_yet"));
  const list = applyCoachSearch(allActive);
  if (!list.length) return empty(tr("no_tickets_match_search"));
  return `<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">${list.map(t=>ticketCard(t, t.status==="New"?`<div class="flex gap-2">${editBtn(t.id)}${cancelBtn(t.id)}</div>`:"")).join("")}</div>`;
}

function coachClosedListHtml(allClosed){
  const list = applyCoachSearch(allClosed);
  if (!list.length) return empty(tr("no_closed_match_search"));
  return `<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 opacity-75">${list.map(t=>ticketCard(t, t.status==="Rejected"?resubmitBtn(t.id):"")).join("")}</div>`;
}

function CoachView() {
  // newest first — defensive sort, doesn't rely on state.tickets' load order
  const mine = state.tickets
    .filter(t => t.created_by === state.session.user.id)
    .sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

  // active tickets sorted newest-first (above); Completed/Rejected grouped below
  const CLOSED = ["Completed", "Rejected"];
  const active = mine.filter(t => !CLOSED.includes(t.status));
  const closed = mine.filter(t => CLOSED.includes(t.status));

  const searchBar = mine.length===0 ? "" : `<div class="relative mb-4">
    <span class="absolute left-3 top-2.5 text-slate-400">${icon("search","w-4 h-4")}</span>
    <input id="coach-search" value="${state.coachSearch}" placeholder="${tr("search_my_tickets_placeholder")}" class="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm" />
  </div>`;

  const activeHtml = `<div id="coach-active-list">${coachActiveListHtml(active)}</div>`;

  const closedHeader = closed.length===0 ? "" : `<button data-action="toggle-coach-closed" class="w-full flex items-center gap-2 text-slate-900 font-semibold mb-3">
    ${icon("chevron", `w-4 h-4 transition-transform ${state.coachClosedCollapsed ? "" : "rotate-90"}`)}
    ${icon("check","w-5 h-5")}${tr("closed")}<span class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">${closed.length}</span>
  </button>`;
  const closedHtml = closed.length===0 ? "" : `<div class="mt-8">
    ${closedHeader}
    ${state.coachClosedCollapsed ? "" : `<div id="coach-closed-list">${coachClosedListHtml(closed)}</div>`}
  </div>`;

  return `<div>${searchBar}${sectionTitle("grid",tr("my_tickets"), active.length)}${activeHtml}${closedHtml}</div>`;
}

/* ===== 5. ADMIN VIEW ===== */

// which action buttons an open ticket gets depends on its category — Reject
// is offered for every category, not per-category, so it lives outside the switch
function adminActionsFor(t){
  // A senior admin's job here is sign-off only: while a FOC ticket is still
  // pending their decision, Approve or Reject it — nothing else, and NEVER
  // the day-to-day processing buttons (Mark ready / Mark collected / Edit).
  // Once decided (approved → assigned_role moves off "SeniorAdmin", or
  // rejected → status "Rejected"), that decision is final — no more Approve
  // or Reject from the senior admin, just Note left available for both.
  if (isSeniorAdmin()) {
    const pending = t.assigned_role === "SeniorAdmin";
    return `<div class="flex items-center justify-between gap-2 flex-wrap">
      <div class="flex items-center gap-2 flex-wrap">${pending ? `${approveFocBtn(t.id)}${rejectBtn(t.id)}` : ""}${noteBtn(t)}</div>
    </div>`;
  }

  let primary;
  if (t.category === "Equipment")
    primary = t.status !== "Ready" ? actionBtn(t.id,"Ready","Mark ready","package","amber") : actionBtn(t.id,"Completed","Mark collected","check","green");
  else if (t.category === "Finance")
    primary = actionBtn(t.id,"Completed","Approve","check","green");
  else if (t.category === "ChangeClass")
    primary = `<div class="flex gap-2">${actionBtn(t.id,"Completed","Approve change","check","green")}${actionBtn(t.id,"In_Progress","Review","clock","dark")}</div>`;
  else // Schedule / SpecialCare
    primary = t.status === "New" ? actionBtn(t.id,"Completed","Acknowledge","check","dark")
      : actionBtn(t.id,"Completed","Complete","check","green");

  const undo = t.status === "New" ? "" : reopenBtn(t.id);
  return `<div class="flex items-center justify-between gap-2 flex-wrap">
    <div class="flex items-center gap-2 flex-wrap">${primary}${editBtn(t.id)}${rejectBtn(t.id)}${noteBtn(t)}</div>
    ${undo}
  </div>`;
}

// filter bar shown above the open "All tickets" list
function openFilterBar(){
  const of = state.openFilter;
  return `<div class="flex flex-wrap gap-2 mb-3">
    <select id="open-status-filter" class="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white">
      <option value="">All statuses</option>
      <option value="New" ${of.status==="New"?"selected":""}>New</option>
      <option value="In_Progress" ${of.status==="In_Progress"?"selected":""}>In Progress</option>
      <option value="Ready" ${of.status==="Ready"?"selected":""}>Ready</option>
    </select>
    <select id="open-cat-filter" class="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white">
      <option value="">All categories</option>
      ${Object.entries(CATEGORIES).map(([key,c])=>`<option value="${key}" ${of.category===key?"selected":""}>${c.label}</option>`).join("")}
    </select>
    <select id="open-branch-filter" class="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white">
      <option value="">All branches</option>
      ${BRANCHES.map(b=>`<option value="${b.id}" ${of.branch===b.id?"selected":""}>${b.name}</option>`).join("")}
    </select>
    <input id="open-search" value="${of.q}" placeholder="Search ticket code…" class="border border-slate-200 rounded-lg px-2 py-1.5 text-xs flex-1 min-w-[160px]" />
  </div>`;
}

function applyOpenFilter(open){
  const of = state.openFilter;
  let list = open;
  if (of.status) list = list.filter(t => t.status === of.status);
  if (of.category) list = list.filter(t => t.category === of.category);
  if (of.branch) list = list.filter(t => t.student.branch_id === of.branch);
  if (of.q) {
    const q = of.q.toLowerCase();
    list = list.filter(t => t.ticket_code.toLowerCase().includes(q));
  }
  return list;
}

// open.length===0 (nothing open at all) vs a filter matching nothing get different messages
function openListHtml(open){
  if (!open.length) return empty("No open tickets");
  const list = applyOpenFilter(open);
  if (!list.length) return empty("No open tickets match this filter");
  return `<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">${list.map(t=>ticketCard(t, adminActionsFor(t))).join("")}</div>`;
}

// small stats overview — same SeniorAdmin visibility rule as the rest of AdminView
function StatsPanel(){
  const visible = state.tickets.filter(t => t.assigned_role !== "SeniorAdmin" || isSeniorAdmin());
  const total = visible.length;
  const closed = visible.filter(t => t.status === "Completed" || t.status === "Rejected").length;
  const pending = total - closed;

  const now = new Date();
  const thisMonth = visible.filter(t => {
    if (!t.created_at) return false;
    const d = new Date(t.created_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  const tile = (label, value, ic, hue) => `<div class="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
    <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-${hue}-100 text-${hue}-600">${icon(ic,"w-4 h-4")}</div>
    <div>
      <div class="text-xs text-slate-400">${label}</div>
      <div class="text-xl font-semibold text-${hue}-700">${value}</div>
    </div>
  </div>`;

  // maps a CATEGORIES color name to a solid bar-fill class
  const BAR_COLOR = { amber:"bg-amber-500", blue:"bg-blue-500", purple:"bg-purple-500", green:"bg-emerald-500", red:"bg-red-500" };
  const barRow = (label, count, max, barColorCls) => `<div class="flex items-center gap-2 text-xs">
    <span class="w-28 truncate text-slate-500">${label}</span>
    <div class="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden"><div class="h-full ${barColorCls||"bg-slate-900"}" style="width:${max?Math.round(count/max*100):0}%"></div></div>
    <span class="w-6 text-right text-slate-700 font-medium">${count}</span>
  </div>`;

  const byCategory = {};
  for (const t of visible) byCategory[t.category] = (byCategory[t.category]||0) + 1;
  const catEntries = Object.entries(byCategory).sort((a,b)=>b[1]-a[1]);
  const catMax = catEntries.length ? catEntries[0][1] : 0;
  const catHtml = catEntries.map(([key,count]) => barRow(CATEGORIES[key]?.label || key, count, catMax, BAR_COLOR[CATEGORIES[key]?.color])).join("");

  const byBranch = {};
  for (const t of visible) { const id = t.student.branch_id; byBranch[id] = (byBranch[id]||0) + 1; }
  const branchEntries = Object.entries(byBranch).sort((a,b)=>b[1]-a[1]);
  const branchMax = branchEntries.length ? branchEntries[0][1] : 0;
  const branchHtml = branchEntries.map(([id,count]) => barRow(branchName(id), count, branchMax, "bg-blue-500")).join("");

  return `<div class="mb-6 space-y-3">
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      ${tile("Total tickets", total, "ticket", "blue")}
      ${tile("Pending", pending, "clock", "amber")}
      ${tile("Closed", closed, "check", "emerald")}
      ${tile("New this month", thisMonth, "calendar", "purple")}
    </div>
    <div class="grid sm:grid-cols-2 gap-3">
      <div class="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
        <div class="text-xs font-medium text-slate-500 mb-1">By category</div>
        ${catHtml || `<div class="text-xs text-slate-400">No tickets yet</div>`}
      </div>
      <div class="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
        <div class="text-xs font-medium text-slate-500 mb-1">By branch</div>
        ${branchHtml || `<div class="text-xs text-slate-400">No tickets yet</div>`}
      </div>
    </div>
  </div>`;
}

function AdminView() {
  // FOC equipment requests need senior sign-off — regular admin doesn't get
  // to see them at all, not just get the buttons hidden.
  const visible = state.tickets.filter(t => t.assigned_role !== "SeniorAdmin" || isSeniorAdmin());
  const CLOSED = ["Completed", "Rejected"];
  const open = visible.filter(t => !CLOSED.includes(t.status));
  const done = visible.filter(t => CLOSED.includes(t.status));

  const openHtml = `<div id="open-list">${openListHtml(open)}</div>`;

  const closedHeader = `<button data-action="toggle-closed" class="w-full flex items-center gap-2 text-slate-900 font-semibold mb-3">
    ${icon("chevron", `w-4 h-4 transition-transform ${state.closedCollapsed ? "" : "rotate-90"}`)}
    ${icon("check","w-5 h-5")}Closed<span class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">${done.length}</span>
  </button>`;
  const doneHtml = done.length===0 ? "" : `<div class="mt-8">
    ${closedHeader}
    ${state.closedCollapsed ? "" : `${closedFilterBar()}<div id="closed-list">${closedListHtml(done)}</div>`}
  </div>`;

  return `<div>${StatsPanel()}${sectionTitle("grid","All tickets", open.length)}${openFilterBar()}${openHtml}${doneHtml}</div>`;
}

/* ===== 6. ADMIN CREATE-ACCOUNT PANEL ===== */
function AdminUserPanel() {
  const nu = state.newUser;

  // ----- CREATE / EDIT FORM MODE -----
  if (nu.editing) {
    const isNew = nu.editing === "new";
    const isSelf = !isNew && nu.editing === state.profile.id;
    return `
    <div class="modal-backdrop fixed inset-0 bg-black/40 flex items-end sm:items-start justify-center p-0 sm:p-4 z-50 overflow-y-auto" data-close="user-cancel-edit">
      <div class="modal-card bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md mt-0 sm:mt-16 shadow-xl max-h-[92vh] sm:max-h-none overflow-y-auto">
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 class="font-semibold text-slate-900 flex items-center gap-2">${icon(isNew?"plus":"edit","w-5 h-5")}${isNew?"Create account":"Edit account"}</h2>
          <button data-action="user-cancel-edit" class="text-slate-400 hover:text-slate-700">${icon("x","w-5 h-5")}</button>
        </div>
        <div class="p-5 space-y-3">
          <div><label class="text-xs font-medium text-slate-500 mb-1 block">Full name</label>
            <input id="nu-name" value="${nu.name}" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Coach Tan" /></div>
          ${isNew ? `
          <div><label class="text-xs font-medium text-slate-500 mb-1 block">Email</label>
            <input id="nu-email" type="email" value="${nu.email}" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="coach@example.com" /></div>
          <div><label class="text-xs font-medium text-slate-500 mb-1 block">Temporary password</label>
            <input id="nu-password" value="${nu.password}" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="min 6 characters" /></div>` :
            `<p class="text-[11px] text-slate-400 -mt-1">Email and password can't be changed here — that needs Supabase Auth admin access, not just this app.</p>`}
          <div><label class="text-xs font-medium text-slate-500 mb-1 block">Role</label>
            <select id="nu-role" ${isSelf?"disabled":""} class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm ${isSelf?"bg-slate-50 text-slate-400":""}">
              <option value="coach" ${nu.role==="coach"?"selected":""}>Coach</option>
              <option value="admin" ${nu.role==="admin"?"selected":""}>Admin</option>
            </select>
            ${isSelf?`<p class="text-[11px] text-slate-400 mt-1">Can't change your own role here — ask another admin.</p>`:""}</div>
          ${nu.msg?`<div class="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">${nu.msg}</div>`:""}
        </div>
        <div class="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button data-action="user-cancel-edit" class="text-sm text-slate-500 px-4 py-2">Cancel</button>
          <button data-action="user-save" ${state.creatingUser ? "disabled" : ""} class="bg-slate-900 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-1.5 disabled:opacity-70">${state.creatingUser ? `${icon("spinner","w-4 h-4 animate-spin")} Creating…` : `${icon("check")} ${isNew?"Create account":"Save"}`}</button>
        </div>
      </div>
    </div>`;
  }

  // ----- LIST MODE -----
  const rows = state.users.length === 0
    ? `<div class="text-xs text-slate-400 py-8 text-center">No accounts yet</div>`
    : state.users.map(u => `
      <div class="flex items-center justify-between px-3 py-2 border border-slate-200 rounded-lg gap-2">
        <div class="min-w-0">
          <div class="text-sm font-medium text-slate-900 truncate">${u.full_name || "(no name)"}${u.id===state.profile.id?` <span class="text-slate-400 font-normal">(you)</span>`:""}</div>
          <div class="text-xs text-slate-400 truncate capitalize">${u.role}</div>
        </div>
        <button data-action="user-edit" data-id="${u.id}" class="text-slate-400 hover:text-slate-900 p-1.5 shrink-0" title="Edit">${icon("edit","w-4 h-4")}</button>
      </div>`).join("");

  return `
  <div class="modal-backdrop fixed inset-0 bg-black/40 flex items-end sm:items-start justify-center p-0 sm:p-4 z-50 overflow-y-auto" data-close="close-users">
    <div class="modal-card bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md mt-0 sm:mt-16 shadow-xl max-h-[92vh] sm:max-h-none overflow-y-auto flex flex-col">
      <div class="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
        <h2 class="font-semibold text-slate-900 flex items-center gap-2">${icon("users","w-5 h-5")}Accounts <span class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">${state.users.length}</span></h2>
        <button data-action="close-users" class="text-slate-400 hover:text-slate-700">${icon("x","w-5 h-5")}</button>
      </div>
      <div class="p-5 space-y-3">
        <button data-action="user-add" class="w-full bg-slate-900 text-white rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-1.5">${icon("plus")} Create account</button>
        <div class="space-y-2 max-h-[50vh] overflow-y-auto">${rows}</div>
      </div>
    </div>
  </div>`;
}

/* ===== 6b. ADMIN MANAGE-BRANCHES PANEL ===== */
function AdminBranchPanel() {
  const nb = state.newBranch;
  const rows = BRANCHES.length === 0
    ? `<div class="text-xs text-slate-400 py-4 text-center">No branches yet</div>`
    : BRANCHES.map(b => `
      <div class="flex items-center justify-between px-3 py-2 border border-slate-200 rounded-lg">
        <div class="text-sm"><span class="font-medium text-slate-900">${b.name}</span>
          <span class="text-xs text-slate-400 ml-2">${b.id}</span></div>
        <button data-action="delete-branch" data-id="${b.id}" class="text-slate-300 hover:text-red-600" title="Delete">${icon("x","w-4 h-4")}</button>
      </div>`).join("");

  return `
  <div class="modal-backdrop fixed inset-0 bg-black/40 flex items-end sm:items-start justify-center p-0 sm:p-4 z-50 overflow-y-auto" data-close="close-branches">
    <div class="modal-card bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md mt-0 sm:mt-16 shadow-xl max-h-[92vh] sm:max-h-none overflow-y-auto">
      <div class="flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <h2 class="font-semibold text-slate-900 flex items-center gap-2">${icon("building","w-5 h-5")}Manage branches</h2>
        <button data-action="close-branches" class="text-slate-400 hover:text-slate-700">${icon("x","w-5 h-5")}</button>
      </div>
      <div class="p-5 space-y-4">
        <div class="space-y-2">${rows}</div>

        <div class="pt-3 border-t border-slate-100">
          <p class="text-xs font-medium text-slate-500 mb-2">Add a branch</p>
          <div class="flex gap-2">
            <input id="nb-id" value="${nb.id}" maxlength="8" placeholder="Code (e.g. SA)" class="w-28 border border-slate-200 rounded-lg px-3 py-2 text-sm uppercase" />
            <input id="nb-name" value="${nb.name}" placeholder="Full name (e.g. Simpang Ampat)" class="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <p class="text-[11px] text-slate-400 mt-1">Code is permanent once used — keep it short and unique.</p>
          ${nb.msg?`<div class="text-xs ${nb.msg.startsWith("✓")?"text-emerald-600 bg-emerald-50":"text-red-600 bg-red-50"} rounded-lg px-3 py-2 mt-2">${nb.msg}</div>`:""}
        </div>
      </div>
      <div class="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
        <button data-action="close-branches" class="text-sm text-slate-500 px-4 py-2">Close</button>
        <button data-action="add-branch" class="bg-slate-900 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-1.5">${icon("plus")} Add branch</button>
      </div>
    </div>
  </div>`;
}

/* ===== 6b2. ADMIN MANAGE-CATEGORIES PANEL =====
   Schedule/ChangeClass/Finance/SpecialCare are still fully working under the
   hood (old tickets, routing.js special-case logic) — they're just not
   offered anywhere in the UI anymore (Quick ticket picker or here), so this
   list only ever shows Equipment (the one built-in still in active use) plus
   whatever admin-added categories exist. Nothing here can delete Equipment —
   routing.js has special-case logic tied to it (FOC sign-off, etc.). ===== */
function AdminCategoryPanel() {
  const nc = state.newCategory;
  const rows = Object.entries(CATEGORIES).filter(([key]) => !HIDDEN_BUILTIN_CATEGORIES.includes(key)).map(([key, c]) => {
    const builtin = !!BUILTIN_CATEGORIES[key];
    return `
      <div class="flex items-center justify-between px-3 py-2 border border-slate-200 rounded-lg gap-2">
        <div class="min-w-0 flex items-center gap-2">
          <span class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${CAT_STYLE[c.color]}">${icon(c.icon,"w-3.5 h-3.5")}</span>
          <div class="min-w-0">
            <div class="text-sm font-medium text-slate-900 truncate">${catLabel(key)}${builtin?` <span class="text-slate-400 font-normal">(built-in)</span>`:""}</div>
            <div class="text-xs text-slate-400 truncate">${c.dept} · ${c.role}</div>
          </div>
        </div>
        ${builtin ? "" : `<button data-action="delete-category" data-key="${key}" class="text-slate-300 hover:text-red-600 shrink-0" title="Delete">${icon("x","w-4 h-4")}</button>`}
      </div>`;
  }).join("");

  const colorOptions = CATEGORY_COLORS.map(c => `<option value="${c}" ${nc.color===c?"selected":""}>${c}</option>`).join("");
  const iconOptions = CATEGORY_ICONS.map(i => `<option value="${i}" ${nc.icon===i?"selected":""}>${i}</option>`).join("");

  return `
  <div class="modal-backdrop fixed inset-0 bg-black/40 flex items-end sm:items-start justify-center p-0 sm:p-4 z-50 overflow-y-auto" data-close="close-categories">
    <div class="modal-card bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md mt-0 sm:mt-16 shadow-xl max-h-[92vh] sm:max-h-none overflow-y-auto">
      <div class="flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <h2 class="font-semibold text-slate-900 flex items-center gap-2">${icon("grid","w-5 h-5")}Manage categories</h2>
        <button data-action="close-categories" class="text-slate-400 hover:text-slate-700">${icon("x","w-5 h-5")}</button>
      </div>
      <div class="p-5 space-y-4">
        <div class="space-y-2">${rows}</div>

        <div class="pt-3 border-t border-slate-100 space-y-2">
          <p class="text-xs font-medium text-slate-500">Add a category</p>
          <div class="flex gap-2">
            <input id="nc-key" value="${nc.key}" maxlength="24" placeholder="Code (e.g. Merchandise)" class="w-40 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <input id="nc-label" value="${nc.label}" placeholder="Display label" class="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <input id="nc-desc" value="${nc.desc}" placeholder="Short description (optional)" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          <div class="grid grid-cols-2 gap-2">
            <input id="nc-dept" value="${nc.dept}" placeholder="Department (e.g. Central)" class="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <input id="nc-role" value="${nc.role}" placeholder="Assigned role (e.g. Admin)" class="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <select id="nc-color" class="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">${colorOptions}</select>
            <select id="nc-icon" class="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">${iconOptions}</select>
          </div>
          <p class="text-[11px] text-slate-400">Code is permanent once used — keep it short and unique. Department/role decide who this ticket gets routed to.</p>
          ${nc.msg?`<div class="text-xs ${nc.msg.startsWith("✓")?"text-emerald-600 bg-emerald-50":"text-red-600 bg-red-50"} rounded-lg px-3 py-2">${nc.msg}</div>`:""}
        </div>
      </div>
      <div class="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
        <button data-action="close-categories" class="text-sm text-slate-500 px-4 py-2">Close</button>
        <button data-action="add-category" class="bg-slate-900 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-1.5">${icon("plus")} Add category</button>
      </div>
    </div>
  </div>`;
}

/* ===== 6c. ADMIN IMPORT-STUDENTS PANEL ===== */
function AdminImportPanel() {
  const im = state.imp;
  const branchOptions = `<option value="">Choose branch…</option>` +
    BRANCHES.map(b => `<option value="${b.id}" ${im.branch===b.id?"selected":""}>${b.name}</option>`).join("");

  const preview = im.rows.length ? `
    <div class="border border-slate-200 rounded-lg overflow-hidden">
      <div class="bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 flex items-center justify-between">
        <span>${im.fileName}</span><span>${im.rows.length} student(s) found</span>
      </div>
      <div class="max-h-40 overflow-y-auto divide-y divide-slate-100">
        ${im.rows.slice(0,8).map(r => `<div class="px-3 py-1.5 text-xs flex justify-between">
          <span class="font-medium text-slate-800">${r.name}</span>
          <span class="text-slate-400">${[r.time_1,r.time_2].filter(Boolean).join(" / ")} ${r.parent_whatsapp?"· "+r.parent_whatsapp:""}</span></div>`).join("")}
        ${im.rows.length>8?`<div class="px-3 py-1.5 text-xs text-slate-400">…and ${im.rows.length-8} more</div>`:""}
      </div>
    </div>` : "";

  const canImport = im.rows.length > 0 && im.branch && !im.importing;

  return `
  <div class="modal-backdrop fixed inset-0 bg-black/40 flex items-end sm:items-start justify-center p-0 sm:p-4 z-50 overflow-y-auto" data-close="close-import">
    <div class="modal-card bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg mt-0 sm:mt-16 shadow-xl max-h-[92vh] sm:max-h-none overflow-y-auto">
      <div class="flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <h2 class="font-semibold text-slate-900 flex items-center gap-2">${icon("upload","w-5 h-5")}Import students</h2>
        <button data-action="close-import" class="text-slate-400 hover:text-slate-700">${icon("x","w-5 h-5")}</button>
      </div>
      <div class="p-5 space-y-4">
        <p class="text-xs text-slate-500">Export your branch's Google Sheet as CSV and drop it here. Columns like
          <span class="font-medium">Player Name, Time 1, Time 2, Phone Number</span> are detected automatically; other columns are ignored.</p>

        <div>
          <label class="text-xs font-medium text-slate-500 mb-1 block">1. Which branch are these students in?</label>
          <select id="imp-branch" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">${branchOptions}</select>
        </div>

        <div>
          <label class="text-xs font-medium text-slate-500 mb-1 block">2. Choose the CSV file</label>
          <label class="border border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center gap-2 text-slate-400 cursor-pointer hover:border-slate-400">
            ${icon("upload","w-7 h-7")}
            <span class="text-xs">${im.fileName ? im.fileName : "Click to choose a .csv file"}</span>
            <input id="imp-file" type="file" accept=".csv,text/csv" class="hidden" />
          </label>
        </div>

        ${preview}
        ${im.msg?`<div class="text-xs ${im.msg.startsWith("✓")?"text-emerald-600 bg-emerald-50":"text-red-600 bg-red-50"} rounded-lg px-3 py-2">${im.msg}</div>`:""}
      </div>
      <div class="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
        <button data-action="close-import" class="text-sm text-slate-500 px-4 py-2">Close</button>
        <button data-action="run-import" ${canImport?"":"disabled"} class="bg-slate-900 disabled:opacity-40 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-1.5">
          ${im.importing ? `${icon("spinner","w-4 h-4 animate-spin")} Importing…` : `${icon("check")} Import ${im.rows.length||""} students`}</button>
      </div>
    </div>
  </div>`;
}

/* ===== 6d. ADMIN MANAGE-STUDENTS PANEL ===== */
function AdminStudentPanel() {
  const st = state.stu;

  // ----- EDIT / ADD FORM MODE -----
  if (st.editing) {
    const f = st.form;
    const isNew = st.editing === "new";
    const input = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm";
    const lbl = "text-xs font-medium text-slate-500 mb-1 block";
    const branchOpts = `<option value="">No branch</option>` +
      BRANCHES.map(b => `<option value="${b.id}" ${f.branch_id===b.id?"selected":""}>${b.name}</option>`).join("");

    return `
    <div class="modal-backdrop fixed inset-0 bg-black/40 flex items-end sm:items-start justify-center p-0 sm:p-4 z-50 overflow-y-auto" data-close="stu-cancel-edit">
      <div class="modal-card bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md mt-0 sm:mt-16 shadow-xl max-h-[92vh] sm:max-h-none overflow-y-auto">
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 class="font-semibold text-slate-900 flex items-center gap-2">${icon(isNew?"plus":"edit","w-5 h-5")}${isNew?"Add student":"Edit student"}</h2>
          <button data-action="stu-cancel-edit" class="text-slate-400 hover:text-slate-700">${icon("x","w-5 h-5")}</button>
        </div>
        <div class="p-5 space-y-3">
          <div><label class="${lbl}">Name</label><input id="stu-name" value="${f.name||""}" class="${input}" placeholder="Student full name" /></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="${lbl}">Time 1</label><input id="stu-time1" value="${f.time_1||""}" class="${input}" placeholder="e.g. Sat 3pm" /></div>
            <div><label class="${lbl}">Time 2</label><input id="stu-time2" value="${f.time_2||""}" class="${input}" placeholder="optional" /></div>
          </div>
          <div><label class="${lbl}">Parent WhatsApp</label><input id="stu-phone" value="${f.parent_whatsapp||""}" class="${input}" placeholder="+60..." /></div>
          <div><label class="${lbl}">Branch</label><select id="stu-branch" class="${input}">${branchOpts}</select></div>
          ${st.msg?`<div class="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">${st.msg}</div>`:""}
        </div>
        <div class="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button data-action="stu-cancel-edit" class="text-sm text-slate-500 px-4 py-2">Cancel</button>
          <button data-action="stu-save" class="bg-slate-900 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-1.5">${icon("check")} ${isNew?"Add":"Save"}</button>
        </div>
      </div>
    </div>`;
  }

  // ----- LIST MODE -----
  const pool = st.branchFilter ? state.students.filter(s => s.branch_id === st.branchFilter) : state.students;
  const list = st.q ? pool.filter(s => (s.name||"").toLowerCase().includes(st.q.toLowerCase())) : pool;
  const branchOptions = `<option value="">All branches</option>` +
    BRANCHES.map(b => `<option value="${b.id}" ${st.branchFilter===b.id?"selected":""}>${b.name}</option>`).join("");

  const rows = list.length === 0
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

  return `
  <div class="modal-backdrop fixed inset-0 bg-black/40 flex items-end sm:items-start justify-center p-0 sm:p-4 z-50 overflow-y-auto" data-close="close-students">
    <div class="modal-card bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg mt-0 sm:mt-16 shadow-xl max-h-[92vh] sm:max-h-none overflow-y-auto flex flex-col">
      <div class="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
        <h2 class="font-semibold text-slate-900 flex items-center gap-2">${icon("cap","w-5 h-5")}Students <span class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">${state.students.length}</span></h2>
        <button data-action="close-students" class="text-slate-400 hover:text-slate-700">${icon("x","w-5 h-5")}</button>
      </div>
      <div class="p-5 space-y-3">
        <div class="flex gap-2">
          <select id="stu-branch-filter" class="border border-slate-200 rounded-lg px-2 py-2 text-sm bg-white">${branchOptions}</select>
          <div class="relative flex-1">
            <span class="absolute left-3 top-2.5 text-slate-400">${icon("search")}</span>
            <input id="stu-search" value="${st.q}" placeholder="Search name…" class="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm" />
          </div>
        </div>
        <button data-action="stu-add" class="w-full bg-slate-900 text-white rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-1.5">${icon("plus")} Add student</button>
        <div id="stu-list" class="space-y-2 max-h-[50vh] overflow-y-auto">${rows}</div>
      </div>
    </div>
  </div>`;
}

/* ===== 7. QUICK-CREATE MODAL (coach) =====
   Split into a shell (backdrop + card frame) and a body (#qc-body).
   Selecting things updates ONLY #qc-body via renderQuickCreate(),
   so the page never fully repaints — no flash. ===== */
function QuickCreateView() {
  const editing = !!state.qc.editingId;
  return `<div class="modal-backdrop fixed inset-0 bg-black/40 flex items-end sm:items-start justify-center p-0 sm:p-4 z-50 overflow-y-auto" data-close="close-modal">
    <div class="modal-card bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg mt-0 sm:mt-10 shadow-xl max-h-[92vh] sm:max-h-none overflow-y-auto">
      <div class="flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <h2 class="font-semibold text-slate-900 flex items-center gap-2">${icon(editing?"edit":"plus","w-5 h-5")}${editing?tr("qc_title_edit"):tr("qc_title_new")}</h2>
        <button data-action="close-modal" class="text-slate-400 hover:text-slate-700">${icon("x","w-5 h-5")}</button>
      </div>
      <div id="qc-body">${quickCreateBody()}</div>
    </div>
  </div>`;
}

// Category is the main thing being picked here — branch is just an optional
// remark, so it neither gates nor is gated by anything else.
function quickCreateBody() {
  const { branch, cat, fields, editingId, aiText, aiParsing, aiError } = state.qc;

  // AI-assisted fill: only offered while composing a fresh ticket (not while
  // editing an existing one) — it only ever pre-fills the fields below, the
  // coach still reviews and hits Create & route themselves.
  // Temporarily switched off via AI_FILL_ENABLED (config.js) — flip that
  // back to true to bring this block back, nothing else needs to change.
  const aiBlock = (editingId || !AI_FILL_ENABLED) ? "" : `<div class="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
    <label class="text-xs font-medium text-slate-500 flex items-center gap-1.5">${icon("sparkle","w-3.5 h-3.5")}${tr("qc_ai_label")}</label>
    <div class="flex gap-2">
      <input id="qc-ai-text" autocomplete="off" ${aiParsing?"disabled":""} value="${aiText}" placeholder="${tr("qc_ai_placeholder")}" class="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm disabled:opacity-60" />
      <button data-action="qc-ai-parse" ${aiParsing?"disabled":""} class="bg-slate-900 disabled:opacity-50 text-white rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-1.5 shrink-0">${aiParsing?icon("spinner","w-4 h-4 animate-spin"):icon("sparkle","w-4 h-4")}${tr("qc_ai_fill")}</button>
    </div>
    ${aiParsing?`<div class="text-xs text-slate-400 flex items-center gap-1.5">${icon("spinner","w-3 h-3 animate-spin")}${tr("qc_ai_loading")}</div>`:""}
    ${aiError?`<div class="text-xs text-red-600">${aiError}</div>`:""}
  </div>`;

  // coaches only ever raise Equipment tickets. Admins can also pick any
  // custom category they've added — but not the 4 retired built-ins
  // (HIDDEN_BUILTIN_CATEGORIES in config.js), same as everywhere else in the
  // UI. Either way, an OLD ticket already in one of those hidden categories
  // still shows its own category here too when being edited, so the picker
  // doesn't just look broken for it.
  const isAdmin = state.profile.role === "admin";
  const catOptions = Object.entries(CATEGORIES).filter(([key]) =>
    key === cat || !HIDDEN_BUILTIN_CATEGORIES.includes(key) && (isAdmin || key === "Equipment")
  );
  const catBlock = `<div><label class="text-xs font-medium text-slate-500 mb-1 block">${tr("qc_category")}</label>
    <div class="grid grid-cols-2 gap-2">${catOptions.map(([key,c])=>`<button data-action="qc-pick-cat" data-cat="${key}" class="flex items-start gap-2 px-3 py-2 rounded-lg border text-left transition ${cat===key?"border-slate-900 bg-slate-900 text-white":"border-slate-200 hover:border-slate-400"}">${icon(c.icon,"w-4 h-4 mt-0.5 shrink-0")}<span><span class="text-sm font-medium block">${catLabel(key)}</span><span class="text-xs ${cat===key?"text-slate-300":"text-slate-400"}">${catDesc(key)}</span></span></button>`).join("")}</div></div>`;

  const fieldsBlock = cat ? dynamicFields(cat, fields) : "";

  const branchOptions = `<option value="">${tr("qc_no_branch")}</option>` +
    BRANCHES.map(b => `<option value="${b.id}" ${branch===b.id?"selected":""}>${b.name}</option>`).join("");
  const remarkBlock = `
    <div class="pt-3 border-t border-slate-100">
      <p class="text-xs font-medium text-slate-500 mb-2">${tr("qc_remark_label")}</p>
      <select id="qc-branch" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">${branchOptions}</select>
    </div>`;

  const routePreview = cat ? `<div class="bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-500 flex items-center gap-1">${icon("chevron","w-3.5 h-3.5")} ${tr("qc_route_preview")} <span class="text-slate-800 font-medium">${routeTicket(cat, branch, fields).routed_to}</span></div>` : "";

  const editing = !!state.qc.editingId;
  const submitLabel = editing ? tr("qc_save") : tr("qc_create");
  const submitBusyLabel = editing ? tr("qc_saving") : tr("qc_creating");
  const equipmentNeedsItems = cat === "Equipment" && !(fields.items || []).length;
  const canSubmit = cat && !state.submittingTicket && !equipmentNeedsItems;

  return `
      <div class="p-5 space-y-4">
        ${aiBlock}${catBlock}${fieldsBlock}${remarkBlock}${routePreview}
      </div>
      <div class="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
        <button data-action="close-modal" class="text-sm text-slate-500 px-4 py-2">${tr("qc_cancel")}</button>
        <button data-action="qc-submit" ${canSubmit?"":"disabled"} class="bg-slate-900 disabled:opacity-40 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-1.5">${state.submittingTicket ? `${icon("spinner","w-4 h-4 animate-spin")} ${submitBusyLabel}` : `${icon("check")} ${submitLabel}`}</button>
      </div>`;
}

// the fields that appear after picking a category
function dynamicFields(cat, f) {
  const input="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm", lbl="text-xs font-medium text-slate-500 mb-1 block";
  // value stored/submitted stays English (v); the visible label is translated
  const opt=(v,cur)=>`<option value="${v}" ${v===cur?"selected":""}>${optLabel(v)}</option>`;
  if (cat === "Equipment") {
  const list = f.items || [];
  const d = state.qc.eqDraft || { items: [], type: "", size: "", quantity: 1 };
  const needsType = d.items.some(v => EQUIPMENT_TYPE_ITEMS.includes(v));
  const needsSize = d.items.some(v => EQUIPMENT_SIZE_ITEMS.includes(v));
  const needsQty = d.items.some(v => v !== "Students racquet");
  const qtyUnit = d.items.includes("Coach multishuttle") ? tr("unit_basket") : d.items.includes("Coach game play shuttle") ? tr("unit_dozen") : "";

  const rows = list.length ? `<div class="space-y-1.5 mb-3">${list.map((it,i) => `
    <div class="flex items-center justify-between gap-2 border border-slate-200 rounded-lg px-3 py-2 text-sm">
      <div class="min-w-0 truncate">
        <span class="font-medium text-slate-800">${optLabel(it.item)}</span>
        <span class="text-xs text-slate-400">${[it.type&&optLabel(it.type), it.size, it.quantity?`×${it.quantity}`:""].filter(Boolean).join(" · ")}</span>
      </div>
      <button type="button" data-action="eq-remove-item" data-index="${i}" class="text-slate-300 hover:text-red-600 shrink-0">${icon("x","w-4 h-4")}</button>
    </div>`).join("")}</div>` : `<p class="text-xs text-slate-400 mb-3">${tr("eq_no_items_yet")}</p>`;

  const itemCheckboxes = `<div class="grid grid-cols-2 gap-1.5 border border-slate-200 rounded-lg p-2 max-h-44 overflow-y-auto bg-white">
    ${EQUIPMENT_ITEMS.map(v => `
      <label class="flex items-center gap-2 text-sm px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer">
        <input type="checkbox" data-eq-item-toggle="${v}" ${d.items.includes(v)?"checked":""} class="rounded border-slate-300" />
        ${optLabel(v)}
      </label>`).join("")}
  </div>`;

  return `
    <div id="equipment-form">
      <label class="${lbl}">${tr("eq_added_items")}</label>
      ${rows}

      <div class="grid grid-cols-2 gap-3 bg-slate-50 rounded-lg p-3">
        <div class="col-span-2">
          <label class="${lbl}">${tr("fld_item")}</label>
          ${itemCheckboxes}
        </div>

        <div class="${needsType ? "" : "hidden"}">
          <label class="${lbl}">${tr("fld_type")}</label>
          <select class="${input}" data-eqfield="type">
            <option value="">${tr("fld_select")}</option>
            ${["Purchase", "FOC"].map(v => opt(v, d.type)).join("")}
          </select>
        </div>

        <div class="${needsSize ? "" : "hidden"}">
          <label class="${lbl}">${tr("fld_size")}</label>
          <select class="${input}" data-eqfield="size">
            <option value="">${tr("fld_select")}</option>
            ${["XS", "S", "M", "L", "XL", "XXL"].map(v => opt(v, d.size)).join("")}
          </select>
        </div>

        <div class="${needsQty ? "" : "hidden"}">
          <label class="${lbl}">${tr("fld_quantity")} <span>${qtyUnit}</span></label>
          <input type="number" min="1" id="eq-draft-quantity" class="${input}" value="${d.quantity || 1}" placeholder="1" />
        </div>

        <div class="col-span-2">
          <button type="button" data-action="eq-add-item" ${d.items.length?"":"disabled"} class="w-full bg-slate-900 disabled:opacity-40 text-white rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-1.5">${icon("plus","w-4 h-4")}${tr("eq_add_item")}</button>
        </div>
      </div>

      <div class="mt-3">
        <label class="${lbl}">${tr("fld_requireDate")}</label>
        <input type="date" class="${input}" data-field="requireDate" value="${f.requireDate || ""}" />
      </div>
    </div>
  `;
}
  if (cat==="Schedule") return `<div class="grid grid-cols-2 gap-3">
    <div><label class="${lbl}">${tr("fld_type")}</label><select class="${input}" data-field="type"><option value="">${tr("fld_select")}</option>${["Leave","Makeup class"].map(v=>opt(v,f.type)).join("")}</select></div>
    <div><label class="${lbl}">${tr("fld_date")}</label><input type="date" class="${input}" data-field="date" value="${f.date||""}" /></div>
    <div class="col-span-2"><label class="${lbl}">${tr("fld_reason")}</label><input class="${input}" data-field="reason" value="${f.reason||""}" /></div>
  </div>`;
  if (cat==="ChangeClass") return `<div class="grid grid-cols-2 gap-3">
    <div><label class="${lbl}">${tr("fld_to")}</label><select class="${input}" data-field="to"><option value="">${tr("fld_select")}</option>${BRANCHES.map(b=>opt(b.name,f.to)).join("")}</select></div>
    <div><label class="${lbl}">${tr("fld_newClass")}</label><input class="${input}" data-field="newClass" placeholder="${tr("changeclass_placeholder")}" value="${f.newClass||""}" /></div>
  </div>`;
  if (cat==="Finance") return `<div class="space-y-3"><div class="grid grid-cols-2 gap-3">
    <div><label class="${lbl}">${tr("fld_type")}</label><select class="${input}" data-field="type"><option value="">${tr("fld_select")}</option>${["Tuition payment","Receipt verification"].map(v=>opt(v,f.type)).join("")}</select></div>
    <div><label class="${lbl}">${tr("fld_amount")}</label><input class="${input}" data-field="amount" placeholder="RM 0.00" value="${f.amount||""}" /></div></div>
    <div><label class="${lbl}">${tr("fld_receipt")}</label><div data-action="qc-mock-receipt" role="button" class="border border-dashed border-slate-300 rounded-lg p-4 text-center text-xs text-slate-400 flex flex-col items-center gap-1 cursor-pointer">${icon("file","w-6 h-6")}${f.receipt?`<span class="text-emerald-600 font-medium">${f.receipt} ✓</span>`:tr("receipt_mock_cta")}</div></div>
  </div>`;
  if (cat==="SpecialCare") return `<div class="grid grid-cols-1 gap-3">
    <div><label class="${lbl}">${tr("fld_type")}</label><select class="${input}" data-field="type"><option value="">${tr("fld_select")}</option>${["Late pickup","Injury observation"].map(v=>opt(v,f.type)).join("")}</select></div>
    <div><label class="${lbl}">${tr("fld_note")}</label><input class="${input}" data-field="note" placeholder="${tr("specialcare_note_placeholder")}" value="${f.note||""}" /></div>
  </div>`;
  // any admin-added custom category (not one of the 5 built-ins above) gets
  // one generic free-text field — no per-category logic to hand-write for it
  if (CATEGORIES[cat]) return `<div><label class="${lbl}">Details</label>
    <textarea class="${input}" rows="3" data-field="note" placeholder="Describe the request">${f.note||""}</textarea></div>`;
  return "";
}
