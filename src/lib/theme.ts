export type Theme = 'light' | 'dark'

/** Default when nothing is stored: dark. Explicit light/dark in storage wins. */
export function resolveTheme(stored: string | null): Theme {
  if (stored === 'light' || stored === 'dark') return stored
  return 'dark'
}
