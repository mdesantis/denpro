import createCache from '@emotion/cache'

// On the client side, Create a meta tag at the top of the <head> and set it as insertionPoint. This assures that
// Material UI styles are loaded first. It allows developers to easily override Material UI styles with other styling
// solutions, like CSS modules.
export default function createEmotionCache() {
  let insertionPoint;

  if (!import.meta.env.SSR) {
    const emotionInsertionPoint = document.querySelector('meta[name="emotion-insertion-point"]');
    insertionPoint = emotionInsertionPoint ?? undefined;
  }

  return createCache({ key: 'denpro', insertionPoint });
}
