import http from 'http';
import app from './app';
import { env, ensureDataDir } from './config/env';
import { initializeSocket, getIO } from './socket/socket';
import { assistantService } from './services/assistant.service';
import { logger } from './utils/logger';

const start = (): void => {
  ensureDataDir();

  const httpServer = http.createServer(app);
  const io = initializeSocket(httpServer);

  httpServer.listen(env.PORT, () => {
    const health = assistantService.health();
    logger.info('─'.repeat(72));
    logger.info(`  AI Assistant API`);
    logger.info(`  http://localhost:${env.PORT}/api/health`);
    logger.info(`  engine      ${health.engine.label} (${health.engine.model}) configured=${health.engine.configured}`);
    if (health.usingFallback) {
      logger.warn(`  requested   ${health.requestedProvider} → fell back to the offline local engine`);
    }
    logger.info(`  storage     ${health.storage}`);
    logger.info(`  cors        ${env.CLIENT_URLS.join(', ')}`);
    logger.info(`  environment ${env.NODE_ENV}`);
    logger.info('─'.repeat(72));
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received — closing.`);
    io.close();
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 8000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => logger.error('unhandled rejection', reason));
  process.on('uncaughtException', (error) => {
    logger.error('uncaught exception', error);
    getIO()?.close();
    process.exit(1);
  });
};

start();

export { app, getIO };