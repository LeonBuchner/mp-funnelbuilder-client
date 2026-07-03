<!--
  EditorBrandingSection: Zeigt und verwaltet Workspace-Brandings im Design-Tab.

  Abschnitt "Dein Branding" wird UEBER den Perspective-Theme-Presets angezeigt.
  - Liste der vorhandenen Brandings mit Farb-Swatches und Auswahl
  - "Kein Branding" als erste Option (zurueck zum Theme-Preset)
  - "Neues Branding" / Bearbeiten oeffnet BrandingEditorModal
  - Loeschen (nur mp_admin)
  - client-Rolle: read-only (sehen, nicht bearbeiten/anlegen)

  Auswahl wendet das Branding per PUT /funnels/{uuid} { branding_id } an
  und aktualisiert editorStore.funnel.branding sofort fuer den Frame.
-->
<script setup lang="ts">
import type { Branding } from '~/types/funnel'
import { useBrandings } from '~/composables/useBrandings'
import { useFunnels } from '~/composables/useFunnels'

const props = defineProps<{
  isReadonly: boolean
}>()

const editorStore = useEditorStore()
const workspaceStore = useWorkspaceStore()
const { list, remove } = useBrandings()
const { update: updateFunnel } = useFunnels()

// ---------------------------------------------------------------------------
// Brandings laden
// ---------------------------------------------------------------------------

const brandings = ref<Branding[]>([])
const loading = ref(false)
const loadError = ref<string | null>(null)

async function loadBrandings(): Promise<void> {
  const wsId = workspaceStore.activeWorkspace?.id
  if (!wsId) return

  loading.value = true
  loadError.value = null

  try {
    const res = await list(wsId)
    brandings.value = res.data
  }
  catch {
    loadError.value = 'Brandings konnten nicht geladen werden.'
  }
  finally {
    loading.value = false
  }
}

onMounted(loadBrandings)

// ---------------------------------------------------------------------------
// Aktives Branding
// ---------------------------------------------------------------------------

const activeBrandingId = computed<string | null>(
  () => editorStore.funnel?.branding?.id ?? null,
)

// ---------------------------------------------------------------------------
// Branding auf Funnel anwenden
// ---------------------------------------------------------------------------

const applying = ref<string | null>(null) // UUID oder 'none'
const applyError = ref<string | null>(null)

async function applyBranding(brandingId: string | null): Promise<void> {
  const funnelId = editorStore.funnel?.id
  if (!funnelId) return

  applying.value = brandingId ?? 'none'
  applyError.value = null

  try {
    const res = await updateFunnel(funnelId, {
      branding_id: brandingId,
    })

    // editorStore.funnel lokal aktualisieren (kein vollstaendiger Re-Load noetig)
    if (editorStore.funnel) {
      editorStore.funnel = {
        ...editorStore.funnel,
        branding: res.data.branding,
      }
    }
  }
  catch {
    applyError.value = 'Branding konnte nicht gesetzt werden. Bitte erneut versuchen.'
  }
  finally {
    applying.value = null
  }
}

// ---------------------------------------------------------------------------
// Branding loeschen (nur mp_admin)
// ---------------------------------------------------------------------------

const canDelete = computed<boolean>(() => workspaceStore.activeRole === 'mp_admin')
const confirmDeleteId = ref<string | null>(null)
const deleteError = ref<string | null>(null)

async function handleDelete(id: string): Promise<void> {
  deleteError.value = null
  try {
    await remove(id)
    brandings.value = brandings.value.filter(b => b.id !== id)
    confirmDeleteId.value = null

    // Wenn das geloeschte Branding aktiv war, Funnel zuruecksetzen
    if (activeBrandingId.value === id) {
      await applyBranding(null)
    }
  }
  catch {
    confirmDeleteId.value = null
    deleteError.value = 'Das Branding konnte nicht geloescht werden.'
  }
}

// ---------------------------------------------------------------------------
// Branding-Editor-Modal
// ---------------------------------------------------------------------------

const editorModalOpen = ref(false)
const editingBranding = ref<Branding | null>(null)

function openCreateModal(): void {
  editingBranding.value = null
  editorModalOpen.value = true
}

function openEditModal(branding: Branding): void {
  editingBranding.value = branding
  editorModalOpen.value = true
}

function onBrandingSaved(savedBranding: Branding): void {
  const idx = brandings.value.findIndex(b => b.id === savedBranding.id)
  if (idx >= 0) {
    // Update bestehenden Eintrag
    brandings.value = brandings.value.map(b =>
      b.id === savedBranding.id ? savedBranding : b,
    )

    // Frame sofort aktualisieren, wenn dieses Branding aktiv ist
    if (activeBrandingId.value === savedBranding.id && editorStore.funnel) {
      editorStore.funnel = {
        ...editorStore.funnel,
        branding: savedBranding,
      }
    }
  }
  else {
    // Neues Branding ans Ende der Liste
    brandings.value = [...brandings.value, savedBranding]
  }
  editorModalOpen.value = false
}

// ---------------------------------------------------------------------------
// Farb-Swatches fuer die Listenansicht
// ---------------------------------------------------------------------------

function getBrandingSwatches(branding: Branding): string[] {
  return [
    branding.colors.primary,
    branding.colors.background,
    branding.colors.accent,
  ]
}
</script>

<template>
  <section
    class="mb-4"
    aria-label="Dein Branding"
  >
    <div class="mb-2 flex items-center justify-between">
      <h2 class="text-xs font-semibold text-ui-text">
        Dein Branding
      </h2>
      <button
        v-if="!props.isReadonly"
        type="button"
        class="flex h-5 w-5 items-center justify-center rounded text-ui-muted hover:text-ui-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
        aria-label="Neues Branding erstellen"
        title="Neues Branding"
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
      </button>
    </div>

    <!-- Ladefehler -->
    <div
      v-if="loadError"
      class="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"
      role="alert"
    >
      {{ loadError }}
    </div>

    <!-- Anwende-Fehler -->
    <div
      v-if="applyError"
      class="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"
      role="alert"
    >
      {{ applyError }}
    </div>

    <!-- Loeschfehler -->
    <div
      v-if="deleteError"
      class="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"
      role="alert"
    >
      {{ deleteError }}
    </div>

    <!-- Lade-Skelett -->
    <div
      v-if="loading"
      class="space-y-1"
      aria-label="Brandings werden geladen"
    >
      <div
        v-for="n in 2"
        :key="n"
        class="h-10 animate-pulse rounded-xl bg-ui-border"
      />
    </div>

    <ul
      v-else
      class="space-y-1"
      aria-label="Branding-Auswahl"
    >
      <!-- Option: Kein Branding -->
      <li>
        <div
          :class="[
            'group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5',
            !activeBrandingId
              ? 'border-ui-accent bg-ui-accent/5'
              : 'border-transparent bg-white hover:border-ui-border hover:bg-ui-bg/60',
            props.isReadonly ? 'cursor-default' : 'cursor-pointer',
          ]"
        >
          <button
            type="button"
            class="flex flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent rounded-lg"
            :aria-label="!activeBrandingId ? 'Kein Branding (aktiv)' : 'Kein Branding anwenden'"
            :aria-pressed="!activeBrandingId"
            :disabled="props.isReadonly || applying !== null"
            @click="!props.isReadonly && applyBranding(null)"
          >
            <!-- Leere Swatches-Platzhalter -->
            <div
              class="flex shrink-0 gap-0.5"
              aria-hidden="true"
            >
              <span class="h-4 w-4 rounded-full border border-black/10 bg-ui-border" />
              <span class="h-4 w-4 rounded-full border border-black/10 bg-ui-bg" />
            </div>
            <span class="flex-1 truncate text-sm text-ui-muted">
              Kein Branding
            </span>
            <span
              v-if="applying === 'none'"
              class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ui-accent border-t-transparent"
              aria-hidden="true"
            />
            <svg
              v-else-if="!activeBrandingId"
              class="h-4 w-4 shrink-0 text-ui-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2.5"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>
      </li>

      <!-- Vorhandene Brandings -->
      <li
        v-for="branding in brandings"
        :key="branding.id"
      >
        <!-- Bestaetigungs-Overlay loeschen -->
        <div
          v-if="confirmDeleteId === branding.id"
          class="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-3 py-2.5"
          role="alertdialog"
          :aria-label="`Branding ${branding.name} wirklich loeschen?`"
        >
          <span class="text-xs font-medium text-red-700">
            "{{ branding.name }}" loeschen?
          </span>
          <div class="flex gap-1.5">
            <button
              type="button"
              class="rounded px-2.5 py-1 text-xs font-medium bg-red-600 text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500"
              @click="handleDelete(branding.id)"
            >
              Ja
            </button>
            <button
              type="button"
              class="rounded border border-ui-border px-2.5 py-1 text-xs font-medium text-ui-text hover:bg-ui-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
              @click="confirmDeleteId = null"
            >
              Nein
            </button>
          </div>
        </div>

        <div
          v-else
          :class="[
            'group flex w-full items-center gap-2 rounded-xl border px-3 py-2.5',
            activeBrandingId === branding.id
              ? 'border-ui-accent bg-ui-accent/5'
              : 'border-transparent bg-white hover:border-ui-border hover:bg-ui-bg/60',
          ]"
        >
          <!-- Auswahl-Button (Hauptflaeche) -->
          <button
            type="button"
            class="flex flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent rounded-lg"
            :aria-label="`Branding ${branding.name} ${activeBrandingId === branding.id ? '(aktiv)' : 'anwenden'}`"
            :aria-pressed="activeBrandingId === branding.id"
            :disabled="props.isReadonly || applying !== null"
            @click="!props.isReadonly && applyBranding(branding.id)"
          >
            <!-- Farb-Swatches -->
            <div
              class="flex shrink-0 gap-0.5"
              aria-hidden="true"
            >
              <span
                v-for="color in getBrandingSwatches(branding)"
                :key="color"
                class="h-4 w-4 rounded-full border border-black/10"
                :style="{ backgroundColor: color }"
              />
            </div>
            <span class="flex-1 truncate text-sm text-ui-text">
              {{ branding.name }}
            </span>
            <span
              v-if="applying === branding.id"
              class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ui-accent border-t-transparent"
              aria-hidden="true"
            />
            <svg
              v-else-if="activeBrandingId === branding.id"
              class="h-4 w-4 shrink-0 text-ui-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2.5"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>

          <!-- Aktions-Buttons (Hover und Tastatur-Fokus) -->
          <div
            v-if="!props.isReadonly"
            class="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
            @click.stop
          >
            <!-- Bearbeiten -->
            <button
              type="button"
              class="flex h-6 w-6 items-center justify-center rounded text-ui-muted hover:text-ui-text focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
              :aria-label="`Branding ${branding.name} bearbeiten`"
              @click="openEditModal(branding)"
            >
              <svg
                class="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>

            <!-- Loeschen (nur mp_admin) -->
            <button
              v-if="canDelete"
              type="button"
              class="flex h-6 w-6 items-center justify-center rounded text-ui-muted hover:text-red-500 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
              :aria-label="`Branding ${branding.name} loeschen`"
              @click="confirmDeleteId = branding.id"
            >
              <svg
                class="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        </div>
      </li>

      <!-- Leer-Zustand -->
      <li
        v-if="!loading && brandings.length === 0"
        class="px-3 py-2 text-xs text-ui-muted"
      >
        Noch keine Brandings vorhanden.
      </li>
    </ul>

    <!-- Branding-Editor-Modal -->
    <Teleport to="body">
      <EditorBrandingEditorModal
        v-if="editorModalOpen && workspaceStore.activeWorkspace"
        :workspace-uuid="workspaceStore.activeWorkspace.id"
        :branding="editingBranding"
        @saved="onBrandingSaved"
        @close="editorModalOpen = false"
      />
    </Teleport>
  </section>
</template>
