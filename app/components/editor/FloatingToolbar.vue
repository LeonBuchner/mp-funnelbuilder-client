<!--
  EditorFloatingToolbar: Vertikale Schnellaktionen neben einem selektierten Block.
  Zeigt Duplizieren, Hoch, Runter, Zu Seite kopieren, Löschen.
  Erscheint rechts neben dem Handy-Frame, außerhalb des Frame-Hintergrunds.
-->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { onClickOutside } from '@vueuse/core'

const props = defineProps<{
  stepId: string
  blockId: string
  blockIndex: number
  totalBlocks: number
}>()

const editorStore = useEditorStore()

// ---------------------------------------------------------------------------
// Bestehende Aktionen
// ---------------------------------------------------------------------------

function handleDuplicate(): void {
  editorStore.duplicateBlock(props.stepId, props.blockId)
}

function handleMoveUp(): void {
  editorStore.moveBlock(props.stepId, props.blockId, 'up')
}

function handleMoveDown(): void {
  editorStore.moveBlock(props.stepId, props.blockId, 'down')
}

function handleDelete(): void {
  editorStore.removeBlock(props.stepId, props.blockId)
}

// ---------------------------------------------------------------------------
// „Zu Seite kopieren"-Dropdown
// ---------------------------------------------------------------------------

const copyMenuOpen = ref(false)
const wrapperRef = ref<HTMLElement | null>(null)

/**
 * Alle Steps als Auswahl-Eintraege, inklusive Nummer/Buchstabe und internem Titel.
 * Kopieren in den gleichen Step ist erlaubt (ergibt denselben Effekt wie Duplizieren).
 */
const stepsWithLabels = computed(() => {
  const pageSteps = editorStore.steps.filter(s => s.type !== 'result')
  const resultSteps = editorStore.steps.filter(s => s.type === 'result')

  return editorStore.steps.map(step => {
    if (step.type === 'result') {
      const rIdx = resultSteps.findIndex(s => s.id === step.id)
      const letter = String.fromCharCode(65 + rIdx)
      return { id: step.id, displayLabel: `Ergebnis ${letter}: ${step.internalTitle}` }
    }
    const pIdx = pageSteps.findIndex(s => s.id === step.id)
    return { id: step.id, displayLabel: `Seite ${pIdx + 1}: ${step.internalTitle}` }
  })
})

function toggleCopyMenu(): void {
  copyMenuOpen.value = !copyMenuOpen.value
}

function handleCopyToStep(targetStepId: string): void {
  editorStore.copyBlockToStep(props.blockId, props.stepId, targetStepId)
  copyMenuOpen.value = false
}

onClickOutside(wrapperRef, () => {
  copyMenuOpen.value = false
})
</script>

<template>
  <!-- Wrapper fuer Dropdown-Positionierung; overflow-visible damit Menue nicht geclippt wird -->
  <div
    ref="wrapperRef"
    class="relative"
  >
    <!-- Toolbar-Buttons -->
    <div
      class="flex flex-col overflow-hidden rounded-lg border border-ui-border bg-white shadow-sm"
      role="toolbar"
      aria-label="Block-Aktionen"
    >
      <!-- Duplizieren -->
      <button
        type="button"
        class="flex h-8 w-8 items-center justify-center text-ui-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus:ring-1 focus:ring-inset focus:ring-ui-accent"
        title="Duplizieren"
        aria-label="Block duplizieren"
        @click.stop="handleDuplicate"
      >
        <svg
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.75"
          aria-hidden="true"
        >
          <rect
            x="9"
            y="9"
            width="13"
            height="13"
            rx="2"
            stroke-linejoin="round"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
          />
        </svg>
      </button>

      <div class="h-px bg-ui-border" />

      <!-- Hoch -->
      <button
        type="button"
        :disabled="blockIndex === 0"
        class="flex h-8 w-8 items-center justify-center text-ui-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus:ring-1 focus:ring-inset focus:ring-ui-accent disabled:cursor-not-allowed disabled:opacity-30"
        title="Nach oben"
        aria-label="Block nach oben verschieben"
        @click.stop="handleMoveUp"
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
            d="M5 15l7-7 7 7"
          />
        </svg>
      </button>

      <div class="h-px bg-ui-border" />

      <!-- Runter -->
      <button
        type="button"
        :disabled="blockIndex === totalBlocks - 1"
        class="flex h-8 w-8 items-center justify-center text-ui-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus:ring-1 focus:ring-inset focus:ring-ui-accent disabled:cursor-not-allowed disabled:opacity-30"
        title="Nach unten"
        aria-label="Block nach unten verschieben"
        @click.stop="handleMoveDown"
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
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      <div class="h-px bg-ui-border" />

      <!-- Zu Seite kopieren -->
      <button
        type="button"
        class="flex h-8 w-8 items-center justify-center text-ui-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus:ring-1 focus:ring-inset focus:ring-ui-accent"
        :class="{ 'bg-ui-bg text-ui-accent': copyMenuOpen }"
        title="Zu Seite kopieren"
        aria-label="Block zu anderer Seite kopieren"
        :aria-expanded="copyMenuOpen"
        aria-haspopup="menu"
        @click.stop="toggleCopyMenu"
        @keydown.escape.stop="copyMenuOpen = false"
      >
        <!-- Pfeil-nach-rechts-auf-Quadrat (Exportieren/Senden) -->
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
            d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
          />
        </svg>
      </button>

      <div class="h-px bg-ui-border" />

      <!-- Löschen -->
      <button
        type="button"
        class="flex h-8 w-8 items-center justify-center text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-red-500"
        title="Löschen"
        :aria-label="`Block löschen`"
        @click.stop="handleDelete"
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
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>

    <!-- Seiten-Auswahl-Dropdown -->
    <div
      v-if="copyMenuOpen"
      role="menu"
      aria-label="Seite für die Kopie auswählen"
      class="absolute right-full top-0 z-50 mr-2 min-w-[180px] rounded-lg border border-ui-border bg-white py-1 shadow-lg"
      @keydown.escape.stop="copyMenuOpen = false"
    >
      <p
        class="px-3 py-1 text-xs font-semibold text-ui-muted"
        aria-hidden="true"
      >
        Zu Seite kopieren
      </p>
      <div class="my-1 h-px bg-ui-border" />
      <button
        v-for="step in stepsWithLabels"
        :key="step.id"
        type="button"
        role="menuitem"
        class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-ui-text hover:bg-ui-bg focus:bg-ui-bg focus:outline-none focus:ring-1 focus:ring-inset focus:ring-ui-accent"
        @click.stop="handleCopyToStep(step.id)"
      >
        <span class="truncate">{{ step.displayLabel }}</span>
      </button>
    </div>
  </div>
</template>
