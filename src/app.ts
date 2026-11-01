import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './shared/middlewares/errorHandler.js';
import { createUsersRouter } from './modules/users/index.js';
import { createProductsRouter } from './modules/products/index.js';
import { createOrdersRouter } from './modules/orders/index.js';

export function createApp() {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: env.NODE_ENV === 'production' ? false : true,
      credentials: true,
    })
  );

  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());

  // Global rate limit
  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
  });

  // Mount module routers under versioned prefix
  const api = express.Router();
  api.use(createUsersRouter());
  api.use(createProductsRouter());
  api.use(createOrdersRouter());
  app.use(env.API_PREFIX, api);

  // 404 + error handlers
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}