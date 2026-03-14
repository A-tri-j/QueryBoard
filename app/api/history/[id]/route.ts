import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const backendBaseUrl =
  process.env.QUERYBOARD_BACKEND_URL ||
  process.env.NEXT_PUBLIC_QUERYBOARD_BACKEND_URL ||
  'http://127.0.0.1:8000'

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params)
    const response = await fetch(
      `${backendBaseUrl}/api/history/${id}`,
      { method: 'DELETE', cache: 'no-store' }
    )
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ detail: 'Delete failed.' }, { status: 500 })
  }
}
