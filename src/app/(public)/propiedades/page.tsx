// src/app/(public)/propiedades/page.tsx
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PropertyCard from '@/components/property/PropertyCard'
import SearchBox from '@/components/property/SearchBox'
import WhatsAppButton from '@/components/ui/WhatsAppButton'
import type { Property } from '@/types'
import { OPERATION_LABELS, TYPE_LABELS } from '@/types'
import { SlidersHorizontal } from 'lucide-react'

// ─── Tipos de los search params ───────────────────────────────────────────────
// Todos son string porque vienen de la URL (e.g. ?bedrooms=2&minPrice=50000).
// La sanitización ocurre en buildWhere().
interface SearchParams {
  operation?: string
  type?:      string
  city?:      string
  minPrice?:  string
  maxPrice?:  string
  bedrooms?:  string
  page?:      string
}

const PAGE_SIZE = 12

// ─── Builder tipado del where de Prisma ──────────────────────────────────────
//
// Al tipar como Prisma.PropertyWhereInput:
//   · el compilador rechaza campos inexistentes o tipos incorrectos,
//   · eliminamos el `where: any` previo que ocultaba bugs silenciosos,
//   · Prisma puede inferir el query plan óptimo.
//
function buildWhere(params: SearchParams): Prisma.PropertyWhereInput {
  // Filtros base: siempre aplicados
  const where: Prisma.PropertyWhereInput = {
    isPublished: true,
    status:      { not: 'INACTIVE' },
  }

  // operation: validar contra valores conocidos para evitar consultas arbitrarias
  const validOperations = ['venta', 'alquiler', 'alquiler_temp'] as const
  type ValidOp = typeof validOperations[number]
  if (params.operation && (validOperations as readonly string[]).includes(params.operation)) {
    where.operation = params.operation as ValidOp
  }

  // type: validar contra el enum del negocio
  const validTypes = ['casa', 'departamento', 'lote', 'local', 'oficina', 'campo', 'deposito']
  if (params.type && validTypes.includes(params.type)) {
    where.propertyType = params.type
  }

  // city: búsqueda insensible a mayúsculas y acentos
  // Trim para evitar whitespace accidental desde la URL
  if (params.city?.trim()) {
    where.city = { contains: params.city.trim(), mode: 'insensitive' }
  }

  // bedrooms: mínimo de dormitorios
  const bedroomsNum = parseInt(params.bedrooms ?? '')
  if (!isNaN(bedroomsNum) && bedroomsNum > 0) {
    where.bedrooms = { gte: bedroomsNum }
  }

  // price: rango mínimo/máximo
  const minPrice = parseFloat(params.minPrice ?? '')
  const maxPrice = parseFloat(params.maxPrice ?? '')
  if (!isNaN(minPrice) || !isNaN(maxPrice)) {
    where.price = {
      ...(!isNaN(minPrice) ? { gte: minPrice } : {}),
      ...(!isNaN(maxPrice) ? { lte: maxPrice } : {}),
    }
  }

  return where
}

// ─── Query principal ──────────────────────────────────────────────────────────

async function getProperties(params: SearchParams) {
  const where = buildWhere(params)
  const page  = Math.max(1, parseInt(params.page ?? '1') || 1)
  const skip  = (page - 1) * PAGE_SIZE

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      include: {
        images:   { where: { isMain: true }, take: 1 },
        features: { take: 5 },
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: PAGE_SIZE,
    }),
    prisma.property.count({ where }),
  ])

  return {
    properties: properties as unknown as Property[],
    total,
    page,
    pages: Math.ceil(total / PAGE_SIZE),
  }
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default async function PropiedadesPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { properties, total, page, pages } = await getProperties(searchParams)

  // Construir label legible de los filtros activos para mostrar al usuario
  const activeFilters = [
    searchParams.operation && OPERATION_LABELS[searchParams.operation],
    searchParams.type      && TYPE_LABELS[searchParams.type],
    searchParams.city?.trim(),
    searchParams.bedrooms  && `${searchParams.bedrooms}+ dorm.`,
    searchParams.minPrice  && `Desde $${parseInt(searchParams.minPrice).toLocaleString('es-AR')}`,
    searchParams.maxPrice  && `Hasta $${parseInt(searchParams.maxPrice).toLocaleString('es-AR')}`,
  ].filter(Boolean) as string[]

  return (
    <>
      <Navbar />

      {/* Header */}
      <div className="bg-[#0d1f3c] pt-28 pb-16 px-[5%]">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-serif text-4xl text-white mb-2">Propiedades</h1>
          <p className="text-white/50 text-sm mb-8">
            {total} {total === 1 ? 'propiedad encontrada' : 'propiedades encontradas'}
          </p>
          <SearchBox defaultOperation={searchParams.operation || 'venta'} variant="page" />
        </div>
      </div>

      {/* Resultados */}
      <section className="py-16 px-[5%] bg-[#f8f7f4] min-h-screen">
        <div className="max-w-6xl mx-auto">

          {/* Filtros activos */}
          {activeFilters.length > 0 && (
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <SlidersHorizontal size={15} className="text-slate-400" />
              <span className="text-xs text-slate-400 mr-1">Filtros:</span>
              {activeFilters.map(f => (
                <span key={f} className="bg-[#0d1f3c] text-white text-xs px-3 py-1 rounded-full">
                  {f}
                </span>
              ))}
              <a href="/propiedades" className="text-xs text-[#c9a84c] hover:underline ml-1">
                Limpiar filtros
              </a>
            </div>
          )}

          {properties.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
                {properties.map(p => (
                  <PropertyCard key={p.id} property={p} showStatus />
                ))}
              </div>

              {/* Paginación */}
              {pages > 1 && (
                <div className="flex justify-center gap-2 mt-12">
                  {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                    <a
                      key={p}
                      href={`/propiedades?${new URLSearchParams({ ...searchParams, page: String(p) })}`}
                      className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-all no-underline
                        ${p === page
                          ? 'bg-[#0d1f3c] text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                    >
                      {p}
                    </a>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-24 text-slate-400">
              <div className="text-5xl mb-4">🏠</div>
              <h3 className="font-serif text-xl text-slate-600 mb-2">No encontramos propiedades</h3>
              <p className="text-sm mb-6">Probá con otros filtros o consultanos directamente.</p>
              <a href="/propiedades" className="btn-outline">Ver todas las propiedades</a>
            </div>
          )}
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
    </>
  )
}
