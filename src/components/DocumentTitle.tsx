'use client'

import { useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import { applyDocumentTitle } from '@/lib/documentTitle'

export function DocumentTitle() {
  const { lang } = useApp()
  const pathname = usePathname()

  useLayoutEffect(() => {
    applyDocumentTitle(pathname, lang)

    // Next.js App Router writes <title> from static metadata after navigation.
    // That payload is always Russian, so it can overwrite the client title.
    const head = document.head
    const observer = new MutationObserver(() => {
      applyDocumentTitle(pathname, lang)
    })
    observer.observe(head, {
      subtree: true,
      childList: true,
      characterData: true,
    })
    return () => observer.disconnect()
  }, [pathname, lang])

  return null
}
