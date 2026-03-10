// src/app/api/properties/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const property = await prisma.property.findUnique({
      where: { slug: params.slug },
      include: {
        images: { orderBy: { orderIndex: 'asc' } },
        features: { orderBy: { category: 'asc' } },
      },
    })

    if (!property) {
      return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 })
    }

    // Registrar vista
    await prisma.property.update({
      where: { id: property.id },
      data: { viewsCount: { increment: 1 } },
    })

    // IP anónima
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    await prisma.propertyView.create({
      data: { propertyId: property.id, ipAddress: ip },
    }).catch(() => {}) // Silenciar errores de vistas

    return NextResponse.json(property)
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
