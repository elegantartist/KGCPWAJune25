/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    
    // General rules
    'no-console': 'off', // Allow console in healthcare apps for audit trails
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    
    // Import/export rules
    'no-duplicate-imports': 'error',
  },
  overrides: [
    // Browser/React environments
    {
      files: ['apps/web/**/*', 'client/**/*'],
      env: {
        browser: true,
        es2022: true,
      },
      extends: [
        'eslint:recommended',
        '@typescript-eslint/recommended',
      ],
      rules: {
        'no-console': 'warn', // More restrictive in frontend
      },
    },
    // Node.js backend environments
    {
      files: ['services/**/*', 'server/**/*'],
      env: {
        node: true,
        es2022: true,
      },
      rules: {
        'no-console': 'off', // Allow console logs for audit trails
      },
    },
    // Configuration files
    {
      files: ['*.config.{js,ts,mjs}', '.eslintrc.{js,cjs}'],
      env: {
        node: true,
      },
    },
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '.next/',
    '*.min.js',
  ],
};