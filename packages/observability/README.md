# @aliste-sdk/observability

Production-grade observability for Node.js + Express services. Drop in OpenTelemetry tracing and Prometheus metrics with a two-call setup.

---

## Quick Start

> **Assumes:** Node.js ≥ 18, an Express application, and an OTLP-compatible collector (e.g. [OpenTelemetry Collector](https://opentelemetry.io/docs/collector/)) reachable at `OTEL_EXPORTER_OTLP_ENDPOINT`.

### CommonJS (`require`)

The SDK compiles to CommonJS and works directly with `require()`. In CJS there is no import hoisting, so `require()` calls execute in the exact order they appear — no dynamic import trick needed.

```js
// server.js — process entry point

const { initTracing, initMetrics } = require("@aliste-sdk/observability");

initTracing({
  serviceName: process.env.OTEL_SERVICE_NAME,
  serviceVersion: process.env.SERVICE_VERSION,
  deploymentEnvironment: process.env.NODE_ENV,
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  samplerRatio: Number(process.env.OTEL_TRACES_SAMPLER_ARG ?? "1.0"),
});

// All subsequent requires are now patched by OTel (express, http, mongoose, etc.)
const app = require("./app");
const http = require("http");

initMetrics(app, {
  serviceName: process.env.OTEL_SERVICE_NAME,
  serviceVersion: process.env.SERVICE_VERSION,
  deploymentEnvironment: process.env.NODE_ENV,
});

http.createServer(app).listen(Number(process.env.PORT ?? 3000));
```

### ESM / TypeScript (`import`)

In ESM, static `import` statements are hoisted before any code runs. Use a dynamic `import()` to control load order.

```ts
// index.ts — process entry point
import { initTracing } from '@aliste-sdk/observability';

initTracing();

// Dynamic import runs AFTER initTracing() patches are applied
import('./app').then(({ default: app }) => app.listen(3000));
```

```ts
// app.ts
import express from 'express';
import { initMetrics } from '@aliste-sdk/observability';

const app = express();
initMetrics(app);

export default app;
```

```bash
OTEL_SERVICE_NAME=my-service \
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \
NODE_ENV=production \
node dist/index.js
```

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Features](#features)
3. [Installation](#installation)
4. [Initialization — Critical Order](#initialization--critical-order)
5. [Metrics Usage](#metrics-usage)
6. [Environment Variables](#environment-variables)
7. [Service Identity and Labels](#service-identity-and-labels)
8. [Route Normalization](#route-normalization)
9. [Double Initialization Safety](#double-initialization-safety)
10. [Security Considerations](#security-considerations)
11. [Example Usage](#example-usage)
12. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

The SDK exposes two completely separate initialization flows because tracing and metrics have fundamentally different initialization timing requirements.

### Why `initTracing()` must run before any other imports

OpenTelemetry auto-instrumentation works by monkey-patching modules **at require/import time**. When `@opentelemetry/auto-instrumentations-node` loads, it intercepts `require()` calls and wraps the target module (e.g. `express`, `http`, `pg`) with span-generating code. If Express is already loaded into memory before OTel starts, those patches never apply — you get a running process with zero traces.

`initTracing()` is synchronous and has no side effects on the rest of your application. It must be the literal first statement in your process entry file, before any `import` that could trigger the loading of an instrumentable module.

### Why `initMetrics()` is separate

`initMetrics(app)` requires an Express `Application` instance to register the `/metrics` endpoint and attach the request-tracking middleware. That instance does not exist until after Express is imported and instantiated. Prometheus metrics do not require pre-import timing — they simply need to be wired up before the server starts accepting traffic.

### Lifecycle separation

```
Process start
    │
    ▼
initTracing()           ← must be first; patches http, express, etc.
    │
    ▼
import express
create app
    │
    ▼
initMetrics(app)        ← registers /metrics + attaches middleware
    │
    ▼
app.listen()
```

---

## Features

- **OpenTelemetry tracing** via `NodeSDK` with `getNodeAutoInstrumentations`
- **Prometheus metrics** via `prom-client` using an **isolated custom `Registry`** (never the global singleton)
- **Express middleware** that tracks request duration, active requests, response size, and errors
- **Route normalization** that strips UUIDs, MongoDB ObjectIds, and numeric IDs from label values before they reach Prometheus
- **Double-initialization safety** — both `initTracing` and `createCollectors` are idempotent
- **Environment-driven configuration** with optional programmatic overrides
- **Graceful shutdown** on `SIGTERM` via `sdk.shutdown()`

---

## Installation

```bash
npm install @aliste-sdk/observability
```

Express is a peer dependency. Install it separately if not already present:

```bash
npm install express
npm install --save-dev @types/express
```

---

## Initialization — Critical Order

The only hard rule is: **`initTracing()` must run before any `require()` or `import` that loads an instrumentable module** (express, http, mongoose, pg, etc.). How you achieve that depends on whether your codebase uses CommonJS or ESM.

### CommonJS — straightforward

`require()` is synchronous and sequential. Call `initTracing()` first, then require everything else. No dynamic import needed.

```js
// server.js
const { initTracing } = require('@aliste-sdk/observability');

initTracing({
  serviceName: 'my-service',
  serviceVersion: '2.1.0',
  otlpEndpoint: 'http://otel-collector:4318',
  samplerRatio: 0.1,
});

// Safe — express is loaded after OTel patches are applied
const app = require('./app');
const http = require('http');

http.createServer(app).listen(3000);
```

### ESM / TypeScript — requires a dynamic import

In ESM, static `import` declarations are **hoisted** to the top of the module by the JavaScript engine before any code executes. This means even if you write `initTracing()` before an `import app from './app'` line, the runtime loads `app.ts` (and therefore express) first. The only way to control load order in ESM is a dynamic `import()`.

```ts
// index.ts
import { initTracing } from '@aliste-sdk/observability';

initTracing({ serviceName: 'my-service', samplerRatio: 0.1 });

// Dynamic import: app module is resolved only after this point
import('./app').then(({ default: app }) => {
  app.listen(3000);
});
```

### Incorrect usage — tracing will be broken

```ts
// WRONG (ESM) — static import is hoisted; express loads before initTracing() runs
import { initTracing } from '@aliste-sdk/observability';
import app from './app'; // hoisted — express already loaded here

initTracing(); // too late
```

```js
// WRONG (CJS) — require order is reversed
const app = require('./app'); // express loaded here

const { initTracing } = require('@aliste-sdk/observability');
initTracing(); // too late: patches never applied
```

When tracing is initialized too late, `NodeSDK.start()` still runs without error, but the auto-instrumentation hooks were never registered, so no spans are generated for HTTP requests.

---

## Metrics Usage

Call `initMetrics(app)` after creating your Express application. It does two things:

1. Registers `metricsMiddleware()` globally via `app.use()` — this must happen before any route definitions to ensure every request is tracked.
2. Mounts a `GET /metrics` endpoint that serializes the registry in Prometheus text format.

```ts
// app.ts
import express from 'express';
import { initMetrics } from '@aliste-sdk/observability';

const app = express();
app.use(express.json());

initMetrics(app, {
  serviceName: 'my-service',
  serviceVersion: '2.1.0',
  deploymentEnvironment: 'production',
  metricsPath: '/metrics',         // default
  collectDefaultMetrics: true,     // default — enables Node.js process metrics
  defaultMetricsInterval: 5000,    // default — ms between GC/event loop samples
});

// Route definitions go AFTER initMetrics so they are covered by the middleware.
app.get('/users/:id', ...);
```

### Custom Registry (not global)

The SDK creates a fresh `prom-client` `Registry` instance rather than using `prom-client`'s global default registry. This means:

- Metrics from different packages or test runs cannot bleed into each other.
- The `/metrics` endpoint only serializes this SDK's registry.
- If you define your own application-level metrics, register them against a separate registry — not the global one.

### Metrics collected

| Metric | Type | Labels |
|---|---|---|
| `http_request_total` | Counter | `method`, `route`, `status_code` |
| `http_request_duration_seconds` | Histogram | `method`, `route`, `status_code` |
| `active_http_requests` | Gauge | — |
| `http_errors_total` | Counter | `method`, `route`, `status_code` |
| `http_response_size_bytes` | Histogram | `method`, `route`, `status_code` |

Plus all standard Node.js process metrics from `collectDefaultMetrics` (heap, GC, event loop lag, file descriptors, etc.).

### Middleware behavior

`metricsMiddleware()` uses `res.on('finish')` to record all metrics after the response is fully sent. The request duration timer starts on the incoming request, not on `finish`. Active request count is incremented on arrival and decremented on finish. Response size is read from the `content-length` response header.

If `initMetrics()` has not been called before `metricsMiddleware()` runs, the middleware silently passes through — it will not throw.

---

## Environment Variables

The SDK reads directly from `process.env`. It does **not** load or parse `.env` files.

### Variables read by this SDK

| Variable | Used by | Default | Description |
|---|---|---|---|
| `OTEL_SERVICE_NAME` | tracing, metrics | `unknown-service` | Service name attached to every trace and metric |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | tracing | `http://localhost:4318` | Base URL of the OTLP collector. The SDK appends `/v1/traces` automatically. |
| `OTEL_TRACES_SAMPLER_ARG` | tracing | `1.0` | Sampling ratio as a float between `0` and `1`. Values outside this range are clamped. |
| `OTEL_DEBUG` | tracing | `false` | Set to `"true"` to enable verbose OTel diagnostic output to stdout |
| `SERVICE_VERSION` | tracing, metrics | `0.0.0` | Application version attached to every trace and metric |
| `NODE_ENV` | tracing, metrics | `development` | Deployment environment (`production`, `staging`, `development`) |
| `INSTANCE_ID` | tracing, metrics | `${HOSTNAME}-${PID}` | Unique instance identifier. Auto-generated from `HOSTNAME` and `process.pid` if not set. |
| `HOSTNAME` | tracing, metrics | `local` | Used as part of the auto-generated instance ID when `INSTANCE_ID` is not set |

### Variables honored by the underlying OTel SDK (not this SDK's config resolver)

| Variable | Notes |
|---|---|
| `OTEL_RESOURCE_ATTRIBUTES` | Additional resource attributes in `key=value,key=value` format. Merged by `NodeSDK` at startup. |

### Variables NOT honored

| Variable | Why |
|---|---|
| `OTEL_TRACES_SAMPLER` | This SDK always configures a `ParentBasedSampler` wrapping `TraceIdRatioBasedSampler`. The env var is ignored because an explicit sampler is passed to `NodeSDK`. |

### Precedence

For every configuration value: **config object argument > environment variable > built-in default**.

---

## Service Identity and Labels

Four identity fields are resolved at initialization time and attached to both telemetry systems.

### OpenTelemetry Resource attributes

Attached to the `Resource` passed to `NodeSDK`. Every span exported by this process carries these attributes:

| OTel attribute | Source field |
|---|---|
| `service.name` | `serviceName` |
| `service.version` | `serviceVersion` |
| `deployment.environment` | `deploymentEnvironment` |
| `service.instance.id` | `instanceId` |

### Prometheus default labels

Attached via `registry.setDefaultLabels()`. Every metric scraped from `/metrics` carries these labels:

| Prometheus label key | Source field |
|---|---|
| `service` | `serviceName` |
| `version` | `serviceVersion` |
| `environment` | `deploymentEnvironment` |
| `instance` | `instanceId` |

Note that Prometheus label keys use flat names (no dots) because dots are not valid in Prometheus label names. The OTel attributes use the standard dotted semantic convention names.

---

## Route Normalization

### Why high-cardinality labels are dangerous

Prometheus stores one time series per unique label combination. If a label like `route` contains raw user-supplied values such as `/users/12345` or `/orders/550e8400-e29b-41d4-a716-446655440000`, every unique ID creates a new time series. A service with millions of users would produce millions of time series, causing Prometheus memory exhaustion, slow queries, and alerting failures. This is called **cardinality explosion**.

### How `normalizeRoute` works

The utility in [src/utils/route.ts](src/utils/route.ts) applies three regex substitutions in order, then strips the query string:

| Pattern | Matches | Replaced with |
|---|---|---|
| `UUID_RE` | `/550e8400-e29b-41d4-a716-446655440000` | `/:id` |
| `OBJECT_ID_RE` | `/507f1f77bcf86cd799439011` (24 hex chars) | `/:id` |
| `NUMERIC_RE` | `/123`, `/42` (all-digit path segments) | `/:id` |

Query strings are stripped before any substitution.

### Examples

| Raw `req.originalUrl` | Normalized route |
|---|---|
| `/users/123` | `/users/:id` |
| `/users/123?expand=profile` | `/users/:id` |
| `/users/507f1f77bcf86cd799439011` | `/users/:id` |
| `/users/550e8400-e29b-41d4-a716-446655440000` | `/users/:id` |
| `/api/v1/orders` | `/api/v1/orders` |
| `/health` | `/health` |

The middleware uses `req.originalUrl` (the full unmodified path) with `req.path` as a fallback.

---

## Double Initialization Safety

### Tracing

```ts
// src/tracing/tracer.ts
let sdk: NodeSDK | null = null;

export function initTracing(config?: TracingConfig): void {
  if (sdk !== null) return;  // ← no-op on second call
  ...
}
```

### Metrics

```ts
// src/metrics/collectors.ts
let collectors: MetricCollectors | null = null;

export function createCollectors(config: ResolvedMetricsConfig): MetricCollectors {
  if (collectors !== null) return collectors;  // ← returns existing instance
  ...
}
```

Both guards use module-level singleton variables. This matters because:

- In Node.js module caching is per-process, so calling `initTracing()` twice in the same process would attempt to start two `NodeSDK` instances and register duplicate SIGTERM handlers.
- Calling `createCollectors()` twice would attempt to register duplicate metric names in the same registry, causing a `prom-client` error.
- The singleton pattern makes the SDK safe to call from library code, middleware, or test setup without worrying about call ordering.

---

## Security Considerations

### `/metrics` endpoint exposure

The `/metrics` endpoint exposes internal runtime data: memory usage, GC pause durations, event loop lag, request rates, error rates, and response times. This information is valuable to an attacker for understanding service behavior and load patterns.

**The SDK does not add any authentication to `/metrics`.**

In production, restrict access using one or more of:

- **Network policy / firewall** — Allow scrape traffic only from your Prometheus server's IP range.
- **Reverse proxy rule** — In Nginx or your ingress controller, block `/metrics` from public-facing traffic and allow only internal subnets.
- **Express middleware** — Add an IP allowlist or token-check middleware mounted specifically on the metrics path before calling `initMetrics()`, or mount your own handler on the same path after switching to a custom `metricsPath`.

Never expose `/metrics` directly on a public-facing port.

---

## Example Usage

The [examples/](examples/) directory contains working examples for both module systems.

### CommonJS

| File | Purpose |
|---|---|
| [examples/server.js](examples/server.js) | Entry point — calls `initTracing()`, then `require('./app-cjs')`, then `initMetrics(app)` |
| [examples/app-cjs.js](examples/app-cjs.js) | Express app with sample routes |

### TypeScript / ESM

| File | Purpose |
|---|---|
| [examples/index.ts](examples/index.ts) | Entry point — calls `initTracing()`, then dynamic `import('./app')` |
| [examples/app.ts](examples/app.ts) | Express app with `initMetrics(app)` and sample routes |

All examples define the same routes, which exercise the route normalizer:

| Defined route | Incoming request | Metric label |
|---|---|---|
| `GET /users/:id` | `GET /users/42` | `GET /users/:id` |
| `GET /users/:id` | `GET /users/507f1f77bcf86cd799439011` | `GET /users/:id` |
| `POST /orders` | `POST /orders` | `POST /orders` |

---

## Troubleshooting

### Traces are not appearing in the collector

**Cause:** `initTracing()` was called after Express or another instrumentable module was already loaded.

**How to confirm:** Add `debug: true` to the `initTracing` config (or set `OTEL_DEBUG=true`). If you see no span creation logs for incoming HTTP requests, auto-instrumentation did not apply.

**Fix:** Ensure `initTracing()` is the very first statement in the process entry file and that the app module is loaded via a dynamic `import()`.

---

### Metrics are missing from `/metrics`

**Cause 1:** `initMetrics(app)` was never called.

**Cause 2:** `metricsMiddleware()` was called directly without first calling `initMetrics()`. The middleware checks `getCollectors()` and silently passes through if collectors have not been created — no error is thrown, but no metrics are recorded.

**Fix:** Always call `initMetrics(app)` before starting the server. Verify the `/metrics` endpoint responds with HTTP 200 and `Content-Type: text/plain`.

---

### Duplicate metric registration error from prom-client

**Cause:** Two separate Node.js module instances of `@aliste-sdk/observability` are loaded in the same process (e.g. due to `npm link`, a broken monorepo hoisting configuration, or a nested `node_modules`). Each module instance has its own `collectors` module-level variable, so the singleton guard does not protect across instances.

**How to confirm:** Run `npm ls @aliste-sdk/observability` in the consuming project. If you see more than one version or path, there are duplicate instances.

**Fix:** Ensure the package is deduplicated. In a monorepo, hoist the package to the root `node_modules`.

---

### OTLP exporter connection refused

**Cause:** `OTEL_EXPORTER_OTLP_ENDPOINT` points to an unreachable collector.

**Behavior:** The SDK does not crash on export failure. Spans are batched and silently dropped after retry exhaustion.

**Fix:** Verify the collector is reachable from the service at the configured endpoint. The SDK appends `/v1/traces` to the base URL automatically — do not include it in `OTEL_EXPORTER_OTLP_ENDPOINT`.

---

## License

[MIT](../../LICENSE)
