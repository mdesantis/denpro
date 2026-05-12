import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import createEmotionCache from '@/lib/create_emotion_cache'
import createEmotionServer from '@emotion/server/create-instance'
import { __ssrComponentsDemos } from './__ssr_imports__'

const components = __ssrComponentsDemos

function render(argsJson: string): { content: string; emotionStyles: string } | { error: string } {
  const { name, props = {}, nonce }: { name?: string; props?: Record<string, unknown>; nonce?: string } = JSON.parse(argsJson)

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
  const emotionStyles = constructStyleTagsFromChunks(emotionChunks).replace(
    /<style /g,
    '<style data-turbo-track="reload" '
  )

  return { content, emotionStyles }
}

globalThis.render = render
