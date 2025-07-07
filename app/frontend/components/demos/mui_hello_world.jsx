import Button from '@mui/material/Button'
import { CacheProvider } from '@emotion/react';
import createEmotionCache from '~/lib/create_emotion_cache';

export default function MuiHelloWorld({ emotionCache }) {
  const cache = emotionCache ?? createEmotionCache()

  return (
    <CacheProvider value={cache}>
      <Button variant="contained">Hello world</Button>
    </CacheProvider>
  )
}
