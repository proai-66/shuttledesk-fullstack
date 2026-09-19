/* ============================================================
   config.js
   Connection to Supabase (auth + realtime only — table reads/writes
   now go through the backend API, see api.js) + static lookup data.
   ⚠️ This is the ONLY place your keys/URLs live — change them here.
============================================================ */

const SUPABASE_URL = "https://qpyhfoaeklkwkoudjnro.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_6dNw4OkobcRyxE8TMmX8AQ_cmC3C-v9";

// used for login/logout/session + the tickets realtime subscription —
// both are safe to talk to directly with the anon key, same as before.
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// the Express backend (see ../../backend). Local dev uses localhost:3001;
// anywhere else (e.g. the deployed Render static site) uses the deployed backend.
const API_BASE_URL = ["localhost", "127.0.0.1"].includes(location.hostname)
  ? "http://localhost:3001/api"
  : "https://shuttledesk-fullstack.onrender.com/api";

/* ---- Branches ----
   Loaded from the backend (branches table) at startup.
   Managed by admin via "Manage branches". Starts empty; data.js
   fills it in loadBranches(). ---- */
let BRANCHES = [];
const branchName = (id) => BRANCHES.find(b => b.id === id)?.name ?? "—";

/* ---- Senior admin(s) ----
   Everyone with role "admin" is otherwise equal — but approving a
   free-of-charge (FOC) Equipment request needs sign-off from someone above
   regular admin. There's no separate DB role for this, so it's identified
   by login email instead. Add more emails here if there's more than one. ---- */
const SENIOR_ADMIN_EMAILS = ["admin01@gmail.com"];
const isSeniorAdmin = () => SENIOR_ADMIN_EMAILS.includes(state.session?.user?.email);

/* ---- Ticket categories (label, colour, icon, routing target) ---- */
const CATEGORIES = {
  Equipment:   { label: "Equipment",          color: "amber",  dept: "Inventory / Front Desk", role: "Warehouse", desc: "T-shirt, Racket, Stringing", icon: "package" },
  Schedule:    { label: "Schedule",           color: "blue",   dept: "Coaching",               role: "Coach",     desc: "Leave / Makeup class",       icon: "calendar" },
  ChangeClass: { label: "Change Branch/Time", color: "purple", dept: "Academic",               role: "Academic",  desc: "Permanent class change",     icon: "repeat" },
  Finance:     { label: "Finance",            color: "green",  dept: "Central Finance",        role: "Finance",   desc: "Tuition, Receipt",           icon: "dollar" },
  SpecialCare: { label: "Special Care",       color: "red",    dept: "On-duty",                role: "Coach",     desc: "Late pickup, Injury",        icon: "heart" },
};

/* ---- Equipment item lists — shared between views.js (the checkbox picker)
   and events.js (deciding which fields a given item actually needs when
   it's added to the ticket's item list). ---- */
const EQUIPMENT_ITEMS = [
  "Students Tshirt", "Skipping rope", "Students racquet", "Students String & Grip",
  "Coach multishuttle", "Coach game play shuttle", "Company racquet", "Coach Tshirt",
];
// Purchase-vs-FOC applies to every item — coach-issued gear (racquets,
// shirts, shuttles) can be given free just as often as student gear can.
const EQUIPMENT_TYPE_ITEMS = EQUIPMENT_ITEMS;
const EQUIPMENT_SIZE_ITEMS = ["Students Tshirt", "Coach Tshirt"];

/* ---- Style maps for status + category badges ---- */
const STATUS_STYLE = {
  New: "bg-slate-100 text-slate-700", In_Progress: "bg-blue-100 text-blue-700",
  Ready: "bg-amber-100 text-amber-700", Completed: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-rose-100 text-rose-700",
};
const CAT_STYLE = {
  amber:"bg-amber-100 text-amber-700", blue:"bg-blue-100 text-blue-700",
  purple:"bg-purple-100 text-purple-700", green:"bg-emerald-100 text-emerald-700", red:"bg-red-100 text-red-700",
};
