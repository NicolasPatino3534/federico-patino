// src/lib/wasi.ts
// Servicio completo de integración con WASI API
import type { Status } from '@prisma/client'

const WASI_BASE = process.env.WASI_BASE_URL || 'https://api.wasi.co/v1'
const ID_COMPANY = process.env.WASI_ID_COMPANY!
const WASI_TOKEN = process.env.WASI_TOKEN!

function creds() {
  return `id_company=${ID_COMPANY}&wasi_token=${WASI_TOKEN}`
}

// ─── Tipos de WASI ────────────────────────────────────────────────────────────

export interface WasiProperty {
  id_property: string
  title: string
  observations: string
  for_sale: string
  for_rent: string
  for_rent_temporal: string
  id_property_type: string
  property_type_label: string
  sale_price: string
  rent_price: string
  id_currency: string
  iso_currency: string
  area: string
  built_area: string
  private_area: string
  unit_area_label: string
  bedrooms: string
  bathrooms: string
  half_bathrooms: string
  garages: string
  floor: string
  furnished: string
  stratum: string
  address: string
  city_label: string
  region_label: string
  country_label: string
  zone_label: string
  latitude: string
  longitude: string
  id_availability: string
  availability_label: string   // Available | Reserved | Sold | Rented
  id_status_on_page: string
  status_on_page_label: string // Outstanding | Standard | Inactive
  updated_at: string
  galleries?: Record<string, Record<string, WasiImage>>
  features?: Record<string, WasiFeature>
  property_features?: Record<string, WasiFeature>
}

export interface WasiImage {
  id: string
  url: string
  url_big: string
  url_original: string
  description: string
  position: string
}

export interface WasiFeature {
  id_feature: string
  label: string
  id_category: string
  category_label: string
  value?: string
}

// ─── Funciones de la API ──────────────────────────────────────────────────────

export async function wasiGetProperties(offset = 0, quantity = 20): Promise<WasiProperty[]> {
  try {
    const url = `${WASI_BASE}/property/search?${creds()}&id_country=5&offset=${offset}&quantity=${quantity}`
    const res = await fetch(url, { next: { revalidate: 0 } })
    const text = await res.text()
    if (!text || text.trim().startsWith('<')) return []
    const data = JSON.parse(text)

    if (data.status === 'error') {
      throw new Error(`WASI API error: ${data.message}`)
    }

    return Object.values(data).filter(
      (item): item is WasiProperty =>
        typeof item === 'object' && item !== null && 'id_property' in item
    )
  } catch (err) {
    throw err
  }
}

/**
 * Obtiene propiedad, imágenes y características en UNA SOLA llamada HTTP.
 * Elimina las llamadas duplicadas de wasiGetGallery + wasiGetFeatures.
 */
export async function wasiGetPropertyDetail(id: string): Promise<{
  property: WasiProperty | null
  galleries: WasiImage[]
  features: WasiFeature[]
}> {
  try {
    const url = `${WASI_BASE}/property/get/${id}?${creds()}`
    const res = await fetch(url, { next: { revalidate: 0 } })
    const text = await res.text()
    if (!text || text.trim().startsWith('<')) return { property: null, galleries: [], features: [] }
    const data = JSON.parse(text) as WasiProperty & { status?: string }
    if (data.status === 'error') return { property: null, galleries: [], features: [] }

    // Extraer imágenes
    const galleries: WasiImage[] = []
    if (data.galleries) {
      for (const galleryGroup of Object.values(data.galleries)) {
        if (typeof galleryGroup === 'object' && galleryGroup !== null) {
          for (const img of Object.values(galleryGroup)) {
            if (typeof img === 'object' && img !== null && 'url' in img) {
              galleries.push(img as WasiImage)
            }
          }
        }
      }
    }

    // Extraer características
    const rawFeatures = data.features ?? data.property_features ?? {}
    const features: WasiFeature[] = Object.values(rawFeatures).filter(
      (item): item is WasiFeature =>
        typeof item === 'object' && item !== null && 'label' in item
    )

    return { property: data, galleries, features }
  } catch {
    return { property: null, galleries: [], features: [] }
  }
}

// ─── Mapeo WASI → schema propio ───────────────────────────────────────────────

function mapAvailability(label: string): Status {
  const map: Record<string, Status> = {
    Available: 'AVAILABLE',
    Reserved:  'RESERVED',
    Sold:      'SOLD',
    Rented:    'RENTED',
    Inactive:  'INACTIVE',
  }
  return map[label] ?? 'AVAILABLE'
}

function mapOperation(prop: WasiProperty): string {
  if (prop.for_rent_temporal === 'true') return 'alquiler_temp'
  if (prop.for_rent === 'true') return 'alquiler'
  return 'venta'
}

function mapPropertyType(label: string): string {
  const map: Record<string, string> = {
    Apartamento: 'departamento',
    Casa:        'casa',
    Lote:        'lote',
    Oficina:     'oficina',
    Local:       'local',
    Bodega:      'deposito',
    Finca:       'campo',
  }
  return map[label] || label.toLowerCase()
}

function generateSlug(title: string, id: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80)
  return `${slug}-${id}`
}

export function mapWasiProperty(
  prop: WasiProperty,
  galleries: WasiImage[],
  features: WasiFeature[]
) {
  const operation = mapOperation(prop)
  const price = parseFloat(
    operation === 'venta' ? prop.sale_price : prop.rent_price
  ) || 0

  return {
    externalId:    String(prop.id_property),
    title:         prop.title,
    slug:          generateSlug(prop.title, prop.id_property),
    description:   prop.observations || null,
    propertyType:  mapPropertyType(prop.property_type_label || ''),
    operation,
    price:         price > 0 ? price : null,
    priceCurrency: prop.iso_currency || 'ARS',
    pricePeriod:   operation === 'alquiler' ? 'mensual' : null,
    areaTotal:     parseFloat(prop.area) || null,
    areaCovered:   parseFloat(prop.built_area) || null,
    bedrooms:      parseInt(prop.bedrooms) || null,
    bathrooms:     parseInt(prop.bathrooms) || null,
    garages:       parseInt(prop.garages) || null,
    floor:         parseInt(prop.floor) || null,
    address:       prop.address || null,
    city:          prop.city_label || null,
    province:      prop.region_label || null,
    neighborhood:  prop.zone_label || null,
    lat:           parseFloat(prop.latitude) || null,
    lng:           parseFloat(prop.longitude) || null,
    status:        mapAvailability(prop.availability_label),
    isPublished:   prop.status_on_page_label !== 'Inactive',
    isFeatured:    prop.status_on_page_label === 'Outstanding',
    crmSource:     'wasi',
    crmUpdatedAt:  prop.updated_at ? new Date(prop.updated_at.replace(' ', 'T')) : new Date(),

    // Imágenes
    images: galleries.map((img, i) => ({
      url:          img.url,
      urlBig:       img.url_big,
      urlOriginal:  img.url_original,
      altText:      img.description || prop.title,
      orderIndex:   parseInt(img.position) || i,
      isMain:       i === 0,
    })),

    // Características
    features: features.map(f => ({
      category: f.category_label || null,
      name:     f.label,
      value:    f.value || null,
    })),
  }
}
