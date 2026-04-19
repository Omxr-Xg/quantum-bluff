import globals from "globals";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactRefresh from "eslint-plugin-react-refresh";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "android/**",
      "ios/**",
      "playwright-report/**",
      "test-results/**",
      "coverage/**",
      "preload.js",
      "electron.js",
      "electron.cjs",
      "vite.config.ts",
      "vite.config.d.ts",
      "**/*.test.ts",
      "**/*.test.tsx",
      "src/__tests__/**",
      "src/test/**",
      "example.test.tsx"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      "react-refresh": reactRefresh,
    },
    rules: {
      // Contextes / UI partagent hooks + composants — avertissements permanents sans gain ici
      "react-refresh/only-export-components": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["electron.js", "electron.cjs"],
    languageOptions: {
      globals: {
        ...globals.node,
        require: "readonly",
        process: "readonly",
        module: "readonly",
        __dirname: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "no-undef": "off",
    },
  }
);
