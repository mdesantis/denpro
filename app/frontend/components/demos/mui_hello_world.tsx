import Button from '@mui/material/Button'
import { CacheProvider } from '@emotion/react';
import type { EmotionCache } from '@emotion/cache';
import createEmotionCache from '@/lib/create_emotion_cache';

export default function MuiHelloWorld({ emotionCache }: { emotionCache?: EmotionCache }) {
  const cache = emotionCache ?? createEmotionCache()

  return (
    <CacheProvider value={cache}>
      <Button variant="contained">Hello world</Button>
    </CacheProvider>
  )
}
