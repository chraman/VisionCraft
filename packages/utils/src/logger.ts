import winston from 'winston';

/**
 * Required fields on every log line (CLAUDE.md §9.2):
 * timestamp · level · service · traceId · requestId · userId (or null) · action
 */

export interface LogContext {
  traceId?: string;
  requestId?: string;
  userId?: string | null;
  action?: string;
  [key: string]: unknown;
}

const { combine, timestamp, json, errors } = winston.format;

/**
 * Creates a structured JSON logger for a service.
 * @param serviceName - Used in the `service` field on every log line.
 */
export function createLogger(serviceName: string): winston.Logger {
  const logger = winston.createLogger({
    level: process.env['LOG_LEVEL'] ?? 'info',
    defaultMeta: { service: serviceName },
    format: combine(errors({ stack: true }), timestamp({ format: 'ISO' }), json()),
    transports: [
      new winston.transports.Console({
        silent: process.env['NODE_ENV'] === 'test',
      }),
    ],
  });

  return logger;
}

/**
 * Default logger instance — useful for quick imports.
 * Services should call createLogger(serviceName) for named loggers.
 */
export const logger = createLogger(process.env['SERVICE_NAME'] ?? 'unknown');
