/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js'],
  clearMocks: true,
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { isolatedModules: true }],
  },
  collectCoverage: true,
  coverageReporters: ['json-summary', 'text', 'lcov'],
  maxWorkers: 2,
};
