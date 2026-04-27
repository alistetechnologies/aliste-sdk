import { TracingConfig, MetricsConfig, ResolvedTracingConfig, ResolvedMetricsConfig } from '../types';

function resolveInstanceId(override?: string): string {
  if (override) return override;
  if (process.env.INSTANCE_ID) return process.env.INSTANCE_ID;
  const hostname = process.env.HOSTNAME ?? 'local';
  return `${hostname}-${process.pid}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function validateHttpUrl(raw: string, field: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`Invalid ${field}: "${raw}" — must be a valid http(s) URL`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${field} must use http or https protocol, got: "${parsed.protocol}"`);
  }
  return raw;
}

export function resolveTracingConfig(config?: TracingConfig): ResolvedTracingConfig {
  const rawRatio = config?.samplerRatio ?? parseFloat(process.env.OTEL_TRACES_SAMPLER_ARG ?? '1.0');
  const rawEndpoint = config?.otlpEndpoint ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318';

  return {
    serviceName: config?.serviceName ?? process.env.OTEL_SERVICE_NAME ?? 'unknown-service',
    serviceVersion: config?.serviceVersion ?? process.env.SERVICE_VERSION ?? '0.0.0',
    deploymentEnvironment: config?.deploymentEnvironment ?? process.env.NODE_ENV ?? 'development',
    instanceId: resolveInstanceId(config?.instanceId),
    otlpEndpoint: validateHttpUrl(rawEndpoint, 'otlpEndpoint'),
    samplerRatio: Number.isFinite(rawRatio) ? clamp(rawRatio, 0, 1) : 1.0,
    debug: config?.debug ?? process.env.OTEL_DEBUG === 'true',
  };
}

export function resolveMetricsConfig(config?: MetricsConfig): ResolvedMetricsConfig {
  const metricsPath = config?.metricsPath ?? '/metrics';
  if (!metricsPath.startsWith('/')) {
    throw new Error(`metricsPath must start with "/", got: "${metricsPath}"`);
  }

  return {
    serviceName: config?.serviceName ?? process.env.OTEL_SERVICE_NAME ?? 'unknown-service',
    serviceVersion: config?.serviceVersion ?? process.env.SERVICE_VERSION ?? '0.0.0',
    deploymentEnvironment: config?.deploymentEnvironment ?? process.env.NODE_ENV ?? 'development',
    instanceId: resolveInstanceId(config?.instanceId),
    metricsPath,
    collectDefaultMetrics: config?.collectDefaultMetrics ?? true,
    eventLoopMonitoringPrecision: config?.eventLoopMonitoringPrecision ?? 10,
    authHandler: config?.authHandler,
  };
}
