require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { requireAuth } = require("./middleware/auth");

const app = express();
app.use(express.json());

const allowedOrigins = (process.env.CORS_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true }));

app.get("/health", (req, res) => res.json({ ok: true }));

// Every /api/* route needs a logged-in Supabase session (Authorization: Bearer <access_token>).
app.use("/api", requireAuth);
app.use("/api/branches", require("./routes/branches"));
app.use("/api/categories", require("./routes/categories"));
app.use("/api/profiles", require("./routes/profiles"));
app.use("/api/students", require("./routes/students"));
app.use("/api/tickets", require("./routes/tickets"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/ai", require("./routes/ai"));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`ShuttleDesk backend listening on http://localhost:${PORT}`));
