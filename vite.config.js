import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const plugins = [react()]

  // Only use basicSsl in local dev (not during production build)
  if (command === 'serve') {
    import('@vitejs/plugin-basic-ssl').then(mod => {
      // basicSsl is loaded dynamically for dev only
    }).catch(() => {
      console.warn('basicSsl plugin not available, skipping HTTPS for dev server')
    })
  }

  return {
    plugins,
    server: {
      // Proxy only works in dev mode — in production, VITE_API_BASE_URL points to Render
      proxy: {
        '/api': {
          target: 'http://localhost:4000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
