import type { Lang } from './lang.ts'

export function titleForPath(pathname: string, lang: Lang): string {
  const t = (ru: string, en: string) => (lang === 'ru' ? ru : en)
  if (pathname.startsWith('/guide')) {
    return `WinTools - ${t('Инструкция', 'Guide')}`
  }
  if (pathname.startsWith('/about')) {
    return `WinTools - ${t('О проекте', 'About')}`
  }
  if (pathname.startsWith('/~offline') || pathname.startsWith('/offline')) {
    return `WinTools - ${t('Нет сети', 'Offline')}`
  }
  return 'WinTools'
}

export function applyDocumentTitle(pathname: string, lang: Lang): string {
  const next = titleForPath(pathname, lang)
  if (document.title !== next) document.title = next
  return next
}
