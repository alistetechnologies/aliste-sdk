const express = require("express");

const app = express();
app.use(express.json());

// initMetrics is called in server.js, before this module is used to create
// an HTTP server. Route definitions here are all covered by the middleware.

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
