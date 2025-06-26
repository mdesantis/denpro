import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'

export default class TurboReact {
  constructor(components) {
    this.components = components
  }

  start() {
    this.mountComponents(document.body)
    window.addEventListener('turbo:before-render', this.turboReactBeforeRender.bind(this))
  }

  mountComponents(bodyElement) {
    bodyElement.reactComponentRoots = []
    const componentRoots = bodyElement.getElementsByClassName('turbo-react-root')

    for (const componentRoot of componentRoots) {
      this.mountComponent(componentRoot, bodyElement)
    }
  }

  unmountComponents(bodyElement) {
    const componentRoots = bodyElement.reactComponentRoots

    if (!componentRoots) return

    for (const componentRoot of componentRoots) {
      componentRoot.unmount()
    }

    delete bodyElement.reactComponentRoots
  }

  async mountComponent(rootElement, bodyElement) {
    const name = rootElement.getAttribute('data-turbo-react-component')
    const path = `/components/${name}.jsx`
    const rawProps = rootElement.getAttribute('data-turbo-react-props')
    const props = JSON.parse(rawProps)
    const lazyComponentModule = this.components[`/components/${name}.jsx`] ?? this.components[`/components/${name}.tsx`]

    if(!lazyComponentModule) {
      throw new Error(`[TurboReact] Missing component with name: "${name}"`)
    }

    // Be aware that moving this Vite glob await to top level makes the import silently fail during SSR and in consequence
    // skip the subsequent hydration, leading to nasty issues.
    const Component = (await lazyComponentModule()).default

    let reactRoot

    if (rootElement.getAttribute('data-turbo-react-ssr')) {
      reactRoot = hydrateRoot(rootElement, <StrictMode><Component {...props} /></StrictMode>)
    } else {
      reactRoot = createRoot(rootElement)
      reactRoot.render(<StrictMode><Component {...props} /></StrictMode>)
    }

    bodyElement.reactComponentRoots.push(reactRoot)
  }

  turboReactBeforeRender(event) {
    event.detail.render = this.turboReactRenderFn(event).bind(this)
  }

  turboReactRenderFn(event) {
    return async (currentBodyElement, newBodyElement) => {
      // The event "turbo:before-render" is triggered twice when turbo cache is hit. The first time, the document
      // element has `data-turbo-preview` attribute, and the second time it does not. We avoid rendering twice by
      // skipping the case where `data-turbo-preview` is present. A more refined approach could be developed later,
      // which would allow mounting of React components during the preview and remount them only if the cache is stale.
      if (document.documentElement.hasAttribute('data-turbo-preview')) return

      this.mountComponents(newBodyElement)
      document.body.replaceWith(newBodyElement)
      this.unmountComponents(currentBodyElement)
    }
  }
}
