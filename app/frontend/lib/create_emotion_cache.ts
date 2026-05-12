import createCache from '@emotion/cache'
import { isBrowser } from '@/lib/utils'

export default function createEmotionCache({ nonce }: { nonce?: string } = {}): ReturnType<typeof createCache> {
  let insertionPoint: HTMLElement | undefined

  if (isBrowser()) {
    const emotionInsertionPoint = document.querySelector<HTMLElement>('meta[name="emotion-insertion-point"]')
    insertionPoint = emotionInsertionPoint ?? undefined

    if (!nonce) {
      if (window.__CSP_NONCE__) {
        nonce = window.__CSP_NONCE__
      }

      if (!nonce) {
        const cspNonceMeta = document.querySelector('meta[name="csp-nonce"]')
        nonce = cspNonceMeta?.getAttribute('content') ?? undefined
      }

      if (!nonce) {
        const anyElementWithNonce = document.querySelector('[nonce]')
        nonce = anyElementWithNonce?.getAttribute('nonce') ?? undefined
      }
    }
  }

  return createCache({ key: 'denpro', insertionPoint, nonce })
}
