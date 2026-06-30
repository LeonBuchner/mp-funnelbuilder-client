<script setup lang="ts">
/**
 * Oeffentlicher Funnel-Renderer: /f/[slug]
 *
 * - SSR: Funnel-Daten per useFetch geladen, bei 404 Fehlerseite.
 * - SEO: useSeoMeta, Canonical, Favicon, Open Graph.
 * - Theme: CSS-Variablen aus content.meta.themeId am Container.
 * - State: useRendererState managt Steps, Antworten, Validierung, Submit.
 * - A11y: <main>, semantisches <form>, visuell verstecktes <h1>, sichtbarer Fokus.
 * - Events: best-effort Tracking (view, start, step_view, step_complete, lead_submit).
 * - PWA: Layout renderer, SSR aktiv (nicht in ssr:false-Regel).
 */
import { provide, computed, ref, watch, onMounted, nextTick } from 'vue'
import BlockRenderer from '~/components/blocks/BlockRenderer.vue'
import { funnelStepContextKey } from '~/composables/useFunnelStepContext'
import { useFunnelThemes } from '~/composables/useFunnelThemes'
import { useRendererState } from '~/composables/useRendererState'
import { usePublicApi } from '~/composables/usePublicApi'
import { sanitizeFunnelContent } from '~/utils/sanitizeFunnelContent'
import type { PublicFunnel } from '~/types/public-funnel'
import type { Block, ButtonBlock } from '~/types/funnel'

// ---------------------------------------------------------------------------
// Layout + Route
// ---------------------------------------------------------------------------

definePageMeta({ layout: 'renderer' })

const route = useRoute()
const slug = route.params.slug as string

// ---------------------------------------------------------------------------
// Funnel laden (SSR)
// ---------------------------------------------------------------------------

const api = usePublicApi()

/**
 * Funnel-Daten laden und HTML-Felder einmalig sanitisieren (transform).
 *
 * Der transform laeuft serverseitig; das Ergebnis wird in den Nuxt-Payload
 * serialisiert. Client-Hydration liest denselben bereits bereinigten String
 * aus dem Payload, ohne erneutes Sanitisieren. Dadurch kein SSR/Client-Divergenz
 * mehr und keine Hydration-Mismatches.
 */
const { data: funnel, error: fetchError } = await useAsyncData<PublicFunnel>(
  `funnel-${slug}`,
  () => api<PublicFunnel>(`/f/${slug}`),
  { transform: sanitizeFunnelContent },
)

// Bei Fehler (404 / Server-Fehler) Error-Seite anzeigen
if (fetchError.value) {
  const statusCode
    = (fetchError.value as { statusCode?: number; status?: number })?.statusCode
    ?? (fetchError.value as { statusCode?: number; status?: number })?.status
    ?? 500

  throw createError({
    statusCode: statusCode === 404 ? 404 : 500,
    statusMessage:
      statusCode === 404 ? 'Funnel nicht gefunden' : 'Fehler beim Laden des Funnels',
    fatal: true,
  })
}

// Sicherheit: Wenn Daten fehlen (sollte nicht vorkommen nach Fehlerprüfung oben)
if (!funnel.value) {
  throw createError({ statusCode: 404, statusMessage: 'Funnel nicht gefunden', fatal: true })
}

const funnelData = funnel.value

// ---------------------------------------------------------------------------
// SEO
// ---------------------------------------------------------------------------

const seoTitle = funnelData.settings.seo_title ?? funnelData.name
const seoDescription = funnelData.settings.seo_description ?? ''
const ogImage = funnelData.settings.og_image_path ?? undefined

const requestOrigin = useRequestURL().origin
const canonicalUrl = `${requestOrigin}/f/${slug}`

useSeoMeta({
  title: seoTitle,
  ogTitle: seoTitle,
  ogType: 'website',
  ogUrl: canonicalUrl,
  description: seoDescription,
  ogDescription: seoDescription,
  ...(ogImage ? { ogImage, twitterImage: ogImage } : {}),
  twitterCard: 'summary_large_image',
  twitterTitle: seoTitle,
  twitterDescription: seoDescription || undefined,
})

// JSON-LD: WebPage + Organization (valide, keine erfundenen Felder)
const schemaWebPage = {
  '@type': 'WebPage',
  '@id': canonicalUrl,
  url: canonicalUrl,
  name: seoTitle,
  inLanguage: 'de',
  ...(seoDescription ? { description: seoDescription } : {}),
  ...(ogImage ? { image: ogImage } : {}),
  isPartOf: {
    '@type': 'WebSite',
    '@id': `${requestOrigin}/#website`,
    url: requestOrigin,
    name: 'MP Funnel-Builder',
    inLanguage: 'de',
    publisher: { '@id': 'https://marketing-planet.de/#organization' },
  },
}

const schemaOrganization = {
  '@type': 'Organization',
  '@id': 'https://marketing-planet.de/#organization',
  name: 'Marketing Planet',
  url: 'https://marketing-planet.de',
  email: 'hello@marketing-planet.de',
}

useHead({
  link: [
    // Canonical auf die Funnel-URL (absolute URL gemaess SEO-Standard)
    { rel: 'canonical', href: canonicalUrl },
    // Benutzerdefiniertes Favicon (falls vorhanden)
    ...(funnelData.settings.favicon_path
      ? [{ rel: 'icon', href: funnelData.settings.favicon_path }]
      : []),
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [schemaWebPage, schemaOrganization],
      }),
    },
  ],
})

// ---------------------------------------------------------------------------
// Theme (CSS-Variablen)
// ---------------------------------------------------------------------------

const { getThemeVars } = useFunnelThemes()
const themeVars = computed<Record<string, string>>(() =>
  getThemeVars(funnelData.content.meta.themeId ?? 'mp'),
)
const containerStyle = computed(() => ({
  ...themeVars.value,
  backgroundColor: 'var(--funnel-bg)',
  fontFamily: 'var(--funnel-font)',
  color: 'var(--funnel-text)',
}))

// ---------------------------------------------------------------------------
// Renderer-State
// ---------------------------------------------------------------------------

const renderer = useRendererState(slug, funnelData.content.steps)

// Step-Kontext fuer BlockProgress bereitstellen
provide(funnelStepContextKey, renderer.stepContext)

// ---------------------------------------------------------------------------
// UTM-Parameter aus URL
// ---------------------------------------------------------------------------

const utm = computed(() => {
  const q = route.query
  const result: Record<string, string> = {}
  if (q.utm_source) result.source = String(q.utm_source)
  if (q.utm_medium) result.medium = String(q.utm_medium)
  if (q.utm_campaign) result.campaign = String(q.utm_campaign)
  if (q.utm_term) result.term = String(q.utm_term)
  if (q.utm_content) result.content = String(q.utm_content)
  return Object.keys(result).length > 0 ? result : undefined
})

// ---------------------------------------------------------------------------
// Tracking (nur clientseitig, nach Mount)
// ---------------------------------------------------------------------------

const hasStarted = ref(false)

onMounted(() => {
  renderer.trackEvent('view')
  renderer.trackEvent('step_view', { step_index: 0 })
})

function trackStart(): void {
  if (hasStarted.value) return
  hasStarted.value = true
  renderer.trackEvent('start')
}

// ---------------------------------------------------------------------------
// Interaktions-Handler
// ---------------------------------------------------------------------------

/** Wird aufgerufen, wenn ein Block einen Wert aendert (v-model). */
function handleAnswerUpdate(block: Block, value: string | boolean): void {
  trackStart()
  renderer.updateAnswer(block, value)
}

/** Wird aufgerufen, wenn ein Button-Block seine action ausfuehrt. */
async function handleBlockAction(action: string, block: Block): Promise<void> {
  trackStart()

  if (action === 'external_url' && block.type === 'button') {
    const btn = block as ButtonBlock
    if (btn.externalUrl) {
      if (btn.openInNewTab) {
        window.open(btn.externalUrl, '_blank', 'noopener,noreferrer')
      }
      else {
        window.location.href = btn.externalUrl
      }
    }
    return
  }

  if (action === 'submit') {
    transitionDirection.value = 'forward'
    await renderer.submitLead({ utm: utm.value })
    return
  }

  if (action === 'next') {
    transitionDirection.value = 'forward'
  }

  await renderer.handleAction(action)
}

// Hilfsfunktion: prueft ob aktuell der result- oder letzte Step sichtbar ist
const isResultStep = computed<boolean>(() => {
  const step = renderer.currentStep.value
  return step?.type === 'result'
    || renderer.currentStepIndex.value === funnelData.content.steps.length - 1
})

// Schritttypen, fuer die ein Zurueck-Button sinnvoll ist
const canGoBack = computed<boolean>(
  () => renderer.currentStepIndex.value > 0
    && renderer.currentStep.value?.type !== 'result'
    && !renderer.isSubmitted.value,
)

// Hat der aktuelle Step mindestens einen Button-Block?
const currentStepHasButton = computed<boolean>(
  () => renderer.currentStep.value?.blocks.some(b => b.type === 'button') ?? false,
)

// Keyboard-Handler fuer Enter-Taste im Formular
async function handleFormSubmit(): Promise<void> {
  // Enter im Formular loest next() aus (wenn kein Button vorhanden)
  if (!currentStepHasButton.value) {
    await renderer.next()
  }
}

// Fuer Slide-Transition: Richtung beim Naechster-Schritt vs. Zurueck
const transitionDirection = ref<'forward' | 'back'>('forward')

// Transition-Name beruecksichtigt Richtung fuer die Slide-Animation
const transitionName = computed<string>(() => {
  switch (funnelData.content.settings.animations) {
    case 'slide':
      return transitionDirection.value === 'back' ? 'funnel-slide-back' : 'funnel-slide'
    case 'fade':
      return 'funnel-fade'
    default:
      return ''
  }
})

function goBack(): void {
  transitionDirection.value = 'back'
  nextTick(() => renderer.back())
}

/**
 * Fokus-Management: Nach jedem Step-Wechsel (auch bei auto-advance)
 * wird der Fokus auf <main id="funnel-main"> gesetzt.
 * Damit verlieren Tastatur- und Screenreader-Nutzer nicht ihren
 * Kontext wenn ein Step via auto-advance oder Klick wechselt.
 * tabindex="-1" auf <main> erlaubt programmatisches focus().
 */
watch(renderer.currentStepIndex, () => {
  nextTick(() => {
    if (import.meta.client) {
      document.getElementById('funnel-main')?.focus({ preventScroll: false })
    }
  })
})

/**
 * Gibt die Fehlermeldung eines Blocks zurueck (oder undefined).
 * Nur Bloecke mit fieldKey koennen Fehler haben.
 */
function getBlockError(block: Block): string | undefined {
  if (!('fieldKey' in block)) return undefined
  const fk = (block as Block & { fieldKey: string }).fieldKey
  return renderer.errors.value[fk] || undefined
}
</script>

<template>
  <div
    class="w-full min-h-screen flex flex-col items-center justify-center py-8"
    :style="containerStyle"
  >
    <!--
      Visuell versteckter <h1> mit dem Funnel-Titel.
      Stellt sicher, dass genau ein <h1> auf der Seite vorhanden ist.
      Inhalts-Bloecke (TextBlock) verwenden h2 oder tiefer.
    -->
    <h1 class="sr-only">
      {{ seoTitle }}
    </h1>

    <!--
      Funnel-Container: schmale zentrierte Spalte (mobile-first).
      Kein Card-Rahmen, kein Schatten – der Viewport-Hintergrund (--funnel-bg)
      fuellt die gesamte Breite. Auf mobilen Screens volle Breite, auf Desktop
      auf max. 460 px zentriert (mx-auto als Absicherung neben items-center).
    -->
    <div
      class="w-full max-w-[460px] mx-auto"
      role="region"
      aria-label="Funnel"
    >
      <!-- Rate-Limit-Hinweis -->
      <div
        v-if="renderer.rateLimitError.value"
        class="p-6 text-center text-sm"
        role="alert"
        aria-live="polite"
      >
        <p class="font-semibold" style="color: var(--funnel-text);">
          Zu viele Anfragen
        </p>
        <p class="mt-1" style="color: var(--funnel-muted);">
          Bitte warte einen Moment und versuche es erneut.
        </p>
      </div>

      <!-- Allgemeiner Submit-Fehler -->
      <div
        v-else-if="renderer.submitError.value"
        class="p-6 text-center text-sm"
        role="alert"
        aria-live="polite"
      >
        <p style="color: var(--funnel-text);">
          {{ renderer.submitError.value }}
        </p>
        <button
          type="button"
          class="mt-3 text-xs underline focus:outline-none focus:ring-2 focus:ring-offset-2"
          :style="{ color: 'var(--funnel-accent)', '--tw-ring-color': 'var(--funnel-accent)' }"
          @click="renderer.submitError.value = null"
        >
          Erneut versuchen
        </button>
      </div>

      <!-- Normaler Schritt-Inhalt -->
      <div
        v-else-if="renderer.currentStep.value"
        class="relative"
      >
        <!-- Step-Transition (Slide-Richtung wird ueber den Transition-Namen gesteuert) -->
        <Transition
          :name="transitionName"
          mode="out-in"
        >
          <form
            :key="renderer.currentStepIndex.value"
            class="px-6 py-8"
            :aria-label="`Schritt ${renderer.currentStepIndex.value + 1} von ${funnelData.content.steps.length}`"
            novalidate
            @submit.prevent="handleFormSubmit"
          >
            <!-- Bloecke des aktuellen Steps -->
            <div
              v-for="block in renderer.currentStep.value.blocks"
              :key="block.id"
              class="mb-4 last:mb-0"
            >
              <BlockRenderer
                :block="block"
                mode="live"
                :model-value="renderer.getAnswerForBlock(block)"
                :error="getBlockError(block)"
                @update:model-value="(val: string | boolean) => handleAnswerUpdate(block, val)"
                @action="(action: string) => handleBlockAction(action, block)"
              />

              <!-- Inline-Fehlermeldung pro Feld.
                   id="field-error-{block.id}" erlaubt aria-describedby im Input/Fieldset. -->
              <p
                v-if="getBlockError(block)"
                :id="`field-error-${block.id}`"
                class="mt-1.5 text-xs text-red-600"
                role="alert"
                aria-live="polite"
              >
                {{ getBlockError(block) }}
              </p>
            </div>

            <!-- Zurueck-Button (wenn nicht erster Schritt und kein Result-Step) -->
            <div
              v-if="canGoBack"
              class="mt-4 flex justify-start"
            >
              <button
                type="button"
                class="flex items-center gap-1 text-xs focus:outline-none focus:ring-2 focus:ring-offset-2 rounded"
                :style="{
                  color: 'var(--funnel-muted)',
                  '--tw-ring-color': 'var(--funnel-accent)',
                }"
                @click="goBack"
              >
                <svg
                  class="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2.5"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Zurück
              </button>
            </div>

            <!-- Lade-Zustand waehrend Submit -->
            <div
              v-if="renderer.isSubmitting.value"
              class="mt-4 flex justify-center"
              role="status"
              aria-live="polite"
            >
              <span class="sr-only">Formular wird gesendet...</span>
              <div
                class="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"
                style="color: var(--funnel-primary);"
                aria-hidden="true"
              />
            </div>
          </form>
        </Transition>

        <!-- MP-Pflicht-Branding am Result- oder letzten Schritt -->
        <RendererMpBranding v-if="isResultStep" />
      </div>

      <!-- Fallback: kein Step vorhanden -->
      <div
        v-else
        class="p-8 text-center text-sm"
        style="color: var(--funnel-muted);"
        role="status"
      >
        Dieser Funnel hat noch keine Schritte.
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Slide vorwaerts: naechster Schritt kommt von rechts */
.funnel-slide-enter-active,
.funnel-slide-leave-active {
  transition: transform 0.28s ease, opacity 0.2s ease;
}

.funnel-slide-enter-from {
  transform: translateX(32px);
  opacity: 0;
}

.funnel-slide-leave-to {
  transform: translateX(-32px);
  opacity: 0;
}

/* Slide rueckwaerts: vorheriger Schritt kommt von links */
.funnel-slide-back-enter-active,
.funnel-slide-back-leave-active {
  transition: transform 0.28s ease, opacity 0.2s ease;
}

.funnel-slide-back-enter-from {
  transform: translateX(-32px);
  opacity: 0;
}

.funnel-slide-back-leave-to {
  transform: translateX(32px);
  opacity: 0;
}

/* Fade-Transition */
.funnel-fade-enter-active,
.funnel-fade-leave-active {
  transition: opacity 0.22s ease;
}

.funnel-fade-enter-from,
.funnel-fade-leave-to {
  opacity: 0;
}
</style>
