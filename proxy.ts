import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/register', '/auth/callback']

export function proxy(request: NextRequest) {  // ← was "middleware", now "proxy"
  const { pathname } = request.nextUrl
  const token = request.cookies.get('qb_token')?.value
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname)
  const isAuthEntryRoute = pathname === '/login' || pathname === '/register'

  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (token && isAuthEntryRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon\\..*|apple-icon).*)'],
}
