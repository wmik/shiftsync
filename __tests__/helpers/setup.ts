import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import './mocks';

beforeAll(() => {
  vi.clearAllMocks();
});

afterAll(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});
