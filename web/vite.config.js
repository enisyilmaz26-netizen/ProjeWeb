import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Production'da console.log ve debugger kaldırılır. console.error/warn
    // korunur — kullanıcının görmemesi gereken hassas bilgi içerebilir, ama
    // ErrorBoundary + crash diagnostics için gerekli.
    minify: 'esbuild',
  },
  esbuild: {
    pure: ['console.log', 'console.debug'],
    drop: ['debugger'],
  },
})
