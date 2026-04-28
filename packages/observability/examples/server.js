/**
 * CJS entry point.
 *
 * Responsibilities:
 *   1. Call initTracing() — must be first, before any other require().
 *   2. Load the app module — express and all other libraries load here,
 *      after OTel patches are already in place.
 *   3. Start the HTTP server.
 *
 * initMetrics() is NOT called here. It is called inside app.js, before
 * route definitions, so the middleware sits at the top of the Express stack.
 */

const { initTracing } = require("@aliste-sdk/observability");

initTracing({
  serviceName: process.env.OTEL_SERVICE_NAME,
  serviceVersion: process.env.SERVICE_VERSION,
  deploymentEnvironment: process.env.SERVICE_DEPLOYMENT_ENVIRONMENT ?? process.env.NODE_ENV,
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  samplerRatio: Number(process.env.OTEL_TRACES_SAMPLER_ARG ?? "1.0"),
  debug: process.env.OTEL_DEBUG === "true",
});

const app = require("./app-cjs");
const http = require("http");

const port = Number(process.env.PORT ?? 3000);
const server = http.createServer(app);

server.listen(port, () => {
  console.log(`[server] Listening on port ${port}`);
});

server.on("error", (err) => {
  console.error("[server] Error:", err);
  process.exit(1);
});
