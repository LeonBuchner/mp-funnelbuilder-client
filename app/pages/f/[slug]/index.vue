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
 *
 * A/B-Varianten (M3.7):
 * - SSR rendert immer den Standard-Content (Kontrolle).
 * - Nach onMounted wird useAbVariant aufgerufen (clientseitig).
 * - 204 -> kein A/B-Test -> Standard-Content bleibt unveraendert.
 * - 200 -> abContent wird reaktiv aktiviert (setActiveSteps + activeContent).
 * - Der Swap geschieht NACH der Hydration -> kein Hydration-Mismatch.
 * - ab_variant_id fliesst per setAbVariantId in Tracking und Lead-Submit.
 */
import { provide, computed, ref, watch, onMounted, nextTick, shallowRef } from 'vue'
import BlockRenderer from '~/components/blocks/BlockRenderer.vue'
import { funnelStepContextKey } from '~/composables/useFunnelStepContext'
import { personalizationKey } from '~/composables/usePersonalizationContext'
import { usePersonalization } from '~/composables/usePersonalization'
import { useFunnelThemes } from '~/composables/useFunnelThemes'
import { brandingToFunnelVars } from '~/composables/useBrandings'
import { useRendererState } from '~/composables/useRendererState'
import { useAbVariant } from '~/composables/useAbVariant'
import { usePublicApi } from '~/composables/usePublicApi'
import { sanitizeFunnelContent } from '~/utils/sanitizeFunnelContent'
import type { PublicFunnel } from '~/types/public-funnel'
import type { FunnelContent, Block, ButtonBlock } from '~/types/funnel'

// ---------------------------------------------------------------------------
// Consent-Hilfsfunktionen (localStorage, SSR-sicher)
// ---------------------------------------------------------------------------

/** Liest den Tracking-Consent aus localStorage. null = noch nicht gesetzt. */
function readTrackingConsent(funnelSlug: string): boolean | null {
  if (!import.meta.client) return null
  try {
    const raw = window.localStorage.getItem(`mp_consent:${funnelSlug}:tracking`)
    if (raw === 'true') return true
    if (raw === 'false') return false
    return null
  }
  catch {
    return null
  }
}

/** Schreibt den Tracking-Consent in localStorage. */
function writeTrackingConsent(funnelSlug: string, value: boolean): void {
  if (!import.meta.client) return
  try {
    window.localStorage.setItem(`mp_consent:${funnelSlug}:tracking`, String(value))
  }
  catch { /* localStorage nicht verfuegbar */ }
}

// ---------------------------------------------------------------------------
// GA4 + Meta Pixel Laden (nur nach Consent, nur clientseitig)
// ---------------------------------------------------------------------------

/**
 * Prueft ob eine GA4-Measurement-ID dem erlaubten Format entspricht.
 * Gleicht das backend-seitige Regex ^G-[A-Z0-9]+$ und das Frontend-Formular-Regex ab.
 * Verhindert XSS wenn ein manipulierter Wert in script.textContent eingebettet wird.
 */
function isValidGa4Id(id: string): boolean {
  return /^G-[A-Z0-9]+$/.test(id)
}

/**
 * Prueft ob eine Meta-Pixel-ID nur aus Ziffern besteht.
 * Gleicht das backend-seitige Regex ^[0-9]+$ und das Frontend-Formular-Regex ab.
 */
function isValidMetaPixelId(id: string): boolean {
  return /^[0-9]+$/.test(id)
}

function loadGa4Script(measurementId: string): void {
  if (!import.meta.client) return
  // Format-Pruefung als letzte Verteidigungslinie vor script.textContent-Einbettung (XSS-Schutz)
  if (!isValidGa4Id(measurementId)) return
  if (document.getElementById('gtag-script')) return
  const script1 = document.createElement('script')
  script1.id = 'gtag-script'
  script1.async = true
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
  document.head.appendChild(script1)
  const script2 = document.createElement('script')
  script2.id = 'gtag-init'
  script2.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${measurementId}');`
  document.head.appendChild(script2)
}

function loadMetaPixel(pixelId: string): void {
  if (!import.meta.client) return
  // Format-Pruefung als letzte Verteidigungslinie vor script.textContent-Einbettung (XSS-Schutz)
  if (!isValidMetaPixelId(pixelId)) return
  if (document.getElementById('fbq-script')) return
  const script = document.createElement('script')
  script.id = 'fbq-script'
  script.textContent = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`
  document.head.appendChild(script)
}

function trackGa4Lead(): void {
  if (!import.meta.client) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- gtag ist eine globale Funktion ohne TS-Typen
  const w = window as any
  if (typeof w.gtag === 'function') {
    w.gtag('event', 'lead_submitted')
  }
}

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

// Favicon: settings.favicon_path hat Prioritaet (per-Funnel), dann Workspace-Branding
const faviconPath = funnelData.settings.favicon_path ?? funnelData.branding?.favicon_path ?? null

const requestOrigin = useRequestURL().origin
// Bevorzugte kanonische URL ist die kurze public_id-URL; UUID-Zugriffe zeigen dieselbe Canonical.
const canonicalSlug = funnelData.public_id ?? slug
const canonicalUrl = `${requestOrigin}/f/${canonicalSlug}`

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
    // Benutzerdefiniertes Favicon: settings.favicon_path > branding.favicon_path
    ...(faviconPath ? [{ rel: 'icon', href: faviconPath }] : []),
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
// Theme / Branding (CSS-Variablen)
// Prioritaet: branding (aus API) > theme-Preset (themeId in meta)
// Die Vars sind deterministisch aus den Branding-Daten berechnet, daher
// kein Hydration-Mismatch zwischen SSR und Client.
// ---------------------------------------------------------------------------

const { getThemeVars } = useFunnelThemes()
const containerStyle = computed(() => {
  const vars = funnelData.branding
    ? brandingToFunnelVars(funnelData.branding)
    : getThemeVars(funnelData.content.meta?.themeId ?? 'mp')

  return {
    ...vars,
    backgroundColor: 'var(--funnel-bg)',
    fontFamily: 'var(--funnel-font)',
    color: 'var(--funnel-text)',
  }
})

// ---------------------------------------------------------------------------
// Renderer-State
// ---------------------------------------------------------------------------

const renderer = useRendererState(slug, funnelData.content.steps)

// Step-Kontext fuer BlockProgress bereitstellen
provide(funnelStepContextKey, renderer.stepContext)

// ---------------------------------------------------------------------------
// A/B-Varianten-Zuweisung (M3.7)
//
// SSR/Hydration-Sicherheit:
//   - activeContent startet mit funnelData.content (Standard, identisch mit SSR).
//   - useAbVariant laeuft nur im onMounted (clientseitig).
//   - Der Swap auf abContent geschieht reaktiv NACH der Hydration.
//   - Kein Hydration-Mismatch: erster Client-Render = SSR-Render (Standard-Content).
//
// onMounted-Reihenfolge (garantiert durch Vue):
//   1. renderer (useRendererState) setzt sessionId in localStorage.
//   2. ab (useAbVariant) liest sessionId und ruft /ab-assign auf.
// ---------------------------------------------------------------------------

/**
 * Aktiver Content: Standard-Content (SSR) bis useAbVariant eine Variante liefert.
 * shallowRef: Nur Referenzaenderungen werden getrackt (kein Deep-Tracking noetig).
 */
const activeContent = shallowRef<FunnelContent>(funnelData.content)

// A/B-Composable (nach renderer initialisieren, damit sessionId onMounted zuerst gesetzt wird)
const { abVariantId, abContent, isResolving: isAbResolving } = useAbVariant(slug, renderer.sessionId)

/**
 * Wenn useAbVariant eine Variante zuweist: activeContent und renderer-Steps aktualisieren.
 * Nur beim ersten Nicht-null-Wert relevant (der Cookie sorgt danach fuer Sticky-Zuweisung).
 */
watch(abContent, (newContent) => {
  if (newContent) {
    activeContent.value = newContent
    renderer.setActiveSteps(newContent.steps)
  }
})

/**
 * ab_variant_id an Tracking und Lead-Submit weitergeben.
 * Wird unmittelbar gesetzt, sobald useAbVariant die Zuweisung abgeschlossen hat.
 */
watch(abVariantId, (id) => {
  renderer.setAbVariantId(id)
})

// ---------------------------------------------------------------------------
// Personalisierungs-Kontext bereitstellen (M3.5)
// ---------------------------------------------------------------------------

/**
 * personalizationVars reaktiv an activeContent binden, damit beim A/B-Content-Swap
 * auch die Variablen-Definitionen des Varianten-Contents verwendet werden.
 *
 * Die Funktionen interpolateText/interpolateHtml schliessen ueber personalizationVars.value
 * und renderer.answersByBlockId.value, sodass Vue die Abhaengigkeiten in den Block-Komponenten
 * korrekt trackt und bei Aenderungen neu auswertet.
 */
const personalizationVars = computed(() => activeContent.value.meta.personalizationVars)

const personalization = usePersonalization()

provide(personalizationKey, {
  interpolateText: (text: string) =>
    personalization.interpolate(text, personalizationVars.value, renderer.answersByBlockId.value),
  interpolateHtml: (text: string) =>
    personalization.interpolate(text, personalizationVars.value, renderer.answersByBlockId.value, {
      htmlContext: true,
    }),
})

// ---------------------------------------------------------------------------
// Datenschutz-URL fuer ConsentBanner
// ---------------------------------------------------------------------------

/**
 * Datenschutz-URL aus dem Workspace-Payload.
 * Fallback auf '/datenschutz' wenn das Feld fehlt (Backend noch ohne privacy_policy_url).
 */
const privacyPolicyUrl = funnelData.workspace?.privacy_policy_url ?? '/datenschutz'

// ---------------------------------------------------------------------------
// Consent-Banner + Tracking-Scripts (M4.11 / M4.12)
// ---------------------------------------------------------------------------

/**
 * Tracking-Consent: null = Banner zeigen, true/false = Entscheidung getroffen.
 * Startet auf null (SSR-sicher: kein localStorage-Zugriff auf Server).
 * Wird in onMounted aus localStorage gelesen.
 */
const trackingConsentState = ref<boolean | null>(null)
/** true = Consent-Banner soll angezeigt werden */
const showConsentBanner = ref<boolean>(false)

/** Tracking-IDs aus den Funnel-Settings */
const ga4Id = funnelData.settings.tracking?.ga4_id ?? null
const metaPixelId = funnelData.settings.tracking?.meta_pixel_id ?? null

onMounted(() => {
  const stored = readTrackingConsent(slug)
  if (stored === null) {
    // Noch keine Entscheidung: Banner anzeigen (nur wenn Tracking konfiguriert)
    if (ga4Id || metaPixelId) {
      showConsentBanner.value = true
    }
  }
  else {
    trackingConsentState.value = stored
    renderer.setTrackingConsent(stored)
    if (stored === true) {
      if (ga4Id) loadGa4Script(ga4Id)
      if (metaPixelId) loadMetaPixel(metaPixelId)
    }
  }
})

/** Wird vom ConsentBanner aufgerufen wenn der Nutzer eine Entscheidung trifft. */
function handleConsentDecision(accepted: boolean): void {
  writeTrackingConsent(slug, accepted)
  trackingConsentState.value = accepted
  renderer.setTrackingConsent(accepted)
  showConsentBanner.value = false
  if (accepted) {
    if (ga4Id) loadGa4Script(ga4Id)
    if (metaPixelId) loadMetaPixel(metaPixelId)
    if (metaPixelId) {
      // fbq PageView wurde bereits beim Laden des Pixels ausgeloest (im Inline-Script)
    }
  }
}

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

/**
 * Prueft ob eine URL sicher fuer externe Navigation ist.
 * Erlaubt nur http:// und https:// – blockiert javascript:, data:, vbscript: usw.
 */
function isSafeExternalUrl(url: string | undefined): url is string {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  }
  catch {
    return false
  }
}

/** Wird aufgerufen, wenn ein Button-Block seine action ausfuehrt. */
async function handleBlockAction(action: string, block: Block): Promise<void> {
  trackStart()

  if (action === 'external_url' && block.type === 'button') {
    const btn = block as ButtonBlock
    if (isSafeExternalUrl(btn.externalUrl)) {
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
    // GA4-Lead-Event nach erfolgreichem Submit (nur wenn Consent erteilt)
    if (renderer.isSubmitted.value && trackingConsentState.value === true) {
      trackGa4Lead()
    }
    return
  }

  if (action === 'next') {
    transitionDirection.value = 'forward'
  }

  // Block wird weitergegeben, damit die Logik-Engine block.target auswertet (M3)
  await renderer.handleAction(action, undefined, block)
}

// Hilfsfunktion: prueft ob aktuell der result- oder letzte Step sichtbar ist
const isResultStep = computed<boolean>(() => {
  const step = renderer.currentStep.value
  return step?.type === 'result'
    || renderer.currentStepIndex.value === activeContent.value.steps.length - 1
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
  switch (funnelData.content.settings?.animations) {
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

/**
 * Wird von BlockOptinOtp aufgerufen, wenn die OTP-Verifikation erfolgreich war.
 * Speichert den Token im Renderer-State (fliesst beim Lead-Submit mit).
 */
function handleOtpVerified(token: string): void {
  renderer.setOtpVerifiedToken(token)
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

      Transition-opacity: dezenter Uebergang waehrend der A/B-Aufloesung (M3.7).
      isAbResolving ist false waehrend SSR und Hydration -> kein Hydration-Mismatch.

      Waehrend des kurzen A/B-Content-Swaps (isAbResolving=true):
        - :inert verhindert, dass Fokus oder Screenreader den ausgeblendeten
          Inhalt lesen (WCAG 2.4.11, Empfehlung M3.7 a11y-Agent).
        - aria-hidden="true" macht den Bereich fuer AT unsichtbar.
        - Beide Attribute werden entfernt, sobald der Swap abgeschlossen ist.
    -->
    <div
      class="w-full max-w-[460px] mx-auto transition-opacity duration-150"
      :class="{ 'opacity-0': isAbResolving }"
      :inert="isAbResolving"
      :aria-hidden="isAbResolving ? 'true' : undefined"
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

      <!-- Double-Opt-in-Bestaetigungs-Screen (M4.10) -->
      <div
        v-else-if="renderer.doubleOptinPending.value"
        class="px-6 py-12 text-center"
        role="status"
        aria-live="polite"
      >
        <div
          class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
          style="background-color: var(--funnel-primary, #1c4687);"
          aria-hidden="true"
        >
          <svg
            class="h-7 w-7"
            style="color: var(--funnel-on-primary, #fff);"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h2
          class="mb-2 text-xl font-semibold"
          style="color: var(--funnel-text);"
        >
          Fast geschafft!
        </h2>
        <p
          class="text-sm leading-relaxed"
          style="color: var(--funnel-muted);"
        >
          Bitte prüfe Deine E-Mails und klicke den Bestätigungslink, um Deine Anmeldung abzuschließen.
        </p>
        <p
          class="mt-2 text-xs"
          style="color: var(--funnel-muted);"
        >
          Keine E-Mail erhalten? Prüfe auch Deinen Spam-Ordner.
        </p>
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
            :aria-label="`Schritt ${renderer.currentStepIndex.value + 1} von ${activeContent.steps.length}`"
            novalidate
            @submit.prevent="handleFormSubmit"
          >
            <!-- Bloecke des aktuellen Steps (gefiltert durch DisplayConditions, M3) -->
            <div
              v-for="block in renderer.visibleBlocksForCurrentStep.value"
              :key="block.id"
              class="mb-4 last:mb-0"
            >
              <BlockRenderer
                :block="block"
                mode="live"
                :model-value="renderer.getAnswerForBlock(block)"
                :error="getBlockError(block)"
                :hash="slug"
                :session-id="renderer.sessionId.value"
                @update:model-value="(val: string | boolean) => handleAnswerUpdate(block, val)"
                @action="(action: string) => handleBlockAction(action, block)"
                @otp-verified="handleOtpVerified"
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

    <!-- Consent-Banner (M4.11): erscheint beim ersten Besuch, nur clientseitig -->
    <RendererConsentBanner
      v-if="showConsentBanner"
      :funnel-slug="slug"
      :privacy-policy-url="privacyPolicyUrl"
      @accept="handleConsentDecision(true)"
      @decline="handleConsentDecision(false)"
    />
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
