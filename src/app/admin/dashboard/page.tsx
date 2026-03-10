// src/app/admin/dashboard/page.tsx
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import {
  Building2, MessageSquare, Eye,
  RefreshCw, CheckCircle2, Clock, AlertCircle
} from 'lucide-react'

async function triggerWasiSync() {
  'use server'
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  await fetch(`${baseUrl}/api/wasi-sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  })
  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/propiedades')
}

export default async function AdminDashboard() {
  try { await requireAdmin() } catch { redirect('/login') }

  const [
    totalProps, publishedProps, availableProps,
    newInquiries, totalInquiries,
    totalViews, lastSync, topProperties
  ] = await Promise.all([
    prisma.property.count(),
    prisma.property.count({ where: { isPublished: true } }),
    prisma.property.count({ where: { status: 'AVAILABLE', isPublished: true } }),
    prisma.inquiry.count({ where: { status: 'NEW' } }),
    prisma.inquiry.count(),
    prisma.propertyView.count(),
    prisma.syncLog.findFirst({ where: { source: 'wasi' }, orderBy: { createdAt: 'desc' } }),
    prisma.property.findMany({
      where: { isPublished: true },
      orderBy: { viewsCount: 'desc' },
      take: 5,
      select: { id: true, title: true, viewsCount: true, status: true, operation: true }
    }),
  ])

  const recentInquiries = await prisma.inquiry.findMany({
    orderBy: { createdAt: 'desc' },
    take: 8,
    include: { property: { select: { title: true, slug: true } } }
  })

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-serif text-3xl text-[#0d1f3c]">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Resumen general de Federico Patiño Negocios Inmobiliarios</p>
        </div>
        <form action={triggerWasiSync}>
          <button type="submit" className="btn-navy flex items-center gap-2 text-sm">
            <RefreshCw size={15} />
            Sincronizar WASI
          </button>
        </form>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {[
          { icon: Building2, label: 'Propiedades totales', value: totalProps, sub: `${publishedProps} publicadas`, color: 'text-blue-500', bg: 'bg-blue-50' },
          { icon: CheckCircle2, label: 'Disponibles', value: availableProps, sub: 'activas en sitio', color: 'text-green-500', bg: 'bg-green-50' },
          { icon: MessageSquare, label: 'Consultas nuevas', value: newInquiries, sub: `${totalInquiries} total`, color: 'text-amber-500', bg: 'bg-amber-50' },
          { icon: Eye, label: 'Vistas totales', value: totalViews.toLocaleString(), sub: 'todas las propiedades', color: 'text-purple-500', bg: 'bg-purple-50' },
        ].map(({ icon: Icon, label, value, sub, color, bg }) => (
          <div key={label} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center mb-4`}>
              <Icon size={20} className={color} />
            </div>
            <div className="font-serif text-3xl font-bold text-[#0d1f3c] leading-none mb-1">{value}</div>
            <div className="text-slate-600 text-sm font-medium">{label}</div>
            <div className="text-slate-400 text-xs mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* Sync status */}
      {lastSync && (
        <div className={`rounded-xl p-4 mb-8 flex items-center gap-3 border ${lastSync.status === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          {lastSync.status === 'success'
            ? <CheckCircle2 size={18} className="text-green-600 shrink-0" />
            : <AlertCircle size={18} className="text-red-600 shrink-0" />
          }
          <div className="text-sm">
            <span className="font-semibold">Última sync con WASI:</span>{' '}
            {new Date(lastSync.createdAt).toLocaleString('es-AR')} ·{' '}
            {lastSync.synced} propiedades · {lastSync.errors} errores
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top propiedades */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center p-6 border-b border-slate-100">
            <h2 className="font-serif text-lg text-[#0d1f3c]">Propiedades más vistas</h2>
            <Link href="/admin/propiedades" className="text-xs text-[#c9a84c] hover:underline">Ver todas</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {topProperties.map((p, i) => (
              <div key={p.id} className="flex items-center gap-4 px-6 py-3.5">
                <span className="w-6 h-6 flex items-center justify-center text-xs font-bold text-slate-400 bg-slate-50 rounded-full shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-700 truncate">{p.title}</div>
                  <div className="text-xs text-slate-400 capitalize">{p.operation}</div>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Eye size={12} />
                  {p.viewsCount}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Consultas recientes */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center p-6 border-b border-slate-100">
            <h2 className="font-serif text-lg text-[#0d1f3c]">Consultas recientes</h2>
            <Link href="/admin/consultas" className="text-xs text-[#c9a84c] hover:underline">Ver todas</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recentInquiries.map(inq => (
              <div key={inq.id} className="flex items-start gap-3 px-6 py-3.5">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${inq.status === 'NEW' ? 'bg-amber-400' : 'bg-slate-200'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-700">{inq.name}</div>
                  <div className="text-xs text-slate-400 truncate">
                    {inq.property?.title || 'Consulta general'}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock size={11} />
                  {new Date(inq.createdAt).toLocaleDateString('es-AR')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
