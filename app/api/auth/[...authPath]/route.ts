import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const backendBaseUrl =
  process.env.QUERYBOARD_BACKEND_URL ||
  process.env.NEXT_PUBLIC_QUERYBOARD_BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://127.0.0.1:8000'

type RouteContext = {
  params: {
    authPath: string[]
  }
}

interface FrontendUser {
  user_id: string
  email: string
  display_name: string | null
  plan: 'free' | 'pro' | 'team'
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
    return { detail: text }
  }
}

function extractMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object') {
    if ('detail' in payload && typeof payload.detail === 'string') {
      return payload.detail
    }
    if ('message' in payload && typeof payload.message === 'string') {
      return payload.message
    }
  }

  if (typeof payload === 'string' && payload.trim()) {
    return payload
  }

  return fallback
}

function normalizeUser(payload: unknown): FrontendUser {
  const user = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {}

  return {
    user_id: String(user.id ?? user.user_id ?? ''),
    email: String(user.email ?? ''),
    display_name:
      typeof user.full_name === 'string'
        ? user.full_name
        : typeof user.display_name === 'string'
          ? user.display_name
          : null,
    plan:
      user.plan === 'pro' || user.plan === 'team'
        ? user.plan
        : 'free',
  }
}

function successResponse(message: string, data?: Record<string, unknown>) {
  return NextResponse.json({
    success: true,
    message,
    ...(data ? { data } : {}),
  })
}

function failureResponse(status: number, message: string) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status },
  )
}

export async function GET(request: NextRequest, context: RouteContext) {
  const [segment] = context.params.authPath

  if (segment === 'google') {
    return NextResponse.redirect(buildBackendUrl('/auth/google'))
  }

  if (segment !== 'me') {
    return failureResponse(404, 'Auth route not found.')
  }

  try {
    const backendResponse = await fetch(buildBackendUrl('/me'), {
      method: 'GET',
      headers: {
        Authorization: request.headers.get('authorization') ?? '',
      },
      cache: 'no-store',
    })

    const payload = await parseResponsePayload(backendResponse)

    if (!backendResponse.ok) {
      return failureResponse(
        backendResponse.status,
        extractMessage(payload, 'Unable to fetch the current user.'),
      )
    }

    return successResponse('User loaded successfully.', {
      user: normalizeUser(payload),
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown connection error.'
    return failureResponse(502, `Could not reach the backend service at ${backendBaseUrl}. ${detail}`)
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const [segment] = context.params.authPath

  if (segment !== 'login' && segment !== 'register') {
    return failureResponse(404, 'Auth route not found.')
  }

  let payload: Record<string, unknown>

  try {
    payload = await request.json()
  } catch {
    return failureResponse(400, 'Invalid JSON body.')
  }

  const backendPath = segment === 'login' ? '/login' : '/register'
  const backendBody =
    segment === 'register'
      ? {
          email: payload.email,
          password: payload.password,
          full_name:
            payload.display_name ||
            payload.full_name ||
            (typeof payload.email === 'string' ? payload.email.split('@')[0] : 'QueryBoard User'),
        }
      : {
          email: payload.email,
          password: payload.password,
        }

  try {
    const backendResponse = await fetch(buildBackendUrl(backendPath), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendBody),
      cache: 'no-store',
    })

    const backendPayload = await parseResponsePayload(backendResponse)

    if (!backendResponse.ok) {
      return failureResponse(
        backendResponse.status,
        extractMessage(
          backendPayload,
          segment === 'login' ? 'Login failed.' : 'Registration failed.',
        ),
      )
    }

    const authPayload =
      backendPayload && typeof backendPayload === 'object'
        ? backendPayload as Record<string, unknown>
        : {}

    return successResponse(
      segment === 'login' ? 'Login successful.' : 'Registration successful.',
      {
        access_token: authPayload.access_token,
        user: normalizeUser(authPayload.user),
      },
    )
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown connection error.'
    return failureResponse(502, `Could not reach the backend service at ${backendBaseUrl}. ${detail}`)
  }
}
