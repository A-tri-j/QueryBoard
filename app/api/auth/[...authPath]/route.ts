import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const backendBaseUrl =
  process.env.QUERYBOARD_BACKEND_URL ??
  process.env.NEXT_PUBLIC_QUERYBOARD_BACKEND_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  'http://127.0.0.1:8000'

type RouteContext = {
  params: Promise<{
    authPath: string[]
  }> | {
    authPath: string[]
  }
}

type BackendAuthUser = {
  id?: string
  email?: string
  full_name?: string | null
}

type BackendLoginRegisterResponse = {
  access_token?: string
  user?: BackendAuthUser
  success?: boolean
}

type BackendMeResponse = {
  id?: string
  email?: string
  full_name?: string | null
  success?: boolean
}

type FrontendUser = {
  user_id: string
  email: string
  display_name: string | null
  plan: 'free'
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function buildBackendUrl(pathname: string): string {
  return new URL(pathname, backendBaseUrl).toString()
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  const text = await response.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function normalizeUser(user: BackendAuthUser): FrontendUser {
  return {
    user_id: String(user.id ?? ''),
    email: String(user.email ?? ''),
    display_name: typeof user.full_name === 'string' ? user.full_name : null,
    plan: 'free',
  }
}

function normalizeSuccess(payload: unknown) {
  if (payload && typeof payload === 'object' && 'success' in payload) {
    return payload
  }

  if (payload && typeof payload === 'object') {
    const data = payload as BackendLoginRegisterResponse & BackendMeResponse

    if (data.access_token && data.user) {
      return {
        success: true,
        message: 'OK',
        data: {
          access_token: data.access_token,
          user: normalizeUser(data.user),
        },
      }
    }

    if (data.id && data.email && !data.access_token) {
      return {
        success: true,
        message: 'OK',
        data: {
          user: normalizeUser(data),
        },
      }
    }
  }

  return {
    success: true,
    message: 'OK',
    data: payload,
  }
}

function normalizeError(payload: unknown) {
  if (payload && typeof payload === 'object' && 'detail' in payload) {
    const detail = payload.detail
    return {
      success: false,
      message: typeof detail === 'string' ? detail : JSON.stringify(detail),
    }
  }

  return {
    success: false,
    message: 'An error occurred',
  }
}

function mapBackendPath(authPath: string[]): string {
  if (authPath.length === 1) {
    const [segment] = authPath

    if (segment === 'login') return '/login'
    if (segment === 'register') return '/register'
    if (segment === 'me') return '/me'
    if (segment === 'logout') return '/logout'
    if (segment === 'google') return '/auth/google'
  }

  return `/${authPath.join('/')}`
}

async function buildBackendRequestBody(authPath: string[], request: NextRequest): Promise<string | undefined> {
  if (request.method === 'GET' || request.method === 'DELETE') {
    return undefined
  }

  const rawBody = await request.text()
  if (!rawBody) {
    return undefined
  }

  if (authPath[0] !== 'register') {
    return rawBody
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return rawBody
  }

  const email = typeof payload.email === 'string' ? payload.email : ''
  const displayName = typeof payload.display_name === 'string' ? payload.display_name.trim() : ''
  const fullName = displayName || (email.includes('@') ? email.split('@')[0] : email) || 'QueryBoard User'

  return JSON.stringify({
    email: payload.email,
    password: payload.password,
    full_name: fullName,
  })
}

async function handleRequest(request: NextRequest, context: RouteContext) {
  const { authPath } = await Promise.resolve(context.params)

  if (!authPath || authPath.length === 0) {
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 404, headers: corsHeaders },
    )
  }

  if (request.method === 'GET' && authPath.length === 1 && authPath[0] === 'google') {
    return NextResponse.redirect(buildBackendUrl('/auth/google'))
  }

  const backendUrl = buildBackendUrl(mapBackendPath(authPath))
  const body = await buildBackendRequestBody(authPath, request)

  try {
    const backendResponse = await fetch(backendUrl, {
      method: request.method,
      headers: {
        'Content-Type': request.headers.get('content-type') || 'application/json',
        Authorization: request.headers.get('authorization') ?? '',
      },
      body,
      cache: 'no-store',
      redirect: 'manual',
    })

    if (
      backendResponse.status >= 300 &&
      backendResponse.status < 400 &&
      request.method === 'GET'
    ) {
      const location = backendResponse.headers.get('location')
      if (location) {
        return NextResponse.redirect(location)
      }
    }

    const payload = await parseResponsePayload(backendResponse)

    if (!backendResponse.ok) {
      return NextResponse.json(normalizeError(payload), {
        status: backendResponse.status,
        headers: corsHeaders,
      })
    }

    return NextResponse.json(normalizeSuccess(payload), {
      status: backendResponse.status,
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
