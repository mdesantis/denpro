import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import createEmotionCache from '@/lib/create_emotion_cache'

interface BodyWithReactRoots extends HTMLBodyElement {
  reactComponentRoots?: Array<{ unmount: () => void }>
}

export default class TurboReact {
  components: Record<string, any>
  componentsRootDir: string

  constructor({ components, componentsRootDir = '' }: { components: Record<string, any>; componentsRootDir?: string }) {
    this.componentsRootDir = componentsRootDir
    this.components = components
  }

  start(): void {
    this.mountComponents(document.body as BodyWithReactRoots)
    window.addEventListener('turbo:before-render', this.turboReactBeforeRender.bind(this) as EventListener)
  }

  mountComponents(bodyElement: BodyWithReactRoots): void {
    bodyElement.reactComponentRoots = []
    const componentRoots = bodyElement.getElementsByClassName('react-component-root')

    for (const componentRoot of componentRoots) {
      this.mountComponent(componentRoot as HTMLElement, bodyElement)
    }
  }

  unmountComponents(bodyElement: BodyWithReactRoots): void {
    const componentRoots = bodyElement.reactComponentRoots

    if (!componentRoots) return

    for (const componentRoot of componentRoots) {
      componentRoot.unmount()
    }

    delete bodyElement.reactComponentRoots
  }

  async mountComponent(rootElement: HTMLElement, bodyElement: BodyWithReactRoots): Promise<void> {
    const name = rootElement.getAttribute('data-react-component-name')
    const rawProps = rootElement.getAttribute('data-react-component-props')
    const props: Record<string, unknown> = JSON.parse(rawProps!)
    const lazyComponentModule = this.components[`${this.componentsRootDir}/components/${name}.jsx`] ?? this.components[`${this.componentsRootDir}/components/${name}.tsx`]

    if(!lazyComponentModule || !name) {
      throw new Error(`[TurboReact] Missing component with name: "${name}"`)
    }

    const Component: React.ComponentType<any> = (await lazyComponentModule()).default

    let reactRoot: ReturnType<typeof createRoot>

    if (rootElement.getAttribute('data-turbo-react-ssr')) {
      reactRoot = hydrateRoot(rootElement, <StrictMode><Component {...props} emotionCache={createEmotionCache()} /></StrictMode>)
    } else {
      reactRoot = createRoot(rootElement)
      reactRoot.render(<StrictMode><Component {...props} emotionCache={createEmotionCache()} /></StrictMode>)
    }

    bodyElement.reactComponentRoots!.push(reactRoot)
  }

  turboReactBeforeRender(event: TurboBeforeRenderEvent): void {
    event.detail.render = this.turboReactRenderFn(event).bind(this)
  }

  turboReactRenderFn(_event: TurboBeforeRenderEvent): (currentBodyElement: Element, newBodyElement: Element) => Promise<void> {
    return async (currentBodyElement: Element, newBodyElement: Element): Promise<void> => {
      // The event "turbo:before-render" is triggered twice when turbo cache is hit. The first time, the document
      // element has `data-turbo-preview` attribute, and the second time it does not. We avoid rendering twice by
      // skipping the case where `data-turbo-preview` is present. A more refined approach could be developed later,
      // which would allow mounting of React components during the preview and remount them only if the cache is stale.
      if (document.documentElement.hasAttribute('data-turbo-preview')) return

      this.mountComponents(newBodyElement as BodyWithReactRoots)
      document.body.replaceWith(newBodyElement)
      this.unmountComponents(currentBodyElement as BodyWithReactRoots)
    }
  }
}
