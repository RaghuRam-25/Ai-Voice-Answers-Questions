import type { CommandDefinition, CommandInvocation, Permission } from '../types';
import { logger } from '../utils/logger';

/**
 * Command registry.
 *
 * Commands are the only way the assistant can affect anything, and every one of
 * them declares its own permission level. There is deliberately no
 * "run arbitrary shell" command: the assistant can never execute OS commands
 * derived from model output.
 */
class CommandRegistry {
  private commands = new Map<string, CommandDefinition>();

  register(definition: CommandDefinition): this {
    this.commands.set(definition.name, definition);
    return this;
  }

  registerAll(definitions: CommandDefinition[]): this {
    for (const d of definitions) this.register(d);
    return this;
  }

  has(name: string): boolean {
    return this.commands.has(name);
  }

  get(name: string): CommandDefinition | undefined {
    return this.commands.get(name);
  }

  list(): CommandDefinition[] {
    return Array.from(this.commands.values());
  }

  permissionOf(name: string): Permission | null {
    return this.commands.get(name)?.permission ?? null;
  }

  /** Human/AI readable capability list used in prompts. */
  describe(): string {
    return this.list()
      .map((c) => {
        const params = Object.entries(c.parameters)
          .map(([key, spec]) => `${key}${spec.required ? '' : '?'}: ${spec.type}`)
          .join(', ');
        return `- ${c.name}(${params}) [${c.permission}] — ${c.description}`;
      })
      .join('\n');
  }

  /** Coerce and validate arguments before a command is allowed to run. */
  validateArguments(
    definition: CommandDefinition,
    raw: Record<string, unknown>
  ): { ok: true; args: Record<string, unknown> } | { ok: false; missing: string[]; error?: string } {
    const args: Record<string, unknown> = {};
    const missing: string[] = [];

    for (const [key, spec] of Object.entries(definition.parameters)) {
      const value = raw[key];
      if (value === undefined || value === null || value === '') {
        if (spec.default !== undefined) {
          args[key] = spec.default;
        } else if (spec.required) {
          missing.push(key);
        }
        continue;
      }
      const coerced = coerce(value, spec.type);
      if (coerced === undefined) {
        return { ok: false, missing, error: `Parameter "${key}" must be a ${spec.type}` };
      }
      args[key] = coerced;
    }

    return missing.length ? { ok: false, missing } : { ok: true, args };
  }

  logInvocation(
    sessionId: string,
    invocation: CommandInvocation,
    result: string,
    store: (entry: import('../types').CommandLogEntry) => void
  ): void {
    logger.info(`[command] ${invocation.name} → ${invocation.status}`, { sessionId, result });
  }
}

function coerce(value: unknown, type: string): unknown {
  switch (type) {
    case 'string':
      return String(value).slice(0, 2000);
    case 'number': {
      const n = typeof value === 'number' ? value : Number.parseFloat(String(value));
      return Number.isFinite(n) ? n : undefined;
    }
    case 'boolean':
      if (typeof value === 'boolean') return value;
      return ['true', 'yes', '1', 'on'].includes(String(value).toLowerCase());
    case 'string[]':
      return Array.isArray(value) ? value.map(String) : [String(value)];
    default:
      return value;
  }
}

export const commandRegistry = new CommandRegistry();