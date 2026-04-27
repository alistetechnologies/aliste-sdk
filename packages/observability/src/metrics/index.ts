import type { Express, Request, Response } from 'express';
import { MetricsConfig } from '../types';
import { resolveMetricsConfig } from '../config';
import { createCollectors } from './collectors';
import { metricsMiddleware } from './middleware';

export function initMetrics(app: Express, config?: MetricsConfig): void {
  const resolved = resolveMetricsConfig(config);
  const { registry } = createCollectors(resolved);

  app.use(metricsMiddleware());

  app.get(resolved.metricsPath, async (req: Request, res: Response) => {
    try {
      if (resolved.authHandler) {
        const allowed = await resolved.authHandler(req, res);
        if (!allowed) {
          res.status(401).end('Unauthorized');
          return;
        }
      }
      res.set('Content-Type', registry.contentType);
      res.end(await registry.metrics());
    } catch {
      res.status(500).end('Internal server error');
    }
  });
}

export { metricsMiddleware };
