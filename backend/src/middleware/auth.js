const { clientForToken } = require("../supabaseClient");

// Every route (except a health check) needs a logged-in caller. Attaches
// req.sb (a Supabase client scoped to that caller's JWT, so RLS decides what
// they can actually see/change) and req.userId (from that same JWT).
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing access token" });

  const sb = clientForToken(token);
  const { data, error } = await sb.auth.getUser();
  if (error || !data?.user) return res.status(401).json({ error: "Invalid or expired session" });

  req.sb = sb;
  req.userId = data.user.id;
  req.userEmail = data.user.email;
  next();
}

module.exports = { requireAuth };
