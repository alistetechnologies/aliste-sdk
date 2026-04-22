import type { Express, Request, Response } from 'express';
import { MetricsConfig } from '../types';
import { resolveMetricsConfig } from '../config';
import { createCollectors } from './collectors';
import { metricsMiddleware } from './middleware';

export function initMetrics(app: Express, config?: MetricsConfig): void {
  const resolved = resolveMetricsConfig(config);
  const { registry } = createCollectors(resolved);

  app.use(metricsMiddleware());

  app.get(resolved.metricsPath, async (_req: Request, res: Response) => {
    try {
      res.set('Content-Type', registry.contentType);
      res.end(await registry.metrics());
    } catch (err) {
      res.status(500).end(String(err));
    }
  });
}

export { metricsMiddleware };
