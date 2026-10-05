import { BadRequestError } from '../utils/errors';

const BLOCKED_HOST_PATTERNS = [
  /^(localhost|127\.|0\.0\.0\.0|\[?::1\]?)/i,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^\.?(internal|local)$/i,
];

/**
 * Allow only public http(s) destinations.
 * Blocks javascript:/data:/file: and private network ranges so the browser can
 * never be steered at loopback or LAN services by a model generated string.
 */
export const sanitizeExternalUrl = (input: string): string => {
  const raw = input.trim();
  if (!raw) throw new BadRequestError('No destination provided');

  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw.replace(/\s+/g, '')}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new BadRequestError(`"${raw}" is not a valid address`);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BadRequestError(`Unsupported protocol "${url.protocol}" — only http and https are allowed`);
  }

  if (BLOCKED_HOST_PATTERNS.some((re) => re.test(url.hostname))) {
    throw new BadRequestError('That address points at a private network and was blocked');
  }

  return url.toString();
};

/** Extract the most plausible address out of a spoken sentence. */
export const extractUrlCandidate = (text: string): string => {
  const explicit = text.match(/\b(?:https?:\/\/|www\.)[^\s"']+/i);
  if (explicit) return explicit[0];

  const spoken = text.match(
    /\b(?:open|go to|visit|launch|start|browse)\s+(?:the\s+)?(?:site\s+|website\s+|page\s+)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)/i
  );
  if (spoken) return spoken[1];

  const bare = text.match(/\b([a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s]*)?)\b/i);
  return bare ? bare[1] : text;
};

export const buildSearchUrl = (query: string): string => {
  const q = query.trim().slice(0, 300);
  if (!q) throw new BadRequestError('No search query provided');
  return `https://duckduckgo.com/?q=${encodeURIComponent(q)}`;
};