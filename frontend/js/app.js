/* ============================================================
   app.js
   The render loop + startup. Loaded LAST so everything it needs
   already exists.

   render() decides what to show based on state:
     - still loading?        → "Loading…"
     - not logged in?        → LoginView
     - admin?                → AdminView
     - coach?                → CoachView
   plus any open modals on top.
============================================================ */

function render() {
  const app = document.getElementById("app");

  // feedback layers appear on top of whatever screen is shown
  const overlays = feedbackStyles() + topLoadingBar() + toastView();

  if (state.loading) {
    app.innerHTML = overlays + `<div class="min-h-screen flex flex-col items-center justify-center gap-3 text-slate-400">
      ${icon("spinner","w-6 h-6 animate-spin")}<span class="text-sm">Loading…</span></div>`;
    return;
  }

  if (!state.session || !state.profile) {
    app.innerHTML = overlays + LoginView();
    return;
  }

  const body = state.profile.role === "admin" ? AdminView() : CoachView();

  app.innerHTML =
    overlays +
    HeaderView() +
    `<main class="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">${body}</main>` +
    (state.modalOpen ? QuickCreateView() : "") +
    (state.adminUserPanel ? AdminUserPanel() : "") +
    (state.branchPanel ? AdminBranchPanel() : "") +
    (state.importPanel ? AdminImportPanel() : "") +
    (state.studentPanel ? AdminStudentPanel() : "") +
    (state.ticketDetail ? TicketDetailModal() : "") +
    (state.rejectingId ? RejectModal() : "") +
    (state.noteEditId ? NoteModal() : "");
}

/* show a toast for ~2.2s, then clear it */
let _toastTimer = null;
function showToast(msg, type = "info") {
  state.toast = { msg, type };
  render();
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { state.toast = null; render(); }, 2200);
}

/* ---- START THE APP ---- */
initAuth();
