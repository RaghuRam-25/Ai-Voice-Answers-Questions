import { v4 as uuidv4 } from 'uuid';
import type { CommandDefinition } from '../types';
import { store, type NoteRecord, type ReminderRecord } from '../storage/jsonStore';
import { systemService } from '../services/system.service';
import { buildSearchUrl, extractUrlCandidate, sanitizeExternalUrl } from './url';
import { parseReminderTime } from './time';

/**
 * System command catalogue supporting both English and natural Bangladeshi Bengali.
 */
export const commands: CommandDefinition[] = [
  /* ── Web ─────────────────────────────────────────────────────────────── */
  {
    name: 'openWebsite',
    description: 'Open a website in the user browser',
    permission: 'safe',
    parameters: { url: { type: 'string', description: 'Site name or full http(s) URL', required: true } },
    examples: ['open youtube', 'go to wikipedia.org', 'Google খুলে দাও', 'ইউটিউব ওপেন করো'],
    patterns: [
      '^\\s*(please\\s+|দয়া করে\\s+)?(open|go to|visit|browse|launch|start|load|খুলো|খুলে দাও|ওপেন করো)\\b.*\\b(google|youtube|facebook|github|wikipedia|[a-z0-9-]+\\.[a-z]{2,})',
      '\\b(open|visit|browse)\\s+(the\\s+)?(website|site|page)\\b',
      '\\bhttps?://',
      '\\b(google|youtube|facebook|github)\\s*(খুলো|খুলে দাও|ওপেন করো)\\b',
    ],
    async execute(_ctx, args) {
      const raw = String(args.url ?? '');
      const url = sanitizeExternalUrl(extractUrlCandidate(raw));
      const host = new URL(url).hostname;
      return {
        ok: true,
        message: `${host} খুলে দিচ্ছি।`,
        data: { url },
        clientAction: { type: 'open_url', url, label: `Open ${host}` },
      };
    },
  },
  {
    name: 'searchWeb',
    description: 'Search the web for a query',
    permission: 'safe',
    parameters: { query: { type: 'string', description: 'Search query', required: true } },
    examples: ['search the web for quantum computing', 'google best mechanical keyboards', 'গুগলে সার্চ করো...'],
    patterns: [
      '\\b(search|google|look up|find out|সার্চ করো|খুঁজো)\\b.*\\b(web|internet|online|গুগলে|ইন্টারনেটে)\\b',
      '^\\s*(search|google|সার্চ)\\b',
      '\\blook up\\b',
    ],
    async execute(_ctx, args) {
      const query = String(args.query ?? '').trim();
      const url = buildSearchUrl(query);
      return {
        ok: true,
        message: `গুগলে "${query}" লিখে সার্চ করছি।`,
        data: { query, url },
        clientAction: { type: 'open_url', url, label: `Search for ${query}` },
      };
    },
  },

  /* ── Notes ───────────────────────────────────────────────────────────── */
  {
    name: 'createNote',
    description: 'Save a note for the user',
    permission: 'safe',
    parameters: {
      title: { type: 'string', description: 'Short note title', required: true },
      content: { type: 'string', description: 'Optional longer body', required: false },
    },
    examples: ['create a note called groceries', 'note: buy milk and eggs', 'আমার জন্য একটা নোট তৈরি করো বাজারে যাওয়ার তালিকা'],
    patterns: [
      '\\b(create|add|make|save|write)\\b.*\\bnote\\b',
      '^\\s*note\\b',
      '\\bnote\\s+(that|to)\\b',
      '\\b(নোট|নোটস)\\s*(তৈরি|লিখ|বানাও|সেভ|করো)\\b',
      '\\b(নোট তৈরি করো|নোট লেখো)\\b',
    ],
    async execute(ctx, args) {
      const title = String(args.title ?? '').trim().slice(0, 120);
      const content = String(args.content ?? '').slice(0, 4000);
      const record: NoteRecord = {
        id: uuidv4(),
        sessionId: ctx.sessionId,
        title: title || 'নতুন নোট',
        content,
        createdAt: new Date().toISOString(),
      };
      store.notes.put(record);
      return {
        ok: true,
        message: `নোট সংরক্ষণ করা হয়েছে: "${record.title}"।`,
        data: { id: record.id, title: record.title, content },
      };
    },
  },
  {
    name: 'listNotes',
    description: 'List saved notes',
    permission: 'safe',
    parameters: {},
    examples: ['list my notes', 'show notes', 'আমার নোটগুলো দেখাও'],
    patterns: ['\\b(list|show|read|what)\\b.*\\bnotes?\\b', '\\bmy notes\\b', '\\bনোটগুলো দেখাও\\b'],
    async execute(ctx) {
      const notes = store.notes.find((n) => n.sessionId === ctx.sessionId);
      if (!notes.length) return { ok: true, message: 'আপনার কোনো সেভ করা নোট নেই।', data: { notes: [] } };
      const list = notes
        .slice(-8)
        .reverse()
        .map((n) => `${n.title}${n.content ? ` — ${n.content.slice(0, 80)}` : ''}`)
        .join('; ');
      return {
        ok: true,
        message: `আপনার মোট ${notes.length}টি নোট আছে: ${list}`,
        data: { notes: notes.map(({ id, title, content, createdAt }) => ({ id, title, content, createdAt })) },
      };
    },
  },

  /* ── Reminders ───────────────────────────────────────────────────────── */
  {
    name: 'setReminder',
    description: 'Create a reminder',
    permission: 'safe',
    parameters: {
      text: { type: 'string', description: 'What to be reminded about', required: true },
      when: { type: 'string', description: 'When to remind, e.g. "in 20 minutes" or "tomorrow at 9"', required: false },
    },
    examples: ['set a reminder to call back in 20 minutes', 'আমাকে ১০ মিনিট পর মনে করিয়ে দাও'],
    patterns: ['\\b(remind me|set (a )?reminder|reminder|মনে করিয়ে দাও|রিমাইন্ডার)\\b'],
    async execute(ctx, args) {
      const rawText = String(args.text ?? '').trim();
      if (!rawText) return { ok: false, message: 'কীসের জন্য রিমাইন্ডার সেট করতে চান বলুন।' };

      let text = rawText;
      let whenText = String(args.when ?? '').trim();
      if (!whenText) {
        const inline = rawText.match(/\b(?:in\s+\d+\s+\w+|at\s+[\d:.]+\s*(?:am|pm)?|tomorrow(?:\s+at\s+[\d:.]+\s*(?:am|pm)?)?|tonight|on\s+(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday))\b/i);
        if (inline) {
          whenText = inline[0];
          text = rawText.replace(inline[0], '').replace(/\b(to|that|about)\b/i, '').trim();
        }
      }

      const parsed = whenText ? parseReminderTime(whenText) : null;
      const record: ReminderRecord = {
        id: uuidv4(),
        sessionId: ctx.sessionId,
        text: text.slice(0, 240),
        dueAt: parsed?.iso ?? null,
        createdAt: new Date().toISOString(),
        status: 'scheduled',
      };
      store.reminders.put(record);
      return {
        ok: true,
        message: parsed
          ? `রিমাইন্ডার সেট করা হয়েছে (${parsed.label}): ${record.text}।`
          : `রিমাইন্ডার সংরক্ষণ করা হয়েছে: ${record.text}।`,
        data: { id: record.id, text: record.text, dueAt: record.dueAt },
      };
    },
  },

  /* ── System ──────────────────────────────────────────────────────────── */
  {
    name: 'getCurrentTime',
    description: 'Report the current date and time',
    permission: 'safe',
    parameters: {},
    examples: ['what time is it', 'what is today\'s date', 'সময় কত', 'কয়টা বাজে'],
    patterns: ['\\b(what|whats)\\b.*\\b(time|date|day)\\b', '\\bcurrent (time|date)\\b', '\\btime is it\\b', '\\b(সময় কত|কয়টা বাজে|আজকে কী বার|তারিখ কত)\\b'],
    async execute() {
      const time = systemService.localTime();
      return { ok: true, message: `এখন সময়: ${time}।`, data: { time } };
    },
  },
  {
    name: 'getSystemInfo',
    description: 'Report real information about the machine running the assistant',
    permission: 'safe',
    parameters: {},
    examples: ['system info', 'কম্পিউটারের তথ্য দেখাও', 'সিস্টেম স্ট্যাটাস'],
    patterns: [
      '\\bsystem (info|information|status)\\b',
      '\\bserver (info|status|health)\\b',
      '\\b(সিস্টেম (তথ্য|স্ট্যাটাস|ইনফরমেশন)|কম্পিউটার(ের)? (তথ্য|ইনফরমেশন))\\b',
    ],
    async execute() {
      const info = systemService.info();
      return { ok: true, message: systemService.spokenSummary(), data: info };
    },
  },
  {
    name: 'clearHistory',
    description: 'Delete the conversation history for this session (destructive)',
    permission: 'dangerous',
    explicitOnly: true,
    parameters: {},
    examples: ['clear the conversation history', 'হিস্ট্রি মুছে ফেলো'],
    patterns: ['\\b(clear|delete|wipe|forget)\\b.*\\b(history|conversation|messages|memory)\\b', '\\bহিস্ট্রি (মুছে|ক্লিয়ার)\\b'],
    async execute(ctx) {
      const cleared = store.conversations.find((c) => c.sessionId === ctx.sessionId);
      for (const conversation of cleared) store.conversations.remove(conversation.id);
      return {
        ok: true,
        message: 'এই সেশনের কথোপকথনের ইতিহাস মুছে ফেলা হয়েছে।',
        data: { cleared: cleared.length },
      };
    },
  },
];