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

export function resolveTracingConfig(config?: TracingConfig): ResolvedTracingConfig {
  const rawRatio = config?.samplerRatio ?? parseFloat(process.env.OTEL_TRACES_SAMPLER_ARG ?? '1.0');

  return {
    serviceName: config?.serviceName ?? process.env.OTEL_SERVICE_NAME ?? 'unknown-service',
    serviceVersion: config?.serviceVersion ?? process.env.SERVICE_VERSION ?? '0.0.0',
    deploymentEnvironment: config?.deploymentEnvironment ?? process.env.NODE_ENV ?? 'development',
    instanceId: resolveInstanceId(config?.instanceId),
    otlpEndpoint: config?.otlpEndpoint ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318',
    samplerRatio: Number.isFinite(rawRatio) ? clamp(rawRatio, 0, 1) : 1.0,
    debug: config?.debug ?? process.env.OTEL_DEBUG === 'true',
  };
}

export function resolveMetricsConfig(config?: MetricsConfig): ResolvedMetricsConfig {
  return {
    serviceName: config?.serviceName ?? process.env.OTEL_SERVICE_NAME ?? 'unknown-service',
    serviceVersion: config?.serviceVersion ?? process.env.SERVICE_VERSION ?? '0.0.0',
    deploymentEnvironment: config?.deploymentEnvironment ?? process.env.NODE_ENV ?? 'development',
    instanceId: resolveInstanceId(config?.instanceId),
    metricsPath: config?.metricsPath ?? '/metrics',
    collectDefaultMetrics: config?.collectDefaultMetrics ?? true,
    defaultMetricsInterval: config?.defaultMetricsInterval ?? 5000,
  };
}
