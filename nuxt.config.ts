import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  app: {
    head: {
      // Sprache fuer A11y/SEO. Inter wird ueber @nuxt/fonts self-hosted geladen
      // (kein render-blockierender externer Google-Fonts-Request).
      htmlAttrs: { lang: 'de' },
    },
  },

  devtools: { enabled: true },

  modules: [
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@vite-pwa/nuxt',
  ],

  // Kein globales CSS mehr: Layouts laden ihr spezifisches Bundle.
  // renderer.vue -> renderer.css (kleineres Bundle ohne Editor-Klassen)
  // admin.vue / auth.vue / editor.vue -> main.css (volles Bundle)

  vite: {
    plugins: [tailwindcss()],
    // TipTap + ProseMirror in den SSR-Bundle einbetten statt als externe
    // Node-Modules zu behandeln. Verhindert CJS/ESM-Interop-Fehler im Build.
    ssr: {
      noExternal: [
        '@tiptap/core',
        '@tiptap/vue-3',
        '@tiptap/pm',
        '@tiptap/starter-kit',
        '@tiptap/extension-link',
        '@tiptap/extension-underline',
      ],
    },
  },

  // Pre-komprimierte Assets (Brotli + gzip) fuer schlanke Uebertragung.
  // Statische Dateien (_nuxt/) werden waehrend des Builds vorkomprimiert.
  nitro: {
    compressPublicAssets: {
      brotli: true,
      gzip: true,
    },
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  eslint: {
    config: {
      stylistic: false,
    },
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:8000/api/admin',
      publicApiBase: process.env.NUXT_PUBLIC_API_BASE_PUBLIC || 'http://localhost:8000/api/public',
    },
  },

  routeRules: {
    // Admin-Bereich laeuft als SPA (kein SSR, kein localStorage-Problem im Server-Kontext).
    // X-Robots-Tag verhindert Indexierung durch Crawler (meta robots greift nicht bei SPA).
    '/admin/**': { ssr: false, headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    // Auth-Seiten ebenfalls nicht indexieren
    '/auth/**': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    // Renderer: SSR mit SWR-Cache fuer 60s. Wiederholte Aufrufe desselben Funnels
    // werden aus dem Nitro-internen Cache bedient (kein erneuter API-Call zum Backend).
    // Cache wird beim naechsten Request nach Ablauf im Hintergrund erneuert.
    '/f/**': { swr: 60 },
  },

  // PWA: Manifest + Service Worker fuer den oeffentlichen Funnel-Renderer
  // Der SW wird am Client registriert; der Scope beschraenkt sich auf /f/.
  // Keine Offline-Pflicht: navigateFallback ist deaktiviert.
  pwa: {
    registerType: 'autoUpdate',

    // Nur im Build aktiv; im Dev-Server reicht Hot-Reload
    devOptions: {
      enabled: false,
    },

    manifest: {
      name: 'MP Funnel',
      short_name: 'MP Funnel',
      description: 'Marketing Planet Funnels',
      theme_color: '#1c4687',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait',
      scope: '/f/',
      start_url: '/f/',
      icons: [
        {
          src: '/icon.svg',
          sizes: 'any',
          type: 'image/svg+xml',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PWA manifest type
          purpose: 'any maskable' as any,
        },
      ],
    },

    workbox: {
      // Keine offline Fallback-Seite
      navigateFallback: undefined,
      // Cache JS, CSS und Bilder
      globPatterns: ['**/*.{js,css,ico,svg,woff2}'],
      // Admin- und Auth-Routen werden nicht vom SW kontrolliert
      navigateFallbackDenylist: [/^\/admin/, /^\/auth/, /^\/api/],
      // Strategie: Network-first fuer Navigationsanfragen
      runtimeCaching: [
        {
          urlPattern: /^https?:\/\/[^/]*\/f\//,
          handler: 'NetworkFirst' as const,
          options: {
            cacheName: 'mp-funnel-pages',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 60 * 24, // 24 Stunden
            },
          },
        },
      ],
    },
  },
})
