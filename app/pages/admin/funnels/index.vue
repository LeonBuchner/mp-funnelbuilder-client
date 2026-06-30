<script setup lang="ts">
import type { FunnelListItem } from '~/types/funnel'
import type { CreateFunnelPayload } from '~/composables/useFunnels'

definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
})

useSeoMeta({
  title: 'Alle Funnels - MP Funnel-Builder',
  description: 'Alle Deine Funnels auf einen Blick: anlegen, bearbeiten und veröffentlichen.',
})

const workspaceStore = useWorkspaceStore()
const funnelsApi = useFunnels()
const toast = useToast()
const router = useRouter()

// ---------------------------------------------------------------------------
// Daten
// ---------------------------------------------------------------------------
const funnels = ref<FunnelListItem[]>([])
const isLoading = ref(false)
const loadError = ref<string | null>(null)

async function loadFunnels(): Promise<void> {
  const wsId = workspaceStore.activeWorkspace?.id
  if (!wsId) return
  isLoading.value = true
  loadError.value = null
  try {
    const response = await funnelsApi.list(wsId)
    funnels.value = response.data
  } catch {
    loadError.value = 'Funnels konnten nicht geladen werden. Bitte Seite neu laden.'
  } finally {
    isLoading.value = false
  }
}

watch(
  () => workspaceStore.activeWorkspace?.id,
  (id) => {
    if (id) loadFunnels()
    else funnels.value = []
  },
  { immediate: true },
)

// ---------------------------------------------------------------------------
// Suche + Ansicht
// ---------------------------------------------------------------------------
const searchQuery = ref('')
const showSearchInput = ref(false)
const viewMode = ref<'list' | 'grid'>('list')
const searchInputEl = ref<HTMLInputElement | null>(null)

function toggleSearch(): void {
  showSearchInput.value = !showSearchInput.value
  if (showSearchInput.value) {
    nextTick(() => searchInputEl.value?.focus())
  } else {
    searchQuery.value = ''
  }
}

const filteredFunnels = computed<FunnelListItem[]>(() => {
  if (!searchQuery.value.trim()) return funnels.value
  const q = searchQuery.value.toLowerCase()
  return funnels.value.filter(f => f.name.toLowerCase().includes(q))
})

const isReadonly = computed(() => workspaceStore.activeRole === 'client')

// ---------------------------------------------------------------------------
// Funnel anlegen
// ---------------------------------------------------------------------------
const showCreateDialog = ref(false)
const newFunnelName = ref('')
const isCreating = ref(false)
const createError = ref<string | null>(null)

function openCreateDialog(): void {
  newFunnelName.value = ''
  createError.value = null
  showCreateDialog.value = true
}

function closeCreateDialog(): void {
  showCreateDialog.value = false
  newFunnelName.value = ''
  createError.value = null
}

async function handleCreate(): Promise<void> {
  const name = newFunnelName.value.trim()
  if (!name) {
    createError.value = 'Bitte einen Namen eingeben.'
    return
  }
  const wsId = workspaceStore.activeWorkspace?.id
  if (!wsId) return

  isCreating.value = true
  createError.value = null
  try {
    const payload: CreateFunnelPayload = { name }
    const response = await funnelsApi.create(wsId, payload)
    closeCreateDialog()
    await router.push(`/admin/funnels/${response.data.id}/editor`)
  } catch {
    createError.value = 'Funnel konnte nicht angelegt werden. Bitte erneut versuchen.'
  } finally {
    isCreating.value = false
  }
}

function handleCreateKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') closeCreateDialog()
}

// ---------------------------------------------------------------------------
// Funnel löschen
// ---------------------------------------------------------------------------
const deletingFunnelId = ref<string | null>(null)
const deletingFunnelName = ref('')

function confirmDelete(funnel: FunnelListItem): void {
  deletingFunnelId.value = funnel.id
  deletingFunnelName.value = funnel.name
  openMenuId.value = null
}

function cancelDelete(): void {
  deletingFunnelId.value = null
  deletingFunnelName.value = ''
}

async function handleDelete(): Promise<void> {
  const id = deletingFunnelId.value
  if (!id) return
  try {
    await funnelsApi.remove(id)
    funnels.value = funnels.value.filter(f => f.id !== id)
    toast.success('Funnel wurde gelöscht.')
  } catch {
    toast.error('Löschen fehlgeschlagen. Bitte erneut versuchen.')
  } finally {
    deletingFunnelId.value = null
    deletingFunnelName.value = ''
  }
}

function handleDeleteKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') cancelDelete()
}

// ---------------------------------------------------------------------------
// Favorit umschalten
// ---------------------------------------------------------------------------
async function handleToggleFavorite(funnel: FunnelListItem): Promise<void> {
  if (isReadonly.value) return
  const prev = funnel.is_favorite
  // Optimistisch umschalten
  funnels.value = funnels.value.map(f =>
    f.id === funnel.id ? { ...f, is_favorite: !f.is_favorite } : f,
  )
  try {
    const response = await funnelsApi.toggleFavorite(funnel.id)
    funnels.value = funnels.value.map(f =>
      f.id === funnel.id ? { ...f, is_favorite: response.is_favorite } : f,
    )
  } catch {
    // Zustand zurücksetzen
    funnels.value = funnels.value.map(f =>
      f.id === funnel.id ? { ...f, is_favorite: prev } : f,
    )
    toast.error('Favorit konnte nicht geändert werden.')
  }
}

// ---------------------------------------------------------------------------
// "..."-Zeilen-Menu
// ---------------------------------------------------------------------------
const openMenuId = ref<string | null>(null)

function toggleMenu(funnelId: string, event: Event): void {
  event.stopPropagation()
  openMenuId.value = openMenuId.value === funnelId ? null : funnelId
}

function closeAllMenus(): void {
  openMenuId.value = null
}

onMounted(() => document.addEventListener('click', closeAllMenus))
onUnmounted(() => document.removeEventListener('click', closeAllMenus))

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

/** Relativer Zeitabstand auf Deutsch, ohne externe Abhängigkeit. */
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
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr))
}

function statusLabel(status: FunnelListItem['status']): string {
  switch (status) {
    case 'published': return 'Live'
    case 'draft': return 'Entwurf'
    case 'archived': return 'Archiviert'
    default: return status
  }
}

/** Thumbnailfarbe basierend auf dem Funnel-Namen (deterministisch). */
function thumbnailColor(name: string): string {
  const colors = [
    '#3579fa', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0
  }
  return colors[Math.abs(hash) % colors.length] ?? '#3579fa'
}
</script>

<template>
  <div class="p-6">
    <!-- ------------------------------------------------------------------ -->
    <!-- Seitenkopf                                                          -->
    <!-- ------------------------------------------------------------------ -->
    <div class="mb-6 flex items-center justify-between gap-4">
      <h1 class="flex items-center gap-2 text-2xl font-bold text-ui-text">
        Alle Funnels
        <svg class="h-5 w-5 text-ui-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </h1>

      <div class="flex items-center gap-2">
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
              placeholder="Funnel suchen..."
              class="mr-1 overflow-hidden rounded-lg border border-ui-border bg-white px-3 py-1.5 text-sm text-ui-text placeholder:text-ui-muted focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
              aria-label="Funnels nach Name filtern"
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

        <!-- Ansicht-Umschalter -->
        <div class="flex rounded-lg border border-ui-border bg-white" role="group" aria-label="Ansicht">
          <button
            type="button"
            :aria-pressed="viewMode === 'list'"
            class="flex h-8 w-8 items-center justify-center rounded-l-lg transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ui-accent/50"
            :class="viewMode === 'list' ? 'bg-ui-accent/10 text-ui-accent' : 'text-ui-muted hover:bg-ui-bg'"
            aria-label="Listenansicht"
            @click="viewMode = 'list'"
          >
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
          <button
            type="button"
            :aria-pressed="viewMode === 'grid'"
            class="flex h-8 w-8 items-center justify-center rounded-r-lg transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ui-accent/50"
            :class="viewMode === 'grid' ? 'bg-ui-accent/10 text-ui-accent' : 'text-ui-muted hover:bg-ui-bg'"
            aria-label="Rasteransicht"
            @click="viewMode = 'grid'"
          >
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
        </div>

        <!-- Neuer Funnel -->
        <button
          v-if="!isReadonly"
          type="button"
          class="flex items-center gap-1.5 rounded-lg bg-ui-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ui-accent-hover focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
          @click="openCreateDialog"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Neuer Funnel
        </button>
      </div>
    </div>

    <!-- ------------------------------------------------------------------ -->
    <!-- Fehler                                                              -->
    <!-- ------------------------------------------------------------------ -->
    <div
      v-if="loadError"
      class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      role="alert"
    >
      {{ loadError }}
    </div>

    <!-- ------------------------------------------------------------------ -->
    <!-- Ladeindikator                                                       -->
    <!-- ------------------------------------------------------------------ -->
    <div
      v-if="isLoading"
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

    <!-- ------------------------------------------------------------------ -->
    <!-- Leer-Zustand                                                        -->
    <!-- ------------------------------------------------------------------ -->
    <div
      v-else-if="!isLoading && funnels.length === 0 && !loadError"
      class="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ui-border bg-ui-surface px-6 py-20 text-center"
    >
      <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-ui-accent/10">
        <svg class="h-7 w-7 text-ui-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
      </div>
      <p class="mb-1 text-base font-semibold text-ui-text">
        Noch kein Funnel vorhanden
      </p>
      <p class="mb-6 max-w-sm text-sm text-ui-muted">
        Leg Deinen ersten Funnel an und baue ihn Schritt für Schritt auf.
      </p>
      <button
        v-if="!isReadonly"
        type="button"
        class="flex items-center gap-1.5 rounded-lg bg-ui-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ui-accent-hover focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
        @click="openCreateDialog"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Ersten Funnel anlegen
      </button>
    </div>

    <!-- ------------------------------------------------------------------ -->
    <!-- Kein Suchergebnis                                                   -->
    <!-- ------------------------------------------------------------------ -->
    <div
      v-else-if="!isLoading && funnels.length > 0 && filteredFunnels.length === 0"
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

    <!-- ------------------------------------------------------------------ -->
    <!-- LISTENANSICHT                                                       -->
    <!-- ------------------------------------------------------------------ -->
    <div
      v-else-if="!isLoading && filteredFunnels.length > 0 && viewMode === 'list'"
      class="overflow-hidden rounded-2xl border border-ui-border bg-ui-surface shadow-sm"
    >
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-ui-border">
            <th
              scope="col"
              class="w-[40%] px-4 py-3 text-left text-xs font-semibold text-ui-muted"
            >
              <span class="flex items-center gap-1">
                Name
                <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </svg>
              </span>
            </th>
            <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-ui-muted">
              <span class="flex items-center gap-1">
                Favorit
                <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </svg>
              </span>
            </th>
            <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-ui-muted">
              <span class="flex items-center gap-1">
                Status
                <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </svg>
              </span>
            </th>
            <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-ui-muted">
              <span class="flex items-center gap-1">
                CVR
                <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </svg>
              </span>
            </th>
            <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-ui-muted">
              <span class="flex items-center gap-1">
                Kontakte
                <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </svg>
              </span>
            </th>
            <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-ui-muted">
              Kontaktstatus
            </th>
            <th scope="col" class="w-10 px-4 py-3">
              <span class="sr-only">Aktionen</span>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-ui-border">
          <tr
            v-for="funnel in filteredFunnels"
            :key="funnel.id"
            class="group transition-colors hover:bg-ui-bg"
          >
            <!-- Name + Thumbnail -->
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <!-- Thumbnail -->
                <div class="flex-shrink-0">
                  <img
                    v-if="funnel.thumbnail_url"
                    :src="funnel.thumbnail_url"
                    :alt="`Vorschau von ${funnel.name}`"
                    width="36"
                    height="36"
                    loading="lazy"
                    class="h-9 w-9 rounded-full object-cover"
                  >
                  <div
                    v-else
                    class="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                    :style="{ backgroundColor: thumbnailColor(funnel.name) }"
                    aria-hidden="true"
                  >
                    {{ funnel.name[0]?.toUpperCase() ?? 'F' }}
                  </div>
                </div>

                <!-- Name + Zeitstempel -->
                <div class="min-w-0">
                  <NuxtLink
                    :to="`/admin/funnels/${funnel.id}/editor`"
                    class="block truncate font-medium text-ui-text hover:text-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
                  >
                    {{ funnel.name }}
                  </NuxtLink>
                  <p class="mt-0.5 text-xs text-ui-muted">
                    Zuletzt bearbeitet {{ relativeTime(funnel.updated_at) }}
                  </p>
                </div>
              </div>
            </td>

            <!-- Favorit -->
            <td class="px-4 py-3">
              <button
                type="button"
                :aria-label="funnel.is_favorite ? `${funnel.name} aus Favoriten entfernen` : `${funnel.name} zu Favoriten hinzufügen`"
                :aria-pressed="funnel.is_favorite"
                class="rounded p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
                :class="funnel.is_favorite ? 'text-amber-400' : 'text-ui-border hover:text-amber-400'"
                :disabled="isReadonly"
                @click="handleToggleFavorite(funnel)"
              >
                <svg
                  class="h-4 w-4"
                  :fill="funnel.is_favorite ? 'currentColor' : 'none'"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>
            </td>

            <!-- Status -->
            <td class="px-4 py-3">
              <div class="flex items-center gap-1.5">
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
                <!-- Link-Icon bei veröffentlichten Funnels -->
                <a
                  v-if="funnel.status === 'published'"
                  :href="`/f/${funnel.id}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-ui-muted transition-colors hover:text-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
                  :aria-label="`${funnel.name} öffentlich öffnen`"
                >
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </a>
              </div>
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

            <!-- Kontaktstatus-Balken -->
            <td class="px-4 py-3">
              <div
                class="h-1.5 w-28 overflow-hidden rounded-full"
                role="presentation"
                aria-hidden="true"
              >
                <div
                  class="h-full w-full"
                  style="background: linear-gradient(to right, #22c55e 35%, #eab308 65%, #ef4444 100%)"
                />
              </div>
            </td>

            <!-- Aktionen -->
            <td class="relative px-4 py-3">
              <button
                type="button"
                class="flex h-7 w-7 items-center justify-center rounded-lg text-ui-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
                :aria-expanded="openMenuId === funnel.id"
                aria-haspopup="true"
                :aria-label="`Aktionen für ${funnel.name}`"
                @click="(e) => toggleMenu(funnel.id, e)"
              >
                <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 5c-.828 0-1.5-.672-1.5-1.5S11.172 2 12 2s1.5.672 1.5 1.5S12.828 5 12 5zm0 7c-.828 0-1.5-.672-1.5-1.5S11.172 10 12 10s1.5.672 1.5 1.5S12.828 12 12 12zm0 7c-.828 0-1.5-.672-1.5-1.5S11.172 17 12 17s1.5.672 1.5 1.5S12.828 19 12 19z" />
                </svg>
              </button>

              <!-- Dropdown-Menu -->
              <div
                v-if="openMenuId === funnel.id"
                class="absolute right-4 top-12 z-20 min-w-[140px] rounded-xl border border-ui-border bg-ui-surface py-1 shadow-lg"
                role="menu"
              >
                <NuxtLink
                  :to="`/admin/funnels/${funnel.id}/editor`"
                  role="menuitem"
                  class="flex items-center gap-2 px-3.5 py-2 text-sm text-ui-text transition-colors hover:bg-ui-bg focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ui-accent/50"
                >
                  <svg class="h-3.5 w-3.5 text-ui-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Bearbeiten
                </NuxtLink>
                <button
                  v-if="!isReadonly"
                  type="button"
                  role="menuitem"
                  class="flex w-full items-center gap-2 px-3.5 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-400/50"
                  @click="confirmDelete(funnel)"
                >
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Löschen
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ------------------------------------------------------------------ -->
    <!-- RASTERANSICHT                                                       -->
    <!-- ------------------------------------------------------------------ -->
    <div
      v-else-if="!isLoading && filteredFunnels.length > 0 && viewMode === 'grid'"
      class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <article
        v-for="funnel in filteredFunnels"
        :key="funnel.id"
        class="group relative overflow-hidden rounded-2xl border border-ui-border bg-ui-surface shadow-sm transition-shadow hover:shadow-md"
      >
        <!-- Thumbnail-Bereich -->
        <div
          class="relative flex h-32 items-center justify-center"
          :style="{ backgroundColor: thumbnailColor(funnel.name) + '20' }"
        >
          <img
            v-if="funnel.thumbnail_url"
            :src="funnel.thumbnail_url"
            :alt="`Vorschau von ${funnel.name}`"
            width="128"
            height="128"
            loading="lazy"
            class="h-full w-full object-cover"
          >
          <span
            v-else
            class="text-4xl font-bold"
            :style="{ color: thumbnailColor(funnel.name) }"
            aria-hidden="true"
          >
            {{ funnel.name[0]?.toUpperCase() ?? 'F' }}
          </span>

          <!-- Status-Badge -->
          <span
            :class="[
              'absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium',
              funnel.status === 'published'
                ? 'bg-live-bg text-live-text'
                : 'bg-white/80 text-ui-muted',
            ]"
          >
            {{ statusLabel(funnel.status) }}
          </span>

          <!-- Favorit-Button -->
          <button
            type="button"
            :aria-label="funnel.is_favorite ? `${funnel.name} aus Favoriten entfernen` : `${funnel.name} zu Favoriten hinzufügen`"
            :aria-pressed="funnel.is_favorite"
            class="absolute right-2 top-2 rounded-lg p-1 backdrop-blur-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
            :class="funnel.is_favorite ? 'text-amber-400' : 'text-white/60 hover:text-amber-400'"
            :disabled="isReadonly"
            @click="handleToggleFavorite(funnel)"
          >
            <svg
              class="h-4 w-4"
              :fill="funnel.is_favorite ? 'currentColor' : 'none'"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
        </div>

        <!-- Karten-Inhalt -->
        <div class="p-4">
          <h2 class="mb-1 truncate font-semibold text-ui-text">
            <NuxtLink
              :to="`/admin/funnels/${funnel.id}/editor`"
              class="hover:text-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
            >
              {{ funnel.name }}
            </NuxtLink>
          </h2>
          <p class="mb-3 text-xs text-ui-muted">
            {{ relativeTime(funnel.updated_at) }}
          </p>
          <div class="flex items-center justify-between text-xs text-ui-muted">
            <span class="flex items-center gap-1">
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {{ funnel.leads_count }} Kontakte
            </span>
            <span>CVR {{ funnel.conversion_rate.toFixed(2) }}%</span>
          </div>
        </div>
      </article>
    </div>

    <!-- ------------------------------------------------------------------ -->
    <!-- Dialog: Neuen Funnel anlegen                                        -->
    <!-- ------------------------------------------------------------------ -->
    <Teleport to="body">
      <div
        v-if="showCreateDialog"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-dialog-title"
        @click.self="closeCreateDialog"
        @keydown="handleCreateKeydown"
      >
        <div class="w-full max-w-sm rounded-2xl bg-ui-surface shadow-xl">
          <div class="border-b border-ui-border px-6 py-4">
            <h2
              id="create-dialog-title"
              class="text-base font-semibold text-ui-text"
            >
              Neuer Funnel
            </h2>
          </div>
          <form
            class="p-6"
            @submit.prevent="handleCreate"
          >
            <div class="mb-5">
              <label
                for="new-funnel-name"
                class="mb-1.5 block text-sm font-medium text-ui-text"
              >
                Name
              </label>
              <input
                id="new-funnel-name"
                v-model="newFunnelName"
                type="text"
                placeholder="z. B. Kontaktformular Herbst 2025"
                required
                autofocus
                class="w-full rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-text placeholder:text-ui-muted focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
              >
              <p
                v-if="createError"
                class="mt-1.5 text-xs text-red-600"
                role="alert"
              >
                {{ createError }}
              </p>
            </div>
            <div class="flex justify-end gap-2">
              <button
                type="button"
                class="rounded-lg px-4 py-2 text-sm font-medium text-ui-muted transition-colors hover:bg-ui-bg focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
                @click="closeCreateDialog"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                :disabled="isCreating"
                class="rounded-lg bg-ui-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ui-accent-hover disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
              >
                {{ isCreating ? 'Wird angelegt...' : 'Anlegen und bearbeiten' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- ------------------------------------------------------------------ -->
    <!-- Dialog: Löschen bestätigen                                        -->
    <!-- ------------------------------------------------------------------ -->
    <Teleport to="body">
      <div
        v-if="deletingFunnelId"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        @click.self="cancelDelete"
        @keydown="handleDeleteKeydown"
      >
        <div class="w-full max-w-sm rounded-2xl bg-ui-surface shadow-xl">
          <div class="p-6">
            <h2
              id="delete-dialog-title"
              class="mb-2 text-base font-semibold text-ui-text"
            >
              Funnel löschen?
            </h2>
            <p class="text-sm text-ui-muted">
              „{{ deletingFunnelName }}" wird unwiderruflich gelöscht. Veröffentlichte Links
              funktionieren danach nicht mehr.
            </p>
          </div>
          <div class="flex justify-end gap-2 border-t border-ui-border px-6 py-4">
            <button
              type="button"
              class="rounded-lg px-4 py-2 text-sm font-medium text-ui-muted transition-colors hover:bg-ui-bg focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
              @click="cancelDelete"
            >
              Abbrechen
            </button>
            <button
              type="button"
              class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/50"
              @click="handleDelete"
            >
              Löschen
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
