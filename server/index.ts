import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { chatRouter } from "./routes/chat.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT ?? "3001", 10);
const isDev = process.env.NODE_ENV !== "production";

const app = express();

app.use(
  cors({
    origin: isDev ? "http://localhost:5173" : false,
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));

// API routes
app.use("/api/chat", chatRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

// Serve built client in production
if (!isDev) {
  const clientDist = path.join(__dirname, "../../dist/client");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(
    `ScoutGraph server running on http://localhost:${PORT} [${isDev ? "dev" : "production"}]`
  );
});
