export type Lang = 'ru' | 'en'

export const LANG_COOKIE = 'wintool-lang'

export function parseLang(value: string | null | undefined): Lang | null {
  if (value === 'ru' || value === 'en') return value
  return null
}

export function langFromAcceptLanguage(
  header: string | null | undefined,
): Lang {
  if (!header) return 'ru'
  const parts = header.split(',').map((p) => {
    const [tag, ...params] = p.trim().split(';')
    const q = params.find((x) => x.trim().startsWith('q='))
    const quality = q ? Number(q.trim().slice(2)) : 1
    return {
      tag: tag.toLowerCase(),
      quality: Number.isFinite(quality) ? quality : 0,
    }
  })
  parts.sort((a, b) => b.quality - a.quality)
  for (const { tag } of parts) {
    if (tag === 'en' || tag.startsWith('en-')) return 'en'
    if (tag === 'ru' || tag.startsWith('ru-')) return 'ru'
  }
  return 'ru'
}

export function resolveLang(input: {
  queryLang?: string | null
  cookieLang?: string | null
  acceptLanguage?: string | null
}): Lang {
  return (
    parseLang(input.queryLang) ??
    parseLang(input.cookieLang) ??
    langFromAcceptLanguage(input.acceptLanguage)
  )
}
