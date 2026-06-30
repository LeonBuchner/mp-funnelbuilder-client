# MP Funnel-Builder — Web (`web/`)

Frontend des MP Funnel-Builders. Backend im Schwester-Repo
[`mp-funnelbuilder-api`](https://github.com/LeonBuchner/mp-funnelbuilder-api). Nuxt 4 (Vue 3.5,
TypeScript strict), Tailwind 4,
Pinia, VueUse.

## Zwei Bereiche

- **Admin/Builder** unter `/admin/**`: Funnel-Liste, WYSIWYG-Editor mit Handy-Frame, Metriken.
  Läuft als SPA (`ssr: false`).
- **Öffentlicher Renderer** unter `/f/[slug]`: veröffentlichte Funnels, mobile-first, SSR,
  Lead-Erfassung, internes Tracking, Pflicht-MP-Branding.

Block-Render-Komponenten (`app/components/blocks/`) werden von Editor-Vorschau und Renderer
geteilt und sind theme-getrieben (CSS-Variablen `--funnel-*`).

Design-Ziel ist 1:1 Perspective. Referenz und Tokens in
[`docs/perspective-reference/DESIGN.md`](./docs/perspective-reference/DESIGN.md).

## Setup

```bash
npm install
npm run dev                  # http://localhost:3000
```

Die API-Basis-URLs werden über `runtimeConfig.public` gesetzt (Default localhost:8000), siehe
`.env.example` (`NUXT_PUBLIC_API_BASE`, `NUXT_PUBLIC_API_BASE_PUBLIC`). Das Backend muss laufen.

## Tests und Qualität

```bash
npm run lint                 # ESLint (TS strict)
npm run typecheck            # vue-tsc
npm run test                 # Vitest (Unit/Component)
npm run test:e2e             # Playwright (Server müssen laufen)
npm run build                # Production-Build
```

Standards: TypeScript strict (kein unbegründetes `any`), semantisches HTML, WCAG 2.1 AA im
Renderer, Lighthouse >= 90. Du-Form, echte Umlaute, keine Gedankenstriche in UI-Texten.
Details in der [CLAUDE.md](./CLAUDE.md).
