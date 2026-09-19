/* ============================================================
   state.js
   One shared object holding everything the app currently knows.
   Views read from it; events write to it; app.js re-renders from it.
============================================================ */

const state = {
  session: null,        // Supabase auth session (who is logged in)
  profile: null,        // { id, full_name, role }  — 'coach' or 'admin'
  students: [],         // loaded from Supabase
  tickets: [],          // loaded from Supabase (with student attached)
  users: [],            // loaded from Supabase (profiles — coach/admin accounts)

  loading: true,        // show "Loading…" on first paint
  authError: "",        // login error message
  showPassword: false,  // eye toggle on login

  // --- busy flags (show spinners / disable buttons while working) ---
  loggingIn: false,     // login request in flight
  dataLoading: false,   // reloading tickets/students
  creatingUser: false,  // admin creating an account
  busyTicket: null,     // id of a ticket whose action is in flight
  submittingTicket: false, // quick-create submit in flight
  toast: null,          // { msg, type }  transient bottom notification

  modalOpen: false,     // quick-create modal (coach)
  financeSel: null,     // (kept for future use)
  adminUserPanel: false,// create-account modal (admin)
  branchPanel: false,   // manage-branches modal (admin)
  categoryPanel: false, // manage-categories modal (admin)
  importPanel: false,   // import-students modal (admin)
  studentPanel: false,  // manage-students panel (admin)
  ticketDetail: null,    // id of the ticket shown in the read-only detail modal, or null
  rejectingId: null,     // id of the ticket the reject-reason modal is open for, or null
  rejectReason: "",      // working text for that modal
  closedCollapsed: true, // admin: is the Closed (Completed/Rejected) archive collapsed?
  closedFilter: { status: "", category: "", q: "" }, // admin: filters for the Closed archive
  openFilter: { status: "", category: "", branch: "", q: "" }, // admin: filters for the open "All tickets" list
  coachSearch: "",            // coach: search across their own tickets
  coachClosedCollapsed: true, // coach: is their own Closed archive collapsed?
  noteEditId: null,      // id of the ticket the note editor is open for, or null
  noteDraft: "",         // working text for that editor

  // student management working state
  stu: {
    q: "", branchFilter: "",       // list search + filter
    editing: null,                 // id being edited, or "new", or null
    form: { name:"", time_1:"", time_2:"", parent_whatsapp:"", branch_id:"" },
    msg: "",
  },

  // working state for adding a branch
  newBranch: { id: "", name: "", msg: "" },

  // working state for adding a custom ticket category
  newCategory: { key: "", label: "", desc: "", dept: "", role: "", color: "amber", icon: "package", msg: "" },

  // working state for CSV import
  imp: { branch: "", rows: [], fileName: "", msg: "", importing: false },

  // working state for the quick-create form
  // editingId: null = creating a new ticket; otherwise the id of the ticket being edited
  // eqDraft: the equipment item(s) currently checked + shared type/size/quantity,
  // before "Add" pushes one entry per checked item into fields.items
  qc: { branch: "", cat: null, fields: {}, editingId: null, aiText: "", aiParsing: false, aiError: "",
        eqDraft: { items: [], type: "", size: "", quantity: 1 } },

  // working state for the login form
  login: { email: "", password: "" },

  // working state for the admin "manage accounts" panel
  // editing: null = list view; "new" = create form; a profile id = edit form
  newUser: { editing: null, email: "", password: "", name: "", role: "coach", msg: "" },
};
