import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { corsOptions } from './config/cors';
import { apiLimiter } from './middleware/rateLimit.middleware';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware';
import { securityHeaders } from './middleware/session.middleware';
import healthRoutes from './routes/health.routes';
import assistantRoutes from './routes/assistant.routes';

const app = express();

// Required for correct client IPs (rate limiting) behind a reverse proxy.
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors(corsOptions));
app.use(securityHeaders);
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));

app.use('/api', apiLimiter);

app.use('/api/health', healthRoutes);
app.use('/api/assistant', assistantRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;