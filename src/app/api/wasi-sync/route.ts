// src/app/api/wasi-sync/route.ts
// Llamado por Vercel Cron cada 2h (vercel.json) o manualmente desde el admin.
// Vercel Cron envía automáticamente: Authorization: Bearer <CRON_SECRET>

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { wasiGetProperties, wasiGetPropertyDetail, mapWasiProperty } from '@/lib/wasi'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let synced = 0
  let errors = 0
  let offset = 0
  const pageSize = 20
  const syncedIds: string[] = []

  try {
    while (true) {
      const wasiProps = await wasiGetProperties(offset, pageSize)
      if (wasiProps.length === 0) break

      for (const wasiProp of wasiProps) {
        try {
          // Una sola llamada HTTP en lugar de las dos anteriores (gallery + features)
          const { galleries, features } = await wasiGetPropertyDetail(wasiProp.id_property)

          const data = mapWasiProperty(wasiProp, galleries, features)
          syncedIds.push(wasiProp.id_property)

          // Upsert + borrar/recrear imágenes sin un findUnique extra
          const saved = await prisma.property.upsert({
            where: { externalId: data.externalId },
            create: { ...data, images: undefined, features: undefined },
            update: { ...data, images: undefined, features: undefined },
          })

          await prisma.propertyImage.deleteMany({ where: { propertyId: saved.id } })
          await prisma.propertyFeature.deleteMany({ where: { propertyId: saved.id } })
          if (data.images.length > 0) {
            await prisma.propertyImage.createMany({
              data: data.images.map(img => ({ ...img, propertyId: saved.id })),
            })
          }
          if (data.features.length > 0) {
            await prisma.propertyFeature.createMany({
              data: data.features.map(f => ({ ...f, propertyId: saved.id })),
            })
          }

          synced++
        } catch (err) {
          errors++
          console.error(`Error en propiedad ${wasiProp.id_property}:`, err)
        }
      }

      offset += pageSize
      if (wasiProps.length < pageSize) break
      await new Promise(r => setTimeout(r, 300))
    }

    // Desactivar propiedades eliminadas en WASI
    if (syncedIds.length > 0) {
      await prisma.property.updateMany({
        where: { crmSource: 'wasi', externalId: { notIn: syncedIds }, status: { not: 'INACTIVE' } },
        data: { status: 'INACTIVE', isPublished: false },
      })
    }

    await prisma.syncLog.create({
      data: { source: 'wasi', status: 'success', synced, errors },
    })

    return NextResponse.json({ success: true, synced, errors })
  } catch (error) {
    await prisma.syncLog.create({
      data: { source: 'wasi', status: 'error', synced, errors, message: String(error) },
    })
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
