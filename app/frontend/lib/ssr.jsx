import  { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import createEmotionCache from '~/lib/create_emotion_cache'

const components = import.meta.glob('~/components/**/*.(j|t)sx', { eager: true })

export function render(name, props) {
  const componentModule = components[`/components/${name}.jsx`] ?? components[`/components/${name}.tsx`]

  if(!componentModule) return null

  const Component = componentModule.default
  const content = renderToString(<StrictMode><Component {...props} /></StrictMode>)

  return { content }
}

export { createEmotionCache }
