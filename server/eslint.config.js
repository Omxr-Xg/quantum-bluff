import globals from "globals";
import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

const tsRecommendedRules = {
  ...tsPlugin.configs.recommended.rules,
  "@typescript-eslint/no-unused-vars": ["error", {
    argsIgnorePattern: "^_",
    varsIgnorePattern: "^_"
  }],
  "@typescript-eslint/explicit-function-return-type": "off",
  "@typescript-eslint/no-require-imports": "off",
  "no-undef": "off"
};

export default [
  {
    ignores: [
      "dist/",
      "node_modules/",
      "src/generated/**",
      "coverage/",
      "**/*.config.js",
      "**/*.config.cjs"
    ]
  },
  js.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module"
      },
      globals: {
        ...globals.node,
        ...globals.jest,
        ...globals.es2021
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin
    },
    rules: {
      ...tsRecommendedRules,
      "@typescript-eslint/no-explicit-any": "warn"
    }
  },
  // Tests : mocks et fixtures utilisent souvent `any`
  {
    files: [
      "**/__tests__/**/*.ts",
      "**/*.integration.test.ts",
      "**/*.test.ts"
    ],
    plugins: {
      "@typescript-eslint": tsPlugin
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off"
    }
  }
];
