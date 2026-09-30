import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],

  // server: {
  //   host: '0.0.0.0',
  //   port: 5173,
  //   allowedHosts: true,

  //   watch: {
  //     usePolling: true,
  //     interval: 300,
  //     ignored: ['node_modules'],
  //   },
  // },

  server: {
  host: '0.0.0.0',
  port: 5173,
  allowedHosts: true,

  hmr: {
    protocol: 'wss',
    clientPort: 443,
  },

  watch: {
    usePolling: true,
    interval: 1000,
    ignored: ['**/node_modules/**'],
  },
},
})