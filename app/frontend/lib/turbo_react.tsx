import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'

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

    if (!name) {
      throw new Error('[TurboReact] Missing data-react-component-name attribute')
    }

    const rawProps = rootElement.getAttribute('data-react-component-props')
    const props: Record<string, unknown> = JSON.parse(rawProps!)
    const extensions = ['.jsx', '.tsx', '.js', '.ts']
    const lazyComponentModule = extensions.reduce((found, ext) => {
      return found ?? this.components[`${this.componentsRootDir}/components/${name}${ext}`]
    }, undefined as any)

    if (!lazyComponentModule) {
      throw new Error(`[TurboReact] Missing component with name: "${name}"`)
    }

    const Component: React.ComponentType<any> = (await lazyComponentModule()).default

    if (rootElement.getAttribute('data-turbo-react-ssr')) {
      const reactRoot = hydrateRoot(rootElement, <StrictMode><Component {...props} /></StrictMode>)

      bodyElement.reactComponentRoots!.push(reactRoot)
    } else {
      const reactRoot = createRoot(rootElement)

      reactRoot.render(<StrictMode><Component {...props} /></StrictMode>)
      bodyElement.reactComponentRoots!.push(reactRoot)
    }
  }

  turboReactBeforeRender(event: TurboBeforeRenderEvent): void {
    event.detail.render = this.turboReactRenderFn(event)
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
