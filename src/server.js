require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const pool = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const widgetRoutes = require("./routes/widgetRoutes");
const publicWidgetRoutes = require("./routes/publicWidgetRoutes"); 
const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();
app.use(express.static("public"));

app.use(helmet());
app.use(express.json({ limit: "100kb" }));

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Malformed JSON." });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body is too large." });
  }

  console.error("Unhandled request error:", err.message);
  return res.status(500).json({ error: "Internal server error." });
});

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Health check failed:", error.message);
    res.status(503).json({ status: "error", database: "unavailable" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/widgets", widgetRoutes);
app.use("/api/public/widgets", publicWidgetRoutes);
app.use("/api/dashboard", dashboardRoutes); 

const port = Number(process.env.PORT) || 5000;

const server = app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
