<!--
  EditorTopBar: Editor-Kopfzeile im Perspective-Stil.
  - Links: Home-Icon + Funnel-Name (inline editierbar)
  - Mitte: Tabs Funnel / Metriken / Kontakte / Apps
  - Rechts: Vorschau, Einstellungen, Veröffentlichen, +, Speicherstatus
-->
<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'

const props = defineProps<{
  isReadonly: boolean
}>()

const route = useRoute()
const editorStore = useEditorStore()
const funnelsApi = useFunnels()
const toast = useToast()

// ---------------------------------------------------------------------------
// Routing: Aktiv-Zustand der Tabs
// ---------------------------------------------------------------------------
const funnelRouteId = computed(() => route.params.id as string)
const isEditorActive = computed(() => route.path.endsWith('/editor'))
const isMetricsActive = computed(() => route.path.endsWith('/metrics'))

// ---------------------------------------------------------------------------
// Inline Name-Bearbeitung
// ---------------------------------------------------------------------------
const isEditingName = ref(false)
const editName = ref('')
const nameInputRef = ref<HTMLInputElement | null>(null)

function startEditName(): void {
  if (props.isReadonly) return
  editName.value = editorStore.funnel?.name ?? ''
  isEditingName.value = true
  nextTick(() => nameInputRef.value?.focus())
}

async function saveName(): Promise<void> {
  const name = editName.value.trim()
  isEditingName.value = false
  if (!name || !editorStore.funnel || name === editorStore.funnel.name) return
  try {
    const response = await funnelsApi.update(editorStore.funnel.id, { name })
    editorStore.funnel = response.data
    useSeoMeta({ title: `${response.data.name} - MP Funnel-Builder` })
  } catch {
    toast.error('Name konnte nicht gespeichert werden.')
  }
}

function cancelEditName(): void {
  isEditingName.value = false
}

function handleNameKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') saveName()
  if (event.key === 'Escape') cancelEditName()
}

// ---------------------------------------------------------------------------
// Speicherstatus
// ---------------------------------------------------------------------------
const saveStatusText = computed<string>(() => {
  if (editorStore.isSaving) return 'Speichert...'
  if (editorStore.isDirty) return 'Nicht gespeichert'
  if (editorStore.lastSavedAt) {
    return `Gespeichert um ${new Intl.DateTimeFormat('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(editorStore.lastSavedAt)}`
  }
  return ''
})

const saveStatusClass = computed<string>(() => {
  if (editorStore.isDirty && !editorStore.isSaving) return 'text-amber-600'
  return 'text-ui-muted'
})

// ---------------------------------------------------------------------------
// Veröffentlichen
// ---------------------------------------------------------------------------
async function handlePublish(): Promise<void> {
  const result = await editorStore.publish()
  if (result) {
    const publicUrl = `${window.location.origin}/f/${result.id}`
    toast.success(`Funnel veröffentlicht. URL: ${publicUrl}`)
  } else {
    toast.error('Veröffentlichen fehlgeschlagen. Bitte erneut versuchen.')
  }
}

// ---------------------------------------------------------------------------
// Einstellungen-Dropdown (Platzhalter)
// ---------------------------------------------------------------------------
const showSettingsDropdown = ref(false)
const settingsDropdownEl = ref<HTMLElement | null>(null)

onClickOutside(settingsDropdownEl, () => {
  showSettingsDropdown.value = false
})
</script>

<template>
  <header
    class="z-20 flex h-14 flex-shrink-0 items-center border-b border-ui-border bg-white px-4"
    aria-label="Editor-Kopfzeile"
  >
    <!-- ------------------------------------------------------------------ -->
    <!-- Links: Home + Funnel-Name                                           -->
    <!-- ------------------------------------------------------------------ -->
    <div class="flex min-w-0 flex-1 items-center gap-2">
      <!-- Home-Icon (zurück zur Funnel-Liste) -->
      <NuxtLink
        to="/admin/funnels"
        class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-ui-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
        aria-label="Zurück zur Funnel-Liste"
        title="Funnel-Liste"
      >
        <svg
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.75"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      </NuxtLink>

      <!-- Funnel-Name (inline editierbar) -->
      <template v-if="isEditingName">
        <input
          ref="nameInputRef"
          v-model="editName"
          type="text"
          class="min-w-0 max-w-[240px] rounded border border-ui-accent bg-white px-2 py-1 text-sm font-semibold text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
          aria-label="Funnel-Name bearbeiten"
          @blur="saveName"
          @keydown="handleNameKeydown"
        >
      </template>
      <template v-else>
        <button
          type="button"
          :disabled="props.isReadonly"
          class="max-w-[240px] truncate text-sm font-semibold text-ui-text transition-colors hover:text-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent/50 disabled:cursor-default disabled:hover:text-ui-text"
          :title="props.isReadonly ? undefined : 'Name bearbeiten'"
          :aria-label="`Funnel-Name: ${editorStore.funnel?.name ?? 'Funnel'}. Klicken zum Bearbeiten`"
          @click="startEditName"
        >
          {{ editorStore.funnel?.name ?? 'Funnel' }}
        </button>
      </template>

      <!-- Speicherstatus -->
      <span
        :class="['hidden flex-shrink-0 text-xs sm:block', saveStatusClass]"
        aria-live="polite"
        aria-atomic="true"
      >
        {{ saveStatusText }}
      </span>

      <!-- Readonly-Hinweis -->
      <span
        v-if="props.isReadonly"
        class="flex-shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
      >
        Nur-Ansicht
      </span>
    </div>

    <!-- ------------------------------------------------------------------ -->
    <!-- Mitte: Tabs als Pills (Funnel + Metriken = echte Links)           -->
    <!-- ------------------------------------------------------------------ -->
    <nav
      class="absolute left-1/2 flex -translate-x-1/2 items-center gap-1"
      aria-label="Editor-Bereiche"
    >
      <!-- Funnel (NuxtLink, aktiv auf /editor) -->
      <NuxtLink
        :to="`/admin/funnels/${funnelRouteId}/editor`"
        :class="[
          'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ui-accent/50',
          isEditorActive
            ? 'border border-ui-border bg-white text-ui-text shadow-sm'
            : 'text-ui-muted hover:bg-ui-bg hover:text-ui-text',
        ]"
        :aria-current="isEditorActive ? 'page' : undefined"
      >
        <svg
          class="h-3.5 w-3.5 flex-shrink-0"
          :class="isEditorActive ? 'text-ui-accent' : ''"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        Funnel
      </NuxtLink>

      <!-- Metriken (NuxtLink, aktiv auf /metrics) -->
      <NuxtLink
        :to="`/admin/funnels/${funnelRouteId}/metrics`"
        :class="[
          'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ui-accent/50',
          isMetricsActive
            ? 'border border-ui-border bg-white text-ui-text shadow-sm'
            : 'text-ui-muted hover:bg-ui-bg hover:text-ui-text',
        ]"
        :aria-current="isMetricsActive ? 'page' : undefined"
      >
        <svg
          class="h-3.5 w-3.5 flex-shrink-0"
          :class="isMetricsActive ? 'text-ui-accent' : ''"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        Metriken
      </NuxtLink>

      <!-- Kontakte (deaktiviert, kommt bald) -->
      <button
        type="button"
        disabled
        aria-disabled="true"
        title="Kontakte kommen bald"
        class="flex cursor-not-allowed items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-ui-muted opacity-50 focus:outline-none"
      >
        <svg
          class="h-3.5 w-3.5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        Kontakte
      </button>

      <!-- Apps (deaktiviert, kommt bald) -->
      <button
        type="button"
        disabled
        aria-disabled="true"
        title="Apps kommen bald"
        class="flex cursor-not-allowed items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-ui-muted opacity-50 focus:outline-none"
      >
        <svg
          class="h-3.5 w-3.5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
        Apps
      </button>
    </nav>

    <!-- ------------------------------------------------------------------ -->
    <!-- Rechts: Undo/Redo, Vorschau, Einstellungen, Veröffentlichen, +  -->
    <!-- ------------------------------------------------------------------ -->
    <div class="flex flex-shrink-0 items-center gap-2 pl-4">
      <!-- Validierungsfehler-Indikator -->
      <span
        v-if="Object.keys(editorStore.validationErrors).length > 0"
        class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
        role="alert"
        title="Schema-Validierungsfehler vorhanden"
      >
        Fehler
      </span>

      <!-- Undo/Redo-Buttons -->
      <div
        v-if="!props.isReadonly"
        class="flex items-center gap-0.5"
        role="group"
        aria-label="Bearbeitungsverlauf"
      >
        <button
          type="button"
          :disabled="!editorStore.canUndo"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-ui-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-accent/50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Rückgängig (Strg+Z)"
          title="Rückgängig (Strg+Z)"
          @click="editorStore.undo()"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.75"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
            />
          </svg>
        </button>

        <button
          type="button"
          :disabled="!editorStore.canRedo"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-ui-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-accent/50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Wiederholen (Strg+Y)"
          title="Wiederholen (Strg+Y)"
          @click="editorStore.redo()"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.75"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15 15 21 9m0 0-6-6m6 6H9a6 6 0 0 0 0 12h3"
            />
          </svg>
        </button>
      </div>

      <!-- Vorschau-Toggle (In-Editor-Vorschau) -->
      <button
        type="button"
        :aria-pressed="editorStore.previewMode"
        :class="[
          'flex h-8 w-8 items-center justify-center rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ui-accent/50',
          editorStore.previewMode
            ? 'bg-ui-accent text-white'
            : 'text-ui-muted hover:bg-ui-bg hover:text-ui-text',
        ]"
        aria-label="Vorschau"
        :title="editorStore.previewMode ? 'Vorschau beenden (Esc)' : 'Vorschau'"
        @click="editorStore.togglePreview()"
      >
        <svg
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.75"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      </button>

      <!-- Einstellungen (Zahnrad, Platzhalter-Dropdown) -->
      <div
        ref="settingsDropdownEl"
        class="relative"
      >
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-ui-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
          :aria-expanded="showSettingsDropdown"
          aria-haspopup="true"
          aria-label="Funnel-Einstellungen"
          title="Einstellungen"
          @click="showSettingsDropdown = !showSettingsDropdown"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.75"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>

        <!-- Platzhalter-Dropdown -->
        <div
          v-if="showSettingsDropdown"
          class="absolute right-0 top-full mt-1 w-52 rounded-xl border border-ui-border bg-white py-1.5 shadow-lg"
          role="menu"
          aria-label="Einstellungs-Optionen"
        >
          <p class="px-4 py-3 text-xs text-ui-muted">
            Funnel-Einstellungen kommen als Nächstes.
          </p>
        </div>
      </div>

      <!-- Veröffentlichen -->
      <button
        v-if="!props.isReadonly"
        type="button"
        :disabled="editorStore.publishState === 'publishing' || editorStore.isSaving"
        class="rounded-lg bg-ui-accent px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-ui-accent-hover focus:outline-none focus:ring-2 focus:ring-ui-accent/50 disabled:cursor-not-allowed disabled:opacity-60"
        @click="handlePublish"
      >
        {{
          editorStore.publishState === 'publishing'
            ? 'Wird veröffentlicht...'
            : 'Veröffentlichen'
        }}
      </button>

      <!-- Platzhalter + -->
      <button
        type="button"
        disabled
        aria-disabled="true"
        title="Weitere Optionen kommen bald"
        class="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-lg border border-ui-border text-ui-muted opacity-50 focus:outline-none"
        aria-label="Weitere Optionen"
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
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>
    </div>
  </header>
</template>
