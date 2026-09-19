/* ============================================================
   routing.js
   THE AUTO-ROUTING ENGINE.
   Given a category + branch, it decides which department /
   role the ticket goes to. Runs when a ticket is created.

   Tickets are no longer tied to a real student record (coach just
   types a name) — branchId is whatever branch the coach picked on
   the form, and is stored as-is for every category (even the
   "central" ones) so it round-trips correctly when editing later.
============================================================ */

function routeTicket(category, branchId, details) {
  const rule = CATEGORIES[category];
  const r = {
    assigned_department: rule.dept,
    assigned_role: rule.role,
    target_branch_id: branchId,
    routed_to: rule.dept,
  };
  switch (category) {
    case "Equipment": {
      // FOC (free-of-charge) items need sign-off from a senior admin — regular
      // admin doesn't have authority to approve giving stock away for free.
      // One ticket can now hold several items (details.items[]); if ANY of
      // them is FOC, the whole ticket needs senior sign-off. `details.type`
      // is also checked for backward compat with tickets saved before this.
      const items = (details && details.items) || [];
      const hasFOC = items.some(it => it.type === "FOC") || (details && details.type === "FOC");
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
