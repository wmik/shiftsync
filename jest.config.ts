/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/__tests__/unit/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/generated/prisma/client$': '<rootDir>/__tests__/__mocks__/prisma.ts',
    '^@/lib/db$': '<rootDir>/__tests__/__mocks__/db.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/helpers/setup-jest.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/generated/**',
    '!**/*.d.ts',
  ],
  testTimeout: 30000,
};
