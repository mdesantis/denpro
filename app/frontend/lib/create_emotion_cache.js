import createCache from '@emotion/cache'

export default function createEmotionCache({ nonce } = {}) {
  let insertionPoint

  if (!import.meta.env.SSR) {
    const emotionInsertionPoint = document.querySelector('meta[name="emotion-insertion-point"]')
    insertionPoint = emotionInsertionPoint ?? undefined

    if (!nonce) {
      if (typeof window !== 'undefined' && window.__CSP_NONCE__) {
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
