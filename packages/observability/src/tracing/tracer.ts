import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ParentBasedSampler, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import type { IncomingMessage } from 'http';
import { TracingConfig } from '../types';
import { resolveTracingConfig } from '../config';

let sdk: NodeSDK | null = null;

function buildOtlpTracesUrl(endpoint: string): string {
  const base = endpoint.replace(/\/$/, '');
  return base.endsWith('/v1/traces') ? base : `${base}/v1/traces`;
}

export function initTracing(config?: TracingConfig): void {
  if (sdk !== null) return;

  const resolved = resolveTracingConfig(config);

  if (resolved.debug) {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
  }

  const resource = new Resource({
    'service.name': resolved.serviceName,
    'service.version': resolved.serviceVersion,
    'deployment.environment': resolved.deploymentEnvironment,
    'service.instance.id': resolved.instanceId,
  });

  const traceExporter = new OTLPTraceExporter({
    url: buildOtlpTracesUrl(resolved.otlpEndpoint),
  });

  sdk = new NodeSDK({
    resource,
    traceExporter,
    sampler: new ParentBasedSampler({
      root: new TraceIdRatioBasedSampler(resolved.samplerRatio),
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-net': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false },
        '@opentelemetry/instrumentation-http': {
          ignoreIncomingRequestHook: (req: IncomingMessage) => {
            const url = req.url ?? '';
            return url === '/favicon.ico' || url === '/metrics' || url.startsWith('/metrics?');
          },
        },
      }),
    ],
    spanLimits: {
      attributeCountLimit: 128,
      attributeValueLengthLimit: 256,
    },
  });

  sdk.start();
}

/**
 * Gracefully shuts down the OTel SDK, flushing any in-flight spans.
 * Call this in your application's shutdown handler before exiting:
 *
 *   process.on('SIGTERM', async () => {
 *     await shutdown();
 *     process.exit(0);
 *   });
 */
export async function shutdown(): Promise<void> {
  if (sdk === null) return;
  const instance = sdk;
  sdk = null;
  await instance.shutdown();
}
