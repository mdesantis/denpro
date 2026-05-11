import { CacheProvider } from '@emotion/react';
import type { EmotionCache } from '@emotion/cache';
import createEmotionCache from '@/lib/create_emotion_cache';
import { alpha } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import AppNavbar from './layout/AppNavbar';
import Header from './layout/Header';
import SideMenu from './layout/SideMenu';
import AppTheme from './theme/AppTheme';

export default function Dashboard(props: { disableCustomTheme?: boolean; emotionCache?: EmotionCache }) {
  const cache = props.emotionCache ?? createEmotionCache();
  return (
    <CacheProvider value={cache}>
      <AppTheme {...props}>
      <CssBaseline enableColorScheme />
      <Box sx={{ display: 'flex' }}>
        <SideMenu />
        <AppNavbar />
        <Box
          component="main"
          sx={(theme) => ({
            flexGrow: 1,
            backgroundColor: theme.vars
              ? `rgba(${theme.vars.palette.background.defaultChannel} / 1)`
              : alpha(theme.palette.background.default, 1),
            overflow: 'auto',
          })}
        >
          <Stack
            spacing={2}
            sx={{
              alignItems: 'center',
              mx: 3,
              pb: 5,
              mt: { xs: 8, md: 0 },
            }}
          >
            <Header />
          </Stack>
        </Box>
      </Box>
      </AppTheme>
    </CacheProvider>
  );
}
