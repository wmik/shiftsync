import '@testing-library/jest-dom';

jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    account: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
    },
    session: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    location: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
    },
    skill: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
    },
    certification: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    availability: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    availability_exception: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    shift: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    shift_assignment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    swap_request: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    drop_request: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    notification: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    audit_log: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $executeRawUnsafe: jest.fn(),
  },
}));

afterAll(() => {
  jest.clearAllMocks();
});
