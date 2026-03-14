import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const backendBaseUrl =
  process.env.QUERYBOARD_BACKEND_URL ||
  process.env.NEXT_PUBLIC_QUERYBOARD_BACKEND_URL ||
  'http://127.0.0.1:8000'

export async function GET() {
  try {
    const response = await fetch(`${backendBaseUrl}/api/usage?user_id=anonymous`, {
      cache: 'no-store',
    })
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json(
      {
        tier: 'free',
        queries_used: 0,
        uploads_used: 0,
        tokens_used: 0,
      },
      { status: 200 }
    )
  }
}
