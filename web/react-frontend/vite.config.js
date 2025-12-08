import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Use a function config so we can read env vars (mode aware)
export default ({ mode }) => {
  // Load environment variables from .env files
  const env = loadEnv(mode, process.cwd(), '')
  // Vite env: expected `VITE_API_HOST` like `http://backend-host:8080`
  const apiHost = env.VITE_API_HOST || 'http://localhost:3001'
  // Route static images to nginx. Configure via VITE_NGINX_HOST (e.g. http://nginx-host:80).
  const nginxHost = env.VITE_NGINX_HOST || 'http://localhost:8080'
  const toWsTarget = (host) => {
    if (host.startsWith('https://')) return host.replace(/^https:\/\//, 'wss://')
    if (host.startsWith('http://')) return host.replace(/^http:\/\//, 'ws://')
    return host
  }
  // If SOURCE_MAPS is set to 'true', generate full maps and reference them.
  // Otherwise, for production default to 'hidden' maps (generated but not referenced).
  const enableSourceMaps = env.SOURCE_MAPS === 'true'
  const isDev = mode === 'development'

  const base = "./";

  return defineConfig({
    base: base, 
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

    publicDir: isDev ? 'public' : false,

    server: {
      port: 3000,
      proxy: {
        '/api': apiHost,
        '/ws': {
          target: toWsTarget(apiHost),
          ws: true
        },
        // Serve static images via nginx so caching / headers can be handled there.
        '/static/images': {
          target: nginxHost,
          changeOrigin: true,
          // If your nginx uses HTTPS with self-signed certs in dev, you may set secure: false
          // secure: false
        }
      }
    }
  })
}

