import {defineConfig} from '@bfra.me/eslint-config'
import {name} from './package.json'

export default defineConfig({
  name,
  ignores: [
    '.ai/',
    '.github/chatmodes/**',
    '.github/instructions/**',
    '.github/copilot-instructions.md',
    'viewing-guide.md',
    'public/manifest.json', // PWA manifest, not browser extension
  ],
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  rules: {
    'no-use-before-define': 'off',
  },
})
