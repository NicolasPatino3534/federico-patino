// src/app/admin/propiedades/page.tsx
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { STATUS_LABELS, STATUS_COLORS, OPERATION_LABELS, formatPrice } from '@/types'
import { Plus, Eye, Pencil, Trash2, RefreshCw } from 'lucide-react'
import Link from 'next/link'

async function triggerWasiSync() {
  'use server'
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  await fetch(`${baseUrl}/api/wasi-sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  })
  revalidatePath('/admin/propiedades')
  revalidatePath('/admin/dashboard')
}

export default async function AdminPropiedades({
  searchParams,
}: {
  searchParams: { page?: string; status?: string; q?: string }
}) {
  try { await requireAdmin() } catch { redirect('/login') }

  const page = parseInt(searchParams.page || '1')
  const limit = 20
  const skip = (page - 1) * limit

  const where: { status?: string; title?: { contains: string; mode: 'insensitive' } } = {}
  if (searchParams.status) where.status = searchParams.status
  if (searchParams.q) where.title = { contains: searchParams.q, mode: 'insensitive' }

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      include: { images: { where: { isMain: true }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.property.count({ where }),
  ])

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-7">
        <div>
          <h1 className="font-serif text-3xl text-[#0d1f3c]">Propiedades</h1>
          <p className="text-slate-400 text-sm">{total} propiedades en total</p>
        </div>
        <div className="flex gap-3">
          <form action={triggerWasiSync}>
            <button type="submit" className="btn-outline flex items-center gap-2 text-sm py-2">
              <RefreshCw size={14} />
              Sync WASI
            </button>
          </form>
          <Link href="/admin/propiedades/nueva" className="btn-navy flex items-center gap-2 text-sm">
            <Plus size={15} />
            Nueva propiedad
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 mb-6 flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Buscar por título…"
          defaultValue={searchParams.q}
          className="input-field max-w-xs"
        />
        <select defaultValue={searchParams.status} className="input-field max-w-[160px]">
          <option value="">Todos los estados</option>
          <option value="AVAILABLE">Disponible</option>
          <option value="RESERVED">Reservada</option>
          <option value="SOLD">Vendida</option>
          <option value="INACTIVE">Inactiva</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Propiedad</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Tipo / Op.</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Precio</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Vistas</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Publicada</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {properties.map(p => (
              <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                      {p.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">N/A</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-slate-700 truncate max-w-[200px]">{p.title}</div>
                      {p.city && <div className="text-xs text-slate-400 truncate">{p.city}</div>}
                      {p.externalId && <div className="text-[10px] text-slate-300">WASI #{p.externalId}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 hidden md:table-cell">
                  <div className="text-slate-600 capitalize text-xs">{p.propertyType}</div>
                  <div className="text-slate-400 text-xs">{OPERATION_LABELS[p.operation] || p.operation}</div>
                </td>
                <td className="px-4 py-3.5 hidden lg:table-cell">
                  <div className="text-slate-700 text-xs font-medium">
                    {formatPrice(p.price, p.priceCurrency)}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${STATUS_COLORS[p.status]}`}>
                    {STATUS_LABELS[p.status]}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-center hidden md:table-cell">
                  <div className="flex items-center justify-center gap-1 text-slate-400 text-xs">
                    <Eye size={11} />
                    {p.viewsCount}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-center hidden lg:table-cell">
                  <div className={`w-2 h-2 rounded-full mx-auto ${p.isPublished ? 'bg-green-400' : 'bg-slate-200'}`} />
                </td>
                <td className="px-5 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/propiedades/${p.slug}`}
                      target="_blank"
                      className="p-1.5 text-slate-400 hover:text-[#0d1f3c] hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Eye size={14} />
                    </Link>
                    <Link
                      href={`/admin/propiedades/${p.id}/editar`}
                      className="p-1.5 text-slate-400 hover:text-[#0d1f3c] hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Pencil size={14} />
                    </Link>
                    <button className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {properties.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <p>No hay propiedades todavía.</p>
            <p className="text-sm mt-1">Hacé sync con WASI o creá una nueva manualmente.</p>
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="flex justify-between items-center px-5 py-4 border-t border-slate-100">
            <span className="text-xs text-slate-400">Mostrando {skip + 1}–{Math.min(skip + limit, total)} de {total}</span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`?page=${page - 1}`} className="px-3 py-1.5 text-xs border border-slate-200 rounded hover:bg-slate-50 no-underline text-slate-600">
                  ← Anterior
                </Link>
              )}
              {skip + limit < total && (
                <Link href={`?page=${page + 1}`} className="px-3 py-1.5 text-xs border border-slate-200 rounded hover:bg-slate-50 no-underline text-slate-600">
                  Siguiente →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
