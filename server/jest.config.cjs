module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],  // ← Utiliser src, pas dist
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],  // ← Fichiers .ts
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests.old/',
    '/services.old/'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/tests.old/**',
    '!src/services.old/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'cobertura'],
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: './', outputName: 'junit.xml' }]
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',  // ← Supprime l'extension .js dans les imports
  },
};