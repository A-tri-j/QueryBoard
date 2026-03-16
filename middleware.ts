import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/auth/callback',
  '/terms',
  '/privacy',
  '/landing',
  '/pricing',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('qb_token')?.value
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname)
  const isAuthEntryRoute = pathname === '/login' || pathname === '/register'

  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL('/landing', request.url))
  }

  if (token && isAuthEntryRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'],
}
