import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        project: ["./tsconfig.json", "./tsconfig.test.json"]
      },
      globals: {
        node: true,
        jest: true,
        es6: true
      }
    },
    plugins: {
      "@typescript-eslint": tseslint
    },
    rules: {
      "no-warning-comments": "error",
      "no-inline-comments": "error",
      "multiline-comment-style": ["error", "starred-block"],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-function-return-type": "error"
    }
  }
]; 