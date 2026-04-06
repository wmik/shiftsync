import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

beforeAll(() => {
  vi.mock('@/lib/db', () => ({
    prisma: {
      $connect: vi.fn(),
      $disconnect: vi.fn(),
    },
  }));
});

afterAll(() => {
  vi.clearAllMocks();
});
