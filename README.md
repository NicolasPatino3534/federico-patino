# Federico Patiño Negocios Inmobiliarios
## Guía de instalación y despliegue

---

## 🚀 Instalación local (5 pasos)

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env.local
```
Completá `.env.local` con tus datos reales:
- `DATABASE_URL` → Tu base de datos PostgreSQL (Neon.tech recomendado)
- `JWT_SECRET` → Generá con: `openssl rand -base64 32`
- `WASI_TOKEN` → **¡Generá un nuevo token en WASI antes de usar!**
- `CLOUDINARY_*` → Opcional para subida manual de imágenes

### 3. Crear la base de datos
```bash
npm run db:generate   # Genera el cliente Prisma
npm run db:push       # Crea las tablas en tu BD
```

### 4. Crear usuario administrador
```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function main() {
  const password = await bcrypt.hash('TU_CONTRASEÑA_AQUI', 12);
  await prisma.user.create({
    data: {
      email: 'federico@tumail.com',
      password,
      name: 'Federico Patiño',
      role: 'ADMIN'
    }
  });
  console.log('✅ Admin creado');
  await prisma.\$disconnect();
}
main();
"
```

### 5. Sincronizar propiedades de WASI
```bash
npm run sync:wasi
```

### 6. Arrancar en desarrollo
```bash
npm run dev
```
Abrí: http://localhost:3000

---

## 🌐 Deploy en Vercel (recomendado)

### 1. Crear proyecto en Vercel
```bash
npm install -g vercel
vercel login
vercel
```

### 2. Configurar variables de entorno en Vercel
En https://vercel.com → tu proyecto → Settings → Environment Variables, agregá todas las variables de `.env.example`.

### 3. Base de datos - Neon.tech (gratis)
1. Ir a https://neon.tech y crear cuenta
2. Crear un nuevo proyecto "federico-patino"
3. Copiar el `DATABASE_URL` de conexión
4. Pegarlo en Vercel como variable de entorno

### 4. Deploy
```bash
vercel --prod
```

### 5. Sync automático (Vercel Cron)
El archivo `vercel.json` ya está configurado para sincronizar con WASI cada 2 horas.
Agregá la variable de entorno:
```
CRON_SECRET=un_secret_aleatorio_seguro
```

---

## 📁 Estructura del proyecto

```
src/
├── app/
│   ├── (public)/           # Páginas públicas (Home, Propiedades, Detalle)
│   ├── admin/              # Panel administración (protegido)
│   ├── login/              # Login
│   └── api/                # API REST
│       ├── auth/           # Login/Logout
│       ├── properties/     # CRUD propiedades
│       ├── inquiries/      # Consultas
│       └── wasi-sync/      # Sync endpoint (llamado por cron)
├── components/
│   ├── layout/             # Navbar, Footer
│   ├── property/           # PropertyCard, SearchBox
│   └── ui/                 # WhatsAppButton, etc.
├── lib/
│   ├── db.ts               # Prisma client
│   ├── auth.ts             # JWT + bcrypt
│   └── wasi.ts             # Integración WASI API completa
└── types/
    └── index.ts            # TypeScript types

jobs/
└── syncWasi.ts             # Script de sync manual

prisma/
└── schema.prisma           # Schema de base de datos
```

---

## 🔑 URLs importantes

| URL | Descripción |
|-----|-------------|
| `/` | Home pública |
| `/propiedades` | Listado con filtros |
| `/propiedades/[slug]` | Detalle de propiedad |
| `/login` | Login admin/usuarios |
| `/admin/dashboard` | Panel admin |
| `/admin/propiedades` | Gestión propiedades |
| `/admin/consultas` | Gestión consultas |
| `/api/properties` | API REST propiedades |
| `/api/wasi-sync` | Trigger sync WASI |

---

## 🔄 Sincronización WASI

### Manual:
```bash
npm run sync:wasi
```

### Automática:
- Vercel Cron: cada 2 horas (configurado en `vercel.json`)
- O llamar POST a `/api/wasi-sync` con header `Authorization: Bearer TU_CRON_SECRET`

### Qué hace el sync:
1. Trae todas las propiedades de WASI (paginado de a 20)
2. Por cada propiedad, trae fotos y características
3. Hace upsert en la BD local (crea si no existe, actualiza si existe)
4. Marca como INACTIVE las propiedades que ya no están en WASI
5. Registra el resultado en la tabla `sync_logs`

---

## ⚠️ Importante: Token de WASI

**El token que se compartió en la conversación debe regenerarse en WASI.**

1. Ir a WASI → Configuración → Ajustes generales
2. Sección "API de Wasi"
3. Clic en "Generar un nuevo token"
4. Actualizar `WASI_TOKEN` en `.env.local` y en Vercel

---

## 🛠 Stack tecnológico

- **Framework**: Next.js 14 (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS
- **ORM**: Prisma
- **BD**: PostgreSQL (Neon.tech)
- **Auth**: JWT + bcrypt
- **Imágenes**: Next/Image + Cloudinary (opcional)
- **Hosting**: Vercel
- **CRM**: WASI API con sync cada 2 horas
