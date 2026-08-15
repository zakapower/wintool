import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { AppProvider } from '@/context/AppContext'
import { DocumentTitle } from '@/components/DocumentTitle'
import { Header } from '@/components/Header'
import { OverlayScrollbar } from '@/components/OverlayScrollbar'
import { getRequestLang } from '@/lib/request-lang'
import './globals.css'

export const metadata: Metadata = {
  title: 'WinTools',
  description:
    'Build an autounattend.xml answer file for Windows 11 setup.',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const lang = await getRequestLang()
  return (
    <html lang={lang} data-theme="dark" suppressHydrationWarning>
      <head>
        <link
          rel="icon"
          type="image/svg+xml"
          href="/favicon-dark.svg?v=4"
          id="site-favicon"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,600;7..72,700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if('scrollRestoration'in history)history.scrollRestoration='manual';var th=localStorage.getItem('wintool-theme');if(th!=='dark'&&th!=='light'){th='dark'}document.documentElement.dataset.theme=th;var icon=document.getElementById('site-favicon');if(icon){icon.href=th==='dark'?'/favicon-dark.svg?v=4':'/favicon-light.svg?v=4'}}catch(e){document.documentElement.dataset.theme='dark'}`,
          }}
        />
      </head>
      <body>
        <AppProvider initialLang={lang}>
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
