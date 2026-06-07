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
  /** Périmètre « logique métier » testable unitairement (hors I/O massifs listés). */
  collectCoverageFrom: [
    'src/logic/**/*.ts',
    '!src/logic/belote/types.ts',
    '!src/logic/botAI.ts',
    '!src/logic/blackjackSessionStore.ts',
    /** Tables runtime volumineuses : couvertes par tests dédiés (`CashGameController.seats`, blackjack), hors métrique globale. */
    '!src/logic/CashGameController.ts',
    '!src/logic/BlackjackTableController.ts',
    'src/tournament/bracket/**/*.ts',
    'src/tournament/tournament.entryFee.ts',
    'src/tournament/tournament.constants.ts',
    'src/tournament/tournament.create.validation.ts',
    'src/tournament/tournament.seed.ts',
    'src/tournament/tournament.reward.service.ts',
    'src/tournament/tournament.gatewayHook.ts',
    'src/utils/chips.ts',
    'src/utils/antiCheat.ts',
    'src/utils/avatarUrl.ts',
    'src/utils/secretAnswer.ts',
    'src/validation/**/*.ts',
    'src/referral/**/*.ts',
    '!src/referral/**/__tests__/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'cobertura'],
  coverageThreshold: {
    global: {
      lines: 80,
      statements: 80,
      functions: 80,
      /** Les branches restent plus basses (schemas Zod, poker runtime). */
      branches: 65,
    },
  },
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