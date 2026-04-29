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
  /**
   * IP allowlist for the /metrics endpoint. Accepts exact IPs and CIDR ranges.
   * Falls back to METRICS_ALLOWED_IPS env var (comma-separated).
   * If empty, the endpoint is open to all — not recommended for production.
   * Example: ['10.0.0.0/8', '192.168.1.50']
   */
  allowedIPs?: string[] | string;
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
  allowedIPs: string[];
}
