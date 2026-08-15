import { NextResponse } from 'next/server'
import {
  buildUnattendXml,
  validateConfig,
} from '@/lib/buildUnattendXml'
import type { UnattendConfig } from '@/lib/types'

export const runtime = 'nodejs'

function parseLang(value: unknown): 'ru' | 'en' {
  return value === 'en' ? 'en' : 'ru'
}

function isConfigShape(body: unknown): body is UnattendConfig {
  return Boolean(body) && typeof body === 'object' && !Array.isArray(body)
}

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!isConfigShape(body)) {
    return NextResponse.json(
      { error: 'Invalid configuration payload' },
      { status: 400 },
    )
  }

  const lang = parseLang(
    'lang' in body ? (body as { lang?: unknown }).lang : undefined,
  )
  const errors = validateConfig(body, lang)
  if (errors.length) {
    return NextResponse.json(
      { error: errors.map((e) => e.message).join('; ') },
      { status: 400 },
    )
  }

  const xml = buildUnattendXml(body)
  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': 'attachment; filename="autounattend.xml"',
      'Cache-Control': 'no-store',
    },
  })
}
