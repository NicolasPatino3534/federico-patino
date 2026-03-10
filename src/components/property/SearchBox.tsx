'use client'
// src/components/property/SearchBox.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

interface Props {
  defaultOperation?: string
  variant?: 'hero' | 'page'
}

export default function SearchBox({ defaultOperation = 'venta', variant = 'hero' }: Props) {
  const router = useRouter()
  const [tab,      setTab]      = useState(defaultOperation)
  const [type,     setType]     = useState('')
  const [city,     setCity]     = useState('')
  const [bedrooms, setBedrooms] = useState('')

  function handleSearch() {
    const params = new URLSearchParams()
    params.set('operation', tab)
    if (type)        params.set('type', type)
    if (city.trim()) params.set('city', city.trim())
    if (bedrooms)    params.set('bedrooms', bedrooms)
    router.push(`/propiedades?${params.toString()}`)
  }

  const isHero = variant === 'hero'

  return (
    <div
      className={`w-full max-w-4xl ${
        isHero
          ? 'bg-white rounded-xl shadow-[0_30px_80px_rgba(0,0,0,0.35)]'
          : 'bg-slate-50 rounded-xl border border-slate-200'
      } p-2`}
    >
      {/* Tabs de operación */}
      <div className="flex border-b border-slate-100 mb-1 px-2">
        {[
          { key: 'venta',         label: 'Comprar' },
          { key: 'alquiler',      label: 'Alquilar' },
          { key: 'alquiler_temp', label: 'Temporal' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors
              ${tab === t.key
                ? 'text-[#0d1f3c] border-[#c9a84c]'
                : 'text-slate-400 border-transparent hover:text-slate-600'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Fila: Tipo + Ciudad + Dormitorios + Botón */}
      <div className="flex flex-wrap gap-2 p-2">
        <div className="flex-1 min-w-[140px]">
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 pl-0.5">
            Tipo de propiedad
          </label>
          <select value={type} onChange={e => setType(e.target.value)} className="input-field">
            <option value="">Todos los tipos</option>
            <option value="casa">Casa</option>
            <option value="departamento">Departamento</option>
            <option value="lote">Lote / Terreno</option>
            <option value="local">Local comercial</option>
            <option value="oficina">Oficina</option>
          </select>
        </div>

        <div className="flex-1 min-w-[140px]">
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 pl-0.5">
            Barrio / Ciudad
          </label>
          <input
            type="text"
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="Ej: Nueva Córdoba…"
            className="input-field"
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
        </div>

        {/* Dormitorios — no aplica para alquiler temporal */}
        {tab !== 'alquiler_temp' && (
          <div className="flex-1 min-w-[110px]">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 pl-0.5">
              Dormitorios
            </label>
            <select value={bedrooms} onChange={e => setBedrooms(e.target.value)} className="input-field">
              <option value="">Cualquiera</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
            </select>
          </div>
        )}

        <button
          onClick={handleSearch}
          className="btn-navy self-end min-h-[44px] px-6 gap-2 whitespace-nowrap"
        >
          <Search size={15} />
          Buscar
        </button>
      </div>
    </div>
  )
}
