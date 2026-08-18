import type { Metadata } from 'next'
import { GuideView } from '@/components/GuideView'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Инструкция',
  description: 'Как записать флешку и поставить Windows 11 без вопросов установщика.',
}

export default function GuidePage() {
  return <GuideView />
}
