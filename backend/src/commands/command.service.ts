import { v4 as uuidv4 } from 'uuid';
import type {
  CommandContext,
  CommandDefinition,
  CommandInvocation,
  CommandResult,
  PendingConfirmation,
} from '../types';
import { commandRegistry } from './command.registry';
import { commands } from './commands';
import { confirmationService, commandAudit } from '../services/confirmation.service';
import { BadRequestError } from '../utils/errors';

commandRegistry.registerAll(commands);

export interface CommandOutcome {
  invocation: CommandInvocation;
  result: CommandResult;
  confirmation?: PendingConfirmation;
}

/**
 * Execution pipeline:
 *   resolve → validate arguments → permission check → (confirm) → execute → audit
 *
 * Nothing bypasses `permissionOf`, and `moderate`/`dangerous` commands can only
 * run through an explicit, expiring, single-use approval.
 */
class CommandService {
  describe(): string {
    return commandRegistry.describe();
  }

  catalog() {
    return commandRegistry.list().map((c) => ({
      name: c.name,
      description: c.description,
      permission: c.permission,
      parameters: c.parameters,
      examples: c.examples,
      explicitOnly: Boolean(c.explicitOnly),
      patterns: c.patterns ?? [],
    }));
  }

  resolve(name: string): CommandDefinition | undefined {
    return commandRegistry.get(name);
  }

  async run(
    ctx: CommandContext,
    name: string,
    rawArgs: Record<string, unknown>,
    options: { approved?: boolean } = {}
  ): Promise<CommandOutcome> {
    const definition = commandRegistry.get(name);
    if (!definition) {
      return {
        invocation: this.invocation(name, rawArgs, 'unsupported', `Unknown command "${name}"`),
        result: { ok: false, message: `"${name}" is not a command I can run.` },
      };
    }

    const validation = commandRegistry.validateArguments(definition, rawArgs);
    if (!validation.ok) {
      const detail = validation.error ?? `Missing required input: ${validation.missing.join(', ')}`;
      return {
        invocation: this.invocation(name, rawArgs, 'failed', detail, definition),
        result: { ok: false, message: askForMissing(definition, validation.missing, detail) },
      };
    }

    const needsApproval = definition.permission !== 'safe';

    if (needsApproval && !options.approved) {
      const confirmation = confirmationService.create(
        ctx.sessionId,
        definition.name,
        validation.args,
        approvalReason(definition)
      );
      return {
        invocation: this.invocation(definition.name, validation.args, 'awaiting_confirmation', approvalReason(definition), definition),
        result: {
          ok: false,
          message: `I need your confirmation before I run ${definition.name}.`,
          data: { reason: approvalReason(definition) },
        },
        confirmation,
      };
    }

    try {
      const result = await definition.execute(ctx, validation.args);
      const status = result.ok ? 'executed' : 'failed';
      commandAudit.record({
        id: uuidv4(),
        sessionId: ctx.sessionId,
        command: definition.name,
        arguments: validation.args,
        permission: definition.permission,
        status,
        result: result.message,
        executedAt: new Date().toISOString(),
      });
      return {
        invocation: this.invocation(definition.name, validation.args, status, result.message, definition),
        result,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected command failure';
      commandAudit.record({
        id: uuidv4(),
        sessionId: ctx.sessionId,
        command: definition.name,
        arguments: validation.args,
        permission: definition.permission,
        status: 'failed',
        result: message,
        executedAt: new Date().toISOString(),
      });
      return {
        invocation: this.invocation(definition.name, validation.args, 'failed', message, definition),
        result: { ok: false, message: `That command could not run: ${message}` },
      };
    }
  }

  private invocation(
    name: string,
    args: Record<string, unknown>,
    status: CommandInvocation['status'],
    summary: string,
    definition?: CommandDefinition
  ): CommandInvocation {
    return {
      name,
      arguments: args,
      permission: definition?.permission ?? 'safe',
      status,
      summary,
    };
  }
}

const approvalReason = (definition: CommandDefinition): string =>
  definition.permission === 'dangerous'
    ? `${definition.name} is a destructive action: ${definition.description.toLowerCase()}`
    : `${definition.name} changes something outside the chat: ${definition.description.toLowerCase()}`;

const askForMissing = (
  definition: CommandDefinition,
  missing: string[],
  detail: string
): string => {
  const fields = missing
    .map((key) => definition.parameters[key]?.description?.toLowerCase() ?? key)
    .join(' and ');
  return `I need the ${fields} to do that. ${detail}`;
};

export const commandService = new CommandService();

export { commandRegistry };
export const ensureCommand = (name: string): CommandDefinition => {
  const definition = commandService.resolve(name);
  if (!definition) throw new BadRequestError(`Unknown command "${name}"`);
  return definition;
};