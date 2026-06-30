<!--
  EditorFloatingToolbar: Vertikale Schnellaktionen neben einem selektierten Block.
  Zeigt Duplizieren, Hoch, Runter, Löschen.
  Erscheint rechts neben dem Handy-Frame, außerhalb des Frame-Hintergrunds.
-->
<script setup lang="ts">
const props = defineProps<{
  stepId: string
  blockId: string
  blockIndex: number
  totalBlocks: number
}>()

const editorStore = useEditorStore()

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
</script>

<template>
  <div
    class="flex flex-col overflow-hidden rounded-lg border border-ui-border bg-white shadow-sm"
    role="toolbar"
    aria-label="Block-Aktionen"
  >
    <!-- Duplizieren -->
    <button
      type="button"
      class="flex h-8 w-8 items-center justify-center text-ui-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus:ring-1 focus:ring-inset focus:ring-ui-accent/50"
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
      class="flex h-8 w-8 items-center justify-center text-ui-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus:ring-1 focus:ring-inset focus:ring-ui-accent/50 disabled:cursor-not-allowed disabled:opacity-30"
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
      class="flex h-8 w-8 items-center justify-center text-ui-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus:ring-1 focus:ring-inset focus:ring-ui-accent/50 disabled:cursor-not-allowed disabled:opacity-30"
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

    <!-- Löschen -->
    <button
      type="button"
      class="flex h-8 w-8 items-center justify-center text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-red-400/50"
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
</template>
