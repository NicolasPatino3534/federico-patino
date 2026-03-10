// src/components/property/PropertyCardSkeleton.tsx
//
// Placeholder animado que mantiene el layout estable mientras se carga
// el grid de propiedades. Se muestra durante el Suspense boundary.
// No requiere 'use client' — es JSX puro, sin estado.

export default function PropertyCardSkeleton() {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-[0_2px_16px_rgba(13,31,60,0.07)]">
      {/* Imagen */}
      <div className="h-56 bg-slate-200 animate-pulse" />

      {/* Cuerpo */}
      <div className="p-5 space-y-3">
        {/* Precio */}
        <div className="h-7 w-32 bg-slate-200 rounded animate-pulse" />
        {/* Título */}
        <div className="space-y-1.5">
          <div className="h-4 w-full bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse" />
        </div>
        {/* Ubicación */}
        <div className="h-3 w-2/4 bg-slate-200 rounded animate-pulse" />

        <div className="h-px bg-slate-100 my-4" />

        {/* Specs row */}
        <div className="flex gap-4">
          <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
          <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
          <div className="h-3 w-14 bg-slate-200 rounded animate-pulse ml-auto" />
        </div>
      </div>
    </div>
  )
}

// ── Grid de esqueletos para la sección de destacadas ─────────────────────────
export function PropertyGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
      {Array.from({ length: count }).map((_, i) => (
        <PropertyCardSkeleton key={i} />
      ))}
    </div>
  )
}
