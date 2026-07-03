<!--
  AbMetricsPanel – Verwaltung und Metriken fuer einen einzelnen A/B-Test.

  Zeigt den aktuellen Status, passende Aktions-Buttons und die Metriken-Tabelle.
  Laedt die Metriken intern per GET .../ab-tests/{abTestId}/metrics.

  Aktionen je Status:
    draft    -> Starten, Loeschen
    running  -> Pausieren
    paused   -> Fortsetzen, Beenden
    concluded -> keine Aktionen (nur Anzeige)

  Destruktive/finale Aktionen (Beenden, Loeschen, Gewinner setzen) werden
  mit dem zugaenglichen ConfirmModal bestaetigt, nicht per window.confirm().

  canWrite=true: mp_team / mp_admin.
  canWrite=false: client (nur Anzeige, keine Buttons).
-->
<script setup lang="ts">
import type { AbTestMetrics, AbVariantMetrics } from '~/types/ab-test'
import { formatAbConversionRate, isBestConversion } from '~/composables/useAbMetrics'

// ---------------------------------------------------------------------------
// Props + Emits
// ---------------------------------------------------------------------------

interface Props {
  /** UUID/public_id des Funnels (aus Route-Param). */
  funnelId: string
  /** Numerische ID des A/B-Tests. */
  abTestId: string
  /**
   * Darf der aktuelle Nutzer den Test verwalten (starten, pausieren, beenden, loeschen)?
   * Auch fuer die Gewinner-Aktion verwendet. true fuer mp_team und mp_admin.
   */
  canWrite: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  /** Wird ausgegeben wenn sich der Test-Status aendert (z. B. nach Start/Delete),
   *  damit die Elternkomponente die Liste neu laden kann. */
  updated: []
}>()

// ---------------------------------------------------------------------------
// Daten laden
// ---------------------------------------------------------------------------

const abMetricsApi = useAbMetrics()
const abTestsApi = useAbTests()
const toast = useToast()

const isLoading = ref(true)
const error = ref<string | null>(null)
const metrics = ref<AbTestMetrics | null>(null)

async function load(): Promise<void> {
  isLoading.value = true
  error.value = null
  try {
    const res = await abMetricsApi.get(props.funnelId, props.abTestId)
    metrics.value = res.data
  } catch {
    error.value = 'Metriken konnten nicht geladen werden.'
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

// ---------------------------------------------------------------------------
// Aktions-State
// ---------------------------------------------------------------------------

const isActing = ref(false)
const actionError = ref<string | null>(null)

// Confirm-Modal-State
const confirmModal = ref<{
  show: boolean
  title: string
  message: string
  confirmLabel: string
  variant: 'danger' | 'primary'
  onConfirm: () => Promise<void>
}>({
  show: false,
  title: '',
  message: '',
  confirmLabel: 'Bestätigen',
  variant: 'danger',
  onConfirm: async () => {},
})

function openConfirm(opts: {
  title: string
  message: string
  confirmLabel: string
  variant?: 'danger' | 'primary'
  onConfirm: () => Promise<void>
}): void {
  confirmModal.value = {
    show: true,
    title: opts.title,
    message: opts.message,
    confirmLabel: opts.confirmLabel,
    variant: opts.variant ?? 'danger',
    onConfirm: opts.onConfirm,
  }
}

function closeConfirm(): void {
  confirmModal.value.show = false
}

async function executeConfirm(): Promise<void> {
  isActing.value = true
  actionError.value = null
  try {
    await confirmModal.value.onConfirm()
  } catch {
    actionError.value = 'Aktion fehlgeschlagen. Bitte versuche es erneut.'
  } finally {
    isActing.value = false
    closeConfirm()
  }
}

// ---------------------------------------------------------------------------
// Aktionen
// ---------------------------------------------------------------------------

async function handleStart(): Promise<void> {
  isActing.value = true
  actionError.value = null
  try {
    await abTestsApi.start(props.funnelId, props.abTestId)
    toast.success('A/B-Test wurde gestartet.')
    await load()
    emit('updated')
  } catch {
    actionError.value = 'Test konnte nicht gestartet werden.'
  } finally {
    isActing.value = false
  }
}

async function handlePause(): Promise<void> {
  isActing.value = true
  actionError.value = null
  try {
    await abTestsApi.pause(props.funnelId, props.abTestId)
    toast.success('A/B-Test wurde pausiert.')
    await load()
    emit('updated')
  } catch {
    actionError.value = 'Test konnte nicht pausiert werden.'
  } finally {
    isActing.value = false
  }
}

function askConclude(): void {
  openConfirm({
    title: 'Test beenden?',
    message: 'Der Test wird abgeschlossen. Danach kannst Du keinen Gewinner mehr setzen und den Test nicht neu starten.',
    confirmLabel: 'Beenden',
    variant: 'danger',
    onConfirm: async () => {
      await abTestsApi.conclude(props.funnelId, props.abTestId)
      toast.success('A/B-Test wurde beendet.')
      await load()
      emit('updated')
    },
  })
}

function askDelete(): void {
  openConfirm({
    title: 'Test löschen?',
    message: 'Der Test und alle zugehörigen Daten werden unwiderruflich gelöscht.',
    confirmLabel: 'Löschen',
    variant: 'danger',
    onConfirm: async () => {
      await abTestsApi.remove(props.funnelId, props.abTestId)
      toast.success('A/B-Test wurde gelöscht.')
      emit('updated')
    },
  })
}

// ---------------------------------------------------------------------------
// Gewinner setzen
// ---------------------------------------------------------------------------

const isSettingWinner = ref(false)

function askSetWinner(variant: AbVariantMetrics): void {
  openConfirm({
    title: `${variant.label} als Gewinner wählen?`,
    message: 'Der Funnel wird auf diese Version umgestellt und der A/B-Test abgeschlossen.',
    confirmLabel: 'Als Gewinner wählen',
    variant: 'primary',
    onConfirm: async () => {
      isSettingWinner.value = true
      try {
        await abTestsApi.setWinner(props.funnelId, props.abTestId, variant.ab_variant_id)
        toast.success(`${variant.label} wurde als Gewinner gesetzt.`)
        await load()
        emit('updated')
      } finally {
        isSettingWinner.value = false
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Status-Hilfsfunktionen
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<string, string> = {
  draft: 'Entwurf',
  running: 'Läuft',
  paused: 'Pausiert',
  concluded: 'Beendet',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  running: 'bg-green-100 text-green-700',
  paused: 'bg-amber-100 text-amber-700',
  concluded: 'bg-blue-100 text-blue-700',
}

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'
}

/**
 * Kann fuer diese Variante ein Gewinner-Button angezeigt werden?
 * Bedingungen: canWrite + Test nicht draft + kein Gewinner gesetzt.
 */
function canShowWinnerButton(m: AbTestMetrics): boolean {
  return (
    props.canWrite &&
    m.status !== 'draft' &&
    m.winner_variant_id === null
  )
}

function isWinner(variantId: string, m: AbTestMetrics): boolean {
  return m.winner_variant_id === variantId
}

function formatInteger(value: number): string {
  return value.toLocaleString('de-DE')
}
</script>

<template>
  <section
    class="rounded-xl border border-ui-border bg-white shadow-[0_1px_2px_rgba(0,0,0,.06)]"
    :aria-label="metrics ? `A/B-Test: ${metrics.name}` : 'A/B-Test'"
  >
    <!-- ------------------------------------------------------------------ -->
    <!-- Header                                                              -->
    <!-- ------------------------------------------------------------------ -->
    <div class="flex flex-wrap items-center gap-3 border-b border-ui-border px-5 py-4">
      <!-- Name + Status-Badge -->
      <div class="flex min-w-0 flex-1 items-center gap-3">
        <h3 class="truncate text-sm font-semibold text-ui-text">
          {{ metrics?.name ?? 'A/B-Test' }}
        </h3>
        <span
          v-if="metrics"
          class="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium"
          :class="statusColor(metrics.status)"
        >
          {{ statusLabel(metrics.status) }}
        </span>
      </div>

      <!-- Aktions-Buttons (nur fuer mp_team/mp_admin) -->
      <div
        v-if="canWrite && metrics && !isLoading"
        class="flex shrink-0 items-center gap-2"
      >
        <!-- draft: Starten + Loeschen -->
        <template v-if="metrics.status === 'draft'">
          <button
            type="button"
            class="rounded-lg bg-ui-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-ui-accent-hover disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ui-accent"
            :disabled="isActing"
            @click="handleStart"
          >
            Starten
          </button>
          <button
            type="button"
            class="rounded-lg border border-ui-border px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:border-red-300 hover:bg-red-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500"
            :disabled="isActing"
            @click="askDelete"
          >
            Löschen
          </button>
        </template>

        <!-- running: Pausieren -->
        <template v-else-if="metrics.status === 'running'">
          <button
            type="button"
            class="rounded-lg border border-ui-border px-3 py-1.5 text-xs font-medium text-ui-text transition-colors hover:border-ui-accent/40 hover:text-ui-accent disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ui-accent"
            :disabled="isActing"
            @click="handlePause"
          >
            Pausieren
          </button>
        </template>

        <!-- paused: Fortsetzen + Beenden -->
        <template v-else-if="metrics.status === 'paused'">
          <button
            type="button"
            class="rounded-lg bg-ui-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-ui-accent-hover disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ui-accent"
            :disabled="isActing"
            @click="handleStart"
          >
            Fortsetzen
          </button>
          <button
            type="button"
            class="rounded-lg border border-ui-border px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:border-red-300 hover:bg-red-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500"
            :disabled="isActing"
            @click="askConclude"
          >
            Beenden
          </button>
        </template>
      </div>

      <!-- Neu laden -->
      <button
        type="button"
        class="shrink-0 rounded p-1 text-ui-muted transition-colors hover:text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-accent"
        aria-label="Metriken neu laden"
        :disabled="isLoading"
        @click="load"
      >
        <svg
          class="h-4 w-4"
          :class="{ 'animate-spin': isLoading }"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
    </div>

    <!-- Aktion fehlgeschlagen -->
    <div
      v-if="actionError"
      class="border-b border-ui-border bg-red-50 px-5 py-2.5 text-xs text-red-700"
      role="alert"
    >
      {{ actionError }}
    </div>

    <!-- ------------------------------------------------------------------ -->
    <!-- Ladezustand                                                         -->
    <!-- ------------------------------------------------------------------ -->
    <div
      v-if="isLoading"
      class="flex items-center justify-center py-10"
      aria-busy="true"
      aria-label="Metriken werden geladen"
    >
      <svg
        class="h-5 w-5 animate-spin text-ui-accent"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    </div>

    <!-- ------------------------------------------------------------------ -->
    <!-- Fehler                                                              -->
    <!-- ------------------------------------------------------------------ -->
    <div
      v-else-if="error"
      class="px-5 py-4 text-sm text-red-600"
      role="alert"
    >
      {{ error }}
    </div>

    <!-- ------------------------------------------------------------------ -->
    <!-- Metrik-Tabelle                                                      -->
    <!-- ------------------------------------------------------------------ -->
    <template v-else-if="metrics">
      <div class="overflow-x-auto">
        <table class="w-full text-sm" role="table">
          <caption class="sr-only">
            Metriken je Variante fuer A/B-Test &ldquo;{{ metrics.name }}&rdquo;
          </caption>
          <thead>
            <tr class="border-b border-ui-border bg-ui-bg/50">
              <th
                scope="col"
                class="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-ui-muted"
              >
                Variante
              </th>
              <th
                scope="col"
                class="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-ui-muted"
              >
                Besuche
              </th>
              <th
                scope="col"
                class="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-ui-muted"
              >
                Starts
              </th>
              <th
                scope="col"
                class="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-ui-muted"
              >
                Leads
              </th>
              <th
                scope="col"
                class="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-ui-muted"
              >
                Conversion
              </th>
              <th
                v-if="canShowWinnerButton(metrics)"
                scope="col"
                class="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-ui-muted"
              >
                <span class="sr-only">Aktion</span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ui-border">
            <tr
              v-for="variant in metrics.variants"
              :key="variant.ab_variant_id"
              class="transition-colors hover:bg-ui-bg/30"
            >
              <!-- Varianten-Label + Badges -->
              <td class="px-5 py-4">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-medium text-ui-text">{{ variant.label }}</span>
                  <span
                    class="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs"
                    :class="variant.is_control ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-600'"
                  >
                    {{ variant.is_control ? 'Kontrolle' : 'Treatment' }}
                  </span>
                  <!-- Gewinner-Badge -->
                  <span
                    v-if="isWinner(variant.ab_variant_id, metrics)"
                    class="inline-flex items-center gap-1 rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700"
                  >
                    <svg
                      class="h-3 w-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      />
                    </svg>
                    Gewinner
                  </span>
                </div>
              </td>

              <!-- Views -->
              <td class="px-4 py-4 text-right tabular-nums text-ui-text">
                {{ formatInteger(variant.views) }}
              </td>

              <!-- Starts -->
              <td class="px-4 py-4 text-right tabular-nums text-ui-text">
                {{ formatInteger(variant.starts) }}
              </td>

              <!-- Leads -->
              <td class="px-4 py-4 text-right tabular-nums text-ui-text">
                {{ formatInteger(variant.leads) }}
              </td>

              <!-- Conversion Rate: visuell + textuell hervorgehoben (nicht nur Farbe -> a11y) -->
              <td class="px-4 py-4 text-right tabular-nums">
                <span
                  :class="
                    isBestConversion(variant.ab_variant_id, metrics.variants)
                      ? 'font-semibold text-green-700'
                      : 'text-ui-text'
                  "
                >
                  {{ formatAbConversionRate(variant.conversion_rate) }}
                </span>
                <!-- Textuelle Hervorhebung: nicht nur auf Farbe angewiesen (WCAG 1.4.1) -->
                <!-- text-green-700 (#15803d) auf weiß: 5.0:1 – besteht WCAG 1.4.3 AA -->
                <span
                  v-if="isBestConversion(variant.ab_variant_id, metrics.variants)"
                  class="ml-1 text-xs text-green-700"
                  aria-label="Beste Conversion Rate"
                >
                  (Besser)
                </span>
              </td>

              <!-- Gewinner-Aktion -->
              <td
                v-if="canShowWinnerButton(metrics)"
                class="px-4 py-4 text-right"
              >
                <button
                  type="button"
                  class="rounded-lg border border-ui-border px-3 py-1.5 text-xs font-medium text-ui-text transition-colors hover:border-ui-accent/40 hover:text-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent disabled:cursor-not-allowed disabled:opacity-50"
                  :aria-label="`${variant.label} als Gewinner wählen`"
                  :disabled="isSettingWinner || isActing"
                  @click="askSetWinner(variant)"
                >
                  Gewinner wählen
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Hinweis: nur Rohdaten, keine Signifikanz -->
      <p class="border-t border-ui-border px-5 py-3 text-xs text-ui-muted">
        Rohdatenvergleich ohne statistische Signifikanz. Die Zahlen zeigen absolute Werte je Variante.
      </p>
    </template>

    <!-- Keine Varianten -->
    <div
      v-else
      class="px-5 py-6 text-center text-sm text-ui-muted"
    >
      Keine Varianten für diesen A/B-Test gefunden.
    </div>
  </section>

  <!-- -------------------------------------------------------------------- -->
  <!-- Confirm-Modal (teleportiert nach body)                                -->
  <!-- -------------------------------------------------------------------- -->
  <AdminConfirmModal
    v-if="confirmModal.show"
    :title="confirmModal.title"
    :message="confirmModal.message"
    :confirm-label="confirmModal.confirmLabel"
    :variant="confirmModal.variant"
    :is-loading="isActing || isSettingWinner"
    @confirm="executeConfirm"
    @cancel="closeConfirm"
  />
</template>
