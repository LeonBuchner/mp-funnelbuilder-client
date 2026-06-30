# Projekt-Kontext für Claude — Client-Repo

> Verbindlich für alle Agenten. Dies ist das **Frontend-Repo** des MP Funnel-Builders.
> Das Backend liegt im Schwester-Repo `mp-funnelbuilder-api` (Laravel). Beide bilden zusammen
> ein Produkt; dieses Repo ist der Nuxt-Client. Root dieses Repos = die Nuxt-App.

## Projekt

- **Name:** MP Funnel-Builder (Perspective-Klon), Frontend
- **Kunde:** Marketing Planet (Eigennutzung + Kundenprojekte)
- **Kopplung:** dieser Nuxt-Client + separate Laravel-API (entkoppelt, JSON über Sanctum)
- **Schwester-Repo:** `mp-funnelbuilder-api` (Laravel 13, PHP 8.4)
- **Auftrag/Vision:** `funnel-builder-bootstrap.md`. **Design-Ziel:** `docs/perspective-reference/DESIGN.md`

## Stack (echte Versionen)

- Nuxt 4.4 / Vue 3.5 (Composition API, `<script setup>`), vue-router 5
- **TypeScript 6 strict überall.** Kein `any` ohne begründeten `// eslint-disable` mit Kommentar.
- Tailwind CSS 4.3 (via `@tailwindcss/vite`), Pinia 3, VueUse 14, `@nuxt/fonts` (self-hosted Inter)
- Tests: Vitest 4.1 + Playwright 1.61 (`@axe-core/playwright` für a11y). Node 22

## Architektur

- Eine Nuxt-App, zwei Bereiche. **Admin/Builder** unter `/admin/**` (Layout `admin.vue`, Auth-Middleware, SSR aus). Öffentlicher **Renderer** unter `/f/[slug]` (Layout `renderer.vue`, SSR + SWR, PWA).
- Block-Render-Komponenten (`app/components/blocks/`) werden von Editor-Vorschau und Renderer geteilt, theme-getrieben über CSS-Variablen `--funnel-*`. `BlockRenderer.vue` nutzt STATISCHE Imports (kein `defineAsyncComponent`/Suspense), sonst Hydration-Mismatch im SSR-Renderer.
- Nuxt-Auto-Import präfixt Komponenten mit dem Ordnerpfad (z.B. `components/editor/Foo.vue` -> `<EditorFoo>`). Wird eine Komponente per Kurznamen genutzt, MUSS sie explizit importiert werden, sonst „Failed to resolve component" zur Laufzeit (in Tests unsichtbar).
- API-Basis-URLs über `runtimeConfig.public` (`apiBase` = `/api/admin`, `publicApiBase` = `/api/public`), siehe `.env.example`. Bearer-Token im localStorage; `useApi` liest ihn robust (roh oder JSON).

## Design-Ziel: Perspective 1:1

Verbindliche Referenz mit Screenshots und Tokens: `docs/perspective-reference/DESIGN.md`. Bei Layout-/Stilfragen immer zuerst dort nachsehen; bei Abweichung gilt der Screenshot.
- **App-Chrome:** heller Perspective-Look. Akzent `#3579fa`, Hintergrund `#f3f4f6`, Flächen weiß, Border `#e5e7eb`, Text `#1f2937`, Muted `#6b7280`, Schrift Inter. Editor mit zentralem Handy-Frame.
- **Renderer/Funnel-Inhalt:** übernimmt pro Funnel das Theme (`--funnel-*`), Default-Theme „MP".

## Befehle (nutzen, nicht raten)

- Install: `npm install` · Dev: `npm run dev`
- Lint/Typecheck: `npm run lint` · `npm run typecheck`
- Tests: `npm run test` (Vitest) · `npm run test:e2e` (Playwright, Backend muss laufen)
- Build: `npm run build` · Audit: `npm audit --audit-level=high`
- Lighthouse (Renderer, Prod-Build): `npm run build && PORT=3100 node .output/server/index.mjs &` dann `npx lighthouse http://localhost:3100/f/<hash> ...`
- Deploy: **niemals automatisch auf Prod. Nur vorschlagen, Leon löst aus.**

## Test-Anspruch

Vitest für Composables/Stores mit Logik (Editor, Auth, Renderer, Metriken, Themes). Playwright für Happy-Paths (Renderer-Flow, Lead-Submit, Editor) und a11y (axe). **UI/API-Änderungen immer im echten Browser verifizieren (Playwright-Screenshot + Konsolen-/4xx-Check), nicht nur per Tests/curl.**

## Verbindliche Standards

- TS strict, semantisches HTML von Anfang an.
- **Accessibility:** Renderer WCAG 2.1 AA (axe ohne critical/serious), Erklärung zur Barrierefreiheit (`/barrierefreiheit`) im Renderer-Footer.
- **Performance:** Renderer Lighthouse >= 90 in allen vier Kategorien.
- **SEO:** ein `<title>`/Meta-Description/`<h1>` pro Renderer-Seite, Canonical, JSON-LD, robots/Sitemap, Admin noindex.

## Schreibstil (alle UI-Texte, SEO-Content)

- **Keine Gedankenstriche (—).** Echte Umlaute (ü/ö/ä/ß), keine ue/oe/ae-Transliteration.
- Du-Form, groß (Du, Dir, Deine). Bodenständig, direkt, kein Marketing-Sprech. Keine drei parallelen Kurzsätze.

## Offene Nach-M1-Empfehlungen (aus der Abnahme)

CSP-Header für `/f/**`, Focus-Trap für Admin-Modale, Kontrastprüfung je Funnel-Theme, Alt-Text-Warnung im Editor, HTML-Sanitizing (DOMPurify) für `v-html`, PWA-PNG-Icons statt SVG-Platzhalter, Impressum/Datenschutz inhaltlich pflegen.
