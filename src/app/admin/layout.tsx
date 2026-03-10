// src/app/admin/layout.tsx
import Link from 'next/link'
import { Building2, MessageSquare, LayoutDashboard, Settings, LogOut, RefreshCw } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-60 bg-[#0d1f3c] flex flex-col fixed top-0 bottom-0 left-0 z-40">
        {/* Logo */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#c9a84c] flex items-center justify-center rounded font-serif font-bold text-[#0d1f3c] text-sm">
              FP
            </div>
            <div>
              <div className="text-white text-xs font-semibold leading-tight">Federico Patiño</div>
              <div className="text-[#c9a84c] text-[9px] tracking-wider uppercase">Panel Admin</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {[
            { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
            { icon: Building2, label: 'Propiedades', href: '/admin/propiedades' },
            { icon: MessageSquare, label: 'Consultas', href: '/admin/consultas' },
            { icon: RefreshCw, label: 'Sincronización', href: '/admin/sync' },
            { icon: Settings, label: 'Configuración', href: '/admin/configuracion' },
          ].map(({ icon: Icon, label, href }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 text-sm hover:bg-white/10 hover:text-white transition-all no-underline"
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-white/10">
          <Link href="/" className="flex items-center gap-3 px-3 py-2 text-white/40 text-xs hover:text-white/70 transition-colors no-underline mb-2">
            ← Ver sitio público
          </Link>
          <form action="/api/auth/logout" method="POST">
            <button className="flex items-center gap-3 px-3 py-2 text-white/40 text-sm hover:text-white/70 transition-colors w-full">
              <LogOut size={14} />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-60 overflow-auto">
        {children}
      </main>
    </div>
  )
}
