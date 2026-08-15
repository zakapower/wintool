'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useApp } from '@/context/AppContext'

export function DocumentTitle() {
  const { t } = useApp()
  const pathname = usePathname()

  useEffect(() => {
    if (pathname.startsWith('/guide')) {
      document.title = t('Инструкция', 'Guide')
    } else if (pathname.startsWith('/about')) {
      document.title = t('О проекте', 'About')
    } else {
      document.title = 'WinTools'
    }
  }, [pathname, t])

  return null
}
