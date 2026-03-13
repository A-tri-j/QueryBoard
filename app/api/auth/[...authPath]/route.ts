import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{
    authPath: string[]
  }> | {
    authPath: string[]
  }
}

type FrontendUser = {
  user_id: string
  email: string
  display_name: string | null
  plan: 'free'
}

const DEMO_TOKEN = 'queryboard-hackathon-demo-token'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function successResponse(message: string, data?: Record<string, unknown>, status = 200) {
  return NextResponse.json(
    {
      success: true,
      message,
      ...(data ? { data } : {}),
    },
    {
      status,
      headers: corsHeaders,
    },
  )
}

function failureResponse(message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    {
      status,
      headers: corsHeaders,
    },
  )
}

function buildUser(email: string, displayName?: string | null): FrontendUser {
  const normalizedEmail = email.trim() || 'demo@queryboard.app'
  const fallbackName = normalizedEmail.includes('@')
    ? normalizedEmail.split('@')[0]
    : 'Demo User'

  return {
    user_id: 'hackathon-demo-user',
    email: normalizedEmail,
    display_name: (displayName?.trim() || fallbackName),
    plan: 'free',
  }
}

async function parseJsonBody(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

async function handleRequest(request: NextRequest, context: RouteContext) {
  const { authPath } = await Promise.resolve(context.params)
  const [segment] = authPath ?? []

  if (!segment) {
    return failureResponse('Auth route not found.', 404)
  }

  if (request.method === 'GET' && segment === 'google') {
    const callbackUrl = new URL('/auth/callback', request.url)
    callbackUrl.searchParams.set('token', DEMO_TOKEN)
    return NextResponse.redirect(callbackUrl)
  }

  if (request.method === 'GET' && segment === 'me') {
    const authHeader = request.headers.get('authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()

    if (!token) {
      return failureResponse('Unauthorized', 401)
    }

    return successResponse('OK', {
      user: buildUser('demo@queryboard.app', 'Hackathon Demo'),
    })
  }

  if (request.method === 'POST' && (segment === 'login' || segment === 'register')) {
    const payload = await parseJsonBody(request)
    const email =
      typeof payload.email === 'string' && payload.email.trim()
        ? payload.email
        : 'demo@queryboard.app'
    const displayName =
      typeof payload.display_name === 'string'
        ? payload.display_name
        : typeof payload.full_name === 'string'
          ? payload.full_name
          : undefined

    return successResponse('OK', {
      access_token: DEMO_TOKEN,
      user: buildUser(email, displayName),
    })
  }

  if (request.method === 'POST' && segment === 'logout') {
    return successResponse('OK')
  }

  return failureResponse('Auth route not found.', 404)
}

export const GET = handleRequest
export const POST = handleRequest
export const PUT = handleRequest
export const DELETE = handleRequest

export function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}
