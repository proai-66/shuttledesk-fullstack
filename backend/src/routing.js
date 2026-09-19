// THE AUTO-ROUTING ENGINE — ported as-is from the original frontend's
// js/routing.js. Now runs here (authoritatively, on ticket create/update)
// instead of in the browser. Kept byte-for-byte identical in behaviour;
// the frontend keeps its own copy purely to show a live preview before submit.

const CATEGORIES = {
  Equipment:   { label: "Equipment",          color: "amber",  dept: "Inventory / Front Desk", role: "Warehouse", desc: "T-shirt, Racket, Stringing", icon: "package" },
  Schedule:    { label: "Schedule",           color: "blue",   dept: "Coaching",               role: "Coach",     desc: "Leave / Makeup class",       icon: "calendar" },
  ChangeClass: { label: "Change Branch/Time", color: "purple", dept: "Academic",               role: "Academic",  desc: "Permanent class change",     icon: "repeat" },
  Finance:     { label: "Finance",            color: "green",  dept: "Central Finance",        role: "Finance",   desc: "Tuition, Receipt",           icon: "dollar" },
  SpecialCare: { label: "Special Care",       color: "red",    dept: "On-duty",                role: "Coach",     desc: "Late pickup, Injury",        icon: "heart" },
};

function routeTicket(category, branchId, details, branches) {
  const rule = CATEGORIES[category];
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

module.exports = { routeTicket, CATEGORIES };
