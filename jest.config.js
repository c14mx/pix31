module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest']
  },
  moduleNameMapper: {
    '^@lib/(.*)$': '<rootDir>/src/lib/$1'
  },
  roots: ['<rootDir>/src'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
}; 