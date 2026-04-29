import type { Express, Request, Response } from 'express';
import { MetricsConfig } from '../types';
import { resolveMetricsConfig } from '../config';
import { createCollectors } from './collectors';
import { metricsMiddleware } from './middleware';
import { isIpAllowed } from '../utils/ip';

export function initMetrics(app: Express, config?: MetricsConfig): void {
  const resolved = resolveMetricsConfig(config);
  const { registry } = createCollectors(resolved);

  if (resolved.allowedIPs.length === 0) {
    console.warn(
      '[observability] /metrics is open to all IPs. ' +
      'Set METRICS_ALLOWED_IPS (e.g. "10.0.0.1,10.0.0.0/8") to restrict access.',
    );
  }

  app.use(metricsMiddleware());

  app.get(resolved.metricsPath, async (req: Request, res: Response) => {
    if (resolved.allowedIPs.length > 0) {
      const clientIp = req.ip ?? req.socket.remoteAddress ?? '';
      if (!isIpAllowed(clientIp, resolved.allowedIPs)) {
        res.status(403).end('Forbidden');
        return;
      }
    }

    try {
      res.set('Content-Type', registry.contentType);
      res.end(await registry.metrics());
    } catch (err) {
      res.status(500).end(String(err));
    }
  });
}

export { metricsMiddleware };
