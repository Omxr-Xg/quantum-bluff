module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  /** Un seul worker : teardown Redis/DB partagé, supprime « worker failed to exit gracefully ». */
  maxWorkers: 1,
  /** Évite le message « Jest did not exit » (handles résiduels hors teardown). */
  forceExit: true,
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests.old/',
    '/services.old/',
    'test_cleanup\\.ts$'  // script manuel DA4 (nécessite DB), pas un test unitaire
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
  // 👇 SOLUTION : mapper les imports .js vers .ts
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': 'babel-jest',
  },
};