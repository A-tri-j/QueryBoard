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

type BackendAuthUser = {
  id: string
  email: string
  full_name: string
  auth_provider: string
  created_at?: string | null
  updated_at?: string | null
}

type BackendAuthResponse = {
  access_token?: string
  token_type?: string
  user?: BackendAuthUser
  id?: string
  email?: string
  full_name?: string
  auth_provider?: string
  created_at?: string | null
  updated_at?: string | null
  success?: boolean
  message?: string
  detail?: unknown
}

const BACKEND_URL =
  process.env.QUERYBOARD_BACKEND_URL ??
  process.env.NEXT_PUBLIC_QUERYBOARD_BACKEND_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  'http://127.0.0.1:8000'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function normalizeUser(user: BackendAuthUser | { id: string; email: string; full_name: string }) {
  return {
    user_id: user.id,
    email: user.email,
    display_name: user.full_name,
    plan: 'free' as const,
  }
}

function normalizeSuccessResponse(payload: BackendAuthResponse) {
  if (payload.success !== undefined) {
    return payload
  }

  if (payload.access_token && payload.user) {
    return {
      success: true,
      message: 'OK',
      data: {
        access_token: payload.access_token,
        user: normalizeUser(payload.user),
      },
    }
  }

  if (payload.id && payload.email) {
    return {
      success: true,
      message: 'OK',
      data: {
        user: normalizeUser({
          id: payload.id,
          email: payload.email,
          full_name: payload.full_name ?? '',
        }),
      },
    }
  }

  return {
    success: true,
    message: payload.message ?? 'OK',
    data: payload,
  }
}

function normalizeErrorMessage(detail: unknown): string {
  if (typeof detail === 'string') {
    return detail
  }

  if (detail === undefined || detail === null) {
    return 'An error occurred'
  }

  try {
    return JSON.stringify(detail)
  } catch {
    return 'An error occurred'
  }
}

async function readJsonBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    return (await request.json()) as Record<string, unknown>
  } catch {
    return null
  }
}

function buildBackendPath(segments: string[]): string {
  if (segments.length === 1 && segments[0] === 'google') {
    return '/auth/google'
  }

  if (segments.length === 1 && segments[0] === 'me') {
    return '/me'
  }

  if (segments.length === 2 && segments[0] === 'put' && segments[1] === 'me') {
    return '/me'
  }

  return `/${segments.join('/')}`
}

function buildBackendHeaders(request: NextRequest, hasBody: boolean) {
  const headers = new Headers()
  const authHeader = request.headers.get('authorization')
  const cookieToken = request.cookies.get('qb_token')?.value

  if (authHeader) {
    headers.set('Authorization', authHeader)
  } else if (cookieToken) {
    headers.set('Authorization', `Bearer ${cookieToken}`)
  }

  if (hasBody) {
    headers.set('Content-Type', 'application/json')
  }

  return headers
}

async function proxyAuthRequest(request: NextRequest, backendPath: string) {
  const hasBody = !['GET', 'HEAD'].includes(request.method)
  let requestBody: string | undefined

  if (hasBody) {
    const payload = (await readJsonBody(request)) ?? {}

    if (backendPath === '/register') {
      const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : ''
      const displayName =
        typeof payload.display_name === 'string'
          ? payload.display_name.trim()
          : typeof payload.full_name === 'string'
            ? payload.full_name.trim()
            : ''
      const fallbackName = email.includes('@') ? email.split('@')[0] : 'User'

      requestBody = JSON.stringify({
        email,
        password: payload.password,
        full_name: displayName || fallbackName,
      })
    } else {
      requestBody = JSON.stringify(payload)
    }
  }

  return fetch(`${BACKEND_URL}${backendPath}`, {
    method: request.method,
    headers: buildBackendHeaders(request, hasBody),
    body: requestBody,
    cache: 'no-store',
  })
}

async function handler(request: NextRequest, context: RouteContext) {
  const { authPath } = await Promise.resolve(context.params)

  if (!authPath || authPath.length === 0) {
    return NextResponse.json(
      { success: false, message: 'Auth route not found.' },
      { status: 404, headers: corsHeaders },
    )
  }

  if (request.method === 'GET' && authPath.length === 1 && authPath[0] === 'google') {
    return NextResponse.redirect(`${BACKEND_URL}/auth/google`)
  }

  const backendPath = buildBackendPath(authPath)

  try {
    const response = await proxyAuthRequest(request, backendPath)
    const payload = (await response.json().catch(() => ({}))) as BackendAuthResponse

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: normalizeErrorMessage(payload.detail),
        },
        {
          status: response.status,
          headers: corsHeaders,
        },
      )
    }

    return NextResponse.json(normalizeSuccessResponse(payload), {
      status: response.status,
      headers: corsHeaders,
    })
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: 'Backend unavailable. Please try again shortly.',
      },
      {
        status: 503,
        headers: corsHeaders,
      },
    )
  }
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const DELETE = handler

export function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}
