/*
  Warnings:

  - A unique constraint covering the columns `[oauthProvider,oauthProviderId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "oauthProvider" TEXT,
ADD COLUMN     "oauthProviderId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_oauthProvider_oauthProviderId_key" ON "users"("oauthProvider", "oauthProviderId");
