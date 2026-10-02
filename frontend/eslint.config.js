import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import react from 'eslint-plugin-react'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: { react },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // ESLint's core scope analysis does not treat a JSX element name as a
      // reference, so `({ icon: Icon }) => <Icon />` was reported as an unused
      // arg. These two rules mark JSX-referenced identifiers as used, which
      // keeps the react-refresh pattern of passing components as props working
      // without weakening no-unused-vars.
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error',
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  // Build-time config files run in Node, not the browser.
  {
    files: ['*.config.js', 'eslint.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  // Service worker: a classic worker script, so it gets WorkerGlobalScope
  // globals (`self`, `caches`, `clients`, ...) instead of browser ones.
  {
    files: ['public/**/*.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        ...globals.serviceworker,
        // LocalStorageStorage and friends are not part of a worker scope, but
        // the offline shell documents intent through them; keeping them out of
        // scope would be noise. Declare the standard worker extras explicitly.
        AbortController: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        URL: 'readonly',
      },
    },
  },
])
