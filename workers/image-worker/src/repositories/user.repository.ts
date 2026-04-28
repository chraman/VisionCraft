import { prisma } from '../lib/prisma';

export const workerUserRepository = {
  async incrementGenerationsThisMonth(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        generationsThisMonth: { increment: 1 },
        version: { increment: 1 },
      },
    });
  },
};
