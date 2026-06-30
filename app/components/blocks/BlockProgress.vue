<script setup lang="ts">
import type { ProgressIndicatorBlock } from '~/types/funnel'

const props = defineProps<{
  block: ProgressIndicatorBlock
  mode: 'editor' | 'live'
}>()

// ---------------------------------------------------------------------------
// Step-Kontext via inject (bereitgestellt von Canvas.vue / Renderer).
// Wenn kein Provider vorhanden (Standalone-Test, Storybook), ist ctx null.
// Dann Fallback auf block.currentStep / block.totalSteps.
// ---------------------------------------------------------------------------

const stepCtx = useFunnelStepContext()

/**
 * 1-basierte Fragennummer des aktuellen Steps.
 * null, wenn der Step kein Frage-Step ist oder kein Kontext vorhanden
 * und block.totalSteps <= 0.
 */
const displayQuestionNumber = computed<number | null>(() => {
  if (stepCtx) return stepCtx.value.questionNumber
  return props.block.totalSteps > 0 ? props.block.currentStep : null
})

/** Gesamtzahl der Frage-Steps im Funnel. */
const displayTotalQuestions = computed<number>(() => {
  if (stepCtx) return stepCtx.value.totalQuestions
  return props.block.totalSteps
})

/** Fortschritts-Anteil [0, 1] fuer Balken / Dots. */
const progress = computed<number>(() => {
  const current = displayQuestionNumber.value
  const total = displayTotalQuestions.value
  if (current === null || total <= 0) return 0
  return Math.min(1, current / total)
})

const progressPercent = computed(() => `${Math.round(progress.value * 100)}%`)

/** Zugängliches Label für role="progressbar". */
const ariaProgressLabel = computed<string>(() => {
  const current = displayQuestionNumber.value
  const total = displayTotalQuestions.value
  return current !== null
    ? `Fortschritt: Frage ${current} von ${total}`
    : `Fortschritt von ${total} Fragen`
})
</script>

<template>
  <div class="w-full text-center">
    <!-- "Frage X von N" – nur anzeigen wenn questionNumber bekannt -->
    <p
      v-if="displayQuestionNumber !== null"
      class="text-sm font-semibold"
      :style="{ color: 'var(--funnel-accent)' }"
    >
      {{ block.label ?? 'Frage' }} {{ displayQuestionNumber }} von {{ displayTotalQuestions }}
    </p>

    <!-- Fortschrittsbalken -->
    <div
      v-if="block.progressStyle === 'bar' || !block.progressStyle"
      class="mx-auto mt-2 h-1 w-full max-w-[200px] overflow-hidden rounded-full bg-gray-200"
      role="progressbar"
      :aria-valuenow="displayQuestionNumber ?? 0"
      aria-valuemin="0"
      :aria-valuemax="displayTotalQuestions"
      :aria-label="ariaProgressLabel"
    >
      <div
        class="h-full rounded-full transition-[width] duration-300"
        :style="{
          width: progressPercent,
          backgroundColor: 'var(--funnel-accent)',
        }"
      />
    </div>

    <!-- Punkte -->
    <div
      v-else-if="block.progressStyle === 'dots'"
      class="mt-2 flex justify-center gap-2"
      role="progressbar"
      :aria-valuenow="displayQuestionNumber ?? 0"
      aria-valuemin="0"
      :aria-valuemax="displayTotalQuestions"
      :aria-label="ariaProgressLabel"
    >
      <span
        v-for="n in displayTotalQuestions"
        :key="n"
        class="h-2 w-2 rounded-full transition-colors"
        :style="{
          backgroundColor: displayQuestionNumber !== null && n <= displayQuestionNumber
            ? 'var(--funnel-accent)'
            : '#e5e7eb',
        }"
        :aria-hidden="true"
      />
    </div>

    <!-- Schritt-Zaehler als Text ("1 / 3") -->
    <div
      v-else-if="block.progressStyle === 'steps'"
      class="mt-1 text-xs"
      :style="{ color: 'var(--funnel-muted)' }"
      role="progressbar"
      :aria-valuenow="displayQuestionNumber ?? 0"
      aria-valuemin="0"
      :aria-valuemax="displayTotalQuestions"
      :aria-label="ariaProgressLabel"
    >
      {{ displayQuestionNumber ?? 0 }} / {{ displayTotalQuestions }}
    </div>
  </div>
</template>
