import express from 'express'
import createEmotionServer from '@emotion/server/create-instance'
import requestID from 'express-request-id'
import morgan from 'morgan'

const isProduction = process.env.NODE_ENV === 'production'
const listenToUnixSocket = process.env.VITE_SSR_SERVER_LISTEN_TO_UNIX_SOCKET
const unixSocket = process.env.VITE_SSR_SERVER_UNIX_SOCKET || '/tmp/vite_ssr_server.sock'
const host = process.env.VITE_SSR_SERVER_HOST || '0.0.0.0'
const port = process.env.VITE_SSR_SERVER_PORT || 5173
const app = express()

morgan.token('id', (req) => req.id)
morgan.token('error', (req) => req.errorDescription)

const morganGetDateToken = morgan['date']

morgan.token('date', (req, res, format) => {
  switch (format || 'web') {
    case 'clf':
    case 'iso':
    case 'web':
      return morganGetDateToken(req, res, format)
    case 'ruby': // Ruby's `Time.now.to_s` format
      const isoDateParts = new Date().toISOString().split('T')
      const ymd = isoDateParts[0]
      const hms = isoDateParts[1].split('.')[0]
      return `${ymd} ${hms} +0000`
  }
})

app.use(requestID({ setHeader: false }))

app.use(morgan(
  "I, [:date[iso]]  INFO -- : [:id] Started :method \":url\" for :remote-addr at :date[ruby]",
  { immediate: true }
))
app.use(morgan(
  "I, [:date[iso]]  INFO -- : [:id] Completed :status in :response-time[0] ms",
  { skip: (_req, res) => res.statusCode >= 400 }
))
app.use(morgan(
  "E, [:date[iso]] ERROR -- : [:id] :error for :remote-addr",
  { skip: (_req, res) => res.statusCode < 400 }
))
app.use(express.json({ limit: '20mb' }))

// Add Vite or respective production middlewares
let vite

if (!isProduction) {
  const { createServer } = await import('vite')

  vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    base: '/'
  })

  // Use vite's connect instance as middleware. If you use your own
  // express router (express.Router()), you should use router.use
  app.use((req, res, next) => {
    // When the server restarts (for example after the user modifies
    // vite.config.js), `vite.middlewares` will be reassigned. Calling
    // `vite.middlewares` inside a wrapper handler ensures that the
    // latest Vite middlewares are always used.
    vite.middlewares.handle(req, res, next)
  })
}

app.get('/up', (_req, res) => res.status(204).send())

app.post('/ssr', async (req, res) => {
  try {
    let { name, props } = req.body

    if (!name) {
      res.status(400).json({ message: 'Component name must be provided' })
      return
    }
    if (!props) props = {}

    const serverRenderingModule = isProduction
      ? (await import('~/lib/ssr.jsx'))
      : (await vite.ssrLoadModule('~/lib/ssr.jsx'))

    const { render, createEmotionCache } = serverRenderingModule

    const emotionCache = createEmotionCache()
    const { extractCriticalToChunks, constructStyleTagsFromChunks } = createEmotionServer(emotionCache)

    props.emotionCache = emotionCache

    // Render the component to a string
    const rendering = render(name, props)

    if (!rendering) {
      const description = `Component "${name}" not found`
      req.errorDescription = description
      res.status(404).json({ error: { description } })
      return
    }

    const { content } = rendering

    // Grab the CSS from emotion
    const emotionChunks = extractCriticalToChunks(content)
    const emotionStyles = constructStyleTagsFromChunks(emotionChunks)

    res.json({ content, emotionStyles });
  } catch (error) {
    vite?.ssrFixStacktrace(error)

    const { message: description, stack } = error
    req.errorDescription = description

    res.status(500).json({ error: { description, stack } })
  }
})

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
