import { AppError, isAppError } from '@ai-platform/types';

/**
 * Extract a human-readable error message for frontend display.
 * Handles AppError, Error, and unknown values.
 */
export function getErrorMessage(err: unknown): string {
  if (isAppError(err)) {
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'string') {
    return err;
  }
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Truncates a prompt to `maxLength` characters for safe logging.
 * Never log full prompts — truncate to 100 characters per CLAUDE.md §9.3.
 */
export function truncateForLog(text: string, maxLength = 100): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

export { AppError, isAppError };
