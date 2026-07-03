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
import type { DropoffStep } from '~/composables/useMetricsDropoff'
import {
  getDropoffMaxViews,
  getDropoffBarPercent,
  formatDropoffRate,
} from '~/composables/useMetricsDropoff'
import type { DeviceMetric } from '~/composables/useMetricsDevices'
import { getDeviceLabel } from '~/composables/useMetricsDevices'
import type { TimelinePoint } from '~/composables/useMetricsTimeline'
import {
  getTimelineYMax,
  getTimelineBarPercent,
  formatTimelineDate,
} from '~/composables/useMetricsTimeline'
import type { AnswersBlock } from '~/composables/useMetricsAnswers'
import { getAnswerDistributionMax, getAnswerBarPercent, getAnswerBlockTypeLabel } from '~/composables/useMetricsAnswers'

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

// ---------------------------------------------------------------------------
// Chart-Composables (M4.7)
// ---------------------------------------------------------------------------
const dropoffApi = useMetricsDropoff()
const devicesApi = useMetricsDevices()
const timelineApi = useMetricsTimeline()
const answersApi = useMetricsAnswers()

const dropoffSteps = ref<DropoffStep[]>([])
const deviceMetrics = ref<DeviceMetric[]>([])
const timelinePoints = ref<TimelinePoint[]>([])
const answerBlocks = ref<AnswersBlock[]>([])
const isLoadingCharts = ref(false)
const chartsError = ref<string | null>(null)

// Offene Antworten-Sektionen (fuer den aufklappbaren Bereich)
const openAnswerBlocks = ref<Set<string>>(new Set())

function toggleAnswerBlock(blockId: string): void {
  if (openAnswerBlocks.value.has(blockId)) {
    openAnswerBlocks.value.delete(blockId)
  } else {
    openAnswerBlocks.value.add(blockId)
  }
}

async function loadCharts(): Promise<void> {
  isLoadingCharts.value = true
  chartsError.value = null
  try {
    const [dropoff, devices, timeline, answers] = await Promise.allSettled([
      dropoffApi.get(funnelId.value),
      devicesApi.get(funnelId.value),
      timelineApi.get(funnelId.value),
      answersApi.get(funnelId.value),
    ])
    if (dropoff.status === 'fulfilled') dropoffSteps.value = dropoff.value
    if (devices.status === 'fulfilled') deviceMetrics.value = devices.value
    if (timeline.status === 'fulfilled') timelinePoints.value = timeline.value
    if (answers.status === 'fulfilled') {
      answerBlocks.value = answers.value
      // Ersten Block standardmaessig aufklappen
      if (answers.value.length > 0 && answers.value[0]) {
        openAnswerBlocks.value.add(answers.value[0].block_id)
      }
    }
  } catch {
    chartsError.value = 'Charts konnten nicht geladen werden.'
  } finally {
    isLoadingCharts.value = false
  }
}

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
    // Metriken, A/B-Tests und Charts parallel laden
    await Promise.all([loadMetrics(), loadAbTests(), loadCharts()])
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

// ---------------------------------------------------------------------------
// Chart-Hilfsfunktionen (Weiterleitung an exportierte Pure-Functions)
// ---------------------------------------------------------------------------

const dropoffMaxViews = computed(() => getDropoffMaxViews(dropoffSteps.value))

function dropoffBarPercent(step: DropoffStep): number {
  return getDropoffBarPercent(step, dropoffMaxViews.value)
}

const timelineYMax = computed(() => getTimelineYMax(timelinePoints.value))

function timelineViewsPercent(point: TimelinePoint): number {
  return getTimelineBarPercent(point.views, timelineYMax.value)
}

function timelineLeadsPercent(point: TimelinePoint): number {
  return getTimelineBarPercent(point.leads, timelineYMax.value)
}

/**
 * Erstellt eine barrierefreie Textzusammenfassung der Dropoff-Daten
 * als sr-only Inhalt.
 */
function getDropoffSummary(): string {
  return dropoffSteps.value
    .map(
      (s) =>
        `Seite ${s.step_index + 1}: ${s.step_views} Aufrufe, ${s.step_completions} Abschlüsse, ${formatDropoffRate(s.dropoff_rate)} Absprung`,
    )
    .join('. ')
}

function getTimelineSummary(): string {
  if (timelinePoints.value.length === 0) return 'Keine Daten vorhanden.'
  const totalViews = timelinePoints.value.reduce((s, p) => s + p.views, 0)
  const totalLeads = timelinePoints.value.reduce((s, p) => s + p.leads, 0)
  return `${timelinePoints.value.length} Tage. Gesamt: ${totalViews} Aufrufe, ${totalLeads} Leads.`
}

function getDevicesSummary(): string {
  return deviceMetrics.value
    .map((d) => `${getDeviceLabel(d.device_type)}: ${d.count} (${d.percent} %)`)
    .join(', ')
}

// Pruefen ob Chart-Daten vorhanden (nicht nur leere Arrays)
const hasDropoffData = computed(() => dropoffSteps.value.length > 0)
const hasDevicesData = computed(() => deviceMetrics.value.length > 0)
const hasTimelineData = computed(() => timelinePoints.value.length > 0)
const hasAnswersData = computed(() => answerBlocks.value.length > 0)
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
        class="text-sm text-ui-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
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
                class="appearance-none rounded-lg border border-ui-border bg-white py-1.5 pl-3 pr-8 text-sm font-medium text-ui-text shadow-sm transition-colors hover:border-ui-accent/40 focus:outline-none focus:ring-2 focus:ring-ui-accent"
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
                class="inline-flex items-center gap-1.5 rounded-lg bg-ui-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-ui-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ui-accent"
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
                class="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-ui-border bg-white px-3 py-1.5 text-sm font-medium text-ui-text transition-colors hover:border-ui-accent/40 hover:text-ui-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
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
          <!-- Charts-Bereich (M4.7)                                          -->
          <!-- --------------------------------------------------------------- -->
          <div
            v-if="!isLoadingMetrics && !metricsError"
            class="mt-6 space-y-6"
          >
            <!-- Charts-Fehler -->
            <div
              v-if="chartsError"
              class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {{ chartsError }}
            </div>

            <!-- Charts-Skeleton -->
            <div
              v-if="isLoadingCharts"
              class="grid grid-cols-1 gap-6 lg:grid-cols-2"
              aria-busy="true"
              aria-label="Charts werden geladen"
            >
              <div
                v-for="n in 4"
                :key="n"
                class="animate-pulse rounded-xl border border-ui-border bg-white p-5"
                aria-hidden="true"
              >
                <div class="mb-4 h-4 w-48 rounded bg-gray-200" />
                <div class="space-y-2">
                  <div
                    v-for="m in 4"
                    :key="m"
                    class="h-7 rounded bg-gray-200"
                    :style="{ width: `${80 - m * 12}%` }"
                  />
                </div>
              </div>
            </div>

            <template v-else>
              <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <!-- --------------------------------------------------------- -->
                <!-- Chart 1: Seite-zu-Seite-Konvertierung (Dropoff)           -->
                <!-- --------------------------------------------------------- -->
                <section
                  class="rounded-xl border border-ui-border bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,.06)]"
                  aria-labelledby="chart-dropoff-heading"
                  data-testid="chart-dropoff"
                >
                  <h2
                    id="chart-dropoff-heading"
                    class="mb-4 text-sm font-semibold text-ui-text"
                  >
                    Seite-zu-Seite-Konvertierung
                  </h2>

                  <div
                    v-if="!hasDropoffData"
                    class="py-6 text-center text-sm text-ui-muted"
                  >
                    Noch keine Daten vorhanden.
                  </div>

                  <div
                    v-else
                    aria-label="Seite-zu-Seite-Konvertierung"
                    role="img"
                  >
                    <!-- Barrierefreie Textzusammenfassung -->
                    <p class="sr-only">
                      {{ getDropoffSummary() }}
                    </p>

                    <div
                      class="space-y-3"
                      aria-hidden="true"
                    >
                      <div
                        v-for="step in dropoffSteps"
                        :key="step.step_index"
                        class="group"
                      >
                        <div class="mb-1 flex items-center justify-between text-xs">
                          <span class="font-medium text-ui-text">
                            Seite {{ step.step_index + 1 }}
                          </span>
                          <span class="text-ui-muted">
                            {{ step.step_views.toLocaleString('de-DE') }} Aufrufe
                            <span
                              v-if="step.dropoff_rate > 0"
                              class="ml-2 text-red-600"
                            >
                              -{{ formatDropoffRate(step.dropoff_rate) }}
                            </span>
                          </span>
                        </div>
                        <div class="h-7 w-full overflow-hidden rounded-lg bg-gray-100">
                          <div
                            class="h-full rounded-lg bg-ui-accent transition-all duration-500"
                            :style="{ width: dropoffBarPercent(step) + '%' }"
                          />
                        </div>
                        <div class="mt-0.5 flex items-center justify-between text-[10px] text-ui-muted">
                          <span>{{ step.step_completions.toLocaleString('de-DE') }} Abschlüsse</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <!-- --------------------------------------------------------- -->
                <!-- Chart 2: Geraeteverteilung                                 -->
                <!-- --------------------------------------------------------- -->
                <section
                  class="rounded-xl border border-ui-border bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,.06)]"
                  aria-labelledby="chart-devices-heading"
                  data-testid="chart-devices"
                >
                  <h2
                    id="chart-devices-heading"
                    class="mb-4 text-sm font-semibold text-ui-text"
                  >
                    Geräteverteilung
                  </h2>

                  <div
                    v-if="!hasDevicesData"
                    class="py-6 text-center text-sm text-ui-muted"
                  >
                    Noch keine Daten vorhanden.
                  </div>

                  <div
                    v-else
                    role="img"
                    aria-label="Geräteverteilung"
                  >
                    <!-- Barrierefreie Textzusammenfassung -->
                    <p class="sr-only">
                      {{ getDevicesSummary() }}
                    </p>

                    <div
                      class="space-y-4"
                      aria-hidden="true"
                    >
                      <div
                        v-for="device in deviceMetrics"
                        :key="device.device_type"
                        class="flex items-center gap-3"
                      >
                        <span class="w-20 flex-shrink-0 text-xs font-medium text-ui-text">
                          {{ getDeviceLabel(device.device_type) }}
                        </span>
                        <div class="flex-1 overflow-hidden rounded-full bg-gray-100">
                          <div
                            class="h-5 rounded-full bg-ui-accent transition-all duration-500"
                            :style="{ width: Math.max(device.percent, 1) + '%' }"
                          />
                        </div>
                        <span class="w-12 flex-shrink-0 text-right text-xs text-ui-muted">
                          {{ device.percent }} %
                        </span>
                        <span class="w-10 flex-shrink-0 text-right text-xs text-ui-muted">
                          {{ device.count.toLocaleString('de-DE') }}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <!-- ----------------------------------------------------------- -->
              <!-- Chart 3: Conversion ueber Zeit (Timeline)                   -->
              <!-- ----------------------------------------------------------- -->
              <section
                class="rounded-xl border border-ui-border bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,.06)]"
                aria-labelledby="chart-timeline-heading"
                data-testid="chart-timeline"
              >
                <div class="mb-4 flex items-center justify-between">
                  <h2
                    id="chart-timeline-heading"
                    class="text-sm font-semibold text-ui-text"
                  >
                    Conversion über Zeit
                  </h2>
                  <!-- Legende -->
                  <div class="flex items-center gap-4 text-xs text-ui-muted">
                    <span class="flex items-center gap-1.5">
                      <span class="h-2.5 w-2.5 rounded-sm bg-blue-500" aria-hidden="true" />
                      Aufrufe
                    </span>
                    <span class="flex items-center gap-1.5">
                      <span class="h-2.5 w-2.5 rounded-sm bg-ui-accent" aria-hidden="true" />
                      Leads
                    </span>
                  </div>
                </div>

                <div
                  v-if="!hasTimelineData"
                  class="py-6 text-center text-sm text-ui-muted"
                >
                  Noch keine Daten vorhanden.
                </div>

                <div
                  v-else
                  role="img"
                  aria-label="Conversion über Zeit"
                >
                  <!-- Barrierefreie Textzusammenfassung -->
                  <p class="sr-only">
                    {{ getTimelineSummary() }}
                  </p>

                  <!-- Balken-Chart -->
                  <div
                    class="flex h-40 items-end gap-1 overflow-x-auto"
                    aria-hidden="true"
                  >
                    <div
                      v-for="point in timelinePoints"
                      :key="point.date"
                      class="group relative flex min-w-[24px] flex-1 flex-col items-center justify-end gap-0.5"
                      :title="`${formatTimelineDate(point.date)}: ${point.views} Aufrufe, ${point.leads} Leads`"
                    >
                      <!-- Aufrufe-Balken -->
                      <div class="relative flex w-full items-end justify-center gap-0.5">
                        <div
                          class="w-1/2 rounded-t-sm bg-blue-500 transition-all duration-500"
                          :style="{ height: timelineViewsPercent(point) + '%', minHeight: point.views > 0 ? '2px' : '0' }"
                        />
                        <!-- Leads-Balken -->
                        <div
                          class="w-1/2 rounded-t-sm bg-ui-accent transition-all duration-500"
                          :style="{ height: timelineLeadsPercent(point) + '%', minHeight: point.leads > 0 ? '2px' : '0' }"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- X-Achse: Datum-Labels (nur jeden N-ten) -->
                  <div
                    class="mt-1 flex gap-1 overflow-x-auto"
                    aria-hidden="true"
                  >
                    <div
                      v-for="(point, i) in timelinePoints"
                      :key="point.date"
                      class="min-w-[24px] flex-1 text-center text-[9px] text-ui-muted"
                    >
                      <span v-if="i % Math.max(1, Math.floor(timelinePoints.length / 7)) === 0">
                        {{ formatTimelineDate(point.date) }}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <!-- ----------------------------------------------------------- -->
              <!-- Chart 4: Antworten-Insights                                 -->
              <!-- ----------------------------------------------------------- -->
              <section
                v-if="hasAnswersData"
                class="rounded-xl border border-ui-border bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,.06)]"
                aria-labelledby="chart-answers-heading"
                data-testid="chart-answers"
              >
                <h2
                  id="chart-answers-heading"
                  class="mb-4 text-sm font-semibold text-ui-text"
                >
                  Antworten-Insights
                </h2>

                <div class="space-y-3">
                  <div
                    v-for="block in answerBlocks"
                    :key="block.block_id"
                    class="rounded-lg border border-ui-border"
                  >
                    <!-- Aufklapp-Kopf -->
                    <button
                      type="button"
                      class="flex w-full items-center justify-between px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ui-accent"
                      :aria-expanded="openAnswerBlocks.has(block.block_id)"
                      :aria-controls="`answers-block-${block.block_id}`"
                      @click="toggleAnswerBlock(block.block_id)"
                    >
                      <div>
                        <span class="text-sm font-medium text-ui-text">
                          {{ block.field_key }}
                        </span>
                        <span class="ml-2 text-xs text-ui-muted">
                          {{ getAnswerBlockTypeLabel(block.block_type) }}
                        </span>
                      </div>
                      <div class="flex items-center gap-3">
                        <span class="text-xs text-ui-muted">
                          {{ block.total }} Antworten
                        </span>
                        <svg
                          :class="[
                            'h-4 w-4 flex-shrink-0 text-ui-muted transition-transform duration-200',
                            openAnswerBlocks.has(block.block_id) ? 'rotate-180' : '',
                          ]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          stroke-width="2"
                          aria-hidden="true"
                        >
                          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    <!-- Antwort-Balken -->
                    <div
                      v-show="openAnswerBlocks.has(block.block_id)"
                      :id="`answers-block-${block.block_id}`"
                      class="border-t border-ui-border px-4 py-3"
                    >
                      <!-- sr-only Zusammenfassung -->
                      <p class="sr-only">
                        Antwortverteilung für {{ block.field_key }}:
                        {{
                          block.distribution
                            .map((d) => `${d.value}: ${d.count} (${d.percent} %)`)
                            .join(', ')
                        }}
                      </p>

                      <div
                        v-if="block.distribution.length === 0"
                        class="py-2 text-sm text-ui-muted"
                      >
                        Keine Verteilungsdaten.
                      </div>

                      <div
                        v-else
                        class="space-y-2"
                        aria-hidden="true"
                      >
                        <div
                          v-for="item in block.distribution"
                          :key="item.value"
                          class="flex items-center gap-3"
                        >
                          <span class="w-28 flex-shrink-0 truncate text-xs text-ui-text" :title="item.value">
                            {{ item.value }}
                          </span>
                          <div class="flex-1 overflow-hidden rounded-full bg-gray-100">
                            <div
                              class="h-5 rounded-full bg-ui-accent/80 transition-all duration-500"
                              :style="{
                                width: getAnswerBarPercent(item, getAnswerDistributionMax(block)) + '%',
                              }"
                            />
                          </div>
                          <span class="w-8 flex-shrink-0 text-right text-xs text-ui-muted">
                            {{ item.count }}
                          </span>
                          <span class="w-10 flex-shrink-0 text-right text-xs text-ui-muted">
                            {{ item.percent }} %
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </template>
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
