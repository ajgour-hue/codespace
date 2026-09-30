import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import * as httpProxy from 'http-proxy-3'

function dynamicAgentProxy() {
  const proxy = httpProxy.createProxyServer({
    changeOrigin: true,
    secure: false,
  })

  proxy.on('error', (err, req, res) => {
    console.error('AGENT PROXY ERROR:', err.message)

    if (
      res &&
      typeof res.writeHead === 'function' &&
      !res.headersSent
    ) {
      res.writeHead(502, {
        'Content-Type': 'application/json',
      })

      res.end(
        JSON.stringify({
          error: 'Agent proxy failed',
          message: err.message,
        })
      )
    }
  })

  proxy.on('proxyReq', (proxyReq, req) => {
    proxyReq.removeHeader('if-none-match')
    proxyReq.removeHeader('if-modified-since')

    proxyReq.setHeader(
      'cache-control',
      'no-cache'
    )

    console.log(
      'AGENT PROXY ->',
      req.method,
      req.url
    )
  })

  proxy.on('proxyRes', (proxyRes, req) => {
    delete proxyRes.headers.etag
    delete proxyRes.headers['last-modified']

    proxyRes.headers['cache-control'] =
      'no-store, no-cache, must-revalidate'

    console.log(
      'AGENT RESPONSE <-',
      proxyRes.statusCode,
      req.url
    )
  })

  return {
    name: 'dynamic-agent-proxy',

    configureServer(server) {

      // =========================
      // HTTP
      // =========================

      server.middlewares.use((req, res, next) => {
        const url = req.url || ''

        if (!url.startsWith('/agent/')) {
          return next()
        }

        const match = url.match(
          /^\/agent\/([^/]+)(\/.*)?$/
        )

        if (!match) {
          return next()
        }

        const sandboxId = match[1]
        const agentPath = match[2] || '/'

        const target =
          `http://${sandboxId}.agent.localhost`

        console.log('')
        console.log('==============================')
        console.log('AGENT HTTP PROXY')
        console.log('Sandbox:', sandboxId)
        console.log('Target :', target)
        console.log('Path   :', agentPath)
        console.log('==============================')

        // Remove /agent/<sandboxId>
        req.url = agentPath

        proxy.web(req, res, {
          target,
          changeOrigin: true,
          secure: false,
        })

        return
      })

      // =========================
      // WEBSOCKET / SOCKET.IO
      // =========================

      server.httpServer?.on(
        'upgrade',
        (req, socket, head) => {

          const url = req.url || ''

          if (!url.startsWith('/agent/')) {
            return
          }

          const match = url.match(
            /^\/agent\/([^/]+)(\/.*)?$/
          )

          if (!match) {
            return
          }

          const sandboxId = match[1]
          const agentPath = match[2] || '/'

          const target =
            `http://${sandboxId}.agent.localhost`

          console.log('')
          console.log('==============================')
          console.log('AGENT WEBSOCKET PROXY')
          console.log('Sandbox:', sandboxId)
          console.log('Target :', target)
          console.log('Path   :', agentPath)
          console.log('==============================')

          req.url = agentPath

          proxy.ws(
            req,
            socket,
            head,
            {
              target,
              changeOrigin: true,
              secure: false,
            }
          )
        }
      )
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    dynamicAgentProxy(),
  ],

  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,

    // Disable Vite HMR WebSocket

    hmr: false,
    ws: false,

    proxy: {
      '/api': {
        target: 'http://127.0.0.1:80',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})