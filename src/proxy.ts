import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/verify-email',
  '/reset-password',
  '/accept-invite',
]

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isPublic = PUBLIC_ROUTES.some(r => pathname.startsWith(r))

  // Auth yoxla
  const session = await auth()

  // Doğrulanmamış istifadəçini login-ə yönləndir
  if (!session && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Artıq giriş etmiş istifadəçini dashboard-a yönləndir
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  if (session?.user.role === 'staff' && (pathname === '/dashboard/vardiya-checklist' || pathname === '/vardiya-checklist')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images).*)'],
}
