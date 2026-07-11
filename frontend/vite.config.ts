import path from 'node:path'
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const configDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ command }) => ({
  // 로컬 개발 환경(serve)에서는 루트 경로('/')를 사용하고,
  // 깃허브 페이지 빌드(build) 환경에서만 레포지토리 이름('/golden-project/')을 사용합니다.
  base: command === 'serve' ? '/' : '/golden-project/',
  plugins: [react(), tailwindcss()],
  envDir: path.resolve(configDir, '..'),
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
  },
}))
