const express = require("express");
const { initMetrics } = require("@aliste-sdk/observability");

const app = express();
app.use(express.json());

// initMetrics must be called before any route definitions so that
// metricsMiddleware sits at the top of the Express stack and intercepts
// every request before route handlers fire.
initMetrics(app, {
  serviceName: process.env.OTEL_SERVICE_NAME,
  serviceVersion: process.env.SERVICE_VERSION,
  deploymentEnvironment: process.env.SERVICE_DEPLOYMENT_ENVIRONMENT ?? process.env.NODE_ENV,
  metricsPath: "/metrics",
  collectDefaultMetrics: true,
  // Restrict /metrics to your Prometheus server's IP or internal subnet.
  // Falls back to METRICS_ALLOWED_IPS env var (comma-separated).
  // Leave empty only in development — a warning is logged in production.
  allowedIPs: process.env.METRICS_ALLOWED_IPS?.split(",").map((s) => s.trim()) ?? [],
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/users", (_req, res) => {
  res.json([{ id: 1, name: "Alice" }]);
});

app.get("/users/:id", (req, res) => {
  res.json({ id: req.params.id, name: "Alice" });
});

app.post("/orders", (req, res) => {
  res.status(201).json({ id: 42, ...req.body });
});

module.exports = app;
