import { cookies, headers } from 'next/headers'
import { LANG_COOKIE, resolveLang, type Lang } from './lang'

export async function getRequestLang(): Promise<Lang> {
  const cookieStore = await cookies()
  const headerStore = await headers()
  return resolveLang({
    cookieLang: cookieStore.get(LANG_COOKIE)?.value,
    acceptLanguage: headerStore.get('accept-language'),
  })
}
