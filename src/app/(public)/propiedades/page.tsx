// src/app/(public)/propiedades/page.tsx
import { prisma } from '@/lib/db'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PropertyCard from '@/components/property/PropertyCard'
import SearchBox from '@/components/property/SearchBox'
import WhatsAppButton from '@/components/ui/WhatsAppButton'
import { Property } from '@/types'
import { SlidersHorizontal } from 'lucide-react'

interface SearchParams {
  operation?: string
  type?: string
  city?: string
  minPrice?: string
  maxPrice?: string
  bedrooms?: string
  page?: string
}

async function getProperties(params: SearchParams) {
  const where: any = {
    isPublished: true,
    status: { not: 'INACTIVE' },
  }

  if (params.operation) where.operation = params.operation
  if (params.type) where.propertyType = params.type
  if (params.city) where.city = { contains: params.city, mode: 'insensitive' }
  if (params.bedrooms) where.bedrooms = { gte: parseInt(params.bedrooms) }
  if (params.minPrice || params.maxPrice) {
    where.price = {}
    if (params.minPrice) where.price.gte = parseFloat(params.minPrice)
    if (params.maxPrice) where.price.lte = parseFloat(params.maxPrice)
  }

  const page = parseInt(params.page || '1')
  const limit = 12
  const skip = (page - 1) * limit

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      include: {
        images: { where: { isMain: true }, take: 1 },
        features: { take: 5 },
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.property.count({ where }),
  ])

  return { properties: properties as any as Property[], total, page, pages: Math.ceil(total / limit) }
}

export default async function PropiedadesPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { properties, total, page, pages } = await getProperties(searchParams)

  return (
    <>
      <Navbar />

      {/* Header */}
      <div className="bg-[#0d1f3c] pt-28 pb-16 px-[5%]">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-serif text-4xl text-white mb-2">Propiedades</h1>
          <p className="text-white/50 text-sm mb-8">
            {total} propiedades encontradas
          </p>
          <SearchBox defaultOperation={searchParams.operation || 'venta'} variant="page" />
        </div>
      </div>

      {/* Results */}
      <section className="py-16 px-[5%] bg-[#f8f7f4] min-h-screen">
        <div className="max-w-6xl mx-auto">
          {/* Active filters */}
          {(searchParams.operation || searchParams.type || searchParams.city) && (
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <SlidersHorizontal size={15} className="text-slate-400" />
              <span className="text-xs text-slate-400 mr-1">Filtros:</span>
              {searchParams.operation && (
                <span className="bg-[#0d1f3c] text-white text-xs px-3 py-1 rounded-full">
                  {searchParams.operation === 'venta' ? 'Venta' : searchParams.operation === 'alquiler' ? 'Alquiler' : 'Temporal'}
                </span>
              )}
              {searchParams.type && (
                <span className="bg-[#0d1f3c] text-white text-xs px-3 py-1 rounded-full capitalize">
                  {searchParams.type}
                </span>
              )}
              {searchParams.city && (
                <span className="bg-[#0d1f3c] text-white text-xs px-3 py-1 rounded-full">
                  {searchParams.city}
                </span>
              )}
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

              {/* Pagination */}
              {pages > 1 && (
                <div className="flex justify-center gap-2 mt-12">
                  {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                    <a
                      key={p}
                      href={`/propiedades?${new URLSearchParams({ ...searchParams, page: String(p) })}`}
                      className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-all no-underline
                        ${p === page ? 'bg-[#0d1f3c] text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
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
