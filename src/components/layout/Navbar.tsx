'use client'
// src/components/layout/Navbar.tsx
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 px-[5%] flex items-center justify-between transition-all duration-300
        ${scrolled ? 'h-16 bg-[#0d1f3c]/98 shadow-2xl' : 'h-[72px] bg-[#0d1f3c]/96'}
        backdrop-blur-md border-b border-[#c9a84c]/20`}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 no-underline">
        <div className="w-9 h-9 bg-[#c9a84c] flex items-center justify-center rounded font-serif font-bold text-[#0d1f3c] text-lg shrink-0">
          FP
        </div>
        <div>
          <div className="text-white font-serif font-semibold text-[15px] leading-tight">
            Federico Patiño
          </div>
          <div className="text-[#e8c97a] text-[10px] tracking-[1.5px] uppercase">
            Negocios Inmobiliarios
          </div>
        </div>
      </Link>

      {/* Desktop links */}
      <ul className="hidden md:flex gap-8 list-none">
        {[
          ['Propiedades', '/propiedades'],
          ['Servicios', '/#servicios'],
          ['Nosotros', '/#nosotros'],
          ['Contacto', '/#contacto'],
        ].map(([label, href]) => (
          <li key={href}>
            <Link
              href={href}
              className="text-white/80 text-[13px] tracking-wide hover:text-[#e8c97a] transition-colors no-underline"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="hidden md:flex items-center gap-3">
        <Link
          href="/login"
          className="text-white/80 text-[13px] px-4 py-1.5 rounded border border-white/20 hover:border-[#c9a84c] hover:text-[#e8c97a] transition-all no-underline"
        >
          Ingresar
        </Link>
      </div>

      {/* Mobile hamburger */}
      <button
        className="md:hidden text-white p-1"
        onClick={() => setOpen(!open)}
        aria-label="Menú"
      >
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile menu */}
      {open && (
        <div className="absolute top-full left-0 right-0 bg-[#0d1f3c] border-t border-[#c9a84c]/20 py-4 px-6 flex flex-col gap-4 md:hidden">
          {[
            ['Propiedades', '/propiedades'],
            ['Servicios', '/#servicios'],
            ['Nosotros', '/#nosotros'],
            ['Contacto', '/#contacto'],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="text-white/80 text-base hover:text-[#e8c97a] transition-colors no-underline"
            >
              {label}
            </Link>
          ))}
          <div className="flex gap-3 pt-2 border-t border-white/10">
            <Link href="/login" className="flex-1 text-center text-white/80 text-sm py-2 rounded border border-white/20 no-underline">
              Ingresar
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
