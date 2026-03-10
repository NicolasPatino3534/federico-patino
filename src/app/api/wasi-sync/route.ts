// src/app/api/wasi-sync/route.ts
//
// Disparado por Vercel Cron (vercel.json) cada 2h o manualmente desde admin.
// Vercel Cron inyecta automáticamente: Authorization: Bearer <CRON_SECRET>
//
// MEJORAS vs la versión anterior:
//   1. Procesamiento concurrente por lotes de CONCURRENCY propiedades a la vez
//      (era secuencial: 1 prop → HTTP → upsert → siguiente).
//      Con 100 propiedades y CONCURRENCY=5 → ~5x más rápido.
//   2. Upsert + deleteMany/createMany de imágenes y features en una sola
//      transacción Prisma → si algo falla, revierte todo el registro, sin
//      dejar datos corrompidos a mitad de escritura.
//   3. Promise.allSettled asegura que un error en prop X no cancela el lote.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { wasiGetProperties, wasiGetPropertyDetail, mapWasiProperty, type WasiProperty } from '@/lib/wasi'

// Cuántas propiedades procesamos en paralelo por ronda.
// Ajustar según los rate-limits de WASI y conexiones max de la DB.
const CONCURRENCY = 5
const PAGE_SIZE = 20

// ─── Tipo interno del batch item ─────────────────────────────────────────────
interface BatchItem {
  prop:      WasiProperty          // item del listado (puede tener campos incompletos)
  property:  WasiProperty | null   // objeto completo del endpoint de detalle
  galleries: Awaited<ReturnType<typeof wasiGetPropertyDetail>>['galleries']
  features:  Awaited<ReturnType<typeof wasiGetPropertyDetail>>['features']
}

// ─── Helper: procesar UNA propiedad en una sola transacción atómica ──────────

async function syncOneProperty(wasiId: string, wasiPropRaw: BatchItem) {
  const { prop, property: detailProp, galleries, features } = wasiPropRaw
  // Usar el objeto del detail cuando esté disponible: tiene todos los campos
  // (status_on_page_label, galleries, features, etc.).
  // El item del listado puede tener campos vacíos o desactualizados.
  const data = mapWasiProperty(detailProp ?? prop, galleries, features)

  // Transacción: si createMany de imágenes falla, el upsert se revierte.
  await prisma.$transaction(async (tx) => {
    const saved = await tx.property.upsert({
      where:  { externalId: data.externalId },
      create: { ...data, images: undefined, features: undefined },
      update: { ...data, images: undefined, features: undefined },
      select: { id: true },
    })

    // Borrar y recrear en la misma transacción → atómico
    await tx.propertyImage.deleteMany({ where: { propertyId: saved.id } })
    await tx.propertyFeature.deleteMany({ where: { propertyId: saved.id } })

    if (data.images.length > 0) {
      await tx.propertyImage.createMany({
        data: data.images.map(img => ({ ...img, propertyId: saved.id })),
      })
    }
    if (data.features.length > 0) {
      await tx.propertyFeature.createMany({
        data: data.features.map(f => ({ ...f, propertyId: saved.id })),
      })
    }
  })

  return wasiId
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Vercel Cron envía el Bearer automáticamente; peticiones manuales deben incluirlo.
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  let synced = 0
  let errors = 0
  let offset = 0
  const syncedExternalIds: string[] = []  // IDs de WASI vistos en este sync

  try {
    // ── Fase 1: paginar WASI y procesar en lotes concurrentes ───────────────
    while (true) {
      const page = await wasiGetProperties(offset, PAGE_SIZE)
      if (page.length === 0) break

      // Dividir la página en sub-lotes de CONCURRENCY y procesarlos en paralelo
      for (let i = 0; i < page.length; i += CONCURRENCY) {
        const batch = page.slice(i, i + CONCURRENCY)

        // Fetch detalle de cada prop en el lote — en paralelo.
        // Construimos un BatchItem explícito para no mezclar campos del listado
        // con los del detalle (el detalle tiene status_on_page_label completo).
        const detailResults = await Promise.allSettled(
          batch.map(p => wasiGetPropertyDetail(p.id_property).then(detail => ({
            prop:     p,
            property: detail.property,
            galleries: detail.galleries,
            features:  detail.features,
          } satisfies BatchItem)))
        )

        // Upsert de cada prop en el lote — en paralelo
        const upsertResults = await Promise.allSettled(
          detailResults.map((result, idx) => {
            if (result.status === 'rejected') return Promise.reject(result.reason)
            return syncOneProperty(batch[idx].id_property, result.value)
          })
        )

        for (let j = 0; j < batch.length; j++) {
          const r = upsertResults[j]
          if (r.status === 'fulfilled') {
            syncedExternalIds.push(r.value)
            synced++
          } else {
            errors++
            console.error(`[wasi-sync] Error prop ${batch[j].id_property}:`, r.reason)
          }
        }
      }

      offset += PAGE_SIZE
      if (page.length < PAGE_SIZE) break

      // Pausa entre páginas para no saturar la API de WASI
      await new Promise(r => setTimeout(r, 300))
    }

    // ── Fase 2: marcar como INACTIVE las props que ya no responde WASI ──────
    let deactivated = 0
    if (syncedExternalIds.length > 0) {
      const result = await prisma.property.updateMany({
        where: {
          crmSource: 'wasi',
          externalId: { notIn: syncedExternalIds },
          status:    { not: 'INACTIVE' },
        },
        data: { status: 'INACTIVE', isPublished: false },
      })
      deactivated = result.count
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    await prisma.syncLog.create({
      data: {
        source:  'wasi',
        status:  'success',
        synced,
        errors,
        message: `Sync en ${elapsed}s — ${deactivated} desactivadas`,
      },
    })

    return NextResponse.json({ success: true, synced, errors, deactivated, elapsed })

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[wasi-sync] Error fatal:', message)

    await prisma.syncLog.create({
      data: { source: 'wasi', status: 'error', synced, errors, message },
    }).catch(() => {}) // no fallar en el log si la DB tampoco responde

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
