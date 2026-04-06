import { beforeAll, afterAll, vi } from 'vitest';

const mockPrisma = {
  user: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  account: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
  session: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  location: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
  skill: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
  certification: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  availability: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  availability_exception: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  shift: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  shift_assignment: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  swap_request: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  drop_request: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  notification: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  audit_log: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
  manager_location: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  $executeRawUnsafe: vi.fn(),
};

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}));

vi.mock('@/generated/prisma', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

beforeAll(() => {
  vi.clearAllMocks();
});

afterAll(() => {
  vi.restoreAllMocks();
});

export { mockPrisma };
