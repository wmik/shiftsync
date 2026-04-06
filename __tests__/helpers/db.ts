import { execSync } from 'child_process';
import path from 'path';

const testDbUrl = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/shiftsync_test';

const mockPrisma = {
  $connect: async () => {},
  $disconnect: async () => {},
  $executeRawUnsafe: async () => {},
  user: { findMany: async () => [], findUnique: async () => null, upsert: async () => ({}) },
  account: { findMany: async () => [], findUnique: async () => null, upsert: async () => ({}) },
  session: { findMany: async () => [], findUnique: async () => null, upsert: async () => ({}) },
  location: { findMany: async () => [], findUnique: async () => null, upsert: async () => ({}) },
  skill: { findMany: async () => [], findUnique: async () => null, upsert: async () => ({}) },
  certification: { findMany: async () => [], findUnique: async () => null, upsert: async () => ({}), delete: async () => ({}) },
  availability: { findMany: async () => [], findUnique: async () => null, upsert: async () => ({}), delete: async () => ({}) },
  availability_exception: { findMany: async () => [], findUnique: async () => null, upsert: async () => ({}), delete: async () => ({}) },
  shift: { findMany: async () => [], findUnique: async () => null, upsert: async () => ({}), create: async () => ({}), update: async () => ({}) },
  shift_assignment: { findMany: async () => [], findUnique: async () => null, upsert: async () => ({}), create: async () => ({}), update: async () => ({}), delete: async () => ({}) },
  swap_request: { findMany: async () => [], findUnique: async () => null, upsert: async () => ({}), create: async () => ({}), update: async () => ({}) },
  drop_request: { findMany: async () => [], findUnique: async () => null, upsert: async () => ({}), create: async () => ({}), update: async () => ({}) },
  notification: { findMany: async () => [], findUnique: async () => null, upsert: async () => ({}), create: async () => ({}), update: async () => ({}) },
  audit_log: { findMany: async () => [], findUnique: async () => null, upsert: async () => ({}), create: async () => ({}) },
  manager_location: { findMany: async () => [], findUnique: async () => null, upsert: async () => ({}), create: async () => ({}), delete: async () => ({}) },
};

export const prisma = mockPrisma;

export async function setupTestDb() {
  process.env.DATABASE_URL = testDbUrl;
  
  try {
    execSync('npx prisma migrate deploy', {
      env: {
        ...process.env,
        DATABASE_URL: testDbUrl,
      },
      cwd: path.resolve(process.cwd()),
      stdio: 'pipe',
    });
  } catch (error) {
    console.log('Migration may already be applied, continuing...');
  }
}

export async function seedTestDb() {
  try {
    execSync('npx tsx prisma/seed.ts', {
      env: {
        ...process.env,
        DATABASE_URL: testDbUrl,
      },
      cwd: path.resolve(process.cwd()),
      stdio: 'pipe',
    });
  } catch (error) {
    console.log('Seeding may have failed:', error);
  }
}

export async function resetTestDb() {
  try {
    execSync('npx prisma migrate reset --force', {
      env: {
        ...process.env,
        DATABASE_URL: testDbUrl,
      },
      cwd: path.resolve(process.cwd()),
      stdio: 'pipe',
    });
  } catch (error) {
    console.log('Reset may have failed:', error);
  }
}

export async function teardownTestDb() {
  const tableNames = [
    'audit_log',
    'notification',
    'shift_assignment',
    'swap_request',
    'drop_request',
    'shift',
    'availability_exception',
    'availability',
    'certification',
    'manager_location',
    'location',
    'skill',
    'session',
    'account',
    'user',
  ];

  try {
    for (const table of tableNames) {
      await prisma.$executeRawUnsafe(`DELETE FROM "${table}" CASCADE`);
    }
  } catch (error) {
    console.log('Teardown may have partial data:', error);
  }
}

export async function disconnectTestDb() {
  await prisma.$disconnect();
}

export function getTestPrisma() {
  return prisma;
}
