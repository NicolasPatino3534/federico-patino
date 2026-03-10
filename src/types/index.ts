// src/types/index.ts

export interface Property {
  id: string
  externalId?: string | null
  title: string
  slug: string
  description?: string | null
  propertyType: string
  operation: string
  price?: number | null
  priceCurrency: string
  pricePeriod?: string | null
  areaTotal?: number | null
  areaCovered?: number | null
  rooms?: number | null
  bedrooms?: number | null
  bathrooms?: number | null
  garages?: number | null
  floor?: number | null
  address?: string | null
  city?: string | null
  province?: string | null
  neighborhood?: string | null
  lat?: number | null
  lng?: number | null
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'RENTED' | 'INACTIVE'
  isPublished: boolean
  isFeatured: boolean
  viewsCount: number
  images: PropertyImage[]
  features: PropertyFeature[]
  createdAt: string
  updatedAt: string
}

export interface PropertyImage {
  id: string
  url: string
  urlBig?: string | null
  altText?: string | null
  isMain: boolean
  orderIndex: number
}

export interface PropertyFeature {
  id: string
  category?: string | null
  name: string
  value?: string | null
}

export interface Inquiry {
  id: string
  name: string
  email: string
  phone?: string | null
  message: string
  source: string
  status: 'NEW' | 'READ' | 'IN_PROGRESS' | 'CLOSED'
  property?: { id: string; title: string; slug: string } | null
  createdAt: string
}

export interface SearchFilters {
  operation?: string
  propertyType?: string
  city?: string
  minPrice?: number
  maxPrice?: number
  bedrooms?: number
  page?: number
}

export const OPERATION_LABELS: Record<string, string> = {
  venta: 'Venta',
  alquiler: 'Alquiler',
  alquiler_temp: 'Alquiler temporal',
}

export const TYPE_LABELS: Record<string, string> = {
  casa: 'Casa',
  departamento: 'Departamento',
  lote: 'Lote / Terreno',
  local: 'Local comercial',
  oficina: 'Oficina',
  campo: 'Campo / Finca',
  deposito: 'Depósito',
}

export const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Disponible',
  RESERVED: 'Reservada',
  SOLD: 'Vendida',
  RENTED: 'Alquilada',
  INACTIVE: 'Inactiva',
}

export const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-800',
  RESERVED: 'bg-orange-100 text-orange-800',
  SOLD: 'bg-red-100 text-red-800',
  RENTED: 'bg-blue-100 text-blue-800',
  INACTIVE: 'bg-gray-100 text-gray-600',
}

export function formatPrice(price: number | null | undefined, currency = 'ARS', period?: string | null): string {
  if (!price) return 'Consultar precio'
  const sym = currency === 'USD' ? 'USD' : '$'
  const formatted = new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0,
  }).format(price)
  const per = period === 'mensual' ? '/mes' : ''
  return `${sym} ${formatted}${per}`
}
