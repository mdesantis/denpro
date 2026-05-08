import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import createEmotionCache from '@/lib/create_emotion_cache'
import createEmotionServer from '@emotion/server/create-instance'

const components = import.meta.glob('@/components/**/*.{j,t}sx', { eager: true })

function render(argsJson) {
  const { name, props = {}, nonce } = JSON.parse(argsJson)

  if (!name) {
    return { error: 'Component name must be provided' }
  }

  const componentModule = components[`${__VITE_SOURCE_DIR__}/components/${name}.jsx`] ?? components[`${__VITE_SOURCE_DIR__}/components/${name}.tsx`]

  if (!componentModule) {
    return { error: `Component "${name}" not found` }
  }

  const Component = componentModule.default
  const emotionCache = createEmotionCache(nonce ? { nonce } : {})
  const { extractCriticalToChunks, constructStyleTagsFromChunks } = createEmotionServer(emotionCache)

  const content = renderToString(
    <StrictMode>
      <Component {...props} emotionCache={emotionCache} />
    </StrictMode>
  )

  const emotionChunks = extractCriticalToChunks(content)
  const emotionStyles = constructStyleTagsFromChunks(emotionChunks)

  return { content, emotionStyles }
}

globalThis.render = render
