import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repositoryName = globalThis.process?.env.GITHUB_REPOSITORY?.split('/')[1] || ''
const isUserOrOrgPages = repositoryName.endsWith('.github.io')

// https://vite.dev/config/
export default defineConfig({
  base: repositoryName && !isUserOrOrgPages ? `/${repositoryName}/` : '/',
  plugins: [react()],
})
