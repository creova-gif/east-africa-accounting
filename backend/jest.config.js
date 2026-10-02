/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  clearMocks: true,
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          esModuleInterop: true,
          isolatedModules: true,
          strict: true,
          module: 'commonjs',
          target: 'ES2022',
          types: ['node', 'jest'],
        },
      },
    ],
  },
};
