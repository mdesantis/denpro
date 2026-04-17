import express from 'express'
import loggerMiddleware from './ssr_server/logger.js'
import { viteMiddleware, ssrRoute } from './ssr_server/renderer.js'

const listenToUnixSocket = process.env.VITE_SSR_SERVER_LISTEN_TO_UNIX_SOCKET
const unixSocket = process.env.VITE_SSR_SERVER_UNIX_SOCKET || '/tmp/vite_ssr_server.sock'
const host = process.env.VITE_SSR_SERVER_HOST || '0.0.0.0'
const port = process.env.VITE_SSR_SERVER_PORT || 5173

const app = express()

app.use((req, _res, next) => { req.id = req.headers['x-request-id'] || crypto.randomUUID(); next() })
app.use(loggerMiddleware)
if (viteMiddleware) app.use(viteMiddleware)
app.use(express.json({ limit: '20mb' }))

app.get('/up', (_req, res) => res.status(204).send())
app.post('/ssr', ssrRoute)

let server

// Start http server
if (listenToUnixSocket) {
  const { unlink } = await import('node:fs/promises')

  try {
    await unlink(unixSocket)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }

  server = app.listen(unixSocket, () => {
    console.log(`Listening on unix://${unixSocket}`)
    console.log('Use Ctrl-C to stop')
  })
} else {
  server = app.listen(port, host, () => {
    console.log(`Listening on http://${host}:${port}`)
    console.log('Use Ctrl-C to stop')
  })
}

process.on('SIGINT', () => {
  console.log('- Gracefully stopping, waiting for requests to finish')
  server.close(() => {
    console.log('- Goodbye!')
    console.log('Exiting')
    process.exit()
  })
})
