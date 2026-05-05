-- AlterEnum
ALTER TYPE "GenerationJobType" ADD VALUE 'INFLUENCER';

-- AlterTable
ALTER TABLE "generation_jobs" ADD COLUMN     "influencerId" TEXT;

-- AlterTable
ALTER TABLE "images" ADD COLUMN     "influencerId" TEXT;

-- CreateTable
CREATE TABLE "influencers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sourceImageUrl" TEXT,
    "characterDna" JSONB NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "influencers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "influencers_userId_idx" ON "influencers"("userId");

-- CreateIndex
CREATE INDEX "influencers_userId_createdAt_idx" ON "influencers"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "influencers_deletedAt_idx" ON "influencers"("deletedAt");

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "influencers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "influencers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "influencers" ADD CONSTRAINT "influencers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
