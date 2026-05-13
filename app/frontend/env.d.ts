declare const __VITE_SOURCE_DIR__: string

interface ImportMetaEnv {
  readonly SSR: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
  glob(pattern: string, options?: { eager?: boolean }): Record<string, any>
}

interface Window {
  __CSP_NONCE__?: string
}

interface TurboBeforeRenderEvent extends CustomEvent<{
  render: (
    currentBody: Element,
    newBody: Element,
  ) => Promise<void>
}> {}

declare function render(
  argsJson: string,
): { content: string; emotionStyles: string } | { error: string }

// Vendor MUI templates reference Pro packages not installed
declare module '@mui/x-data-grid-pro/themeAugmentation' {
  interface DataGridComponents {}
}

declare module '@mui/x-date-pickers-pro/themeAugmentation' {
  export type PickersProComponents<Theme> = any
}

declare module '*/dataGrid' {
  export const dataGridCustomizations: Record<string, any>
}

// Prevent TS from type-checking vendor files imported by app code
declare module '@/lib/mui_templates/v9.0.1/dashboard/Dashboard' {
  import type { EmotionCache } from '@emotion/cache'
  const Dashboard: React.ComponentType<{ disableCustomTheme?: boolean; emotionCache?: EmotionCache }>
  export default Dashboard
}
