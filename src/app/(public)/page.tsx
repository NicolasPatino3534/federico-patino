// src/app/(public)/page.tsx
//
// PILAR 5 — Suspense + Streaming
//
// PROBLEMA ANTERIOR:
//   const [featured, stats] = await Promise.all([...])
//   Esto hacía que TODO el HTML esperara a que AMBAS queries de Prisma
//   terminaran antes de enviar el primer byte al browser.
//   El Hero (que es estático) no se veía hasta que Prisma respondía.
//
// SOLUCIÓN:
//   1. El page component NO hace ningún await → el Hero se envía inmediatamente.
//   2. Cada sección con datos vive en su propio async Server Component.
//   3. <Suspense> muestra el skeleton mientras el server resuelve cada sección.
//   4. Next.js usa HTTP streaming para inyectar el HTML real cuando está listo.
//
//   Resultado: el Hero + Navbar cargan al instante (TTFB mínimo),
//   los count y las cards aparecen progresivamente sin spinner de página entera.

import { Suspense } from 'react'
import { prisma } from '@/lib/db'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import SearchBox from '@/components/property/SearchBox'
import ContactForm from '@/components/property/ContactForm'
import WhatsAppButton from '@/components/ui/WhatsAppButton'
import FeaturedProperties from '@/components/sections/FeaturedProperties'
import { PropertyGridSkeleton } from '@/components/property/PropertyCardSkeleton'
import {
  Building2, FileCheck, DollarSign, Users,
  MapPin, Phone, Mail, Clock
} from 'lucide-react'

// ─── Stats Bar — Server Component async aislado ───────────────────────────────
// Si esta query tarda, sólo esta sección muestra el skeleton; el Hero ya cargó.
async function StatsBar() {
  const available = await prisma.property.count({
    where: { isPublished: true, status: 'AVAILABLE' },
  })

  const items = [
    { num: '+350',        label: 'Propiedades vendidas' },
    { num: '15',          label: 'Años de experiencia' },
    { num: `+${available}`, label: 'Propiedades activas' },
    { num: '98%',         label: 'Clientes satisfechos' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-[5%] grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
      {items.map(s => (
        <div key={s.label}>
          <div className="font-serif text-4xl font-bold text-[#c9a84c]">{s.num}</div>
          <div className="text-white/45 text-[11px] tracking-wider uppercase mt-1">{s.label}</div>
        </div>
      ))}
    </div>
  )
}

// Skeleton para StatsBar mientras carga el count
function StatsBarSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-[5%] grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <div className="h-9 w-20 bg-white/10 rounded animate-pulse" />
          <div className="h-3 w-28 bg-white/10 rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}

// ─── Page Component — NO async, NO awaits ─────────────────────────────────────
// Al no hacer ningún await, Next.js puede enviar el Hero al browser inmediatamente
// y resolver las secciones de datos en streaming mientras el usuario ya ve el Hero.
export default function HomePage() {
  const wa = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '543515956397'

  return (
    <>
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      {/* 100% estático — se envía al browser sin esperar ninguna query */}
      <section className="relative min-h-screen bg-[#0d1f3c] flex flex-col overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1f3c] via-[#162d54] to-[#0d1f3c]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div className="absolute right-0 top-0 w-[50%] h-full opacity-10 bg-gradient-radial from-[#c9a84c] to-transparent" />

        <div className="relative z-10 flex flex-col items-center justify-center flex-1 text-center px-[5%] pt-28 pb-20">
          <div className="inline-flex items-center gap-2 bg-[#c9a84c]/15 border border-[#c9a84c]/30 text-[#e8c97a] text-[11px] tracking-[2px] uppercase px-5 py-1.5 rounded-full mb-7">
            <span className="w-1.5 h-1.5 bg-[#c9a84c] rounded-full" />
            Córdoba, Argentina · Desde 2009
          </div>

          <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.1] mb-5 max-w-4xl">
            Tu próxima propiedad<br />
            <span className="text-[#c9a84c] italic font-normal">te está esperando</span>
          </h1>

          <p className="text-white/60 text-base sm:text-lg max-w-xl leading-relaxed mb-12">
            Más de 15 años conectando personas con propiedades en Córdoba.
            Ventas, alquileres y asesoramiento con la confianza que merecés.
          </p>

          <SearchBox />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-2 pb-8 text-white/30 text-[10px] tracking-[2px] uppercase">
          <div className="w-6 h-9 rounded-xl border border-white/20 relative">
            <div className="w-0.5 h-1.5 bg-white/40 rounded absolute top-1.5 left-1/2 -translate-x-1/2 animate-bounce" />
          </div>
          Explorar
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────── */}
      {/* Suspense propio: si el count tarda, muestra skeletons sólo aquí */}
      <div className="bg-[#0d1f3c] border-t border-[#c9a84c]/15 py-7">
        <Suspense fallback={<StatsBarSkeleton />}>
          {/* @ts-expect-error — Server Component async inside Suspense */}
          <StatsBar />
        </Suspense>
      </div>

      {/* ── PROPIEDADES DESTACADAS ───────────────────────────────────── */}
      {/* Suspense propio: muestra el grid de skeletons mientras Prisma resuelve */}
      <section className="bg-[#f8f7f4] py-24 px-[5%]">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-end mb-12 flex-wrap gap-4">
            <div>
              <div className="section-label">Propiedades Destacadas</div>
              <h2 className="section-title">
                Las mejores oportunidades<br />del mercado cordobés
              </h2>
            </div>
            <a href="/propiedades" className="btn-outline">Ver todas →</a>
          </div>

          <Suspense fallback={<PropertyGridSkeleton count={6} />}>
            {/* @ts-expect-error — Server Component async inside Suspense */}
            <FeaturedProperties />
          </Suspense>
        </div>
      </section>

      {/* ── SERVICIOS ────────────────────────────────────────────────── */}
      <section id="servicios" className="py-24 px-[5%] bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="section-label">Cómo trabajamos</div>
          <h2 className="section-title">Un servicio integral<br />en cada etapa</h2>
          <p className="text-slate-500 text-base max-w-lg leading-relaxed mb-14">
            Desde la búsqueda hasta la escritura, acompañamos cada paso con profesionalismo y transparencia.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
            {[
              { icon: Building2, num: '01', title: 'Búsqueda personalizada', desc: 'Analizamos tus necesidades y buscamos activamente la propiedad ideal para vos.' },
              { icon: FileCheck, num: '02', title: 'Gestión documental',     desc: 'Nos encargamos de toda la documentación legal: contratos, certificados y trámites.' },
              { icon: DollarSign, num: '03', title: 'Tasación gratuita',    desc: 'Valoramos tu propiedad con criterios de mercado actualizados para vender al precio justo.' },
              { icon: Users,     num: '04', title: 'Asesoramiento post-venta', desc: 'Nuestra relación no termina con la firma. Asesoramos en todos los pasos posteriores.' },
            ].map(({ icon: Icon, num, title, desc }) => (
              <div key={title} className="p-8 rounded-xl border-2 border-slate-100 relative overflow-hidden hover:border-[#0d1f3c] hover:shadow-lg transition-all group">
                <div className="absolute top-5 right-5 font-serif text-5xl font-bold text-slate-100 leading-none group-hover:text-[#0d1f3c]/10 transition-colors">
                  {num}
                </div>
                <div className="w-12 h-12 bg-[#0d1f3c] rounded-xl flex items-center justify-center mb-5">
                  <Icon size={22} className="text-[#c9a84c]" />
                </div>
                <h3 className="font-serif text-lg font-semibold text-[#0d1f3c] mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOBRE NOSOTROS ───────────────────────────────────────────── */}
      <section id="nosotros" className="py-24 px-[5%] bg-[#0d1f3c]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="relative">
            <div className="aspect-[4/5] rounded-xl overflow-hidden bg-[#162d54]">
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-[#c9a84c] rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="font-serif text-4xl font-bold text-[#0d1f3c]">FP</span>
                  </div>
                  <p className="text-white/50 text-sm">Federico Patiño</p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -right-5 w-32 h-32 border-2 border-[#c9a84c] rounded-lg -z-0 hidden lg:block" />
            <div className="absolute top-8 -left-5 bg-[#c9a84c] rounded-xl p-4 text-center shadow-xl">
              <div className="font-serif text-3xl font-bold text-[#0d1f3c] leading-none">15+</div>
              <div className="text-[#0d1f3c] text-[10px] font-bold uppercase tracking-wide mt-1">Años en<br />el mercado</div>
            </div>
          </div>

          <div>
            <div className="section-label text-[#e8c97a]">Sobre Nosotros</div>
            <h2 className="section-title text-white">Experiencia y confianza<br />en el mercado cordobés</h2>
            <p className="text-white/65 text-[15px] leading-relaxed mb-4">
              Somos una inmobiliaria con más de 15 años de trayectoria en Córdoba, especializada en la compra, venta y alquiler de propiedades residenciales, comerciales y terrenos.
            </p>
            <p className="text-white/65 text-[15px] leading-relaxed mb-7">
              Nuestro compromiso es brindarte un servicio personalizado, transparente y eficiente. Conocemos profundamente el mercado local y trabajamos para que tomes las mejores decisiones.
            </p>
            <ul className="space-y-3 mb-9">
              {[
                'Matrícula habilitada ante el Colegio Profesional Inmobiliario',
                'Especialistas en barrios privados y countries de Córdoba',
                'Amplia red de compradores e inversores calificados',
                'Tasaciones gratuitas con criterios de mercado actuales',
              ].map(item => (
                <li key={item} className="flex items-start gap-3 text-white/70 text-sm">
                  <span className="w-1.5 h-1.5 bg-[#c9a84c] rounded-full mt-2 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <a
              href={`https://wa.me/${wa}?text=${encodeURIComponent('Hola Federico, quisiera más información sobre sus servicios.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary no-underline"
            >
              Consultá por WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ── CONTACTO ─────────────────────────────────────────────────── */}
      <section id="contacto" className="py-24 px-[5%] bg-[#f8f7f4]">
        <div className="max-w-6xl mx-auto">
          <div className="section-label">Contacto</div>
          <h2 className="section-title">Hablemos de tu<br />próxima propiedad</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mt-12">
            <div>
              {[
                { icon: Phone,  label: 'Teléfono / WhatsApp', value: '+54 351 5956397',           href: `tel:+${wa}` },
                { icon: Mail,   label: 'Correo electrónico',   value: 'info@federicopatino.com.ar', href: 'mailto:info@federicopatino.com.ar' },
                { icon: MapPin, label: 'Ubicación',            value: 'Córdoba Capital, Argentina', href: null },
                { icon: Clock,  label: 'Horario',              value: 'Lun–Vie 9–18 hs · Sáb 10–14 hs', href: null },
              ].map(({ icon: Icon, label, value, href }) => (
                <div key={label} className="flex items-start gap-4 mb-7">
                  <div className="w-11 h-11 bg-[#0d1f3c] rounded-lg flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-[#c9a84c]" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{label}</div>
                    {href ? (
                      <a href={href} className="text-[15px] text-[#0d1f3c] font-medium mt-0.5 block no-underline hover:text-[#c9a84c] transition-colors">{value}</a>
                    ) : (
                      <div className="text-[15px] text-[#0d1f3c] font-medium mt-0.5">{value}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <ContactForm />
          </div>
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
    </>
  )
}
