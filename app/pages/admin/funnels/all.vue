<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'
import type { FunnelWithWorkspace, AllWorkspacesFunnelList } from '~/types/funnel'
import { pageWindow } from '~/utils/pageWindow'
import type { PageItem } from '~/utils/pageWindow'

definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
})

useSeoMeta({
  title: 'Alle Workspaces - MP Funnel-Builder',
  description: 'Workspace-übergreifende Übersicht aller Deiner Funnels.',
})

const authStore = useAuthStore()
const router = useRouter()

// Nur mp_admin darf diese Seite sehen
onMounted(() => {
  if (!authStore.isMpAdmin) {
    router.replace('/admin/funnels')
  }
})

// ---------------------------------------------------------------------------
// Suche
// ---------------------------------------------------------------------------
const searchQuery = ref('')
const showSearchInput = ref(false)
const searchInputEl = ref<HTMLInputElement | null>(null)
const activeSearch = computed(() => searchQuery.value.trim().length > 0)

function toggleSearch(): void {
  showSearchInput.value = !showSearchInput.value
  if (showSearchInput.value) {
    nextTick(() => searchInputEl.value?.focus())
  }
  else {
    searchQuery.value = ''
  }
}

// ---------------------------------------------------------------------------
// Daten laden
// ---------------------------------------------------------------------------
const funnels = ref<FunnelWithWorkspace[]>([])
const isLoading = ref(false)
const isInitialized = ref(false)
const loadError = ref<string | null>(null)
const currentPage = ref(1)
const lastPage = ref(1)
const total = ref(0)

async function loadAllFunnels(page: number = 1): Promise<void> {
  isLoading.value = true
  loadError.value = null
  try {
    const api = useApi()
    const search = searchQuery.value.trim()
    let url = `/funnels?page=${page}`
    if (search) {
      url += `&search=${encodeURIComponent(search)}`
    }
    const response = await api<AllWorkspacesFunnelList>(url)
    funnels.value = response.data
    currentPage.value = response.meta.current_page
    lastPage.value = response.meta.last_page
    total.value = response.meta.total
  }
  catch {
    loadError.value = 'Funnels konnten nicht geladen werden. Bitte Seite neu laden.'
  }
  finally {
    isLoading.value = false
    isInitialized.value = true
  }
}

onMounted(() => {
  if (authStore.isMpAdmin) {
    loadAllFunnels()
  }
})

// Serverseitige Suche: bei Eingabe nach 300 ms mit Seite 1 neu laden
watchDebounced(
  searchQuery,
  () => {
    loadAllFunnels(1)
  },
  { debounce: 300 },
)

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------
const pages = computed<PageItem[]>(() => pageWindow(currentPage.value, lastPage.value))

async function goToPage(page: number): Promise<void> {
  if (page < 1 || page > lastPage.value || page === currentPage.value) return
  await loadAllFunnels(page)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ---------------------------------------------------------------------------
// Abgeleitete Zustände
// ---------------------------------------------------------------------------
const isFirstLoad = computed(() => isLoading.value && !isInitialized.value)
const isRefreshing = computed(() => isLoading.value && isInitialized.value)

// ---------------------------------------------------------------------------
// Funnels nach Workspace gruppieren (nur aktuelle Seite)
// ---------------------------------------------------------------------------
interface WorkspaceGroup {
  id: string
  name: string
  funnels: FunnelWithWorkspace[]
}

const groupedByWorkspace = computed<WorkspaceGroup[]>(() => {
  const map = new Map<string, WorkspaceGroup>()
  for (const funnel of funnels.value) {
    const wsId = funnel.workspace.id
    if (!map.has(wsId)) {
      map.set(wsId, { id: wsId, name: funnel.workspace.name, funnels: [] })
    }
    map.get(wsId)!.funnels.push(funnel)
  }
  return Array.from(map.values())
})

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60_000)
  const h = Math.floor(diff / 3_600_000)
  const d = Math.floor(diff / 86_400_000)
  if (min < 2) return 'gerade eben'
  if (min < 60) return `vor ${min} Minuten`
  if (h === 1) return 'vor 1 Stunde'
  if (h < 24) return `vor ${h} Stunden`
  if (d === 1) return 'vor 1 Tag'
  if (d < 7) return `vor ${d} Tagen`
  if (d < 30) return `vor ${Math.floor(d / 7)} Wochen`
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(dateStr))
}

function statusLabel(status: FunnelWithWorkspace['status']): string {
  switch (status) {
    case 'published': return 'Live'
    case 'draft': return 'Entwurf'
    case 'archived': return 'Archiviert'
    default: return status
  }
}

function thumbnailColor(name: string): string {
  const colors = ['#3579fa', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444']
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0
  }
  return colors[Math.abs(hash) % colors.length] ?? '#3579fa'
}

function workspaceColor(name: string): string {
  const colors = ['bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-pink-100 text-pink-700']
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0
  }
  return colors[Math.abs(hash) % colors.length] ?? colors[0]!
}
</script>

<template>
  <div class="mx-auto max-w-5xl p-6">
    <!-- Seitenkopf -->
    <div class="mb-6 flex items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <NuxtLink
          to="/admin/funnels"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-ui-muted transition-colors hover:bg-ui-border hover:text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
          aria-label="Zurück zur Workspace-Übersicht"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </NuxtLink>
        <h1 class="text-2xl font-bold text-ui-text">
          Alle Workspaces
        </h1>
      </div>

      <!-- Suche -->
      <div class="flex items-center">
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="w-0 opacity-0"
          enter-to-class="w-48 opacity-100"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="w-48 opacity-100"
          leave-to-class="w-0 opacity-0"
        >
          <input
            v-if="showSearchInput"
            ref="searchInputEl"
            v-model="searchQuery"
            type="search"
            placeholder="Funnel oder Workspace suchen..."
            class="mr-1 overflow-hidden rounded-lg border border-ui-border bg-white px-3 py-1.5 text-sm text-ui-text placeholder:text-ui-muted focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
            aria-label="Funnels filtern"
            @keydown.escape="toggleSearch"
          >
        </Transition>
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-ui-muted transition-colors hover:bg-ui-border hover:text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
          :aria-pressed="showSearchInput"
          :aria-label="showSearchInput ? 'Suche schließen' : 'Suche öffnen'"
          @click="toggleSearch"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Fehler -->
    <div
      v-if="loadError"
      class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      role="alert"
    >
      {{ loadError }}
    </div>

    <!-- Ladeindikator (nur beim ersten Laden, solange noch keine Daten vorhanden) -->
    <div
      v-if="isFirstLoad"
      class="flex items-center gap-3 py-20 text-ui-muted"
      aria-busy="true"
      aria-label="Funnels werden geladen"
    >
      <svg class="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span class="text-sm">Funnels werden geladen...</span>
    </div>

    <!-- Inhalt (nach erstem Laden) -->
    <template v-else-if="isInitialized">
      <!-- Leer-Zustand: keine Funnels vorhanden, keine aktive Suche -->
      <div
        v-if="total === 0 && !activeSearch && !loadError"
        class="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ui-border bg-ui-surface px-6 py-20 text-center"
      >
        <p class="mb-1 text-base font-semibold text-ui-text">
          Keine Funnels gefunden
        </p>
        <p class="text-sm text-ui-muted">
          In keinem Deiner Workspaces sind bislang Funnels vorhanden.
        </p>
      </div>

      <!-- Kein-Suchergebnis-Zustand: Suche aktiv, 0 Treffer -->
      <div
        v-else-if="total === 0 && activeSearch"
        class="rounded-2xl border border-ui-border bg-ui-surface px-6 py-12 text-center"
      >
        <p class="text-sm font-medium text-ui-text">
          Kein Funnel mit „{{ searchQuery }}" gefunden.
        </p>
        <button
          type="button"
          class="mt-2 text-sm text-ui-accent hover:underline focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
          @click="searchQuery = ''"
        >
          Filter zurücksetzen
        </button>
      </div>

      <!-- Funnels nach Workspace gruppiert -->
      <div
        v-else-if="groupedByWorkspace.length > 0"
        :aria-busy="isRefreshing"
        :class="{ 'opacity-60 pointer-events-none': isRefreshing }"
        class="space-y-8 transition-opacity duration-150"
      >
        <section
          v-for="group in groupedByWorkspace"
          :key="group.id"
          :aria-labelledby="`ws-heading-${group.id}`"
        >
          <!-- Workspace-Überschrift -->
          <div class="mb-3 flex items-center gap-2">
            <span
              class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
              :class="workspaceColor(group.name)"
              aria-hidden="true"
            >
              {{ group.name[0]?.toUpperCase() ?? 'W' }}
            </span>
            <h2
              :id="`ws-heading-${group.id}`"
              class="text-base font-semibold text-ui-text"
            >
              {{ group.name }}
            </h2>
            <span class="rounded-full bg-ui-bg px-2 py-0.5 text-xs text-ui-muted">
              {{ group.funnels.length }} {{ group.funnels.length === 1 ? 'Funnel' : 'Funnels' }}
            </span>
          </div>

          <!-- Funnel-Tabelle -->
          <div class="overflow-hidden rounded-2xl border border-ui-border bg-ui-surface shadow-sm">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-ui-border">
                  <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-ui-muted">
                    Name
                  </th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-ui-muted">
                    Status
                  </th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-ui-muted">
                    CVR
                  </th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-ui-muted">
                    Kontakte
                  </th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-ui-muted">
                    Zuletzt bearbeitet
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-ui-border">
                <tr
                  v-for="funnel in group.funnels"
                  :key="funnel.id"
                  class="transition-colors hover:bg-ui-bg"
                >
                  <!-- Name + Thumbnail -->
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <div
                        class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        :style="{ backgroundColor: thumbnailColor(funnel.name) }"
                        aria-hidden="true"
                      >
                        {{ funnel.name[0]?.toUpperCase() ?? 'F' }}
                      </div>
                      <NuxtLink
                        :to="`/admin/funnels/${funnel.id}/editor`"
                        class="font-medium text-ui-text hover:text-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
                      >
                        {{ funnel.name }}
                      </NuxtLink>
                    </div>
                  </td>

                  <!-- Status -->
                  <td class="px-4 py-3">
                    <span
                      :class="[
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        funnel.status === 'published'
                          ? 'bg-live-bg text-live-text'
                          : 'bg-ui-bg text-ui-muted',
                      ]"
                    >
                      {{ statusLabel(funnel.status) }}
                    </span>
                  </td>

                  <!-- CVR -->
                  <td class="px-4 py-3 tabular-nums text-ui-text">
                    {{ funnel.conversion_rate.toFixed(2) }}%
                  </td>

                  <!-- Kontakte -->
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-1.5 text-ui-text">
                      <svg class="h-3.5 w-3.5 flex-shrink-0 text-ui-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span class="tabular-nums">{{ funnel.leads_count }}</span>
                    </div>
                  </td>

                  <!-- Zuletzt bearbeitet -->
                  <td class="px-4 py-3 text-xs text-ui-muted">
                    {{ relativeTime(funnel.updated_at) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Pagination -->
        <div
          v-if="lastPage > 1"
          class="flex flex-col items-center gap-2 pt-2"
        >
          <!-- Seitenanzeige -->
          <p class="text-xs text-ui-muted">
            Seite {{ currentPage }} von {{ lastPage }} ({{ total }} {{ total === 1 ? 'Funnel' : 'Funnels' }} gesamt)
          </p>

          <nav aria-label="Seiten der Funnel-Liste">
            <ul class="flex items-center gap-1">
              <!-- Zurück -->
              <li>
                <button
                  type="button"
                  class="flex h-8 min-w-[2rem] items-center justify-center rounded-lg border border-ui-border bg-white px-2 text-sm text-ui-text transition-colors hover:bg-ui-bg focus:outline-none focus:ring-2 focus:ring-ui-accent/50 disabled:cursor-not-allowed disabled:opacity-40"
                  :disabled="currentPage <= 1"
                  aria-label="Vorherige Seite"
                  @click="goToPage(currentPage - 1)"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </li>

              <!-- Seitenzahlen -->
              <li
                v-for="(item, idx) in pages"
                :key="`${String(item)}-${idx}`"
              >
                <span
                  v-if="item === 'ellipsis'"
                  class="flex h-8 w-8 items-center justify-center text-sm text-ui-muted"
                  aria-hidden="true"
                >
                  &hellip;
                </span>
                <button
                  v-else
                  type="button"
                  class="flex h-8 min-w-[2rem] items-center justify-center rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
                  :class="item === currentPage
                    ? 'border-ui-accent bg-ui-accent font-semibold text-white'
                    : 'border-ui-border bg-white text-ui-text hover:bg-ui-bg'"
                  :aria-current="item === currentPage ? 'page' : undefined"
                  :aria-label="`Seite ${item}`"
                  @click="goToPage(item)"
                >
                  {{ item }}
                </button>
              </li>

              <!-- Weiter -->
              <li>
                <button
                  type="button"
                  class="flex h-8 min-w-[2rem] items-center justify-center rounded-lg border border-ui-border bg-white px-2 text-sm text-ui-text transition-colors hover:bg-ui-bg focus:outline-none focus:ring-2 focus:ring-ui-accent/50 disabled:cursor-not-allowed disabled:opacity-40"
                  :disabled="currentPage >= lastPage"
                  aria-label="Nächste Seite"
                  @click="goToPage(currentPage + 1)"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </template>
  </div>
</template>
