import type { ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans, Literata } from 'next/font/google'
import { AppProvider } from '@/context/AppContext'
import { DocumentTitle } from '@/components/DocumentTitle'
import { Header } from '@/components/Header'
import { OverlayScrollbar } from '@/components/OverlayScrollbar'
import './globals.css'

export const dynamic = 'force-static'

const sans = IBM_Plex_Sans({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

const display = Literata({
  subsets: ['latin', 'cyrillic'],
  weight: ['600', '700'],
  variable: '--font-display-face',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'WinTools',
    template: 'WinTools - %s',
  },
  description:
    'Build an autounattend.xml answer file for Windows 11 setup.',
  applicationName: 'WinTools',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'WinTools',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f6fa' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1218' },
  ],
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ru"
      data-theme="dark"
      className={`${sans.variable} ${display.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if('scrollRestoration'in history)history.scrollRestoration='manual';var th=localStorage.getItem('wintool-theme');if(th!=='dark'&&th!=='light'){th='dark'}document.documentElement.dataset.theme=th;var m=document.cookie.match(/(?:^|; )wintool-lang=(ru|en)/);if(m)document.documentElement.lang=m[1]}catch(e){document.documentElement.dataset.theme='dark'}`,
          }}
        />
      </head>
      <body>
        <AppProvider>
          <DocumentTitle />
          <OverlayScrollbar />
          <div className="app-shell">
            <Header />
            <main>{children}</main>
          </div>
        </AppProvider>
      </body>
    </html>
  )
}
