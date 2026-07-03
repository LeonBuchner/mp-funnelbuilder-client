<!--
  Kontakte-Tab (Lead-Verwaltung) im Funnel-Editor-Kontext (M4.4 + M4.5).

  Zwei Ansichten, umschaltbar per Toggle:
  1. Tabelle (paginiert, filterbar) - bisheriger Stand
  2. Kanban-Board nach Bewerbungsphase (Neu/Gesichtet/Interview/Zusage/Absage)

  Gemeinsam genutzter Detail-Drawer und ConfirmModal.

  Rollen:
  - mp_admin / mp_team: alle Aktionen sichtbar, Drag + Stage-Select aktiv
  - client: nur Ansehen, kein Drag/Select/Export/Loeschen
-->
<script setup lang="ts">
import type {
  Lead,
  LeadStatus,
  LeadStage,
  BoardLead,
  LeadsFilter,
  PaginatedLeadsMeta,
} from '~/composables/useLeads'
import {
  getLeadStatusLabel,
  getLeadStatusClass,
  getFirstAnswerPreview,
  formatFileSize,
} from '~/composables/useLeads'

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
const leadsApi = useLeads()
const toast = useToast()
const { trapFocus } = useFocusTrap()

const funnelId = computed(() => route.params.id as string)
const isReadonly = computed(() => workspaceStore.activeRole === 'client')
const canWrite = computed(() => workspaceStore.activeRole !== 'client')

// ---------------------------------------------------------------------------
// Ansichts-Umschalter: Tabelle | Board
// ---------------------------------------------------------------------------
const VIEW_MODE_KEY = 'mp_leads_view_mode'

type ViewMode = 'table' | 'board'

const viewMode = ref<ViewMode>(
  import.meta.client && localStorage.getItem(VIEW_MODE_KEY) === 'board' ? 'board' : 'table',
)

// ---------------------------------------------------------------------------
// Funnel laden (fuer TopBar-Name)
// ---------------------------------------------------------------------------
const isLoadingFunnel = ref(true)
const loadError = ref<string | null>(null)

onMounted(async () => {
  try {
    await editorStore.load(funnelId.value)
    useSeoMeta({
      title: `Kontakte - ${editorStore.funnel?.name ?? 'Funnel'} - MP Funnel-Builder`,
      description: `Lead-Verwaltung für den Funnel ${editorStore.funnel?.name ?? ''}.`,
    })
    if (viewMode.value === 'board') {
      await loadBoard()
    } else {
      await loadLeads()
    }
  } catch {
    loadError.value = 'Funnel konnte nicht geladen werden.'
  } finally {
    isLoadingFunnel.value = false
  }
})

// ---------------------------------------------------------------------------
// Filter
// ---------------------------------------------------------------------------
const filterStatus = ref<LeadStatus | ''>('')
const filterFrom = ref('')
const filterTo = ref('')
const currentPage = ref(1)

const statusOptions: ReadonlyArray<{ value: LeadStatus | ''; label: string }> = [
  { value: '', label: 'Alle Status' },
  { value: 'complete', label: 'Abgeschlossen' },
  { value: 'partial', label: 'Teilweise' },
  { value: 'double_opt_in_pending', label: 'DOI ausstehend' },
  { value: 'double_opt_in_confirmed', label: 'DOI bestätigt' },
] as const

function buildFilter(): LeadsFilter {
  const f: LeadsFilter = {}
  if (filterStatus.value) f.status = filterStatus.value
  if (filterFrom.value) f.from = filterFrom.value
  if (filterTo.value) f.to = filterTo.value
  if (currentPage.value > 1) f.page = currentPage.value
  return f
}

// ---------------------------------------------------------------------------
// Leads laden
// ---------------------------------------------------------------------------
const isLoadingLeads = ref(false)
const leads = ref<Lead[]>([])
const leadsMeta = ref<PaginatedLeadsMeta | null>(null)
const leadsError = ref<string | null>(null)

async function loadLeads(): Promise<void> {
  isLoadingLeads.value = true
  leadsError.value = null
  try {
    const response = await leadsApi.list(funnelId.value, buildFilter())
    leads.value = response.data
    leadsMeta.value = response.meta
  } catch {
    leadsError.value = 'Kontakte konnten nicht geladen werden.'
  } finally {
    isLoadingLeads.value = false
  }
}

async function applyFilter(): Promise<void> {
  currentPage.value = 1
  await loadLeads()
}

async function goToPage(page: number): Promise<void> {
  currentPage.value = page
  await loadLeads()
}

// Filter-Aenderungen triggern neu laden
watch([filterStatus, filterFrom, filterTo], () => {
  currentPage.value = 1
})

// ---------------------------------------------------------------------------
// Board-Daten
// ---------------------------------------------------------------------------
const boardLeads = ref<BoardLead[]>([])
const isBoardLoading = ref(false)
const boardError = ref<string | null>(null)

async function loadBoard(): Promise<void> {
  isBoardLoading.value = true
  boardError.value = null
  try {
    const response = await leadsApi.fetchBoard(funnelId.value)
    boardLeads.value = response.data
  } catch {
    boardError.value = 'Kontakte konnten nicht geladen werden.'
  } finally {
    isBoardLoading.value = false
  }
}

function handleStageUpdated(leadId: string, stage: LeadStage): void {
  // Lokalen Board-State synchronisieren (wird durch das Board-Component
  // optimistisch schon aktualisiert; hier nur das Flat-Array anpassen)
  const lead = boardLeads.value.find((l) => l.id === leadId)
  if (lead) lead.stage = stage
}

// Watch NACH den Board-Deklarationen, damit keine TDZ-Referenzen entstehen
watch(viewMode, (mode) => {
  if (import.meta.client) localStorage.setItem(VIEW_MODE_KEY, mode)
  if (mode === 'board' && boardLeads.value.length === 0 && !isBoardLoading.value) {
    void loadBoard()
  }
})

// ---------------------------------------------------------------------------
// Datum-Formatierung
// ---------------------------------------------------------------------------
function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

// ---------------------------------------------------------------------------
// Detail-Drawer
// ---------------------------------------------------------------------------
const selectedLead = ref<Lead | null>(null)
const isLoadingDetail = ref(false)
const drawerEl = ref<HTMLElement | null>(null)
/** Speichert den Button, der den Drawer geoeffnet hat, fuer den Fokus-Rueckgabe. */
const drawerOpenerEl = ref<HTMLElement | null>(null)

async function openDrawer(lead: Lead, event?: Event): Promise<void> {
  drawerOpenerEl.value = (event?.currentTarget as HTMLElement) ?? null
  isLoadingDetail.value = true
  selectedLead.value = lead
  try {
    const response = await leadsApi.get(funnelId.value, lead.id)
    selectedLead.value = response.data
  } catch {
    toast.error('Kontakt konnte nicht geladen werden.')
  } finally {
    isLoadingDetail.value = false
  }
  nextTick(() => {
    drawerEl.value?.focus()
  })
}

/**
 * Oeffnet den Detail-Drawer anhand einer Lead-ID.
 * Wird vom Board-Component verwendet, das nur die BoardLead-Minimalstruktur kennt.
 * Der Drawer zeigt einen Ladeindikator bis die vollstaendigen Daten vorliegen.
 */
async function openDrawerById(leadId: string, event?: Event): Promise<void> {
  const placeholder: Lead = {
    id: leadId,
    status: 'complete',
    consent_given_at: null,
    created_at: new Date().toISOString(),
    answers: [],
    files: [],
  }
  await openDrawer(placeholder, event)
}

function closeDrawer(): void {
  selectedLead.value = null
  // Fokus auf den oeffnenden Button zurueckgeben (WCAG 2.4.3)
  nextTick(() => {
    drawerOpenerEl.value?.focus()
    drawerOpenerEl.value = null
  })
}

function handleGlobalKeydown(event: KeyboardEvent): void {
  if (!selectedLead.value) return
  if (event.key === 'Escape') {
    closeDrawer()
    return
  }
  if (drawerEl.value) trapFocus(event, drawerEl.value)
}

// Scroll-Lock und Document-Keydown-Listener wenn Drawer offen
watch(selectedLead, (val) => {
  if (import.meta.client) {
    document.body.style.overflow = val ? 'hidden' : ''
  }
})

onMounted(() => {
  if (import.meta.client) {
    document.addEventListener('keydown', handleGlobalKeydown)
  }
})

onUnmounted(() => {
  if (import.meta.client) {
    document.body.style.overflow = ''
    document.removeEventListener('keydown', handleGlobalKeydown)
  }
})

// ---------------------------------------------------------------------------
// Antwort-Wert formatieren
// ---------------------------------------------------------------------------
function formatAnswerValue(value: Lead['answers'][number]['value']): string {
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'boolean') return value ? 'Ja' : 'Nein'
  return String(value)
}

// ---------------------------------------------------------------------------
// Datei-Download
// ---------------------------------------------------------------------------
const downloadingFileId = ref<string | null>(null)

async function downloadFile(leadId: string, fileId: string, filename: string): Promise<void> {
  downloadingFileId.value = fileId
  try {
    const url = await leadsApi.fileDownload(funnelId.value, leadId, fileId)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.target = '_blank'
    anchor.rel = 'noopener noreferrer'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
  } catch {
    toast.error('Datei konnte nicht heruntergeladen werden.')
  } finally {
    downloadingFileId.value = null
  }
}

// ---------------------------------------------------------------------------
// Loeschen
// ---------------------------------------------------------------------------
const pendingDeleteLead = ref<Lead | null>(null)
const isDeleting = ref(false)

function requestDelete(lead: Lead): void {
  pendingDeleteLead.value = lead
}

async function confirmDelete(): Promise<void> {
  if (!pendingDeleteLead.value) return
  isDeleting.value = true
  try {
    await leadsApi.remove(funnelId.value, pendingDeleteLead.value.id)
    toast.success('Kontakt wurde gelöscht.')
    // Drawer schliessen wenn geloeschter Lead gerade gezeigt wird
    if (selectedLead.value?.id === pendingDeleteLead.value.id) {
      closeDrawer()
    }
    await loadLeads()
  } catch {
    toast.error('Kontakt konnte nicht gelöscht werden.')
  } finally {
    isDeleting.value = false
    pendingDeleteLead.value = null
  }
}

// ---------------------------------------------------------------------------
// CSV-Export
// ---------------------------------------------------------------------------
const isExporting = ref(false)

async function handleExport(): Promise<void> {
  isExporting.value = true
  try {
    await leadsApi.downloadExport(funnelId.value, buildFilter())
  } catch {
    toast.error('CSV-Export fehlgeschlagen.')
  } finally {
    isExporting.value = false
  }
}

// ---------------------------------------------------------------------------
// Pagination-Hilfsfunktionen
// ---------------------------------------------------------------------------
const totalPages = computed(() => leadsMeta.value?.last_page ?? 1)
const totalLeads = computed(() => leadsMeta.value?.total ?? 0)

function getPaginationPages(): number[] {
  const total = totalPages.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  // Sliding-Window
  const current = currentPage.value
  const pages: number[] = [1]
  const start = Math.max(2, current - 2)
  const end = Math.min(total - 1, current + 2)
  if (start > 2) pages.push(-1) // Ellipsis
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < total - 1) pages.push(-2) // Ellipsis
  pages.push(total)
  return pages
}
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <!-- ------------------------------------------------------------------- -->
    <!-- Ladezustand Funnel                                                   -->
    <!-- ------------------------------------------------------------------- -->
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
      <!-- Editor-Top-Bar -->
      <EditorTopBar :is-readonly="isReadonly" />

      <!-- ----------------------------------------------------------------- -->
      <!-- Hauptbereich                                                       -->
      <!-- ----------------------------------------------------------------- -->
      <main
        id="leads-main"
        class="flex-1 overflow-y-auto bg-ui-bg"
        aria-label="Kontakte-Dashboard"
      >
        <div class="mx-auto max-w-5xl p-6">
          <!-- --------------------------------------------------------------- -->
          <!-- Kopfzeile                                                        -->
          <!-- --------------------------------------------------------------- -->
          <div class="mb-6 flex items-center justify-between gap-4">
            <h1 class="text-xl font-semibold text-ui-text">
              Kontakte
            </h1>

            <div class="flex items-center gap-2">
              <!-- Ansichts-Umschalter: Tabelle | Board -->
              <div
                class="flex items-center rounded-lg border border-ui-border bg-white p-0.5"
                role="group"
                aria-label="Ansicht wechseln"
              >
                <!--
                  Kontrast-Hinweis: bg-ui-accent + text-white kann in headless Chromium
                  durch OKLCH-Farbkonvertierung unter 4.5:1 fallen.
                  bg-ui-accent-light + text-ui-text (dunkel auf hellem Blau) ist stabiler:
                  #1f2937 auf #eff4ff -> 12.5:1 (WCAG AA).
                  Inaktiver Zustand: text-ui-text auf weiss -> 15.3:1.
                -->
                <button
                  type="button"
                  :class="[
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent',
                    viewMode === 'table'
                      ? 'bg-ui-accent-light text-ui-text'
                      : 'text-ui-text hover:bg-ui-bg',
                  ]"
                  :aria-pressed="viewMode === 'table'"
                  data-testid="view-toggle-table"
                  @click="viewMode = 'table'"
                >
                  <svg
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M3 10h18M3 6h18M3 14h18M3 18h18"
                    />
                  </svg>
                  Tabelle
                </button>
                <button
                  type="button"
                  :class="[
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent',
                    viewMode === 'board'
                      ? 'bg-ui-accent-light text-ui-text'
                      : 'text-ui-text hover:bg-ui-bg',
                  ]"
                  :aria-pressed="viewMode === 'board'"
                  data-testid="view-toggle-board"
                  @click="viewMode = 'board'"
                >
                  <svg
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                    />
                  </svg>
                  Board
                </button>
              </div>

              <!-- CSV-Export (nur mp_admin / mp_team, nur in Tabellen-Ansicht) -->
              <button
                v-if="canWrite && viewMode === 'table'"
                type="button"
                :disabled="isExporting || isLoadingLeads"
                class="inline-flex items-center gap-1.5 rounded-lg border border-ui-border bg-white px-3 py-1.5 text-sm font-medium text-ui-text transition-colors hover:border-ui-accent/40 hover:text-ui-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent disabled:cursor-not-allowed disabled:opacity-60"
                :aria-label="isExporting ? 'Export läuft...' : 'Kontakte als CSV herunterladen'"
                data-testid="export-csv-btn"
                @click="handleExport"
              >
                <svg
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                {{ isExporting ? 'Wird exportiert...' : 'CSV exportieren' }}
              </button>
            </div>
          </div>

          <!-- --------------------------------------------------------------- -->
          <!-- Board-Ansicht                                                    -->
          <!-- --------------------------------------------------------------- -->
          <template v-if="viewMode === 'board'">
            <!-- Lade-Zustand Board -->
            <div
              v-if="isBoardLoading"
              class="flex items-center justify-center py-16"
              aria-busy="true"
              aria-label="Board wird geladen"
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

            <!-- Fehler Board -->
            <div
              v-else-if="boardError"
              class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {{ boardError }}
            </div>

            <!-- Board-Komponente -->
            <AdminLeadsBoard
              v-else
              :board-leads="boardLeads"
              :funnel-id="funnelId"
              :is-readonly="isReadonly"
              data-testid="leads-board"
              @open-lead="(id, evt) => openDrawerById(id, evt)"
              @stage-updated="handleStageUpdated"
            />
          </template>

          <!-- --------------------------------------------------------------- -->
          <!-- Filterleiste (nur Tabellen-Ansicht)                              -->
          <!-- --------------------------------------------------------------- -->
          <template v-else>
          <div
            class="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-ui-border bg-white p-4"
            aria-label="Kontakte filtern"
          >
            <!-- Status-Select -->
            <div class="flex flex-col gap-1">
              <label
                for="lead-status-filter"
                class="text-xs font-medium text-ui-muted"
              >Status</label>
              <div class="relative">
                <select
                  id="lead-status-filter"
                  v-model="filterStatus"
                  class="appearance-none rounded-lg border border-ui-border bg-white py-1.5 pl-3 pr-8 text-sm font-medium text-ui-text shadow-sm transition-colors hover:border-ui-accent/40 focus:outline-none focus:ring-2 focus:ring-ui-accent"
                >
                  <option
                    v-for="opt in statusOptions"
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

            <!-- Von-Datum -->
            <div class="flex flex-col gap-1">
              <label
                for="lead-from-filter"
                class="text-xs font-medium text-ui-muted"
              >Von</label>
              <input
                id="lead-from-filter"
                v-model="filterFrom"
                type="date"
                class="rounded-lg border border-ui-border bg-white px-3 py-1.5 text-sm text-ui-text shadow-sm transition-colors hover:border-ui-accent/40 focus:outline-none focus:ring-2 focus:ring-ui-accent"
              >
            </div>

            <!-- Bis-Datum -->
            <div class="flex flex-col gap-1">
              <label
                for="lead-to-filter"
                class="text-xs font-medium text-ui-muted"
              >Bis</label>
              <input
                id="lead-to-filter"
                v-model="filterTo"
                type="date"
                class="rounded-lg border border-ui-border bg-white px-3 py-1.5 text-sm text-ui-text shadow-sm transition-colors hover:border-ui-accent/40 focus:outline-none focus:ring-2 focus:ring-ui-accent"
              >
            </div>

            <!-- Filter anwenden -->
            <button
              type="button"
              class="rounded-lg bg-ui-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-ui-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ui-accent"
              @click="applyFilter"
            >
              Filtern
            </button>

            <!-- Filter zuruecksetzen -->
            <button
              v-if="filterStatus || filterFrom || filterTo"
              type="button"
              class="rounded-lg border border-ui-border bg-white px-3 py-1.5 text-sm font-medium text-ui-muted transition-colors hover:text-ui-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
              @click="filterStatus = ''; filterFrom = ''; filterTo = ''; applyFilter()"
            >
              Zurücksetzen
            </button>
          </div>

          <!-- --------------------------------------------------------------- -->
          <!-- Fehlermeldung                                                    -->
          <!-- --------------------------------------------------------------- -->
          <div
            v-if="leadsError"
            class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {{ leadsError }}
          </div>

          <!-- --------------------------------------------------------------- -->
          <!-- Tabelle                                                          -->
          <!-- --------------------------------------------------------------- -->
          <div class="rounded-xl border border-ui-border bg-white shadow-[0_1px_2px_rgba(0,0,0,.06)]">
            <!-- Tabellenanzeige: Anzahl + Ladezustand -->
            <div class="flex items-center justify-between border-b border-ui-border px-5 py-3">
              <p class="text-sm text-ui-muted">
                <span
                  v-if="isLoadingLeads"
                  aria-live="polite"
                  aria-atomic="true"
                >Wird geladen...</span>
                <span
                  v-else
                  aria-live="polite"
                  aria-atomic="true"
                >{{ totalLeads }} Kontakte</span>
              </p>
            </div>

            <!-- Skeleton -->
            <template v-if="isLoadingLeads">
              <div
                class="divide-y divide-ui-border"
                aria-busy="true"
                aria-label="Kontakte werden geladen"
              >
                <div
                  v-for="n in 5"
                  :key="n"
                  class="animate-pulse px-5 py-4"
                  aria-hidden="true"
                >
                  <div class="flex items-center gap-4">
                    <div class="h-4 w-32 rounded bg-gray-200" />
                    <div class="h-5 w-24 rounded-full bg-gray-200" />
                    <div class="flex-1 h-4 w-40 rounded bg-gray-200" />
                  </div>
                </div>
              </div>
            </template>

            <!-- Keine Ergebnisse -->
            <div
              v-else-if="leads.length === 0"
              class="px-5 py-12 text-center"
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <p class="text-sm font-medium text-ui-text">
                Keine Kontakte gefunden
              </p>
              <p class="mt-1 text-xs text-ui-muted">
                Passe den Filter an oder warte auf die ersten Einreichungen.
              </p>
            </div>

            <!-- Datentabelle -->
            <div
              v-else
              class="overflow-x-auto"
            >
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-ui-border bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-ui-muted">
                    <th
                      scope="col"
                      class="px-5 py-3"
                    >
                      Datum
                    </th>
                    <th
                      scope="col"
                      class="px-5 py-3"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      class="px-5 py-3"
                    >
                      Erste Antwort
                    </th>
                    <th
                      scope="col"
                      class="px-5 py-3 text-right"
                    >
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-ui-border">
                  <tr
                    v-for="lead in leads"
                    :key="lead.id"
                    class="transition-colors hover:bg-gray-50"
                  >
                    <!-- Datum -->
                    <td class="px-5 py-4 font-mono text-xs text-ui-muted whitespace-nowrap">
                      <time :datetime="lead.created_at">
                        {{ formatDate(lead.created_at) }}
                      </time>
                    </td>

                    <!-- Status-Badge -->
                    <td class="px-5 py-4">
                      <span
                        :class="[
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                          getLeadStatusClass(lead.status),
                        ]"
                        :aria-label="`Status: ${getLeadStatusLabel(lead.status)}`"
                      >
                        {{ getLeadStatusLabel(lead.status) }}
                      </span>
                    </td>

                    <!-- Erste Antwort -->
                    <td class="px-5 py-4 text-ui-text">
                      <span
                        v-if="getFirstAnswerPreview(lead)"
                        class="max-w-xs truncate"
                        :title="getFirstAnswerPreview(lead)"
                      >
                        {{ getFirstAnswerPreview(lead) }}
                      </span>
                      <span
                        v-else
                        class="text-ui-muted"
                      >Keine Antworten</span>
                    </td>

                    <!-- Aktionen -->
                    <td class="px-5 py-4 text-right">
                      <div class="flex items-center justify-end gap-2">
                        <!-- Ansehen -->
                        <button
                          type="button"
                          class="rounded-lg px-2.5 py-1 text-xs font-medium text-ui-accent transition-colors hover:bg-ui-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
                          :aria-label="`Kontakt vom ${formatDate(lead.created_at)} ansehen`"
                          @click="openDrawer(lead, $event)"
                        >
                          Ansehen
                        </button>

                        <!-- Loeschen (nur mp_admin / mp_team) -->
                        <button
                          v-if="canWrite"
                          type="button"
                          class="rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                          :aria-label="`Kontakt vom ${formatDate(lead.created_at)} löschen`"
                          data-testid="delete-lead-btn"
                          @click="requestDelete(lead)"
                        >
                          Löschen
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- ----------------------------------------------------------- -->
            <!-- Pagination                                                   -->
            <!-- ----------------------------------------------------------- -->
            <div
              v-if="totalPages > 1 && !isLoadingLeads"
              class="flex items-center justify-between border-t border-ui-border px-5 py-3"
              aria-label="Seitennavigation"
            >
              <p class="text-xs text-ui-muted">
                Seite {{ currentPage }} von {{ totalPages }}
              </p>
              <nav
                class="flex items-center gap-1"
                aria-label="Seiten"
              >
                <!-- Vorherige Seite -->
                <button
                  type="button"
                  :disabled="currentPage === 1"
                  class="flex h-7 w-7 items-center justify-center rounded-lg text-ui-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Vorherige Seite"
                  @click="goToPage(currentPage - 1)"
                >
                  <svg
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <!-- Seiten-Nummern -->
                <template
                  v-for="page in getPaginationPages()"
                  :key="page"
                >
                  <!-- Ellipsis -->
                  <span
                    v-if="page < 0"
                    class="flex h-7 w-7 items-center justify-center text-xs text-ui-muted"
                    aria-hidden="true"
                  >…</span>
                  <!-- Seiten-Button -->
                  <button
                    v-else
                    type="button"
                    :aria-label="`Seite ${page}`"
                    :aria-current="page === currentPage ? 'page' : undefined"
                    :class="[
                      'flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent',
                      page === currentPage
                        ? 'bg-ui-accent text-white'
                        : 'text-ui-muted hover:bg-ui-bg hover:text-ui-text',
                    ]"
                    @click="goToPage(page)"
                  >
                    {{ page }}
                  </button>
                </template>

                <!-- Naechste Seite -->
                <button
                  type="button"
                  :disabled="currentPage === totalPages"
                  class="flex h-7 w-7 items-center justify-center rounded-lg text-ui-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Nächste Seite"
                  @click="goToPage(currentPage + 1)"
                >
                  <svg
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
          </template>
          <!-- Ende: Tabellen-Ansicht -->
        </div>
      </main>
    </template>

    <!-- ------------------------------------------------------------------- -->
    <!-- Detail-Drawer (Slide-over)                                          -->
    <!-- ------------------------------------------------------------------- -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="selectedLead !== null"
          class="fixed inset-0 z-40 flex"
          @click.self="closeDrawer"
        >
          <!-- Overlay -->
          <div
            class="absolute inset-0 bg-black/30 backdrop-blur-sm"
            aria-hidden="true"
          />

          <!-- Panel -->
          <Transition
            enter-active-class="transition-transform duration-300 ease-out"
            enter-from-class="translate-x-full"
            enter-to-class="translate-x-0"
            leave-active-class="transition-transform duration-200 ease-in"
            leave-from-class="translate-x-0"
            leave-to-class="translate-x-full"
          >
            <div
              v-if="selectedLead !== null"
              ref="drawerEl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="drawer-title"
              tabindex="-1"
              class="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl focus:outline-none"
            >
              <!--
                Der fruehereStyleWorkaround `--color-ui-text/--color-ui-muted` wurde
                entfernt (M5.6). Tailwind v4 emittiert @theme-Tokens auf :root, daher
                stehen diese Variablen auch im Teleport-Ziel zur Verfuegung.
                Sollte kuenftig ein Teleport-Scoping-Problem auftreten, hier kommentieren
                und die Variablen per dedizierter CSS-Klasse wieder einbinden.
              -->
              <!-- Drawer-Kopf -->
              <div class="flex flex-shrink-0 items-center justify-between border-b border-ui-border px-6 py-4">
                <h2
                  id="drawer-title"
                  class="text-base font-semibold text-ui-text"
                >
                  Kontakt-Details
                </h2>
                <button
                  type="button"
                  class="flex h-8 w-8 items-center justify-center rounded-lg text-ui-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
                  aria-label="Details schließen"
                  @click="closeDrawer"
                >
                  <svg
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <!-- Drawer-Inhalt -->
              <div
                class="flex-1 overflow-y-auto px-6 py-5"
                :aria-busy="isLoadingDetail"
              >
                <!-- Lade-Zustand -->
                <div
                  v-if="isLoadingDetail"
                  class="flex items-center justify-center py-8"
                  aria-label="Details werden geladen"
                >
                  <svg
                    class="h-6 w-6 animate-spin text-ui-accent"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>

                <template v-else>
                  <!-- Meta-Informationen -->
                  <section
                    class="mb-6"
                    aria-label="Allgemeine Informationen"
                  >
                    <h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-ui-muted">
                      Allgemein
                    </h3>
                    <dl class="space-y-2 text-sm">
                      <div class="flex gap-3">
                        <dt class="w-28 flex-shrink-0 text-ui-muted">
                          ID
                        </dt>
                        <dd class="font-mono text-xs text-ui-text break-all">
                          {{ selectedLead.id }}
                        </dd>
                      </div>
                      <div class="flex gap-3">
                        <dt class="w-28 flex-shrink-0 text-ui-muted">
                          Eingegangen
                        </dt>
                        <dd class="text-ui-text">
                          <time :datetime="selectedLead.created_at">
                            {{ formatDate(selectedLead.created_at) }}
                          </time>
                        </dd>
                      </div>
                      <div class="flex gap-3">
                        <dt class="w-28 flex-shrink-0 text-ui-muted">
                          Status
                        </dt>
                        <dd>
                          <span
                            :class="[
                              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                              getLeadStatusClass(selectedLead.status),
                            ]"
                            :aria-label="`Status: ${getLeadStatusLabel(selectedLead.status)}`"
                          >
                            {{ getLeadStatusLabel(selectedLead.status) }}
                          </span>
                        </dd>
                      </div>
                      <div
                        v-if="selectedLead.consent_given_at"
                        class="flex gap-3"
                      >
                        <dt class="w-28 flex-shrink-0 text-ui-muted">
                          Consent
                        </dt>
                        <dd class="text-ui-text">
                          <time :datetime="selectedLead.consent_given_at">
                            {{ formatDate(selectedLead.consent_given_at) }}
                          </time>
                        </dd>
                      </div>
                    </dl>
                  </section>

                  <!-- Antworten -->
                  <section
                    class="mb-6"
                    aria-label="Antworten"
                  >
                    <h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-ui-muted">
                      Antworten ({{ selectedLead.answers.length }})
                    </h3>
                    <div
                      v-if="selectedLead.answers.length === 0"
                      class="text-sm text-ui-muted"
                    >
                      Keine Antworten vorhanden.
                    </div>
                    <dl
                      v-else
                      class="space-y-3"
                    >
                      <div
                        v-for="answer in selectedLead.answers"
                        :key="answer.field_key"
                        class="rounded-lg border border-ui-border bg-gray-50 px-4 py-3"
                      >
                        <dt class="mb-1 text-xs font-medium text-ui-muted">
                          {{ answer.field_key }}
                          <span class="ml-1 rounded bg-gray-200 px-1 py-0.5 text-[10px] text-gray-700">
                            {{ answer.block_type }}
                          </span>
                        </dt>
                        <dd class="text-sm text-ui-text">
                          {{ formatAnswerValue(answer.value) }}
                        </dd>
                      </div>
                    </dl>
                  </section>

                  <!-- Datei-Anhaenge (nur mp_admin / mp_team) -->
                  <section
                    v-if="canWrite && selectedLead.files.length > 0"
                    class="mb-6"
                    aria-label="Datei-Anhänge"
                  >
                    <h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-ui-muted">
                      Dateien ({{ selectedLead.files.length }})
                    </h3>
                    <ul class="space-y-2">
                      <li
                        v-for="file in selectedLead.files"
                        :key="file.id"
                        class="flex items-center justify-between rounded-lg border border-ui-border bg-gray-50 px-4 py-3"
                      >
                        <div class="min-w-0">
                          <p class="truncate text-sm font-medium text-ui-text">
                            {{ file.original_filename }}
                          </p>
                          <p class="text-xs text-ui-muted">
                            {{ file.mime_type }} · {{ formatFileSize(file.file_size_bytes) }}
                          </p>
                        </div>
                        <button
                          type="button"
                          :disabled="downloadingFileId === file.id"
                          class="ml-3 flex-shrink-0 rounded-lg border border-ui-border bg-white px-2.5 py-1 text-xs font-medium text-ui-text transition-colors hover:border-ui-accent/40 hover:text-ui-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent disabled:cursor-wait disabled:opacity-60"
                          :aria-label="`${file.original_filename} herunterladen`"
                          @click="downloadFile(selectedLead!.id, file.id, file.original_filename)"
                        >
                          {{
                            downloadingFileId === file.id
                              ? 'Lädt...'
                              : 'Herunterladen'
                          }}
                        </button>
                      </li>
                    </ul>
                  </section>
                </template>
              </div>

              <!-- Drawer-Footer -->
              <div class="flex flex-shrink-0 items-center justify-between border-t border-ui-border px-6 py-4">
                <button
                  v-if="canWrite && selectedLead"
                  type="button"
                  class="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  data-testid="drawer-delete-btn"
                  @click="requestDelete(selectedLead); closeDrawer()"
                >
                  Kontakt löschen
                </button>
                <button
                  type="button"
                  class="ml-auto rounded-lg border border-ui-border bg-white px-3 py-1.5 text-sm font-medium text-ui-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
                  @click="closeDrawer"
                >
                  Schließen
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- ------------------------------------------------------------------- -->
    <!-- Loeschen-Bestaetigung                                               -->
    <!-- ------------------------------------------------------------------- -->
    <AdminConfirmModal
      v-if="pendingDeleteLead !== null"
      title="Kontakt löschen?"
      message="Dieser Kontakt und alle Antworten werden unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden."
      confirm-label="Löschen"
      :is-loading="isDeleting"
      variant="danger"
      @confirm="confirmDelete"
      @cancel="pendingDeleteLead = null"
    />
  </div>
</template>
