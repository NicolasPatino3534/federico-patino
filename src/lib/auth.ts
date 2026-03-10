// src/lib/auth.ts
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { prisma } from './db'

const JWT_SECRET = process.env.JWT_SECRET!
const COOKIE_NAME = 'fp_auth'

export interface JWTPayload {
  userId: string
  email: string
  role: 'ADMIN' | 'USER'
}

// ─── Hash y verificación de contraseñas ──────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ─── JWT ─────────────────────────────────────────────────────────────────────

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}

// ─── Sesión desde cookies (Server Components) ─────────────────────────────────

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

export async function requireAuth(): Promise<JWTPayload> {
  const session = await getSession()
  if (!session) throw new Error('No autenticado')
  return session
}

export async function requireAdmin(): Promise<JWTPayload> {
  const session = await requireAuth()
  if (session.role !== 'ADMIN') throw new Error('No autorizado')
  return session
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.password) throw new Error('Credenciales inválidas')
  if (!user.isActive) throw new Error('Cuenta desactivada')

  const valid = await verifyPassword(password, user.password)
  if (!valid) throw new Error('Credenciales inválidas')

  const payload: JWTPayload = { userId: user.id, email: user.email, role: user.role as 'ADMIN' | 'USER' }
  const token = signToken(payload)

  return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } }
}

export const COOKIE_NAME_EXPORT = COOKIE_NAME
