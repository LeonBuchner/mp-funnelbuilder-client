<!--
  Metriken-Tab im Funnel-Editor-Kontext.

  Laedt den Funnel (ueber editorStore, damit die TopBar den Namen kennt)
  und die Metriken ueber useMetrics. Zeigt vier Kennzahl-Karten im
  Perspective-Stil plus einen Zeitraum-Waehler oben rechts.

  A/B-Bereich: Verwaltung (Anlegen, Starten, Pausieren, Beenden, Loeschen)
  und Metrik-Anzeige je Test. Button "Neuer A/B-Test" fuer mp_team/mp_admin.

  Charts (Seite-zu-Seite-Konvertierung, Conversion Rate ueber Zeit usw.)
  sind nicht Teil dieses Meilensteins und kommen in M4.
-->
<script setup lang="ts">
import type { MetricsPeriod, MetricsData } from '~/composables/useMetrics'
import { getMetricsDateRange } from '~/composables/useMetrics'
import type { AbTest } from '~/types/ab-test'

definePageMeta({
  layout: 'editor',
  middleware: ['auth'],
})

// ---------------------------------------------------------------------------
// Stores + Composables
// ---------------------------------------------------------------------------
const route = useRoute()
const editorStore = useEditorStore()
const workspaceStore = useWorkspaceStore()
const metricsApi = useMetrics()

const funnelId = computed(() => route.params.id as string)
const isReadonly = computed(() => workspaceStore.activeRole === 'client')

/** Darf der Nutzer A/B-Tests verwalten (starten, pausieren, loeschen...)? */
const canWrite = computed(() => workspaceStore.activeRole !== 'client')

// ---------------------------------------------------------------------------
// Funnel laden (fuer TopBar-Name)
// ---------------------------------------------------------------------------
const isLoadingFunnel = ref(true)
const loadError = ref<string | null>(null)

// ---------------------------------------------------------------------------
// Metriken laden
// ---------------------------------------------------------------------------
const isLoadingMetrics = ref(false)
const metrics = ref<MetricsData | null>(null)
const metricsError = ref<string | null>(null)

// ---------------------------------------------------------------------------
// A/B-Tests laden
// ---------------------------------------------------------------------------
const abTests = ref<AbTest[]>([])
const isLoadingAbTests = ref(false)
const abTestsApi = useAbTests()

async function loadAbTests(): Promise<void> {
  isLoadingAbTests.value = true
  try {
    const res = await abTestsApi.list(funnelId.value)
    abTests.value = res.data
  } catch {
    abTests.value = []
  } finally {
    isLoadingAbTests.value = false
  }
}

// ---------------------------------------------------------------------------
// A/B-Test anlegen (Modal)
// ---------------------------------------------------------------------------
const showCreateModal = ref(false)

function openCreateModal(): void {
  showCreateModal.value = true
}

function closeCreateModal(): void {
  showCreateModal.value = false
}

async function onTestCreated(): Promise<void> {
  await loadAbTests()
}

// ---------------------------------------------------------------------------
// Zeitraum-Auswahl
// ---------------------------------------------------------------------------
const selectedPeriod = ref<MetricsPeriod>('all')

const periodOptions: ReadonlyArray<{ value: MetricsPeriod; label: string }> = [
  { value: 'all', label: 'Gesamt' },
  { value: '7d', label: 'Letzte 7 Tage' },
  { value: '30d', label: 'Letzte 30 Tage' },
  { value: '90d', label: 'Letzte 90 Tage' },
] as const

async function loadMetrics(): Promise<void> {
  isLoadingMetrics.value = true
  metricsError.value = null
  try {
    const params = getMetricsDateRange(selectedPeriod.value)
    const response = await metricsApi.get(funnelId.value, params)
    metrics.value = response.data
  } catch {
    metricsError.value = 'Metriken konnten nicht geladen werden.'
  } finally {
    isLoadingMetrics.value = false
  }
}

// Zeitraum-Aenderung laedt die Metriken neu (erst nach dem initialen Laden)
const isFirstLoad = ref(true)
watch(selectedPeriod, () => {
  if (!isFirstLoad.value) {
    loadMetrics()
  }
})

onMounted(async () => {
  try {
    await editorStore.load(funnelId.value)
    useSeoMeta({
      title: `Metriken - ${editorStore.funnel?.name ?? 'Funnel'} - MP Funnel-Builder`,
      description: `Metriken und Kennzahlen für den Funnel ${editorStore.funnel?.name ?? ''}.`,
    })
    // Metriken und A/B-Tests parallel laden
    await Promise.all([loadMetrics(), loadAbTests()])
    isFirstLoad.value = false
  } catch {
    loadError.value = 'Funnel konnte nicht geladen werden.'
  } finally {
    isLoadingFunnel.value = false
  }
})

// ---------------------------------------------------------------------------
// Kennzahl-Karten Konfiguration
// ---------------------------------------------------------------------------
type NumericMetricKey = 'views' | 'starts' | 'leads' | 'conversion_rate' | 'completion_rate' | 'messages_sent'

interface MetricCardDef {
  key: NumericMetricKey
  label: string
  tooltip: string
  isRate?: boolean
}

const metricCards: ReadonlyArray<MetricCardDef> = [
  {
    key: 'views',
    label: 'Besuche',
    tooltip: 'Gesamtanzahl der Aufrufe dieses Funnels im gewählten Zeitraum.',
  },
  {
    key: 'leads',
    label: 'Neue Conversions',
    tooltip: 'Anzahl der Besucher, die zu Leads wurden (Formular ausgefüllt).',
  },
  {
    key: 'conversion_rate',
    label: 'Conversion Rate',
    tooltip: 'Anteil der Besucher, die zu Leads wurden, in Prozent.',
    isRate: true,
  },
  {
    key: 'messages_sent',
    label: 'Gesendete Nachrichten',
    tooltip: 'Anzahl der automatisch versendeten E-Mails in diesem Zeitraum.',
  },
] as const

/** Gibt den rohen Zahlenwert einer Karte zurueck (0 als Fallback). */
function getMetricValue(key: NumericMetricKey): number {
  return metrics.value?.[key] ?? 0
}

/** Formatiert einen Integer-Wert mit deutschem Tausendertrennzeichen. */
function formatInteger(value: number): string {
  return value.toLocaleString('de-DE')
}

/**
 * Formatiert eine Conversion Rate mit zwei Nachkommastellen.
 * Gibt nur den Zahlenteil zurueck (ohne %-Zeichen, das im Template separat steht).
 */
function formatRate(value: number): string {
  return value.toFixed(2).replace('.', ',')
}
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <!-- ----------------------------------------------------------------- -->
    <!-- Ladezustand Funnel                                                 -->
    <!-- ----------------------------------------------------------------- -->
    <div
      v-if="isLoadingFunnel"
      class="flex flex-1 items-center justify-center"
      aria-busy="true"
      aria-label="Seite wird geladen"
    >
      <svg
        class="h-6 w-6 animate-spin text-ui-accent"
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

    <!-- Fehler beim Laden -->
    <div
      v-else-if="loadError"
      class="flex flex-1 flex-col items-center justify-center gap-4"
    >
      <p class="text-sm text-red-600">
        {{ loadError }}
      </p>
      <NuxtLink
        to="/admin/funnels"
        class="text-sm text-ui-accent hover:underline focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
      >
        Zurück zur Funnel-Liste
      </NuxtLink>
    </div>

    <template v-else>
      <!-- Editor-Top-Bar (mit aktivem Metriken-Tab) -->
      <EditorTopBar :is-readonly="isReadonly" />

      <!-- ----------------------------------------------------------------- -->
      <!-- Hauptbereich                                                       -->
      <!-- ----------------------------------------------------------------- -->
      <main
        class="flex-1 overflow-y-auto bg-ui-bg"
        aria-label="Metriken-Dashboard"
      >
        <!-- Zentrierter Inhalt (grauer Hintergrund bleibt full-width) -->
        <div class="mx-auto max-w-4xl p-6">
          <!-- --------------------------------------------------------------- -->
          <!-- Kopfzeile: Titel + Zeitraum-Auswahl                             -->
          <!-- --------------------------------------------------------------- -->
          <div class="mb-6 flex items-center justify-between">
            <h1 class="text-xl font-semibold text-ui-text">
              Metriken
            </h1>

            <!-- Zeitraum-Waehler -->
            <div class="relative">
              <select
                v-model="selectedPeriod"
                class="appearance-none rounded-lg border border-ui-border bg-white py-1.5 pl-3 pr-8 text-sm font-medium text-ui-text shadow-sm transition-colors hover:border-ui-accent/40 focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
                aria-label="Zeitraum auswählen"
              >
                <option
                  v-for="opt in periodOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
              <!-- Chevron-Icon -->
              <svg
                class="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>

          <!-- --------------------------------------------------------------- -->
          <!-- Fehler beim Laden der Metriken                                  -->
          <!-- --------------------------------------------------------------- -->
          <div
            v-if="metricsError"
            class="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {{ metricsError }}
          </div>

          <!-- --------------------------------------------------------------- -->
          <!-- Kennzahl-Karten                                                 -->
          <!-- --------------------------------------------------------------- -->
          <div
            class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
            aria-label="Kennzahlen"
          >
            <!-- Skeleton beim Laden -->
            <template v-if="isLoadingMetrics">
              <div
                v-for="n in 4"
                :key="n"
                class="animate-pulse rounded-xl border border-ui-border bg-white p-5"
                aria-hidden="true"
              >
                <div class="mb-4 flex items-start justify-between">
                  <div class="h-4 w-32 rounded bg-gray-200" />
                  <div class="h-4 w-4 rounded-full bg-gray-200" />
                </div>
                <div class="mb-2 h-9 w-20 rounded bg-gray-200" />
                <div class="h-3 w-28 rounded bg-gray-200" />
              </div>
            </template>

            <!-- Befuellte Karten -->
            <template v-else>
              <div
                v-for="card in metricCards"
                :key="card.key"
                class="rounded-xl border border-ui-border bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,.06)]"
              >
                <!-- Label-Zeile: Bezeichnung + Info-Icon -->
                <div class="mb-3 flex items-start justify-between">
                  <div class="flex items-center gap-1.5">
                    <span class="text-sm font-medium text-ui-text">
                      {{ card.label }}
                    </span>
                    <!-- Info-Icon mit Tooltip -->
                    <span
                      :title="card.tooltip"
                      class="cursor-help text-ui-muted"
                      role="img"
                      :aria-label="card.tooltip"
                    >
                      <svg
                        class="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                        aria-hidden="true"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </span>
                  </div>

                  <!-- Pfeil-Icon (Detailansicht kommt in M4) -->
                  <svg
                    class="h-3.5 w-3.5 text-ui-muted"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </div>

                <!-- Kennzahl -->
                <div class="mb-1">
                  <!-- Conversion Rate: Zahl + kleines %-Zeichen -->
                  <template v-if="card.isRate">
                    <div class="flex items-baseline gap-0.5">
                      <span
                        class="text-3xl font-bold tracking-tight text-ui-text"
                        :aria-label="`${formatRate(getMetricValue(card.key))} Prozent`"
                      >
                        {{ formatRate(getMetricValue(card.key)) }}
                      </span>
                      <span
                        class="text-xl font-semibold text-ui-text"
                        aria-hidden="true"
                      >
                        %
                      </span>
                    </div>
                  </template>
                  <!-- Ganzzahlige Metriken -->
                  <template v-else>
                    <span class="text-3xl font-bold tracking-tight text-ui-text">
                      {{ formatInteger(getMetricValue(card.key)) }}
                    </span>
                  </template>
                </div>

                <!-- Vergleichstext -->
                <p class="text-xs text-ui-muted">
                  Keine Vergleichsdaten
                </p>
              </div>
            </template>
          </div>

          <!-- --------------------------------------------------------------- -->
          <!-- A/B-Test-Bereich                                               -->
          <!-- --------------------------------------------------------------- -->
          <section
            v-if="!isLoadingMetrics"
            class="mt-8"
            aria-labelledby="ab-tests-heading"
          >
            <!-- Sektion-Kopfzeile: Titel + "Neuer A/B-Test"-Button -->
            <div class="mb-4 flex items-center justify-between">
              <h2
                id="ab-tests-heading"
                class="text-base font-semibold text-ui-text"
              >
                A/B-Tests
              </h2>

              <button
                v-if="canWrite"
                type="button"
                class="inline-flex items-center gap-1.5 rounded-lg bg-ui-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-ui-accent-hover focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
                @click="openCreateModal"
              >
                <svg
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Neuer A/B-Test
              </button>
            </div>

            <!-- Skeleton -->
            <div
              v-if="isLoadingAbTests"
              class="animate-pulse rounded-xl border border-ui-border bg-white p-5"
              aria-hidden="true"
            >
              <div class="mb-3 h-4 w-40 rounded bg-gray-200" />
              <div class="h-24 w-full rounded bg-gray-200" />
            </div>

            <!-- Keine A/B-Tests -->
            <div
              v-else-if="abTests.length === 0"
              class="rounded-xl border border-dashed border-ui-border px-5 py-8 text-center"
            >
              <p class="text-sm text-ui-muted">
                Noch keine A/B-Tests für diesen Funnel vorhanden.
              </p>
              <button
                v-if="canWrite"
                type="button"
                class="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-ui-border bg-white px-3 py-1.5 text-sm font-medium text-ui-text transition-colors hover:border-ui-accent/40 hover:text-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
                @click="openCreateModal"
              >
                <svg
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Ersten A/B-Test anlegen
              </button>
            </div>

            <!-- A/B-Test-Panels -->
            <div
              v-else
              class="flex flex-col gap-4"
            >
              <AdminAbMetricsPanel
                v-for="test in abTests"
                :key="test.id"
                :funnel-id="funnelId"
                :ab-test-id="test.id"
                :can-write="canWrite"
                @updated="loadAbTests"
              />
            </div>
          </section>

          <!-- --------------------------------------------------------------- -->
          <!-- Platzhalter-Hinweis: Charts kommen in M4                        -->
          <!-- --------------------------------------------------------------- -->
          <div
            v-if="!isLoadingMetrics && !metricsError"
            class="mt-6 rounded-xl border border-dashed border-ui-border p-8 text-center"
          >
            <svg
              class="mx-auto mb-3 h-8 w-8 text-ui-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.5"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p class="text-sm font-medium text-ui-text">
              Charts folgen in M4
            </p>
            <p class="mt-1 text-xs text-ui-muted">
              Seite-zu-Seite-Konvertierung, Conversion Rate über Zeit, Geräteverteilung und
              Kontaktentwicklung werden dort ergänzt.
            </p>
          </div>
        </div>
      </main>
    </template>

    <!-- ------------------------------------------------------------------- -->
    <!-- A/B-Test anlegen Modal                                              -->
    <!-- ------------------------------------------------------------------- -->
    <AdminAbTestCreateModal
      v-if="showCreateModal"
      :funnel-id="funnelId"
      @close="closeCreateModal"
      @created="onTestCreated"
    />
  </div>
</template>
