// src/components/property/PropertyCard.tsx
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, BedDouble, Bath, Car, Maximize2 } from 'lucide-react'
import { Property, formatPrice, OPERATION_LABELS, STATUS_LABELS, STATUS_COLORS } from '@/types'

interface Props {
  property: Property
  showStatus?: boolean
}

export default function PropertyCard({ property, showStatus = false }: Props) {
  const mainImage = property.images?.[0]
  const displayPrice = formatPrice(property.price, property.priceCurrency, property.pricePeriod)

  const operationBg: Record<string, string> = {
    venta: 'bg-[#0d1f3c] text-[#c9a84c]',
    alquiler: 'bg-[#c9a84c] text-[#0d1f3c]',
    alquiler_temp: 'bg-slate-600 text-white',
  }

  return (
    <Link href={`/propiedades/${property.slug}`} className="no-underline group block">
      <article className="bg-white rounded-xl overflow-hidden shadow-[0_2px_16px_rgba(13,31,60,0.07)] card-hover">
        {/* Imagen */}
        <div className="relative h-56 bg-slate-100 overflow-hidden">
          {mainImage ? (
            <Image
              src={mainImage.urlBig || mainImage.url}
              alt={mainImage.altText || property.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-200">
              <span className="text-slate-400 text-sm">Sin imagen</span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-1.5">
            <span className={`px-2.5 py-1 rounded text-[11px] font-bold tracking-wide uppercase ${operationBg[property.operation] || 'bg-[#0d1f3c] text-white'}`}>
              {OPERATION_LABELS[property.operation] || property.operation}
            </span>
            {showStatus && property.status !== 'AVAILABLE' && (
              <span className={`px-2.5 py-1 rounded text-[11px] font-bold tracking-wide uppercase ${STATUS_COLORS[property.status]}`}>
                {STATUS_LABELS[property.status]}
              </span>
            )}
            {property.isFeatured && (
              <span className="bg-amber-400 text-amber-900 px-2.5 py-1 rounded text-[11px] font-bold uppercase">
                ★ Destacada
              </span>
            )}
          </div>
        </div>

        {/* Cuerpo */}
        <div className="p-5">
          <div className="font-serif text-2xl font-bold text-[#0d1f3c] mb-0.5">
            {displayPrice}
          </div>

          <h3 className="text-[15px] font-medium text-slate-700 mb-2 leading-snug line-clamp-2">
            {property.title}
          </h3>

          {(property.neighborhood || property.city) && (
            <div className="flex items-center gap-1 text-slate-400 text-xs mb-4">
              <MapPin size={12} className="shrink-0" />
              <span className="truncate">
                {[property.neighborhood, property.city].filter(Boolean).join(', ')}
              </span>
            </div>
          )}

          <div className="h-px bg-slate-100 mb-4" />

          <div className="flex items-center gap-4 text-xs text-slate-500">
            {property.bedrooms != null && property.bedrooms > 0 && (
              <div className="flex items-center gap-1">
                <BedDouble size={14} className="text-slate-400" />
                {property.bedrooms} dorm.
              </div>
            )}
            {property.bathrooms != null && property.bathrooms > 0 && (
              <div className="flex items-center gap-1">
                <Bath size={14} className="text-slate-400" />
                {property.bathrooms} baños
              </div>
            )}
            {property.garages != null && property.garages > 0 && (
              <div className="flex items-center gap-1">
                <Car size={14} className="text-slate-400" />
                {property.garages} coch.
              </div>
            )}
            {property.areaTotal && (
              <div className="flex items-center gap-1 ml-auto">
                <Maximize2 size={13} className="text-slate-400" />
                {property.areaTotal} m²
              </div>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}
