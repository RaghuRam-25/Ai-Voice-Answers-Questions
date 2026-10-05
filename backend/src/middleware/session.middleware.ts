import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const RESERVED = new Set([
  '__proto__',
  'constructor',
  'prototype',
  'toString',
  'valueOf',
  'hasOwnProperty',
]);

const HEX32 = /^[a-f0-9]{32}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Session identity.
 *
 * This build is deliberately account-less, so the "session" is an opaque,
 * client-generated id that the server treats as an untrusted namespace: it can
 * only ever read or write records that carry the exact same id. If accounts are
 * added later, replace `sessionIdOf` with the JWT subject and nothing else has
 * to change.
 */
export function normaliseSessionId(value: unknown): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (HEX32.test(raw) || UUID.test(raw)) return raw;
  // Fall back to a stable hash of whatever the client sent so we never echo
  // attacker controlled characters into file names or logs.
  const seed = raw || 'anonymous';
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `anon-${hash.toString(16).padStart(8, '0')}`;
}

export function sessionIdOf(req: Request): string {
  const header = req.header('x-session-id');
  const query = typeof req.query.sessionId === 'string' ? req.query.sessionId : undefined;
  const body = typeof (req.body as { sessionId?: unknown } | undefined)?.sessionId === 'string'
    ? (req.body as { sessionId: string }).sessionId
    : undefined;
  return normaliseSessionId(header ?? body ?? query);
}

/** Reject prototype-polluting keys before they reach any store. */
export const assertSafePayload = (payload: unknown): void => {
  if (payload && typeof payload === 'object') {
    for (const key of Object.keys(payload as Record<string, unknown>)) {
      if (RESERVED.has(key)) {
        logger.warn(`blocked unsafe key "${key}" in request payload`);
        throw new Error('Invalid payload');
      }
    }
  }
};

export const securityHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (env.isProd) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
};

export const corsOrigin = (origin: string | undefined): boolean => {
  if (!origin) return true; // same-origin / native clients
  return env.CLIENT_URLS.includes(origin);
};