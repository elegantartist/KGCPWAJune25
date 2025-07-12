export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: {
        module: 'esnext',
        moduleResolution: 'node'
      }
    }
  },
  // Corrected property name from moduleNameMapping to moduleNameMapper
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  // Force Jest to transform TypeScript files
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true }]
  },
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  collectCoverageFrom: [
    '<rootDir>/**/*.ts',
    '!<rootDir>/tests/**',
    '!<rootDir>/node_modules/**'
  ],
  // Ensure Jest resolves modules correctly
  resolver: undefined,
  moduleFileExtensions: ['ts', 'js', 'json'],
  // Critical: Tell Jest to handle ESM imports properly
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ]
};
