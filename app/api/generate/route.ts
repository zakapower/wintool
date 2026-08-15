import { NextResponse } from 'next/server'
import {
  buildUnattendXml,
  validateConfig,
} from '@/lib/buildUnattendXml'
import type { UnattendConfig } from '@/lib/types'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Неверный JSON' }, { status: 400 })
  }

  const cfg = body as UnattendConfig
  const errors = validateConfig(cfg)
  if (errors.length) {
    return NextResponse.json(
      { error: errors.map((e) => e.message).join('; ') },
      { status: 400 },
    )
  }

  const xml = buildUnattendXml(cfg)
  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': 'attachment; filename="autounattend.xml"',
      'Cache-Control': 'no-store',
    },
  })
}
