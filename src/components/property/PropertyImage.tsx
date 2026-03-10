'use client'
// src/components/property/PropertyImage.tsx
//
// Wrapper sobre next/image que captura errores de URL rotas en runtime.
// WASI a veces sirve URLs expiradas o inaccesibles — este componente
// muestra el placeholder de la inmobiliaria en lugar de una imagen rota.

import { useState } from 'react'
import Image, { type ImageProps } from 'next/image'
import { Building2 } from 'lucide-react'

type Props = Omit<ImageProps, 'onError'> & {
  /** URL de imagen de respaldo. Si no se provee, muestra el placeholder SVG. */
  fallbackSrc?: string
}

export default function PropertyImage({ fallbackSrc, alt, src, className, ...rest }: Props) {
  const [errored, setErrored] = useState(false)

  // Si tenemos una URL de fallback y la principal falló → intentar con la de respaldo.
  // Si no hay fallback (o ya falló también) → mostrar el placeholder genérico.
  const currentSrc = errored && fallbackSrc ? fallbackSrc : src

  if (errored && !fallbackSrc) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-slate-100 text-slate-300 ${className ?? ''}`}
        style={rest.style}
        aria-label={alt as string}
      >
        <Building2 size={40} strokeWidth={1.2} />
        <span className="text-[10px] mt-2 text-slate-400 font-medium tracking-wide uppercase">
          Sin imagen
        </span>
      </div>
    )
  }

  return (
    <Image
      {...rest}
      src={currentSrc}
      alt={alt}
      className={className}
      // onError se dispara cuando el browser no puede cargar la URL.
      // Marcamos errored=true para re-renderizar con el fallback.
      onError={() => setErrored(true)}
    />
  )
}
