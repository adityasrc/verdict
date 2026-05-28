import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Context files export both a Provider component and a hook — this is standard practice
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Calling setState inside an effect is intentional in the socket context
      'react-hooks/set-state-in-effect': 'off',
      // Allow explicit any where needed
      '@typescript-eslint/no-explicit-any': 'off',
      // Ignore catch variables (e.g. _error)
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
])
