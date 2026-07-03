<!--
  Workspace-weite Performance-Uebersicht.

  Zeigt:
  - Gesamt-KPI-Karten (Views, Starts, Leads, Conversion Rate)
  - Zeitverlauf-Chart (views/leads je Tag, CSS-only Balken analog metrics.vue)
  - Tabelle "Je Funnel": Name, Status, Views, Leads, Conversion Rate

  Die Daten werden ueber useWorkspacePerformance geladen.
  Beim Workspace-Wechsel laedt die Seite automatisch neu (watch auf activeWorkspace.id).
-->
<script setup lang="ts">
import type { WorkspacePerformanceData, WorkspacePerformanceFunnelItem } from '~/types/workspace-performance'
import type { PerformancePeriod, PerformanceParams } from '~/composables/useWorkspacePerformance'
import {
  getPerformanceDateRange,
  getPerformanceYMax,
  getPerformanceBarPercent,
  formatWorkspaceConversionRate,
  formatPerformanceDate,
} from '~/composables/useWorkspacePerformance'

definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
})

useSeoMeta({
  title: 'Performance - MP Funnel-Builder',
  description: 'Workspace-weite Performance-Uebersicht: Views, Starts, Leads und Conversion Rate aller Funnels im Ueberblick.',
})

const workspaceStore = useWorkspaceStore()
const perfApi = useWorkspacePerformance()

// ---------------------------------------------------------------------------
// Daten
// ---------------------------------------------------------------------------
const isLoading = ref(false)
const loadError = ref<string | null>(null)
const data = ref<WorkspacePerformanceData | null>(null)

// ---------------------------------------------------------------------------
// Zeitraum-Auswahl
// ---------------------------------------------------------------------------
const selectedPeriod = ref<PerformancePeriod>('all')

const periodOptions: ReadonlyArray<{ value: PerformancePeriod; label: string }> = [
  { value: 'all', label: 'Gesamt' },
  { value: '7d', label: 'Letzte 7 Tage' },
  { value: '30d', label: 'Letzte 30 Tage' },
  { value: '90d', label: 'Letzte 90 Tage' },
] as const

async function load(): Promise<void> {
  const wsId = workspaceStore.activeWorkspace?.id
  if (!wsId) return

  isLoading.value = true
  loadError.value = null

  try {
    const params: PerformanceParams = getPerformanceDateRange(selectedPeriod.value)
    const response = await perfApi.get(wsId, params)
    data.value = response.data
  } catch {
    loadError.value = 'Performance-Daten konnten nicht geladen werden. Bitte die Seite neu laden.'
  } finally {
    isLoading.value = false
  }
}

// Workspace-Wechsel -> Daten neu laden
watch(
  () => workspaceStore.activeWorkspace?.id,
  (id) => {
    if (id) load()
    else data.value = null
  },
  { immediate: true },
)

// Zeitraum-Aenderung -> Daten neu laden
watch(selectedPeriod, () => {
  if (workspaceStore.activeWorkspace?.id) load()
})

// ---------------------------------------------------------------------------
// Berechnete Werte
// ---------------------------------------------------------------------------

/** Funnels absteigend nach Leads (dann Conversion Rate) sortiert. */
const sortedFunnels = computed<WorkspacePerformanceFunnelItem[]>(() => {
  if (!data.value) return []
  return [...data.value.funnels].sort(
    (a, b) => b.leads - a.leads || b.conversion_rate - a.conversion_rate,
  )
})

const timelineYMax = computed<number>(() =>
  getPerformanceYMax(data.value?.timeline ?? []),
)

const hasData = computed(() => data.value !== null)
const hasTimeline = computed(() => (data.value?.timeline.length ?? 0) > 0)
const hasFunnels = computed(() => (data.value?.funnels.length ?? 0) > 0)

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function formatInteger(n: number): string {
  return n.toLocaleString('de-DE')
}

function formatRate(rate: number): string {
  return formatWorkspaceConversionRate(rate)
}

function statusLabel(status: 'draft' | 'published' | 'archived'): string {
  switch (status) {
    case 'published': return 'Live'
    case 'draft': return 'Entwurf'
    case 'archived': return 'Archiviert'
    default: return status
  }
}

function timelineViewsPercent(views: number): number {
  return getPerformanceBarPercent(views, timelineYMax.value)
}

function timelineLeadsPercent(leads: number): number {
  return getPerformanceBarPercent(leads, timelineYMax.value)
}

function getTimelineSummary(): string {
  const timeline = data.value?.timeline ?? []
  if (timeline.length === 0) return 'Keine Daten vorhanden.'
  const totalViews = timeline.reduce((s, p) => s + p.views, 0)
  const totalLeads = timeline.reduce((s, p) => s + p.leads, 0)
  return `${timeline.length} Tage. Gesamt: ${totalViews.toLocaleString('de-DE')} Aufrufe, ${totalLeads.toLocaleString('de-DE')} Leads.`
}
</script>

<template>
  <div class="mx-auto max-w-4xl p-6">
    <!-- ------------------------------------------------------------------ -->
    <!-- Seitenkopf                                                          -->
    <!-- ------------------------------------------------------------------ -->
    <div class="mb-6 flex items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-ui-text">
        Performance
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
        <svg
          class="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>

    <!-- ------------------------------------------------------------------ -->
    <!-- Fehlerzustand                                                       -->
    <!-- ------------------------------------------------------------------ -->
    <div
      v-if="loadError"
      class="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      role="alert"
    >
      {{ loadError }}
    </div>

    <!-- ------------------------------------------------------------------ -->
    <!-- Ladezustand                                                         -->
    <!-- ------------------------------------------------------------------ -->
    <div
      v-if="isLoading"
      class="flex items-center justify-center gap-3 py-20 text-ui-muted"
      aria-busy="true"
      aria-label="Performance-Daten werden geladen"
    >
      <svg class="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span class="text-sm">Daten werden geladen...</span>
    </div>

    <!-- ------------------------------------------------------------------ -->
    <!-- Leer-Zustand: kein Workspace                                        -->
    <!-- ------------------------------------------------------------------ -->
    <div
      v-else-if="!workspaceStore.activeWorkspace && !loadError"
      class="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ui-border bg-ui-surface px-6 py-20 text-center"
    >
      <p class="text-sm text-ui-muted">
        Kein Workspace ausgewählt.
      </p>
    </div>

    <!-- ------------------------------------------------------------------ -->
    <!-- Hauptinhalt                                                         -->
    <!-- ------------------------------------------------------------------ -->
    <template v-else-if="!isLoading && hasData">
      <!-- KPI-Karten -->
      <section aria-labelledby="kpi-heading">
        <h2
          id="kpi-heading"
          class="sr-only"
        >
          Kennzahlen
        </h2>

        <div
          class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Gesamt-Kennzahlen"
          data-testid="kpi-cards"
        >
          <!-- Views -->
          <div class="rounded-xl border border-ui-border bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,.06)]">
            <div class="mb-3 flex items-start justify-between">
              <div class="flex items-center gap-1.5">
                <span class="text-sm font-medium text-ui-text">Aufrufe</span>
                <span
                  title="Gesamtanzahl der Seitenaufrufe aller Funnels im gewählten Zeitraum."
                  class="cursor-help text-ui-muted"
                  role="img"
                  aria-label="Gesamtanzahl der Seitenaufrufe aller Funnels im gewählten Zeitraum."
                >
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </div>
            </div>
            <div class="mb-1">
              <span class="text-3xl font-bold tracking-tight text-ui-text">
                {{ formatInteger(data!.totals.views) }}
              </span>
            </div>
            <p class="text-xs text-ui-muted">
              alle Funnels dieses Workspace
            </p>
          </div>

          <!-- Starts -->
          <div class="rounded-xl border border-ui-border bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,.06)]">
            <div class="mb-3 flex items-start justify-between">
              <div class="flex items-center gap-1.5">
                <span class="text-sm font-medium text-ui-text">Starts</span>
                <span
                  title="Anzahl der Besucher, die den Funnel aktiv gestartet haben."
                  class="cursor-help text-ui-muted"
                  role="img"
                  aria-label="Anzahl der Besucher, die den Funnel aktiv gestartet haben."
                >
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </div>
            </div>
            <div class="mb-1">
              <span class="text-3xl font-bold tracking-tight text-ui-text">
                {{ formatInteger(data!.totals.starts) }}
              </span>
            </div>
            <p class="text-xs text-ui-muted">
              alle Funnels dieses Workspace
            </p>
          </div>

          <!-- Leads -->
          <div class="rounded-xl border border-ui-border bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,.06)]">
            <div class="mb-3 flex items-start justify-between">
              <div class="flex items-center gap-1.5">
                <span class="text-sm font-medium text-ui-text">Leads</span>
                <span
                  title="Anzahl der eingegangenen Leads aller Funnels im gewählten Zeitraum."
                  class="cursor-help text-ui-muted"
                  role="img"
                  aria-label="Anzahl der eingegangenen Leads aller Funnels im gewählten Zeitraum."
                >
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </div>
            </div>
            <div class="mb-1">
              <span class="text-3xl font-bold tracking-tight text-ui-text">
                {{ formatInteger(data!.totals.leads) }}
              </span>
            </div>
            <p class="text-xs text-ui-muted">
              alle Funnels dieses Workspace
            </p>
          </div>

          <!-- Conversion Rate -->
          <div class="rounded-xl border border-ui-border bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,.06)]">
            <div class="mb-3 flex items-start justify-between">
              <div class="flex items-center gap-1.5">
                <span class="text-sm font-medium text-ui-text">Conversion Rate</span>
                <span
                  title="Anteil der Besucher, die zu Leads wurden, in Prozent (workspace-weit)."
                  class="cursor-help text-ui-muted"
                  role="img"
                  aria-label="Anteil der Besucher, die zu Leads wurden, in Prozent (workspace-weit)."
                >
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </div>
            </div>
            <div class="mb-1">
              <div class="flex items-baseline gap-0.5">
                <span
                  class="text-3xl font-bold tracking-tight text-ui-text"
                  :aria-label="`${data!.totals.conversion_rate.toFixed(2).replace('.', ',')} Prozent`"
                >
                  {{ data!.totals.conversion_rate.toFixed(2).replace('.', ',') }}
                </span>
                <span class="text-xl font-semibold text-ui-text" aria-hidden="true">%</span>
              </div>
            </div>
            <p class="text-xs text-ui-muted">
              alle Funnels dieses Workspace
            </p>
          </div>
        </div>
      </section>

      <!-- ---------------------------------------------------------------- -->
      <!-- Zeitverlauf-Chart                                                 -->
      <!-- ---------------------------------------------------------------- -->
      <section
        class="mt-6 rounded-xl border border-ui-border bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,.06)]"
        aria-labelledby="chart-timeline-heading"
        data-testid="chart-timeline"
      >
        <div class="mb-4 flex items-center justify-between">
          <h2
            id="chart-timeline-heading"
            class="text-sm font-semibold text-ui-text"
          >
            Verlauf
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
          v-if="!hasTimeline"
          class="py-6 text-center text-sm text-ui-muted"
        >
          Noch keine Verlaufsdaten vorhanden.
        </div>

        <div
          v-else
          role="img"
          aria-label="Verlauf von Aufrufen und Leads im gewählten Zeitraum"
        >
          <!-- Barrierefreie Textzusammenfassung (WCAG 1.1.1) -->
          <p class="sr-only">
            {{ getTimelineSummary() }}
          </p>

          <!-- Balken-Chart -->
          <div
            class="flex h-40 items-end gap-1 overflow-x-auto"
            aria-hidden="true"
          >
            <div
              v-for="point in data!.timeline"
              :key="point.date"
              class="group relative flex min-w-[24px] flex-1 flex-col items-center justify-end gap-0.5"
              :title="`${formatPerformanceDate(point.date)}: ${point.views.toLocaleString('de-DE')} Aufrufe, ${point.leads.toLocaleString('de-DE')} Leads`"
            >
              <div class="relative flex w-full items-end justify-center gap-0.5">
                <!-- Aufrufe-Balken -->
                <div
                  class="w-1/2 rounded-t-sm bg-blue-500 transition-all duration-500"
                  :style="{
                    height: timelineViewsPercent(point.views) + '%',
                    minHeight: point.views > 0 ? '2px' : '0',
                  }"
                />
                <!-- Leads-Balken -->
                <div
                  class="w-1/2 rounded-t-sm bg-ui-accent transition-all duration-500"
                  :style="{
                    height: timelineLeadsPercent(point.leads) + '%',
                    minHeight: point.leads > 0 ? '2px' : '0',
                  }"
                />
              </div>
            </div>
          </div>

          <!-- X-Achse: Datum-Labels -->
          <div
            class="mt-1 flex gap-1 overflow-x-auto"
            aria-hidden="true"
          >
            <div
              v-for="(point, i) in data!.timeline"
              :key="point.date"
              class="min-w-[24px] flex-1 text-center text-[9px] text-ui-muted"
            >
              <span v-if="i % Math.max(1, Math.floor((data!.timeline.length) / 7)) === 0">
                {{ formatPerformanceDate(point.date) }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- ---------------------------------------------------------------- -->
      <!-- Funnel-Tabelle                                                    -->
      <!-- ---------------------------------------------------------------- -->
      <section
        class="mt-6"
        aria-labelledby="funnel-table-heading"
      >
        <h2
          id="funnel-table-heading"
          class="mb-4 text-base font-semibold text-ui-text"
        >
          Je Funnel
        </h2>

        <div
          v-if="!hasFunnels"
          class="rounded-2xl border-2 border-dashed border-ui-border bg-ui-surface px-6 py-12 text-center"
        >
          <p class="text-sm text-ui-muted">
            Noch keine Funnels vorhanden oder noch keine Daten erfasst.
          </p>
        </div>

        <div
          v-else
          class="overflow-hidden rounded-2xl border border-ui-border bg-ui-surface shadow-sm"
          data-testid="funnel-table"
        >
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-ui-border">
                <th
                  scope="col"
                  class="w-[40%] px-4 py-3 text-left text-xs font-semibold text-ui-muted"
                >
                  Funnel
                </th>
                <th
                  scope="col"
                  class="px-4 py-3 text-left text-xs font-semibold text-ui-muted"
                >
                  Status
                </th>
                <th
                  scope="col"
                  class="px-4 py-3 text-right text-xs font-semibold text-ui-muted"
                >
                  Aufrufe
                </th>
                <th
                  scope="col"
                  class="px-4 py-3 text-right text-xs font-semibold text-ui-muted"
                >
                  Leads
                </th>
                <th
                  scope="col"
                  class="px-4 py-3 text-right text-xs font-semibold text-ui-muted"
                >
                  Conversion Rate
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ui-border">
              <tr
                v-for="item in sortedFunnels"
                :key="item.funnel.id"
                class="transition-colors hover:bg-ui-bg"
              >
                <!-- Funnel-Name (verlinkt auf Metriken) -->
                <td class="px-4 py-3">
                  <NuxtLink
                    :to="`/admin/funnels/${item.funnel.id}/metrics`"
                    class="font-medium text-ui-text hover:text-ui-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
                  >
                    {{ item.funnel.name }}
                  </NuxtLink>
                </td>

                <!-- Status-Badge -->
                <td class="px-4 py-3">
                  <span
                    :class="[
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                      item.funnel.status === 'published'
                        ? 'bg-live-bg text-live-text'
                        : 'bg-ui-bg text-ui-muted',
                    ]"
                  >
                    {{ statusLabel(item.funnel.status) }}
                  </span>
                </td>

                <!-- Aufrufe -->
                <td class="px-4 py-3 text-right tabular-nums text-ui-text">
                  {{ formatInteger(item.views) }}
                </td>

                <!-- Leads -->
                <td class="px-4 py-3 text-right tabular-nums text-ui-text">
                  {{ formatInteger(item.leads) }}
                </td>

                <!-- Conversion Rate -->
                <td class="px-4 py-3 text-right tabular-nums text-ui-text">
                  {{ formatRate(item.conversion_rate) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <!-- ------------------------------------------------------------------ -->
    <!-- Leer-Zustand nach erfolgreichem Laden (keine Funnels, keine Daten) -->
    <!-- ------------------------------------------------------------------ -->
    <div
      v-else-if="!isLoading && !loadError && !hasData && workspaceStore.activeWorkspace"
      class="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ui-border bg-ui-surface px-6 py-20 text-center"
    >
      <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-ui-accent/10">
        <svg
          class="h-7 w-7 text-ui-accent"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <p class="mb-1 text-base font-semibold text-ui-text">
        Noch keine Performance-Daten
      </p>
      <p class="max-w-sm text-sm text-ui-muted">
        Leg Deinen ersten Funnel an und veroeffentliche ihn, um hier Deine Kennzahlen zu sehen.
      </p>
    </div>
  </div>
</template>
