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
  ],
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
})
