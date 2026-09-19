/* ============================================================
   auth.js
   Login, logout, session bootstrapping, and the admin-only
   "create account" action.
   Auth + Realtime still talk to Supabase directly (safe with the anon
   key + RLS, same as before) — everything else goes through data.js/api.js.
============================================================ */

/* ---- Realtime: live-sync tickets across everyone's open tab -----
   Postgres change events on `tickets` (insert/update/delete, any row) just
   trigger a quiet re-fetch — simplest thing that works, no per-row patching.
   Requires `tickets` to be added to the `supabase_realtime` publication in
   Supabase (Database → Replication), otherwise this silently never fires. ---- */
let ticketsChannel = null;
function subscribeRealtime() {
  if (ticketsChannel) return;                // already subscribed
  ticketsChannel = sb.channel("tickets-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => {
      refreshTickets();
    })
    .subscribe();
}
function unsubscribeRealtime() {
  if (!ticketsChannel) return;
  sb.removeChannel(ticketsChannel);
  ticketsChannel = null;
}

/* ---- On page load: is someone already logged in? ---- */
async function initAuth() {
  const { data } = await sb.auth.getSession();
  state.session = data.session;
  if (state.session) {
    state.profile = await loadProfile();
    await refreshData();
    subscribeRealtime();
  }
  state.loading = false;
  render();
}

// keep state in sync if the session changes / expires
sb.auth.onAuthStateChange((_event, session) => {
  state.session = session;
  if (!session) { state.profile = null; state.tickets = []; state.students = []; unsubscribeRealtime(); render(); }
});

/* ---- Login ---- */
async function doLogin() {
  state.authError = "";
  const { email, password } = state.login;
  if (!email || !password) { state.authError = "Enter email and password"; render(); return; }
  if (state.loggingIn) return;               // ignore double-clicks

  state.loggingIn = true; render();          // button → "Signing in…"

  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { state.authError = error.message; state.loggingIn = false; render(); return; }

  const { data } = await sb.auth.getSession();
  state.session = data.session;
  state.profile = await loadProfile();
  await refreshData();                        // this renders too
  subscribeRealtime();
  state.loggingIn = false; render();
}

/* ---- Logout ---- */
async function doLogout() {
  unsubscribeRealtime();
  await sb.auth.signOut();
  state.session = null; state.profile = null;
  render();
}

/* ---- Admin creates a coach/admin account ----
   Handled entirely by the backend now (POST /admin/users), which uses the
   Supabase service-role key to create the Auth user + profile row server-side. ---- */
async function adminCreateUser() {
  const nu = state.newUser;
  nu.msg = "";
  if (!nu.email || !nu.password || !nu.name) { nu.msg = "Fill all fields"; render(); return; }
  if (nu.password.length < 6) { nu.msg = "Password must be at least 6 characters"; render(); return; }
  if (state.creatingUser) return;

  state.creatingUser = true; render();       // button → "Creating…"

  let result;
  try {
    result = await apiPost("/admin/users", { email: nu.email, password: nu.password, name: nu.name, role: nu.role });
  } catch (e) {
    nu.msg = "Error: " + e.message; state.creatingUser = false; render(); return;
  }

  const created = `${result.role}: ${result.email}`;
  state.newUser = { editing: null, email: "", password: "", name: "", role: "coach", msg: "" };
  state.creatingUser = false;
  await refreshData();               // so the new account shows up in the list
  showToast(`Account created — ${created}`, "success");
}
