import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const backendBaseUrl =
  process.env.QUERYBOARD_BACKEND_URL ||
  process.env.NEXT_PUBLIC_QUERYBOARD_BACKEND_URL ||
  'http://127.0.0.1:8000'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const response = await fetch(`${backendBaseUrl}/api/usage/upgrade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ detail: 'Upgrade failed.' }, { status: 500 })
  }
}
