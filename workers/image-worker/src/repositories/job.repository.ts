import { prisma } from '../lib/prisma';

export const workerJobRepository = {
  async markProcessing(jobId: string): Promise<void> {
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING', startedAt: new Date(), version: { increment: 1 } },
    });
  },

  async markCompleted(jobId: string): Promise<void> {
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', completedAt: new Date(), version: { increment: 1 } },
    });
  },

  async markFailed(jobId: string, errorMessage: string): Promise<void> {
    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorMessage,
        version: { increment: 1 },
      },
    });
  },
};
