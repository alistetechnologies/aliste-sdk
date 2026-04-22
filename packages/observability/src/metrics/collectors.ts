import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics as promCollectDefaultMetrics,
} from 'prom-client';
import { ResolvedMetricsConfig } from '../types';

export interface MetricCollectors {
  registry: Registry;
  httpRequestCounter: Counter<string>;
  httpRequestDuration: Histogram<string>;
  activeRequests: Gauge<string>;
  httpErrorCounter: Counter<string>;
  httpResponseSize: Histogram<string>;
}

let collectors: MetricCollectors | null = null;

export function createCollectors(config: ResolvedMetricsConfig): MetricCollectors {
  if (collectors !== null) return collectors;

  const registry = new Registry();

  registry.setDefaultLabels({
    service: config.serviceName,
    version: config.serviceVersion,
    environment: config.deploymentEnvironment,
    instance: config.instanceId,
  });

  if (config.collectDefaultMetrics) {
    promCollectDefaultMetrics({
      register: registry,
      eventLoopMonitoringPrecision: config.defaultMetricsInterval,
    });
  }

  const httpRequestCounter = new Counter<string>({
    name: 'http_request_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [registry],
  });

  const httpRequestDuration = new Histogram<string>({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 1, 1.5, 2, 5, 10],
    registers: [registry],
  });

  const activeRequests = new Gauge<string>({
    name: 'active_http_requests',
    help: 'Number of currently active HTTP requests',
    registers: [registry],
  });

  const httpErrorCounter = new Counter<string>({
    name: 'http_errors_total',
    help: 'Total number of HTTP errors (4xx and 5xx)',
    labelNames: ['method', 'route', 'status_code'],
    registers: [registry],
  });

  const httpResponseSize = new Histogram<string>({
    name: 'http_response_size_bytes',
    help: 'Size of HTTP responses in bytes',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [512, 1024, 2048, 4096, 8192, 16384, 32768],
    registers: [registry],
  });

  collectors = {
    registry,
    httpRequestCounter,
    httpRequestDuration,
    activeRequests,
    httpErrorCounter,
    httpResponseSize,
  };

  return collectors;
}

export function getCollectors(): MetricCollectors | null {
  return collectors;
}
