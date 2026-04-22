/**
 * Entry point for the example service.
 *
 * CRITICAL: initTracing() must be called before any other imports so that
 * OpenTelemetry auto-instrumentation patches modules at require-time.
 */
import { initTracing } from '../src';

initTracing({
  serviceName: process.env.OTEL_SERVICE_NAME ?? 'example-service',
  serviceVersion: process.env.SERVICE_VERSION ?? '1.0.0',
  deploymentEnvironment: process.env.NODE_ENV ?? 'production',
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://otel-collector:4318',
  samplerRatio: 0.1,
  debug: process.env.OTEL_DEBUG === 'true',
});

// App is imported AFTER tracing is bootstrapped so OTel can patch express/http.
import('./app').then(({ default: app }) => {
  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, () => {
    console.log(`[example-service] Listening on port ${port}`);
  });
});
