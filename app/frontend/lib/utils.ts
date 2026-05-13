export function isBrowser(): boolean {
  return !import.meta.env.SSR
}
