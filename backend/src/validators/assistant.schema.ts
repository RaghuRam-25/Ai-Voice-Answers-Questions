import { z } from 'zod';

export const assistantMessageSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(8000, 'Message is too long'),
  conversationId: z.string().uuid('Invalid conversation id').optional(),
  language: z.enum(['en', 'bn']).optional(),
});

export const confirmSchema = z.object({
  confirmationId: z.string().min(8).max(64),
  approved: z.boolean(),
});

export const sessionSchema = z.object({
  sessionId: z.string().trim().min(8).max(64),
});

export const conversationIdSchema = z.object({
  id: z.string().uuid('Invalid conversation id'),
});

export type AssistantMessageInput = z.infer<typeof assistantMessageSchema>;
export type ConfirmInput = z.infer<typeof confirmSchema>;
export type SessionInput = z.infer<typeof sessionSchema>;