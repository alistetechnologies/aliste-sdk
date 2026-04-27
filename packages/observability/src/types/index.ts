import type { Request, Response } from 'express';

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
  /** Path to expose Prometheus metrics. Must start with "/". Default: /metrics */
  metricsPath?: string;
  /** Enable prom-client default process/Node.js metrics. Default: true */
  collectDefaultMetrics?: boolean;
  /**
   * Precision in ms for the prom-client event-loop monitor.
   * Lower values increase accuracy at a slight CPU cost. Default: 10.
   * Note: prom-client collects metrics on-demand — this is NOT a polling interval.
   */
  eventLoopMonitoringPrecision?: number;
  /**
   * Optional guard called before serving the metrics endpoint.
   * Return `true` to allow the request; return `false` to deny it
   * (the SDK responds with 401 Unauthorized automatically).
   */
  authHandler?: (req: Request, res: Response) => boolean | Promise<boolean>;
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
  eventLoopMonitoringPrecision: number;
  authHandler?: (req: Request, res: Response) => boolean | Promise<boolean>;
}
