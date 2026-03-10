// src/app/api/properties/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const searchSchema = z.object({
  operation: z.string().optional(),
  propertyType: z.string().optional(),
  city: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  bedrooms: z.coerce.number().optional(),
  isFeatured: z.coerce.boolean().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(12),
})

export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams)
    const { operation, propertyType, city, minPrice, maxPrice, bedrooms, isFeatured, page, limit } =
      searchSchema.parse(params)

    const where: any = {
      isPublished: true,
      status: { not: 'INACTIVE' },
    }

    if (operation) where.operation = operation
    if (propertyType) where.propertyType = propertyType
    if (city) where.city = { contains: city, mode: 'insensitive' }
    if (bedrooms) where.bedrooms = { gte: bedrooms }
    if (isFeatured !== undefined) where.isFeatured = isFeatured
    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) where.price.gte = minPrice
      if (maxPrice) where.price.lte = maxPrice
    }

    const skip = (page - 1) * limit

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        include: {
          images: { where: { isMain: true }, take: 1 },
          features: { take: 10 },
        },
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.property.count({ where }),
    ])

    return NextResponse.json({
      properties,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener propiedades' }, { status: 500 })
  }
}
