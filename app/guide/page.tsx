import type { Metadata } from 'next'
import { GuideView } from '@/components/GuideView'

export const metadata: Metadata = {
  title: 'Инструкция',
  description: 'How to reinstall Windows with WinTools autounattend.xml.',
}

export default function GuidePage() {
  return <GuideView />
}
