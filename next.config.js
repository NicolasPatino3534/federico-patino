/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Wildcard **.wasi.co cubre images., cdn., etc. Eliminamos duplicados.
    remotePatterns: [
      { protocol: 'https', hostname: '**.wasi.co' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
    // AVIF primero (hasta 60% más compacto que JPEG), WebP como fallback.
    // Soportados por todos los browsers modernos.
    formats: ['image/avif', 'image/webp'],
    // Cachear imágenes transformadas 7 días en el servidor/CDN.
    // El default de Next.js (60 s) es inadecuado para fotos de propiedades.
    minimumCacheTTL: 60 * 60 * 24 * 7,
    // Breakpoints reales del layout: 390 (mobile 1-col), 640/768 (tablet 2-col),
    // 1024+ (desktop 3-col). Evita srcset de imágenes innecesariamente grandes.
    deviceSizes: [390, 640, 768, 1024, 1280, 1536],
    imageSizes: [64, 128, 256, 384, 500, 760],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
