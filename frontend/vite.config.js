import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'
import packageJson from './package.json' with { type: 'json' }

const commitSha =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? ''

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version),
    'import.meta.env.VITE_APP_COMMIT_SHA': JSON.stringify(commitSha),
  },
})
