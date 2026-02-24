export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'QUOTA_EXCEEDED'
  | 'FEATURE_DISABLED'
  | 'RATE_LIMITED'
  | 'PROVIDER_UNAVAILABLE'
  | 'GENERATION_FAILED'
  | 'UPLOAD_FAILED'
  | 'SAFETY_REJECTED'
  | 'INTERNAL_ERROR'
  | 'INVALID_TOKEN'
  | 'TOKEN_EXPIRED'
  | 'ACCOUNT_LOCKED'
  | 'EMAIL_NOT_VERIFIED'
  | 'DUPLICATE_EMAIL'
  | 'INVALID_CREDENTIALS'
  | 'RESOURCE_CONFLICT';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Ensure prototype chain is preserved
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON(): Record<string, unknown> {
    const result: Record<string, unknown> = {
      code: this.code,
      message: this.message,
    };
    if (this.details !== undefined) {
      result['details'] = this.details;
    }
    return result;
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
