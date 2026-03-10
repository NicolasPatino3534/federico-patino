// jobs/syncWasi.ts
// Ejecutar con: npm run sync:wasi
// O configurar como cron job en Vercel/Railway

import { PrismaClient } from '@prisma/client'
import {
  wasiGetProperties,
  wasiGetPropertyDetail,
  mapWasiProperty,
} from '../src/lib/wasi'

const prisma = new PrismaClient()

async function syncWasi() {
  console.log('🔄 Iniciando sincronización con WASI...')
  const startTime = Date.now()

  let synced = 0
  let errors = 0
  let offset = 0
  const pageSize = 20
  const syncedIds: string[] = []

  try {
    while (true) {
      console.log(`  📦 Obteniendo propiedades ${offset + 1}–${offset + pageSize}...`)
      const wasiProps = await wasiGetProperties(offset, pageSize)

      if (wasiProps.length === 0) {
        console.log('  ✅ No hay más propiedades.')
        break
      }

      for (const wasiProp of wasiProps) {
        try {
          // Una sola llamada HTTP en lugar de dos (wasiGetGallery + wasiGetFeatures)
          const { galleries, features } = await wasiGetPropertyDetail(wasiProp.id_property)

          const data = mapWasiProperty(wasiProp, galleries, features)
          syncedIds.push(wasiProp.id_property)

          // Upsert: crear si no existe, actualizar si existe
          // El resultado ya contiene el id, sin necesidad de un findUnique extra
          const saved = await prisma.property.upsert({
            where: { externalId: data.externalId },
            create: { ...data, images: undefined, features: undefined },
            update: { ...data, images: undefined, features: undefined },
          })

          // Borrar imágenes/características viejas y recrear con el id del upsert
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
          process.stdout.write('.')
        } catch (err) {
          console.error(`\n  ❌ Error en propiedad ${wasiProp.id_property}:`, err)
          errors++
        }
      }

      offset += pageSize

      // Si devolvió menos que pageSize, terminamos
      if (wasiProps.length < pageSize) break

      // Pequeña pausa para no saturar la API
      await new Promise(r => setTimeout(r, 500))
    }

    // Marcar como INACTIVE propiedades que ya no están en WASI
    if (syncedIds.length > 0) {
      const deactivated = await prisma.property.updateMany({
        where: {
          crmSource: 'wasi',
          externalId: { notIn: syncedIds.map(String) },
          status: { not: 'INACTIVE' },
        },
        data: { status: 'INACTIVE', isPublished: false },
      })
      if (deactivated.count > 0) {
        console.log(`\n  🔴 ${deactivated.count} propiedades marcadas como inactivas.`)
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`\n\n✅ Sync completado en ${elapsed}s — ${synced} propiedades, ${errors} errores.`)

    await prisma.syncLog.create({
      data: {
        source: 'wasi',
        status: 'success',
        synced,
        errors,
        message: `Sync completado en ${elapsed}s`,
      },
    })
  } catch (err) {
    console.error('\n❌ Error fatal en sync:', err)
    await prisma.syncLog.create({
      data: {
        source: 'wasi',
        status: 'error',
        synced,
        errors,
        message: String(err),
      },
    })
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

syncWasi()
