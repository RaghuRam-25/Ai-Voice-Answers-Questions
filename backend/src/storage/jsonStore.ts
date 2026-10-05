import fs from 'fs';
import path from 'path';
import { ensureDataDir } from '../config/env';
import { logger } from '../utils/logger';

type Doc<T> = Record<string, T>;

const writeQueue = new Map<string, Promise<void>>();

/**
 * Tiny append-friendly JSON document store.
 *
 * Why not a database: this build has to run anywhere with `npm install` and
 * nothing else. Documents are kept in memory and flushed to disk atomically
 * (write temp file -> rename). If the data directory is not writable the store
 * transparently degrades to memory-only, and health reports it.
 */
export class JsonCollection<T extends { id: string }> {
  private cache: Map<string, T> | null = null;
  private readonly file: string;

  constructor(private readonly name: string) {
    this.file = path.join(ensureDataDir(), `${this.name}.json`);
  }

  private get persistent(): boolean {
    return this.persist !== false;
  }

  /** Set to false by `JsonStore.degradeAll()` when disk writes fail. */
  persist = true;

  private load(): Map<string, T> {
    if (this.cache) return this.cache;
    if (!this.persistent || !fs.existsSync(this.file)) {
      this.cache = new Map();
      return this.cache;
    }
    try {
      const raw = fs.readFileSync(this.file, 'utf8');
      const parsed = JSON.parse(raw) as T[] | Doc<T>;
      const list = Array.isArray(parsed) ? parsed : Object.values(parsed);
      this.cache = new Map(list.map((item) => [item.id, item]));
    } catch (error) {
      logger.warn(`[store:${this.name}] could not read store, starting empty`, error);
      this.cache = new Map();
    }
    return this.cache;
  }

  private flush(): void {
    if (!this.persistent) return;
    const previous = writeQueue.get(this.file) ?? Promise.resolve();
    const next = previous
      .then(async () => {
        const payload = JSON.stringify(Array.from(this.load().values()), null, 2);
        const tmp = `${this.file}.${process.pid}.tmp`;
        await fs.promises.writeFile(tmp, payload, 'utf8');
        await fs.promises.rename(tmp, this.file);
      })
      .catch((error) => {
        this.persist = false;
        logger.error(`[store:${this.name}] persistence disabled`, error);
      });
    writeQueue.set(this.file, next);
  }

  list(): T[] {
    return Array.from(this.load().values());
  }

  get(id: string): T | undefined {
    return this.load().get(id);
  }

  put(item: T): T {
    this.load().set(item.id, item);
    this.flush();
    return item;
  }

  patch(id: string, patch: Partial<T>): T | undefined {
    const current = this.load().get(id);
    if (!current) return undefined;
    const updated = { ...current, ...patch };
    this.load().set(id, updated);
    this.flush();
    return updated;
  }

  remove(id: string): boolean {
    const ok = this.load().delete(id);
    if (ok) this.flush();
    return ok;
  }

  find(predicate: (item: T) => boolean): T[] {
    return this.list().filter(predicate);
  }

  clear(): void {
    this.cache = new Map();
    this.flush();
  }
}

export class JsonStore {
  readonly conversations = new JsonCollection<import('../types').Conversation>('conversations');
  readonly notes = new JsonCollection<NoteRecord>('notes');
  readonly reminders = new JsonCollection<ReminderRecord>('reminders');
  readonly commandLog = new JsonCollection<import('../types').CommandLogEntry>('command-log');

  get all(): JsonCollection<{ id: string }>[] {
    return [this.conversations, this.notes, this.reminders, this.commandLog] as JsonCollection<{ id: string }>[];
  }

  degradeAll(): void {
    for (const c of this.all) c.persist = false;
  }

  get isPersistent(): boolean {
    return this.conversations.persist;
  }
}

export interface NoteRecord {
  id: string;
  sessionId: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface ReminderRecord {
  id: string;
  sessionId: string;
  text: string;
  /** ISO timestamp */
  dueAt: string | null;
  createdAt: string;
  status: 'scheduled' | 'done' | 'cancelled';
}

export const store = new JsonStore();