/**
 * Desktop Companion Host Process
 * A background runner that keeps the AI Assistant accessible across the entire OS.
 * Can be run in the background (e.g. `npm run companion`) to ensure window focus and activation
 * when the user is in VS Code, YouTube, Chrome, Word, etc.
 */

import http from 'http';
import { desktopService } from './desktop.service';
import { clapDetectorService } from '../clap-detector/clap-detector.service';
import { logger } from '../utils/logger';

logger.info('====================================================');
logger.info('  AI Assistant Desktop Background Companion Host    ');
logger.info('  Always-ready background listener for Windows      ');
logger.info('====================================================');

// Heartbeat and IPC trigger listener
const PORT = 5002;
const server = http.createServer((req, res) => {
  if (req.url === '/activate') {
    void desktopService.bringToForeground();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, message: 'Assistant foregrounded' }));
  } else {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, status: 'companion_running' }));
  }
});

server.listen(PORT, () => {
  logger.info(`[DesktopCompanion] Background host listening on port ${PORT}`);
});
