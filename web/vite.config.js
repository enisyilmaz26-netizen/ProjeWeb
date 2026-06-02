import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

const sentryAuth = process.env.SENTRY_AUTH_TOKEN
const sentryOrg = process.env.SENTRY_ORG
const sentryProject = process.env.SENTRY_PROJECT
const uploadSourceMaps = Boolean(sentryAuth && sentryOrg && sentryProject)

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    ...(uploadSourceMaps
      ? [
          sentryVitePlugin({
            org: sentryOrg,
            project: sentryProject,
            authToken: sentryAuth,
            release: { name: pkg.version },
            sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
            telemetry: false,
          }),
        ]
      : []),
  ],
  build: {
    // Hidden source maps: dosya üretilir ama JS bundle'a //# sourceMappingURL eklenmez.
    // Sentry plugin yükler ve uploadtan sonra siler — kullanıcıya hiç ulaşmaz.
    sourcemap: uploadSourceMaps ? 'hidden' : false,
    minify: 'esbuild',
  },
  esbuild: {
    pure: ['console.log', 'console.debug'],
    drop: ['debugger'],
  },
})
