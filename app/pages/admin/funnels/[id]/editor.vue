<script setup lang="ts">
definePageMeta({
  layout: 'editor',
  middleware: ['auth'],
})

const route = useRoute()
const editorStore = useEditorStore()
const workspaceStore = useWorkspaceStore()

const funnelId = computed(() => route.params.id as string)

// ---------------------------------------------------------------------------
// Berechtigungen
// ---------------------------------------------------------------------------
const isReadonly = computed(() => workspaceStore.activeRole === 'client')

// ---------------------------------------------------------------------------
// Laden
// ---------------------------------------------------------------------------
const isLoadingFunnel = ref(true)
const loadError = ref<string | null>(null)

onMounted(async () => {
  try {
    await editorStore.load(funnelId.value)
    useSeoMeta({
      title: `${editorStore.funnel?.name ?? 'Editor'} - MP Funnel-Builder`,
    })
  } catch {
    loadError.value = 'Funnel konnte nicht geladen werden.'
  } finally {
    isLoadingFunnel.value = false
  }
})

// ---------------------------------------------------------------------------
// Add-Panel (ersetzt BlockPicker)
// ---------------------------------------------------------------------------
const showAddPanel = ref(false)

// ---------------------------------------------------------------------------
// Vorschau-Modus
// ---------------------------------------------------------------------------

// Add-Panel schliessen, wenn Vorschau-Modus aktiviert wird
watch(
  () => editorStore.previewMode,
  (active) => {
    if (active) {
      showAddPanel.value = false
    }
  },
)

/**
 * Prueft ob ein Texteingabefeld oder TipTap-Editor fokussiert ist.
 * In diesem Fall behalten diese ihr eigenes Undo-Verhalten.
 */
function isInputFocused(): boolean {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  // contenteditable (TipTap und aehnliche Rich-Text-Editoren)
  if ((el as HTMLElement).contentEditable === 'true') return true
  return false
}

// Esc beendet den Vorschau-Modus; Ctrl/Cmd+Z = Undo; Ctrl/Cmd+Y / Ctrl/Cmd+Shift+Z = Redo
function handleEditorKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && editorStore.previewMode) {
    editorStore.togglePreview()
    return
  }

  // Undo/Redo nur wenn kein Texteingabefeld fokussiert ist
  if (isInputFocused()) return

  const isMac = navigator.platform.toLowerCase().includes('mac')
  const modifier = isMac ? event.metaKey : event.ctrlKey

  if (!modifier) return

  if (event.key === 'z' && !event.shiftKey) {
    event.preventDefault()
    editorStore.undo()
    return
  }

  if (event.key === 'y' || (event.key === 'z' && event.shiftKey)) {
    event.preventDefault()
    editorStore.redo()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEditorKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleEditorKeydown)
})
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <!-- ----------------------------------------------------------------- -->
    <!-- Ladezustand: Skeleton-Artboard                                    -->
    <!-- ----------------------------------------------------------------- -->
    <EditorSkeleton v-if="isLoadingFunnel" />

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
      <!-- Editor-Top-Bar -->
      <EditorTopBar :is-readonly="isReadonly" />

      <!-- Validierungsfehler-Banner -->
      <div
        v-if="Object.keys(editorStore.validationErrors).length > 0"
        class="z-10 border-b border-red-200 bg-red-50 px-5 py-2"
        role="alert"
        aria-live="assertive"
      >
        <p class="mb-1 text-xs font-semibold text-red-700">
          Schema-Validierungsfehler (vom Server):
        </p>
        <ul class="space-y-0.5">
          <li
            v-for="(messages, field) in editorStore.validationErrors"
            :key="field"
            class="text-xs text-red-600"
          >
            <span class="font-mono">{{ field }}</span>: {{ messages.join(', ') }}
          </li>
        </ul>
      </div>

      <!-- Hauptfläche: linkes Panel + Canvas -->
      <!-- Im Vorschau-Modus ist das linke Panel ausgeblendet, damit der Canvas mehr Platz bekommt -->
      <div class="flex flex-1 overflow-hidden">
        <EditorLeftPanel
          v-if="!editorStore.previewMode"
          :is-readonly="isReadonly"
          :show-add-panel="showAddPanel"
          @close-add-panel="showAddPanel = false"
        />
        <EditorCanvas
          :is-readonly="isReadonly"
          @open-block-picker="showAddPanel = true"
        />
      </div>
    </template>
  </div>
</template>
