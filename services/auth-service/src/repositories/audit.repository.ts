import type { AuditAction, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export type AuditLogData = {
  userId?: string;
  action: AuditAction;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
};

export const auditRepository = {
  async log(data: AuditLogData): Promise<void> {
    // Fire-and-forget — don't await to keep request latency low
    prisma.auditLog
      .create({
        data: {
          action: data.action,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          details: data.details as Prisma.InputJsonValue | undefined,
          ...(data.userId ? { userId: data.userId } : {}),
        },
      })
      .catch(() => {
        // Audit log failures are non-fatal
      });
  },
};
