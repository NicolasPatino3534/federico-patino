'use client'
// src/components/property/ContactForm.tsx
import { useState } from 'react'

export default function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    const form = e.currentTarget
    const raw = new FormData(form)
    const data = {
      name:    raw.get('name') as string,
      phone:   (raw.get('phone') as string) || undefined,
      email:   raw.get('email') as string,
      message: (raw.get('message') as string) || (raw.get('subject') as string) || '',
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

  if (status === 'success') {
    return (
      <div className="bg-white rounded-2xl p-9 shadow-[0_4px_24px_rgba(13,31,60,0.07)] text-center">
        <div className="text-green-600 font-serif text-xl mb-3">¡Consulta enviada!</div>
        <p className="text-slate-500 text-sm">Federico se comunicará con vos a la brevedad.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-9 shadow-[0_4px_24px_rgba(13,31,60,0.07)]">
      <h3 className="font-serif text-xl text-[#0d1f3c] mb-7">Envianos tu consulta</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#0d1f3c] mb-1.5">Nombre *</label>
            <input name="name" type="text" required placeholder="Tu nombre" className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0d1f3c] mb-1.5">Teléfono</label>
            <input name="phone" type="tel" placeholder="+54 351…" className="input-field" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#0d1f3c] mb-1.5">Email *</label>
          <input name="email" type="email" required placeholder="tu@email.com" className="input-field" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#0d1f3c] mb-1.5">¿Qué necesitás?</label>
          <select name="subject" className="input-field">
            <option>Quiero comprar una propiedad</option>
            <option>Quiero vender una propiedad</option>
            <option>Quiero alquilar</option>
            <option>Tasación de mi propiedad</option>
            <option>Otro</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#0d1f3c] mb-1.5">Mensaje</label>
          <textarea name="message" rows={4} placeholder="Contanos lo que buscás…" className="input-field resize-none" />
        </div>
        {status === 'error' && (
          <p className="text-red-500 text-xs">Error al enviar. Intentá de nuevo.</p>
        )}
        <button
          type="submit"
          disabled={status === 'loading'}
          className="btn-navy w-full justify-center disabled:opacity-60"
        >
          {status === 'loading' ? 'Enviando…' : 'Enviar consulta'}
        </button>
      </form>
    </div>
  )
}
