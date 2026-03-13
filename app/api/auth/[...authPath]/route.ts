import { NextRequest, NextResponse } from 'next/server'

const BACKEND =
  process.env.QUERYBOARD_BACKEND_URL ??
  process.env.NEXT_PUBLIC_QUERYBOARD_BACKEND_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  'http://127.0.0.1:8000'

type Params = { authPath: string[] }

async function handler(
  request: NextRequest,
  context: { params: Params | Promise<Params> }
) {
  // Next.js 16 — params is a Promise, must be awaited
  const { authPath } = await Promise.resolve(context.params)
  const path = Array.isArray(authPath) ? authPath.join('/') : authPath
  const targetUrl = `${BACKEND}/auth/${path}`

  const isGet = request.method === 'GET'
  const body = isGet ? undefined : await request.text()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const auth = request.headers.get('authorization')
  if (auth) headers['Authorization'] = auth

  // For Google OAuth — redirect instead of proxying
  if (path === 'google') {
    return NextResponse.redirect(targetUrl)
  }

  try {
    const res = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
    })
    const text = await res.text()
    let data: unknown
    try { data = JSON.parse(text) } catch { data = { message: text } }
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    console.error('[Auth Proxy] Error:', err)
    return NextResponse.json(
      { error: 'Backend unavailable', detail: String(err) },
      { status: 503 }
    )
  }
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const DELETE = handler

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}