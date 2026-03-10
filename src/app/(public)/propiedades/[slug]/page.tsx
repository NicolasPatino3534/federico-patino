// src/app/(public)/propiedades/[slug]/page.tsx
import { cache } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { prisma } from '@/lib/db'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import WhatsAppButton from '@/components/ui/WhatsAppButton'
import InquiryForm from '@/components/property/InquiryForm'
import PropertyImage from '@/components/property/PropertyImage'
import { formatPrice, OPERATION_LABELS, TYPE_LABELS, STATUS_LABELS, STATUS_COLORS } from '@/types'
import { MapPin, BedDouble, Bath, Car, Maximize2, Building, CheckCircle2 } from 'lucide-react'

// ISR: revalidar el HTML cacheado cada hora. Si la prop se actualiza en el sync,
// el siguiente visitante tras 3600 s verá la versión fresca.
export const revalidate = 3600

const SITE_URL  = process.env.NEXT_PUBLIC_SITE_URL  || 'https://federicopatino.com.ar'
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'Federico Patiño Propiedades'

// ─── Query cacheada por request ───────────────────────────────────────────────
// React.cache() deduplica llamadas con el mismo slug dentro de un mismo request:
// generateMetadata y el Page Component comparten el resultado → una sola query.
const getPropertyBySlug = cache(async (slug: string) => {
  return prisma.property.findUnique({
    where:   { slug },
    include: {
      images:   { orderBy: { orderIndex: 'asc' } },
      features: { orderBy: { category: 'asc' } },
    },
  })
})

// ─── generateStaticParams ────────────────────────────────────────────────────
// Pre-renderiza en build time las propiedades publicadas más recientes.
// Las demás se renderizan on-demand y se cachean (fallback: 'blocking').
export async function generateStaticParams() {
  const props = await prisma.property.findMany({
    where:   { isPublished: true, status: { not: 'INACTIVE' } },
    select:  { slug: true },
    orderBy: { updatedAt: 'desc' },
    take:    50,
  })
  return props.map(p => ({ slug: p.slug }))
}

// ─── generateMetadata ────────────────────────────────────────────────────────
// Se ejecuta en el servidor en cada request (no-cached) para el <head>.
// Cuando alguien comparte la URL en WhatsApp/Twitter/LinkedIn, este metadata
// es lo que el scraper de la red social lee para generar la preview.
export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const property = await getPropertyBySlug(params.slug)

  if (!property) return { title: 'Propiedad no encontrada' }

  // ── Descripción enriquecida para el snippet de Google y el preview de WhatsApp
  const priceStr    = formatPrice(property.price, property.priceCurrency, property.pricePeriod)
  const typeStr     = TYPE_LABELS[property.propertyType] || property.propertyType
  const opStr       = OPERATION_LABELS[property.operation] || property.operation
  const locationStr = [property.neighborhood, property.city, property.province]
    .filter(Boolean).join(', ')

  const baseDescription = property.description?.substring(0, 120)?.replace(/\n/g, ' ')
  const richDescription  = [
    `${typeStr} en ${opStr}`,
    priceStr !== 'Consultar precio' ? priceStr : null,
    locationStr || null,
    baseDescription || null,
  ]
    .filter(Boolean)
    .join(' · ')
    .substring(0, 160)

  // ── Imagen OG: usar urlBig (la de máxima resolución), NO el thumbnail
  //    WhatsApp renderiza la imagen en ~300x158 px — necesitamos al menos 600 x 315 px.
  const ogImageUrl = property.images[0]?.urlBig
    || property.images[0]?.url
    || `${SITE_URL}/og-default.jpg`   // imagen de fallback en /public

  const canonicalUrl = `${SITE_URL}/propiedades/${property.slug}`

  return {
    // ── Título: incluye precio y tipo para CTR en Google
    title:       `${property.title} · ${priceStr}`,
    description: richDescription,

    // ── URL canónica — evita contenido duplicado si el slug cambia
    alternates: { canonical: canonicalUrl },

    // ── OpenGraph — parseado por WhatsApp, Facebook, LinkedIn, Slack, Telegram
    openGraph: {
      type:        'website',
      url:         canonicalUrl,
      siteName:    SITE_NAME,
      locale:      'es_AR',
      title:       property.title,
      description: richDescription,
      images: [
        {
          url:    ogImageUrl,
          width:  1200,     // WhatsApp/Meta requieren al menos 600x315 para large preview
          height: 630,
          alt:    property.title,
        },
      ],
    },

    // ── Twitter Card — preview en X (Twitter), Notion, Discord, etc.
    twitter: {
      card:        'summary_large_image',
      title:       property.title,
      description: richDescription,
      images:      [ogImageUrl],
    },

    // ── Robots: propiedades INACTIVE no deben indexarse
    robots: property.isPublished && property.status !== 'INACTIVE'
      ? { index: true, follow: true }
      : { index: false, follow: false },
  }
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default async function PropertyPage({ params }: { params: { slug: string } }) {
  const property = await getPropertyBySlug(params.slug)

  if (!property || !property.isPublished) notFound()

  // Incrementar contador de vistas de forma no-bloqueante
  prisma.property.update({
    where: { id: property.id },
    data:  { viewsCount: { increment: 1 } },
  }).catch(() => {})

  // ── JSON-LD Structured Data para Google Rich Results ─────────────────────
  // Propiedad tipo "RealEstateListing" según schema.org — mejora CTR en SERP.
  const priceStr  = formatPrice(property.price, property.priceCurrency, property.pricePeriod)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type':    'RealEstateListing',
    name:        property.title,
    description: property.description?.substring(0, 500) || priceStr,
    url:         `${SITE_URL}/propiedades/${property.slug}`,
    image:       property.images.slice(0, 5).map(img => img.urlBig || img.url),
    offers: property.price
      ? {
          '@type':         'Offer',
          price:            property.price,
          priceCurrency:    property.priceCurrency,
          availability:     'https://schema.org/InStock',
        }
      : undefined,
    address: {
      '@type':           'PostalAddress',
      streetAddress:      property.address || undefined,
      addressLocality:    property.city || undefined,
      addressRegion:      property.province || undefined,
      addressCountry:     'AR',
    },
    ...(property.lat && property.lng
      ? { geo: { '@type': 'GeoCoordinates', latitude: property.lat, longitude: property.lng } }
      : {}),
    numberOfRooms:    property.bedrooms   ?? undefined,
    numberOfBathroomsTotal: property.bathrooms ?? undefined,
    floorSize: property.areaTotal
      ? { '@type': 'QuantitativeValue', value: property.areaTotal, unitCode: 'MTK' }
      : undefined,
  }

  const wa    = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '543515956397'
  const waMsg = encodeURIComponent(`Hola Federico, me interesa "${property.title}". ¿Podés darme más info?`)

  const stats = [
    { icon: BedDouble, label: 'Dormitorios',   value: property.bedrooms },
    { icon: Bath,      label: 'Baños',          value: property.bathrooms },
    { icon: Car,       label: 'Cocheras',        value: property.garages },
    { icon: Maximize2, label: 'Sup. total',      value: property.areaTotal  ? `${property.areaTotal} m²`  : null },
    { icon: Maximize2, label: 'Sup. cubierta',   value: property.areaCovered ? `${property.areaCovered} m²` : null },
    { icon: Building,  label: 'Piso',            value: property.floor },
  ].filter(s => s.value != null && s.value !== 0)

  const featuresByCategory = property.features.reduce((acc, f) => {
    const cat = f.category || 'General'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(f)
    return acc
  }, {} as Record<string, typeof property.features>)

  return (
    <>
      {/* Inyectar el JSON-LD en el <head> */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Navbar />

      <div className="pt-20 min-h-screen bg-[#f8f7f4]">
        <div className="max-w-6xl mx-auto px-[5%] py-10">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-6">
            <a href="/" className="hover:text-[#0d1f3c] no-underline">Inicio</a>
            <span>/</span>
            <a href="/propiedades" className="hover:text-[#0d1f3c] no-underline">Propiedades</a>
            <span>/</span>
            <span className="text-slate-600 line-clamp-1">{property.title}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* LEFT: Galería + Detalles */}
            <div className="lg:col-span-2 space-y-7">

              {/* Galería */}
              <div className="bg-white rounded-xl overflow-hidden shadow-sm">
                {property.images.length > 0 ? (
                  <div className="space-y-2 p-3">
                    <div className="relative h-96 rounded-lg overflow-hidden">
                      <PropertyImage
                        src={property.images[0].urlBig || property.images[0].url}
                        fallbackSrc={property.images[0].url}
                        alt={property.images[0].altText || property.title}
                        fill
                        className="object-cover"
                        priority
                        sizes="(max-width: 1024px) 100vw, 66vw"
                      />
                    </div>
                    {property.images.length > 1 && (
                      <div className="grid grid-cols-4 gap-2">
                        {property.images.slice(1, 5).map((img, i) => (
                          <div key={img.id} className="relative h-20 rounded-lg overflow-hidden">
                            <PropertyImage
                              src={img.url}
                              alt={img.altText || `Foto ${i + 2}`}
                              fill
                              className="object-cover hover:opacity-90 transition-opacity cursor-pointer"
                              sizes="25vw"
                            />
                            {i === 3 && property.images.length > 5 && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-sm font-bold">
                                +{property.images.length - 5}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center text-slate-300 bg-slate-50">
                    <Building size={64} />
                  </div>
                )}
              </div>

              {/* Info principal */}
              <div className="bg-white rounded-xl p-7 shadow-sm">
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`px-3 py-1 rounded text-xs font-bold uppercase ${STATUS_COLORS[property.status as string]}`}>
                    {STATUS_LABELS[property.status as string]}
                  </span>
                  <span className="bg-[#0d1f3c] text-[#c9a84c] px-3 py-1 rounded text-xs font-bold uppercase">
                    {OPERATION_LABELS[property.operation] || property.operation}
                  </span>
                  <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded text-xs font-semibold capitalize">
                    {TYPE_LABELS[property.propertyType] || property.propertyType}
                  </span>
                </div>

                <h1 className="font-serif text-2xl sm:text-3xl text-[#0d1f3c] leading-snug mb-3">
                  {property.title}
                </h1>

                {(property.neighborhood || property.city) && (
                  <div className="flex items-center gap-1.5 text-slate-400 text-sm mb-6">
                    <MapPin size={14} />
                    {[property.neighborhood, property.city, property.province].filter(Boolean).join(', ')}
                  </div>
                )}

                {stats.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 py-5 border-y border-slate-100 mb-6">
                    {stats.map(({ icon: Icon, label, value }) => (
                      <div key={label} className="text-center">
                        <Icon size={18} className="text-[#c9a84c] mx-auto mb-1" />
                        <div className="text-[#0d1f3c] font-semibold text-sm">{value}</div>
                        <div className="text-slate-400 text-[10px] uppercase tracking-wide">{label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {property.description && (
                  <div>
                    <h2 className="font-serif text-lg text-[#0d1f3c] mb-3">Descripción</h2>
                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                      {property.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Características */}
              {Object.keys(featuresByCategory).length > 0 && (
                <div className="bg-white rounded-xl p-7 shadow-sm">
                  <h2 className="font-serif text-lg text-[#0d1f3c] mb-5">Características</h2>
                  {Object.entries(featuresByCategory).map(([category, features]) => (
                    <div key={category} className="mb-6 last:mb-0">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#c9a84c] mb-3">{category}</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {features.map(f => (
                          <div key={f.id} className="flex items-center gap-2 text-sm text-slate-600">
                            <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                            {f.name}{f.value ? `: ${f.value}` : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Mapa */}
              {property.lat && property.lng && (
                <div className="bg-white rounded-xl overflow-hidden shadow-sm">
                  <div className="p-5 border-b border-slate-100">
                    <h2 className="font-serif text-lg text-[#0d1f3c]">Ubicación</h2>
                    {property.address && (
                      <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                        <MapPin size={12} /> {property.address}
                      </p>
                    )}
                  </div>
                  <iframe
                    src={`https://maps.google.com/maps?q=${property.lat},${property.lng}&z=15&output=embed`}
                    width="100%"
                    height="320"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="border-0"
                  />
                </div>
              )}
            </div>

            {/* RIGHT: Precio + Contacto */}
            <div className="space-y-5">
              <div className="bg-white rounded-xl p-6 shadow-sm sticky top-24">
                <div className="font-serif text-3xl font-bold text-[#0d1f3c] mb-1">
                  {formatPrice(property.price, property.priceCurrency, property.pricePeriod)}
                </div>
                {property.pricePeriod && (
                  <div className="text-slate-400 text-xs mb-5">Precio por {property.pricePeriod}</div>
                )}

                <a
                  href={`https://wa.me/${wa}?text=${waMsg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-[#25d366] text-white font-bold py-3.5 rounded-xl hover:bg-[#20ba59] transition-colors no-underline mb-3"
                >
                  <svg viewBox="0 0 24 24" fill="white" width="18" height="18">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Consultar por WhatsApp
                </a>

                <InquiryForm propertyId={property.id} propertyTitle={property.title} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <WhatsAppButton propertyTitle={property.title} />
    </>
  )
}
