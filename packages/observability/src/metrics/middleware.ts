import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { normalizeRoute } from '../utils/route';
import { getCollectors } from './collectors';

export function metricsMiddleware(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const c = getCollectors();
    if (c === null) {
      next();
      return;
    }

    const stopTimer = c.httpRequestDuration.startTimer();
    c.activeRequests.inc();

    res.on('finish', () => {
      const route = normalizeRoute(req.originalUrl ?? req.path ?? 'unknown');
      const statusCode = String(res.statusCode);
      const labels = { method: req.method, route, status_code: statusCode };

      const rawContentLength = res.getHeader('content-length');
      const contentLength =
        typeof rawContentLength === 'string'
          ? parseInt(rawContentLength, 10)
          : typeof rawContentLength === 'number'
          ? rawContentLength
          : 0;

      const rawReqLength = req.headers['content-length'];
      let requestSize = rawReqLength !== undefined ? parseInt(rawReqLength, 10) : NaN;
      if (!Number.isFinite(requestSize) && req.body !== undefined) {
        try { requestSize = Buffer.byteLength(JSON.stringify(req.body)); } catch { requestSize = 0; }
      }

      c.httpRequestCounter.inc(labels);
      c.activeRequests.dec();
      c.httpResponseSize.observe(labels, Number.isFinite(contentLength) ? contentLength : 0);
      c.httpRequestSize.observe({ method: req.method, route }, Number.isFinite(requestSize) ? requestSize : 0);

      if (res.statusCode >= 400) {
        c.httpErrorCounter.inc(labels);
      }

      stopTimer(labels);
    });

    next();
  };
}
