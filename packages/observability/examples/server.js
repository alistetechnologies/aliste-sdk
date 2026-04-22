/**
 * CJS entry point example.
 *
 * In CommonJS, require() is strictly sequential — no hoisting.
 * initTracing() runs first, OTel patches http/express, then app loads.
 * No dynamic import() trick is needed.
 */

const { initTracing, initMetrics } = require("@aliste-sdk/observability");

initTracing({
  serviceName: process.env.OTEL_SERVICE_NAME,
  serviceVersion: process.env.SERVICE_VERSION,
  deploymentEnvironment: process.env.SERVICE_DEPLOYMENT_ENVIRONMENT ?? process.env.NODE_ENV,
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  samplerRatio: Number(process.env.OTEL_TRACES_SAMPLER_ARG ?? "1.0"),
  debug: process.env.OTEL_DEBUG === "true",
});

// All subsequent requires are patched — express, http, pg, mongoose, etc.
const app = require("./app-cjs");
const http = require("http");

const port = Number(process.env.PORT ?? 3000);
app.set("port", port);

initMetrics(app, {
  serviceName: process.env.OTEL_SERVICE_NAME,
  serviceVersion: process.env.SERVICE_VERSION,
  deploymentEnvironment: process.env.SERVICE_DEPLOYMENT_ENVIRONMENT ?? process.env.NODE_ENV,
  metricsPath: "/metrics",
  collectDefaultMetrics: true,
});

const server = http.createServer(app);

server.listen(port, () => {
  console.log(`[server] Listening on port ${port}`);
});

server.on("error", (err) => {
  console.error("[server] Error:", err);
  process.exit(1);
});
