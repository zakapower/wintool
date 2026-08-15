import type { Metadata } from 'next'
import { GuideView } from '@/components/GuideView'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Инструкция',
  description: 'How to reinstall Windows 11 with WinTools autounattend.xml.',
}

export default function GuidePage() {
  return <GuideView />
}
