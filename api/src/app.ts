import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'node:fs';
import { env } from './config/env';
import { authRoutes } from './modules/auth/auth.routes';
import { loanRoutes } from './modules/loans/loan.routes';
import { summaryRoutes } from './modules/summary/summary.routes';
import { errorHandler } from './middleware/errorHandler';
import { HttpError } from './utils/httpError';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: (origin, callback) => {
    if (!origin || env.corsOrigins.includes('*') || env.corsOrigins.includes(origin)) callback(null, true);
    else callback(new HttpError(403, 'This web origin is not allowed by the API.', 'CORS_ORIGIN_DENIED'));
  }}));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  if (env.NODE_ENV !== 'test') app.use(morgan('dev'));
  fs.mkdirSync(env.uploadDirAbsolute, { recursive: true });
  app.use('/uploads', express.static(env.uploadDirAbsolute, { maxAge: env.NODE_ENV === 'production' ? '1d' : 0 }));

  app.get('/api/health', (_req, res) => res.status(200).json({ status: 'ok', service: 'miniledger-api' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/loans', loanRoutes);
  app.use('/api/summary', summaryRoutes);
  app.use((_req, _res, next) => next(new HttpError(404, 'Endpoint not found.', 'ROUTE_NOT_FOUND')));
  app.use(errorHandler);
  return app;
}
