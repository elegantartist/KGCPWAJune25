import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import 'dotenv/config';

const app = express();

// Enable CORS for client
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Basic request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Register all routes from routes.ts
(async () => {
  await registerRoutes(app);
})();

// Start server on port 5000
const port = 5000;
app.listen(port, "0.0.0.0", () => {
  console.log(`KGC Server listening on port ${port}`);
});
