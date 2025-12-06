import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Use a function config so we can read env vars (mode aware)
export default ({ mode }) => {
  // Load environment variables prefixed from .env files
  const env = loadEnv(mode, process.cwd(), '')
  // If SOURCE_MAPS is set to 'true', generate full maps and reference them.
  // Otherwise, for production default to 'hidden' maps (generated but not referenced).
  const enableSourceMaps = env.SOURCE_MAPS === 'true'
  const isDev = mode === 'development'

  return defineConfig({
    plugins: [react()],

    // build.sourcemap accepts: true | false | 'hidden'
    build: {
      sourcemap: enableSourceMaps ? true : (isDev ? true : 'hidden')
    },

    css: {
      // Enable CSS sourcemaps in dev; in production allow toggle via SOURCE_MAPS
      devSourcemap: isDev || enableSourceMaps
    },

    esbuild: {
      sourcemap: enableSourceMaps || isDev
    },

    server: {
      port: 3000,
      proxy: {
        '/api': 'http://localhost:8080',
        '/ws': {
          target: 'ws://localhost:8080',
          ws: true
        },
        '/images': {
          target: 'http://localhost:8080',
          changeOrigin: true
        }
      }
    }
  })
}

