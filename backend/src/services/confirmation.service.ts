import { randomUUID } from 'crypto';
import { env } from '../config/env';
import type { PendingConfirmation } from '../types';
import { store } from '../storage/jsonStore';

interface PendingRecord {
  confirmation: PendingConfirmation;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
}

/**
 * Holds approvals for `moderate` / `dangerous` commands.
 *
 * A confirmation is single use, expires quickly, and is bound to the session that
 * created it, so a client cannot replay another client's approval.
 */
class ConfirmationService {
  private pending = new Map<string, PendingRecord>();

  create(
    sessionId: string,
    command: string,
    args: Record<string, unknown>,
    reason: string
  ): PendingConfirmation {
    this.sweep();
    const now = Date.now();
    const confirmation: PendingConfirmation = {
      id: randomUUID(),
      sessionId,
      command,
      arguments: args,
      reason,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + env.CONFIRMATION_TTL_MS).toISOString(),
    };
    this.pending.set(confirmation.id, { confirmation, status: 'pending' });
    return confirmation;
  }

  /** Returns the confirmation only if it is pending, unexpired and owned by the session. */
  claim(id: string, sessionId: string): PendingConfirmation | null {
    this.sweep();
    const record = this.pending.get(id);
    if (!record) return null;
    if (record.confirmation.sessionId !== sessionId) return null;
    if (new Date(record.confirmation.expiresAt).getTime() < Date.now()) {
      this.pending.delete(id);
      return null;
    }
    return record.confirmation;
  }

  resolve(id: string, status: PendingRecord['status']): void {
    const record = this.pending.get(id);
    if (!record) return;
    if (status === 'executed') {
      this.pending.delete(id);
    } else {
      record.status = status;
      // keep a short audit trail, then drop it
      setTimeout(() => this.pending.delete(id), 10_000).unref?.();
    }
  }

  historyFor(sessionId: string): PendingConfirmation[] {
    this.sweep();
    return Array.from(this.pending.values())
      .map((r) => r.confirmation)
      .filter((c) => c.sessionId === sessionId);
  }

  private sweep(): void {
    const now = Date.now();
    for (const [id, record] of this.pending) {
      if (now - new Date(record.confirmation.createdAt).getTime() > env.CONFIRMATION_TTL_MS * 4) {
        this.pending.delete(id);
      }
    }
  }
}

export const confirmationService = new ConfirmationService();

/** Command execution audit trail, persisted with the rest of the documents. */
export const commandAudit = {
  record(entry: import('../types').CommandLogEntry): void {
    store.commandLog.put(entry);
    if (store.commandLog.list().length > 500) {
      const oldest = store.commandLog.list().sort((a, b) => a.executedAt.localeCompare(b.executedAt))[0];
      if (oldest) store.commandLog.remove(oldest.id);
    }
  },
};