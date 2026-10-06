import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { normaliseSessionId, corsOrigin } from '../middleware/session.middleware';
import type { ClientToServerEvents, ServerToClientEvents } from '../types';
import { setupAssistantSocket } from './assistant.socket';

let io: Server<ClientToServerEvents, ServerToClientEvents> | null = null;

export const initializeSocket = (httpServer: HttpServer): Server<ClientToServerEvents, ServerToClientEvents> => {
  io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (corsOrigin(origin ?? undefined)) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Start on polling so restrictive networks still connect, then upgrade.
    transports: ['polling', 'websocket'],
    maxHttpBufferSize: 1e5,
    pingTimeout: 30_000,
  });

  io.on('connection', (socket) => {
    socket.data.sessionId = normaliseSessionId(socket.handshake.auth?.sessionId);
    setupAssistantSocket(io!, socket);
    logger.info(`socket connected ${socket.id} (${socket.data.sessionId})`);
    socket.on('disconnect', (reason) => logger.info(`socket disconnected ${socket.id} (${reason})`));
    socket.on('error', (error) => logger.error(`socket error ${socket.id}`, error));
  });

  logger.info('socket.io ready');
  return io;
};

export const getIO = (): Server<ClientToServerEvents, ServerToClientEvents> | null => io;