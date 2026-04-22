import express from 'express';
import { initMetrics } from '../src';

const app = express();

app.use(express.json());

initMetrics(app, {
  serviceName: process.env.OTEL_SERVICE_NAME ?? 'example-service',
  serviceVersion: process.env.SERVICE_VERSION ?? '1.0.0',
  deploymentEnvironment: process.env.NODE_ENV ?? 'production',
  metricsPath: '/metrics',
  collectDefaultMetrics: true,
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/users', (_req, res) => {
  res.json([{ id: 1, name: 'Alice' }]);
});

app.get('/users/:id', (req, res) => {
  res.json({ id: req.params.id, name: 'Alice' });
});

app.post('/orders', (req, res) => {
  res.status(201).json({ id: 42, ...req.body });
});

export default app;
