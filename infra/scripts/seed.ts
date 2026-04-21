/* eslint-disable no-console -- Seed script is a CLI tool; stdout feedback is intentional */
/**
 * Seed script — creates test data for local development.
 * Run: pnpm seed (from infra/scripts/)
 *
 * Seeds:
 * - 3 users (free tier / pro tier / admin role)
 * - 2 collections
 * - 5 images with realistic fake data
 */

import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

// Simulated bcrypt hash for "password123" — replace with real bcrypt in production
const FAKE_PASSWORD_HASH = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TieOcZR5kA1VbEEi0LfkDO7AYp5u';

async function main() {
  console.log('🌱 Starting seed...');

  // ─── Clean existing data ───────────────────────────────────────────────────
  await prisma.analyticsEvent.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.savedImage.deleteMany();
  await prisma.image.deleteMany();
  await prisma.generationJob.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.authToken.deleteMany();
  await prisma.user.deleteMany();

  console.log('✓ Cleaned existing data');

  // ─── Create users ─────────────────────────────────────────────────────────

  const freeUser = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      name: 'Alice Freeman',
      passwordHash: FAKE_PASSWORD_HASH,
      role: 'user',
      tier: 'free',
      isPublic: false,
      emailVerifiedAt: new Date(),
      generationsThisMonth: 3,
      quotaResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const proUser = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      name: 'Bob Studio',
      passwordHash: FAKE_PASSWORD_HASH,
      role: 'user',
      tier: 'pro',
      isPublic: true,
      emailVerifiedAt: new Date(),
      generationsThisMonth: 47,
      quotaResetAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Admin User',
      passwordHash: FAKE_PASSWORD_HASH,
      role: 'admin',
      tier: 'enterprise',
      isPublic: false,
      emailVerifiedAt: new Date(),
      generationsThisMonth: 0,
      quotaResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  console.log(
    `✓ Created 3 users (free: ${freeUser.email}, pro: ${proUser.email}, admin: ${adminUser.email})`
  );

  // ─── Create collections ───────────────────────────────────────────────────

  const collection1 = await prisma.collection.create({
    data: {
      userId: proUser.id,
      name: 'Landscapes',
      description: 'AI-generated landscape scenes',
      imageCount: 0,
    },
  });

  const collection2 = await prisma.collection.create({
    data: {
      userId: proUser.id,
      name: 'Portraits',
      description: 'Digital portrait artwork',
      imageCount: 0,
    },
  });

  console.log(`✓ Created 2 collections for ${proUser.email}`);

  // ─── Create generation jobs + images ─────────────────────────────────────

  const imageData = [
    {
      prompt: 'A majestic mountain landscape at golden hour, photorealistic, 8k',
      model: 'sdxl',
      provider: 'stability-ai',
      collectionId: collection1.id,
    },
    {
      prompt: 'Cyberpunk city street at night, neon lights, rain reflections, cinematic',
      model: 'sdxl',
      provider: 'stability-ai',
      collectionId: null,
    },
    {
      prompt: 'Portrait of a wise old wizard, detailed oil painting style, fantasy art',
      model: 'dalle3',
      provider: 'openai',
      collectionId: collection2.id,
    },
    {
      prompt: 'Abstract geometric shapes, vibrant colors, digital art, minimalist',
      model: 'sdxl',
      provider: 'stability-ai',
      collectionId: null,
    },
    {
      prompt: 'Enchanted forest with glowing mushrooms and fairy lights, magical atmosphere',
      model: 'sdxl',
      provider: 'stability-ai',
      collectionId: collection1.id,
    },
  ];

  let imageCount = 0;
  for (const data of imageData) {
    const jobId = faker.string.uuid();
    const imageId = faker.string.uuid();

    await prisma.generationJob.create({
      data: {
        id: jobId,
        userId: proUser.id,
        type: 'TEXT2IMG',
        status: 'COMPLETED',
        prompt: data.prompt,
        model: data.model,
        aspectRatio: '1:1',
        quality: 'standard',
        startedAt: faker.date.recent({ days: 7 }),
        completedAt: faker.date.recent({ days: 7 }),
      },
    });

    await prisma.image.create({
      data: {
        id: imageId,
        userId: proUser.id,
        jobId: jobId,
        url: `https://s3.ap-south-1.amazonaws.com/prod-ai-images-generated/${proUser.id}/2025/01/${jobId}.webp`,
        cdnUrl: `https://cdn.example.com/${proUser.id}/2025/01/${jobId}.webp`,
        prompt: data.prompt,
        model: data.model,
        provider: data.provider,
        isSaved: data.collectionId !== null,
        collectionId: data.collectionId,
        width: 1024,
        height: 1024,
        seed: faker.number.int({ min: 1000000, max: 9999999 }),
      },
    });

    imageCount++;
  }

  // Update collection image counts
  await prisma.collection.update({
    where: { id: collection1.id },
    data: { imageCount: 2 },
  });

  await prisma.collection.update({
    where: { id: collection2.id },
    data: { imageCount: 1 },
  });

  console.log(`✓ Created ${imageCount} images with generation jobs for ${proUser.email}`);

  // ─── Create audit log entries ─────────────────────────────────────────────

  await prisma.auditLog.createMany({
    data: [
      {
        userId: freeUser.id,
        action: 'LOGIN',
        ipAddress: '192.168.1.1',
        details: { method: 'email' },
      },
      {
        userId: proUser.id,
        action: 'LOGIN',
        ipAddress: '10.0.0.1',
        details: { method: 'google-oauth' },
      },
      {
        userId: adminUser.id,
        action: 'LOGIN',
        ipAddress: '127.0.0.1',
        details: { method: 'email' },
      },
    ],
  });

  console.log('✓ Created audit log entries');

  console.log('\n🎉 Seed complete!');
  console.log('\nTest accounts:');
  console.log('  Free tier:    alice@example.com / password123');
  console.log('  Pro tier:     bob@example.com   / password123');
  console.log('  Admin:        admin@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
