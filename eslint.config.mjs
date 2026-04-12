import eslint from '@eslint/js';
import tslint from 'typescript-eslint';
import globals from 'globals';

export default tslint.config(
  eslint.configs.recommended,
  ...tslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    ignores: ['**/dist/**', '**/build/**', 'node_modules/**', 'docs/**'],
  },
  {
    files: ['**/scripts/**', '**/*.mjs', 'verify_*.ts', 'test_*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['webview-ui/src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: ['**/__tests__/**', '**/*.test.{ts,tsx}', '**/*.test.js', '**/*.test.jsx'],
    rules: {
      'no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
);
