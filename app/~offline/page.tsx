import Link from 'next/link'

export const dynamic = 'force-static'

export const metadata = {
  title: 'Offline',
  robots: { index: false, follow: false },
}

export default function OfflinePage() {
  return (
    <main
      style={{
        maxWidth: '28rem',
        margin: '4rem auto',
        padding: '0 1rem',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.75rem' }}>
        Offline
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: '1.25rem' }}>
        Нет сети. Откройте главную — генератор работает без интернета.
      </p>
      <p>
        <Link href="/" style={{ color: 'var(--accent)' }}>
          WinTools
        </Link>
      </p>
    </main>
  )
}
