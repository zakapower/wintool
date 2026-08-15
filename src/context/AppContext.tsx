'use client'

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  LANG_COOKIE,
  langFromAcceptLanguage,
  parseLang,
  type Lang,
} from '@/lib/lang'
import { resolveTheme, type Theme } from '@/lib/theme'

interface AppState {
  lang: Lang
  theme: Theme
  themeReady: boolean
  setLang: (lang: Lang) => void
  toggleLang: () => void
  toggleTheme: () => void
  t: (ru: string, en: string) => string
}

const AppContext = createContext<AppState | null>(null)

function readCookieLang(): Lang | null {
  try {
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${LANG_COOKIE}=(ru|en)`),
    )
    return parseLang(match?.[1])
  } catch {
    return null
  }
}

function readStoredLang(): Lang {
  return (
    readCookieLang() ??
    langFromAcceptLanguage(
      typeof navigator !== 'undefined' ? navigator.language : null,
    )
  )
}

function readStoredTheme(): Theme {
  try {
    const fromDom = document.documentElement.dataset.theme
    if (fromDom === 'light' || fromDom === 'dark') return fromDom
    return resolveTheme(localStorage.getItem('wintool-theme'))
  } catch {
    return 'dark'
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem('wintool-theme', theme)
  } catch {
    /* ignore */
  }
  const icon = document.getElementById('site-favicon') as HTMLLinkElement | null
  if (icon) {
    icon.href =
      theme === 'dark' ? '/favicon-dark.svg?v=4' : '/favicon-light.svg?v=4'
  }
}

function writeLangCookie(lang: Lang) {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ru')
  const [theme, setTheme] = useState<Theme>('dark')
  const [themeReady, setThemeReady] = useState(false)

  useLayoutEffect(() => {
    setLangState(readStoredLang())
    const next = readStoredTheme()
    setTheme(next)
    applyTheme(next)
    const id = requestAnimationFrame(() => setThemeReady(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo<AppState>(
    () => ({
      lang,
      theme,
      themeReady,
      setLang: (next) => {
        writeLangCookie(next)
        setLangState(next)
      },
      toggleLang: () => {
        const next: Lang = lang === 'ru' ? 'en' : 'ru'
        writeLangCookie(next)
        setLangState(next)
      },
      toggleTheme: () => {
        const next = theme === 'light' ? 'dark' : 'light'
        applyTheme(next)
        setTheme(next)
      },
      t: (ru, en) => (lang === 'ru' ? ru : en),
    }),
    [lang, theme, themeReady],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
