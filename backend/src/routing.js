// THE AUTO-ROUTING ENGINE — ported as-is from the original frontend's
// js/routing.js. Now runs here (authoritatively, on ticket create/update)
// instead of in the browser. Kept byte-for-byte identical in behaviour;
// the frontend keeps its own copy purely to show a live preview before submit.

// the 5 built-in categories — always present. Admin can add more on top via
// the ticket_categories table (see routes/categories.js); those get simple
// default routing (routed_to = their dept, no special-case logic below).
const BUILTIN_CATEGORIES = {
  Equipment:   { label: "Equipment",          color: "amber",  dept: "Inventory / Front Desk", role: "Warehouse", desc: "T-shirt, Racket, Stringing", icon: "package" },
  Schedule:    { label: "Schedule",           color: "blue",   dept: "Coaching",               role: "Coach",     desc: "Leave / Makeup class",       icon: "calendar" },
  ChangeClass: { label: "Change Branch/Time", color: "purple", dept: "Academic",               role: "Academic",  desc: "Permanent class change",     icon: "repeat" },
  Finance:     { label: "Finance",            color: "green",  dept: "Central Finance",        role: "Finance",   desc: "Tuition, Receipt",           icon: "dollar" },
  SpecialCare: { label: "Special Care",       color: "red",    dept: "On-duty",                role: "Coach",     desc: "Late pickup, Injury",        icon: "heart" },
};

// fetches admin-added categories and merges them with the built-ins
async function loadCategories(sb) {
  const { data, error } = await sb.from("ticket_categories").select("*");
  if (error) throw error;
  const merged = { ...BUILTIN_CATEGORIES };
  for (const c of data) merged[c.key] = { label: c.label, desc: c.description, dept: c.dept, role: c.role, color: c.color, icon: c.icon };
  return merged;
}

function routeTicket(category, branchId, details, branches, categories = BUILTIN_CATEGORIES) {
  const rule = categories[category];
  const branchName = (id) => branches.find((b) => b.id === id)?.name ?? "—";
  const r = {
    assigned_department: rule.dept,
    assigned_role: rule.role,
    target_branch_id: branchId,
    routed_to: rule.dept,
  };
  switch (category) {
    case "Equipment": {
      const items = (details && details.items) || [];
      const hasFOC = items.some((it) => it.type === "FOC") || (details && details.type === "FOC");
      if (hasFOC) {
        r.assigned_role = "SeniorAdmin";
        r.routed_to = `Senior Admin (FOC approval) — ${branchName(branchId)}`;
      } else {
        r.routed_to = `Front Desk — ${branchName(branchId)}`;
      }
      break;
    }
    case "Schedule":
      r.routed_to = `Coaching Team — ${branchName(branchId)}`;
      break;
    case "ChangeClass":
      r.routed_to = "Academic Manager (Central)";
      break;
    case "Finance":
      r.routed_to = "Central Finance Team";
      break;
    case "SpecialCare":
      r.routed_to = `On-duty Staff — ${branchName(branchId)}`;
      break;
  }
  return r;
}

module.exports = { routeTicket, loadCategories, BUILTIN_CATEGORIES };
