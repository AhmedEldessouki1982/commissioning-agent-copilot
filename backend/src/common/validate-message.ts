import { BadRequestException } from '@nestjs/common';

const MAX_MESSAGE_LENGTH = 4000;

/**
 * Shared request-body guard for the agent endpoints. Keeps the user-facing
 * validation messages identical across every agent.
 */
export function validateMessage(body: { message?: unknown }): string {
  const message = body?.message;

  if (typeof message !== 'string' || message.trim().length === 0) {
    throw new BadRequestException('message must be a non-empty string');
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new BadRequestException(
      `message must be at most ${MAX_MESSAGE_LENGTH} characters`,
    );
  }

  return message;
}
