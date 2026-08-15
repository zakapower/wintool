import type { Metadata } from 'next'
import { AboutView } from '@/components/AboutView'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'О проекте',
  description: 'About WinTools — autounattend.xml generator.',
}

export default function AboutPage() {
  return <AboutView />
}
