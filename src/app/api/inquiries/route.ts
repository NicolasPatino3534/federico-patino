// src/app/api/inquiries/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import nodemailer from 'nodemailer'
import type { Inquiry } from '@prisma/client'

// ─── Rate limiting en memoria ─────────────────────────────────────────────────
// En producción con múltiples instancias serverless, reemplazar con Upstash Redis.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string, max = 5, windowMs = 60_000): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs })
    return false
  }
  if (entry.count >= max) return true
  entry.count++
  return false
}

// ─── Validación ───────────────────────────────────────────────────────────────

const inquirySchema = z.object({
  propertyId: z.string().optional(),
  name:    z.string().min(2).max(100),
  email:   z.string().email(),
  phone:   z.string().optional(),
  message: z.string().min(10).max(1000),
})

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Demasiadas consultas. Intentá en un minuto.' },
      { status: 429 }
    )
  }

  try {
    const body = await req.json()
    const data = inquirySchema.parse(body)

    const inquiry = await prisma.inquiry.create({ data })

    try {
      await sendAdminNotification(inquiry)
    } catch (err) {
      console.error('Error enviando email de notificación:', err)
    }

    return NextResponse.json({ success: true, id: inquiry.id }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al enviar consulta' }, { status: 500 })
  }
}

// ─── Email de notificación ────────────────────────────────────────────────────

async function sendAdminNotification(inquiry: Inquiry) {
  const host = process.env.SMTP_HOST
  if (!host) return // No configurado, skip silencioso

  const transporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })

  await transporter.sendMail({
    from:    process.env.SMTP_FROM  || 'noreply@federicopatino.com.ar',
    to:      process.env.ADMIN_EMAIL || 'info@federicopatino.com.ar',
    subject: `Nueva consulta de ${inquiry.name}`,
    text: [
      `Nombre:   ${inquiry.name}`,
      `Email:    ${inquiry.email}`,
      `Teléfono: ${inquiry.phone || 'No indicado'}`,
      '',
      'Mensaje:',
      inquiry.message,
    ].join('\n'),
  })
}
