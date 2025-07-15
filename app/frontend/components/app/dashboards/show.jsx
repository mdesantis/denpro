import { AppProvider } from '@toolpad/core/AppProvider'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { createTheme } from '@mui/material/styles'
import { CacheProvider } from '@emotion/react'
import DashboardIcon from '@mui/icons-material/Dashboard'
import TimelineIcon from '@mui/icons-material/Timeline'
import { DashboardLayout } from '@toolpad/core/DashboardLayout'
import createEmotionCache from '~/lib/create_emotion_cache'

const NAVIGATION = [
  {
    kind: 'header',
    title: 'Main items',
  },
  {
    segment: 'page',
    title: 'Page',
    icon: <DashboardIcon />,
  },
  {
    segment: 'page-2',
    title: 'Page 2',
    icon: <TimelineIcon />,
  },
]

const demoTheme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'data-denpro-color-scheme',
  },
  colorSchemes: { light: true, dark: true },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 600,
      lg: 1200,
      xl: 1536,
    },
  },
})

function DemoPageContent({ pathname }) {
  return (
    <Box
      sx={{
        py: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      <Typography>Dashboard content for {pathname}</Typography>
    </Box>
  );
}

function router(props) {
  console.log(props)
}

export default function Show({ emotionCache, router }) {
  const cache = emotionCache ?? createEmotionCache()

  console.debug(router)

  return (
    <CacheProvider value={cache}>
        <AppProvider
          navigation={NAVIGATION}
          router={router}
          theme={demoTheme}
        >
          <DashboardLayout>
            <DemoPageContent pathname={router.pathname} />
          </DashboardLayout>
        </AppProvider>
    </CacheProvider>
  )
}
