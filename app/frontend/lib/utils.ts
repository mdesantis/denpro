export function isBrowser(): boolean {
  return typeof document !== 'undefined' && typeof window !== 'undefined'
}
