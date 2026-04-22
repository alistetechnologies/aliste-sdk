export interface ServiceIdentifiers {
  serviceName: string;
  serviceVersion: string;
  deploymentEnvironment: string;
  instanceId: string;
}

export interface TracingConfig {
  serviceName?: string;
  serviceVersion?: string;
  deploymentEnvironment?: string;
  instanceId?: string;
  /** Base OTLP endpoint, e.g. http://otel-collector:4318 */
  otlpEndpoint?: string;
  /** Trace sampling ratio between 0 and 1. Default: 1.0 */
  samplerRatio?: number;
  /** Enable verbose OTel diagnostic logging. Default: false */
  debug?: boolean;
}

export interface MetricsConfig {
  serviceName?: string;
  serviceVersion?: string;
  deploymentEnvironment?: string;
  instanceId?: string;
  /** Path to expose Prometheus metrics. Default: /metrics */
  metricsPath?: string;
  /** Enable prom-client default process/Node.js metrics. Default: true */
  collectDefaultMetrics?: boolean;
  /** Interval in ms for default metrics collection. Default: 5000 */
  defaultMetricsInterval?: number;
}

export interface ResolvedTracingConfig {
  serviceName: string;
  serviceVersion: string;
  deploymentEnvironment: string;
  instanceId: string;
  otlpEndpoint: string;
  samplerRatio: number;
  debug: boolean;
}

export interface ResolvedMetricsConfig {
  serviceName: string;
  serviceVersion: string;
  deploymentEnvironment: string;
  instanceId: string;
  metricsPath: string;
  collectDefaultMetrics: boolean;
  defaultMetricsInterval: number;
}
