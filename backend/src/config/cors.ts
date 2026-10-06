import cors from 'cors';
import { env } from './env';
import { corsOrigin } from '../middleware/session.middleware';
import { logger } from '../utils/logger';

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const isAllowed = corsOrigin(origin ?? undefined);
    if (isAllowed) {
      callback(null, true);
    } else {
      logger.warn(`[CORS] Blocked request from unauthorized origin: "${origin}". Allowed origins: ${env.CLIENT_URLS.join(', ')}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Session-Id', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['X-Session-Id'],
  maxAge: 86400,
};