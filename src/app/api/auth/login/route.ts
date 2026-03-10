// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { loginUser, COOKIE_NAME_EXPORT } from '@/lib/auth'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = loginSchema.parse(body)

    const { token, user } = await loginUser(email, password)

    const response = NextResponse.json({ user, success: true })
    response.cookies.set(COOKIE_NAME_EXPORT, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: '/',
    })

    return response
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error en el login' },
      { status: 401 }
    )
  }
}
