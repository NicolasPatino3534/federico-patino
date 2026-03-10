// src/middleware.ts
// Protección básica de rutas /admin/* en el Edge runtime.
// La verificación criptográfica del JWT se realiza en cada page con requireAdmin().
import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const token = req.cookies.get('fp_auth')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
