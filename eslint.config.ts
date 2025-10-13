import {defineConfig} from '@bfra.me/eslint-config'
import {name} from './package.json'

export default defineConfig(
  {
    name,
    ignores: [
      '.ai/',
      '.github/chatmodes/**',
      '.github/instructions/**',
      '.github/copilot-instructions.md',
      'viewing-guide.md',
      'public/manifest.json', // PWA manifest, not browser extension
    ],
    typescript: true,
    rules: {
      'no-use-before-define': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
    },
  },
  {
    name: 'logger console output',
    files: ['src/modules/logger.ts'],
    rules: {
      'no-console': ['error', {allow: ['warn', 'error', 'info']}],
    },
  },
)
