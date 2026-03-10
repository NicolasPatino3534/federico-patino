// src/app/layout.tsx
import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Federico Patiño Negocios Inmobiliarios | Córdoba',
    template: '%s | Federico Patiño Inmobiliaria',
  },
  description:
    'Más de 15 años en el mercado inmobiliario de Córdoba. Ventas, alquileres y asesoramiento profesional en propiedades residenciales y comerciales.',
  keywords: ['inmobiliaria córdoba', 'propiedades córdoba', 'casas venta córdoba', 'departamentos alquiler córdoba'],
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    url: process.env.NEXT_PUBLIC_SITE_URL,
    siteName: 'Federico Patiño Negocios Inmobiliarios',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
