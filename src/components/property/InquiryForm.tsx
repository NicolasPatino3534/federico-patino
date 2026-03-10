'use client'
// src/components/property/InquiryForm.tsx
import { useState } from 'react'
import { MessageSquare } from 'lucide-react'

interface InquiryFormProps {
  propertyId: string
  propertyTitle: string
}

export default function InquiryForm({ propertyId, propertyTitle }: InquiryFormProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    const form = e.currentTarget
    const raw = new FormData(form)
    const data = {
      propertyId,
      name:    raw.get('name') as string,
      email:   raw.get('email') as string,
      phone:   (raw.get('phone') as string) || undefined,
      message: raw.get('message') as string,
    }

    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
      form.reset()
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="border-t border-slate-100 pt-5 mt-2">
      <div className="flex items-center gap-2 text-[#0d1f3c] text-sm font-semibold mb-4">
        <MessageSquare size={15} />
        O envianos un mensaje
      </div>
      {status === 'success' ? (
        <div className="text-center py-6">
          <div className="text-green-600 font-semibold text-sm mb-1">¡Consulta enviada!</div>
          <p className="text-slate-400 text-xs">Te responderemos a la brevedad.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input name="name" type="text" required placeholder="Tu nombre" className="input-field text-sm" />
          <input name="email" type="email" required placeholder="tu@email.com" className="input-field text-sm" />
          <input name="phone" type="tel" placeholder="+54 351…" className="input-field text-sm" />
          <textarea
            name="message"
            rows={3}
            required
            placeholder="Me interesa esta propiedad…"
            defaultValue={`Hola, me interesa la propiedad "${propertyTitle}". ¿Podés darme más información?`}
            className="input-field text-sm resize-none"
          />
          {status === 'error' && (
            <p className="text-red-500 text-xs">Error al enviar. Intentá de nuevo.</p>
          )}
          <button
            type="submit"
            disabled={status === 'loading'}
            className="btn-navy w-full justify-center text-sm disabled:opacity-60"
          >
            {status === 'loading' ? 'Enviando…' : 'Enviar consulta'}
          </button>
        </form>
      )}
    </div>
  )
}
