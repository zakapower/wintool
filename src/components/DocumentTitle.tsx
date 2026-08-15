'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useApp } from '@/context/AppContext'

export function DocumentTitle() {
  const { t } = useApp()
  const pathname = usePathname()

  useEffect(() => {
    document.title = pathname.startsWith('/about')
      ? t('О проекте', 'About')
      : 'Wintool'
  }, [pathname, t])

  return null
}
