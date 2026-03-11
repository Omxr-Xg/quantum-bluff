module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',

  roots: ['<rootDir>/src'],

  testMatch: ['**/__tests__/**/*.test.ts'],

  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests.old/',
    '/services.old/',
    '/dist/',
    '/src/generated/'
  ],

  extensionsToTreatAsEsm: ['.ts'],

  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.json'
      }
    ]
  },

  moduleFileExtensions: ['ts', 'js', 'json'],

  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },

  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/tests.old/**',
    '!src/services.old/**',
    '!src/generated/**',
    '!src/run-tests.manual.ts',
    '!src/test-utils.ts'
  ],

  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'cobertura'],

  reporters: [
    'default',
    ['jest-junit', { outputDirectory: './', outputName: 'junit.xml' }]
  ]
};