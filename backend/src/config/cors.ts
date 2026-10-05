import cors from 'cors';
import { env } from './env';
import { corsOrigin } from '../middleware/session.middleware';

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (corsOrigin(origin ?? undefined)) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origin ${origin} is not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Session-Id'],
  maxAge: 600,
};