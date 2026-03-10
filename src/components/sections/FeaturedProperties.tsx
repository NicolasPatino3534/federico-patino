// src/components/sections/FeaturedProperties.tsx
//
// Async Server Component — hace la query a Prisma de forma aislada.
// Al estar envuelto en <Suspense> en page.tsx, Next.js puede:
//   1. Enviar el HTML del Hero al browser de inmediato (streaming).
//   2. Continuar resolviendo esta query en el servidor.
//   3. Inyectar el HTML real cuando la query termina, reemplazando el skeleton.
//
// Esto es lo que hace al Hero "cargar instantáneamente": el browser lo pinta
// antes de que Prisma responda, sin bloquear el Time-to-First-Byte.

import { prisma } from '@/lib/db'
import PropertyCard from '@/components/property/PropertyCard'
import type { Property } from '@/types'

async function getFeaturedProperties(): Promise<Property[]> {
  const properties = await prisma.property.findMany({
    where:   { isPublished: true, isFeatured: true, status: { not: 'INACTIVE' } },
    include: {
      images:   { where: { isMain: true }, take: 1 },
      features: { take: 5 },
    },
    orderBy: { createdAt: 'desc' },
    take: 6,
  })
  return properties as unknown as Property[]
}

export default async function FeaturedProperties() {
  const featured = await getFeaturedProperties()

  if (featured.length === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
      {featured.map(p => (
        <PropertyCard key={p.id} property={p} />
      ))}
    </div>
  )
}
