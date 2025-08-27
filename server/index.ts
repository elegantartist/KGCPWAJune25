import { fileURLToPath } from 'node:url';
import path from 'node:path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import express from "express";
import cors from "cors";
import session from "express-session";
import bodyParser from "body-parser";

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") ?? true,
  credentials: true,
}));
app.use(bodyParser.json());
app.use(session({
  secret: process.env.SESSION_SECRET || "fallback-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// ✅ Health route (required for EB)
app.get("/api/health", (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV, time: new Date().toISOString() });
});

// ✅ Example status route (stub for now)
app.get("/api/auth/status", (req, res) => {
  res.json({ authenticated: true, role: "patient" });
});

// ✅ Serve frontend build (Vite outputs to dist/public)
app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

export default app;
