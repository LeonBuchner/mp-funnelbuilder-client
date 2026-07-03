<!--
  EditorBlockLinkTarget: Verknüpfungs-Sektion für Button- und Single-Choice-Blöcke.
  Layout nach 08-element-ausgewaehlt-formatierung.jpg:
    - Dropdown "Nächste Seite" (Navigationsziel)
    - Dropdown "Kein Ergebnis" (verknüpftes Ergebnis-Step)
    - Block-ID read-only
-->
<script setup lang="ts">
import type { ButtonBlock, SingleChoiceBlock, BlockTarget } from '~/types/funnel'

const props = defineProps<{
  isReadonly: boolean
}>()

const editorStore = useEditorStore()

/** Nur für button und single_choice */
const block = computed<ButtonBlock | SingleChoiceBlock | null>(() => {
  const b = editorStore.selectedBlock
  if (!b) return null
  if (b.type === 'button' || b.type === 'single_choice') {
    return b as ButtonBlock | SingleChoiceBlock
  }
  return null
})

const stepId = computed<string>(() => editorStore.selectedStep?.id ?? '')

/** Seiten (kein Ergebnis-Step) für das Ziel-Dropdown */
const pageSteps = computed(() =>
  editorStore.steps.filter(s => s.type !== 'result'),
)

/** Ergebnis-Steps für das Ergebnis-Dropdown */
const resultSteps = computed(() =>
  editorStore.steps.filter(s => s.type === 'result'),
)

/** Buchstabe A/B/C für Ergebnis-Steps */
function resultLabel(idx: number): string {
  return String.fromCharCode(65 + idx)
}

/** Block-ID in die Zwischenablage kopieren */
function copyBlockId(): void {
  if (blockDisplayId.value) {
    navigator.clipboard.writeText(blockDisplayId.value).catch(() => {
      // Kein Fehler-Feedback nötig (nur nice-to-have)
    })
  }
}

/** Index des aktuellen Schritts in der pageSteps-Liste */
const currentPageIdx = computed(() =>
  pageSteps.value.findIndex(s => s.id === stepId.value),
)

// -------------------------------------------------------------------------
// Navigationsziel (erster Dropdown)
// -------------------------------------------------------------------------

/**
 * Wert des ersten Dropdowns als serialisierter String:
 * 'next' | 'step:UUID' | 'result:UUID'
 */
const navTargetValue = computed<string>(() => {
  const t = block.value?.target
  if (!t || t.type === 'next') return 'next'
  if (t.type === 'step') return `step:${t.stepId}`
  if (t.type === 'result') return `result:${t.stepId}`
  return 'next'
})

function onNavChange(event: Event): void {
  const val = (event.target as HTMLSelectElement).value
  if (!block.value || !stepId.value || props.isReadonly) return

  let target: BlockTarget
  if (val === 'next') {
    target = { type: 'next' }
  } else if (val.startsWith('step:')) {
    target = { type: 'step', stepId: val.slice(5) }
  } else if (val.startsWith('result:')) {
    target = { type: 'result', stepId: val.slice(7) }
  } else {
    target = { type: 'next' }
  }

  editorStore.updateBlock(stepId.value, block.value.id, { target } as Parameters<typeof editorStore.updateBlock>[2])
}

// -------------------------------------------------------------------------
// Ergebnis-Zuordnung (zweiter Dropdown)
// -------------------------------------------------------------------------

const resultStepIdValue = computed<string>(() => block.value?.resultStepId ?? '')

function onResultChange(event: Event): void {
  const val = (event.target as HTMLSelectElement).value
  if (!block.value || !stepId.value || props.isReadonly) return
  editorStore.updateBlock(stepId.value, block.value.id, {
    resultStepId: val || null,
  } as Parameters<typeof editorStore.updateBlock>[2])
}

// -------------------------------------------------------------------------
// Block-ID (read-only)
// -------------------------------------------------------------------------

const blockDisplayId = computed<string>(() => {
  const b = block.value
  if (!b) return ''
  if (b.type === 'single_choice') return b.fieldKey
  return b.id.slice(0, 20)
})
</script>

<template>
  <div
    v-if="block"
    class="space-y-2"
  >
    <!-- Abschnitts-Header -->
    <div class="flex items-center justify-between">
      <h3 class="text-xs font-semibold text-ui-text">
        Verknüpfung
      </h3>
      <button
        type="button"
        class="flex h-5 w-5 items-center justify-center rounded-full text-ui-muted hover:text-ui-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
        title="Info zur Verknüpfung"
        aria-label="Info zur Verknüpfung"
      >
        <svg
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.75"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 16v-4m0-4h.01"
          />
        </svg>
      </button>
    </div>

    <!-- Dropdown 1: Nächste Seite / Ziel -->
    <div>
      <label
        :for="`lnk-nav-${block.id}`"
        class="mb-1 flex items-center gap-1 text-xs text-ui-muted"
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
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        Nächste Seite
      </label>
      <select
        :id="`lnk-nav-${block.id}`"
        :value="navTargetValue"
        :disabled="isReadonly"
        class="w-full rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent disabled:cursor-not-allowed disabled:opacity-50"
        @change="onNavChange"
      >
        <option value="next">Nächste Seite</option>
        <optgroup
          v-if="pageSteps.length > 0"
          label="Seiten"
        >
          <option
            v-for="(step, idx) in pageSteps"
            :key="step.id"
            :value="`step:${step.id}`"
            :disabled="idx === currentPageIdx"
          >
            Seite {{ idx + 1 }}: {{ step.internalTitle }}
          </option>
        </optgroup>
        <optgroup
          v-if="resultSteps.length > 0"
          label="Ergebnisse"
        >
          <option
            v-for="(step, idx) in resultSteps"
            :key="step.id"
            :value="`result:${step.id}`"
          >
            Ergebnis {{ resultLabel(idx) }}: {{ step.internalTitle }}
          </option>
        </optgroup>
      </select>
    </div>

    <!-- Dropdown 2: Ergebnis-Zuordnung -->
    <div>
      <label
        :for="`lnk-result-${block.id}`"
        class="mb-1 flex items-center gap-1 text-xs text-ui-muted"
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
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Ergebnis-Zuordnung
      </label>
      <select
        :id="`lnk-result-${block.id}`"
        :value="resultStepIdValue"
        :disabled="isReadonly"
        class="w-full rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent disabled:cursor-not-allowed disabled:opacity-50"
        @change="onResultChange"
      >
        <option value="">Kein Ergebnis</option>
        <option
          v-for="(step, idx) in resultSteps"
          :key="step.id"
          :value="step.id"
        >
          Ergebnis {{ resultLabel(idx) }}: {{ step.internalTitle }}
        </option>
      </select>
    </div>

    <!-- Block-ID (read-only) -->
    <div>
      <div class="mb-1 flex items-center gap-1 text-xs text-ui-muted">
        <span class="text-[10px] font-semibold uppercase tracking-wider">ID</span>
      </div>
      <div class="flex items-center gap-1.5 rounded-lg border border-ui-border bg-ui-bg px-3 py-2">
        <span class="min-w-0 flex-1 truncate font-mono text-xs text-ui-muted">
          {{ blockDisplayId }}
        </span>
        <button
          type="button"
          class="flex-shrink-0 text-ui-muted hover:text-ui-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
          :aria-label="`Block-ID kopieren: ${blockDisplayId}`"
          title="Kopieren"
          @click="copyBlockId"
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
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
