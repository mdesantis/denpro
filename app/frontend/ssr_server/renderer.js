import createEmotionServer from '@emotion/server/create-instance'

const isProduction = process.env.NODE_ENV === 'production'
// Warm up SSR entrypoint on production to prevent the first request to load it increasing its response time.
const serverRenderingModuleProduction = isProduction ? (await import('~/lib/ssr.jsx')) : null

// Add Vite or respective production middlewares
let vite

if (!isProduction) {
  const { createServer } = await import('vite')

  vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    base: '/'
  })
}

// Use vite's connect instance as middleware. If you use your own express router (`express.Router()`), you should use
// `router.use`.
//
// When the server restarts (for example after the user modifies vite.config.js), `vite.middlewares` will be reassigned.
// Calling `vite.middlewares` inside a wrapper handler ensures that the latest Vite middlewares are always used.
export const viteMiddleware = vite
  ? (req, res, next) => vite.middlewares.handle(req, res, next)
  : null

export async function ssrRoute(req, res) {
  try {
    let { name, props } = req.body

    if (!name) {
      res.status(400).json({ message: 'Component name must be provided' })
      return
    }
    if (!props) props = {}

    const serverRenderingModule = isProduction
      ? serverRenderingModuleProduction
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
      res.status(404).json({ error: { type: 'component_not_found', description } })
      return
    }

    const { content } = rendering
    // Grab the CSS from emotion
    const emotionChunks = extractCriticalToChunks(content)
    const emotionStyles = constructStyleTagsFromChunks(emotionChunks)

    res.json({ content, emotionStyles })
  } catch (error) {
    vite?.ssrFixStacktrace(error)

    const { message: description, stack } = error
    req.errorDescription = description

    res.status(500).json({ error: { description, stack } })
  }
}
