<script setup lang="ts">
/**
 * BlockRating – Bewertungs-Block.
 *
 * v-model-Konvention (wichtig fuer Lead-Submit):
 *   Der Wert ist der gewaehlte Rating-Wert als String, z. B. "3".
 *   Das Backend speichert lead_answer.value als diesen String direkt.
 *   Keine Auswahl = leerer String "" oder undefined.
 *
 * Stile:
 *   stars   – Klickbare Sterne (ausgefuellt/leer)
 *   numbers – Buttons 1 bis maxRating
 *   emoji   – Emoji-Skala (5 feste Emojis, auf maxRating skaliert)
 */
import type { RatingBlock } from '~/types/funnel'

const EMOJI_SCALE = ['😞', '😕', '😐', '🙂', '😄'] as const

const props = withDefaults(
  defineProps<{
    block: RatingBlock
    mode: 'editor' | 'live'
    /** Gewaehlter Wert als String, z. B. "3". Leer = keine Auswahl. */
    modelValue?: string
    error?: string
  }>(),
  { modelValue: undefined, error: undefined },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const selectedRating = computed<number>(() => {
  const n = Number(props.modelValue)
  return Number.isInteger(n) && n >= 1 ? n : 0
})

/** Sterne-Hover-State (nur im live-Modus). */
const hoveredRating = ref<number>(0)

function selectRating(value: number): void {
  if (props.mode !== 'live') return
  emit('update:modelValue', String(value))
}

function handleHover(value: number): void {
  if (props.mode !== 'live') return
  hoveredRating.value = value
}

function handleHoverLeave(): void {
  hoveredRating.value = 0
}

/**
 * Gibt fuer einen Stern-Index zurueck, ob er "aktiv" (gewaehlt oder gehovered) ist.
 * Index ist 1-basiert.
 */
function isStarActive(index: number): boolean {
  const compareValue = hoveredRating.value > 0 ? hoveredRating.value : selectedRating.value
  return index <= compareValue
}

/**
 * Emoji fuer einen Button-Index (1-basiert, skaliert auf maxRating).
 * Interpoliert die 5 festen Emojis auf beliebige maxRating-Werte.
 */
function emojiForIndex(index: number): string {
  const normalized = (index - 1) / Math.max(props.block.maxRating - 1, 1)
  const emojiIndex = Math.round(normalized * (EMOJI_SCALE.length - 1))
  return EMOJI_SCALE[Math.min(emojiIndex, EMOJI_SCALE.length - 1)] ?? '😐'
}

/** Zugaengliches Label fuer einen Rating-Button. */
function ratingLabel(value: number): string {
  return `Bewertung ${value} von ${props.block.maxRating}`
}
</script>

<template>
  <div class="w-full">
    <!-- Frage -->
    <p
      class="mb-4 text-center text-lg font-bold"
      :style="{ color: 'var(--funnel-text)' }"
    >
      {{ block.question }}
      <span
        v-if="block.required"
        class="ml-1 text-red-500"
        aria-hidden="true"
      >*</span>
    </p>

    <!-- Sterne -->
    <div
      v-if="block.style === 'stars'"
      class="flex justify-center gap-2"
      role="group"
      :aria-label="block.question"
      :aria-describedby="error ? `field-error-${block.id}` : undefined"
      @mouseleave="handleHoverLeave"
    >
      <button
        v-for="n in block.maxRating"
        :key="n"
        type="button"
        class="transition-transform focus:outline-none focus:ring-2 focus:ring-offset-1"
        :class="[
          mode === 'live' ? 'cursor-pointer hover:scale-110' : 'cursor-default',
        ]"
        :style="{ '--tw-ring-color': 'var(--funnel-accent)' }"
        :aria-label="ratingLabel(n)"
        :aria-pressed="mode === 'live' ? selectedRating === n : undefined"
        @click="selectRating(n)"
        @mouseenter="handleHover(n)"
      >
        <svg
          class="h-9 w-9 transition-colors"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z"
            :fill="isStarActive(n) ? 'var(--funnel-accent)' : '#d1d5db'"
          />
        </svg>
      </button>
    </div>

    <!-- Zahlen -->
    <div
      v-else-if="block.style === 'numbers'"
      class="flex flex-wrap justify-center gap-2"
      role="group"
      :aria-label="block.question"
      :aria-describedby="error ? `field-error-${block.id}` : undefined"
    >
      <button
        v-for="n in block.maxRating"
        :key="n"
        type="button"
        class="h-11 w-11 rounded-full text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1"
        :class="mode === 'live' ? 'cursor-pointer' : 'cursor-default'"
        :style="{
          backgroundColor: selectedRating === n ? 'var(--funnel-accent)' : 'transparent',
          color: selectedRating === n ? '#ffffff' : 'var(--funnel-text)',
          border: `2px solid ${selectedRating === n ? 'var(--funnel-accent)' : '#d1d5db'}`,
          '--tw-ring-color': 'var(--funnel-accent)',
        }"
        :aria-label="ratingLabel(n)"
        :aria-pressed="mode === 'live' ? selectedRating === n : undefined"
        @click="selectRating(n)"
      >
        {{ n }}
      </button>
    </div>

    <!-- Emoji -->
    <div
      v-else-if="block.style === 'emoji'"
      class="flex justify-center gap-3"
      role="group"
      :aria-label="block.question"
      :aria-describedby="error ? `field-error-${block.id}` : undefined"
    >
      <button
        v-for="n in block.maxRating"
        :key="n"
        type="button"
        class="flex flex-col items-center gap-1 rounded-lg px-2 py-2 transition-all focus:outline-none focus:ring-2 focus:ring-offset-1"
        :class="[
          mode === 'live' ? 'cursor-pointer hover:scale-110' : 'cursor-default',
          selectedRating === n ? 'scale-110' : '',
        ]"
        :style="{
          '--tw-ring-color': 'var(--funnel-accent)',
          opacity: selectedRating > 0 && selectedRating !== n ? '0.5' : '1',
        }"
        :aria-label="ratingLabel(n)"
        :aria-pressed="mode === 'live' ? selectedRating === n : undefined"
        @click="selectRating(n)"
      >
        <span
          class="text-3xl leading-none"
          aria-hidden="true"
        >{{ emojiForIndex(n) }}</span>
        <span
          class="text-xs"
          :style="{ color: selectedRating === n ? 'var(--funnel-accent)' : 'var(--funnel-muted)' }"
        >{{ n }}</span>
      </button>
    </div>

    <!-- Fehler-Anzeige -->
    <p
      v-if="error"
      :id="`field-error-${block.id}`"
      class="mt-3 text-center text-sm text-red-600"
      role="alert"
    >
      {{ error }}
    </p>
  </div>
</template>
