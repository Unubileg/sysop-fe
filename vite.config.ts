import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Pin to 5173: it is the control-plane's default DASHBOARD_ORIGIN, so
    // credentialed CORS only works here. strictPort fails loudly instead of
    // silently drifting to 5174+ (which would break the session cookie).
    port: 5173,
    strictPort: true,
  },
})
