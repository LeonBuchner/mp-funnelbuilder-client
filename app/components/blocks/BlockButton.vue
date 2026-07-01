<script setup lang="ts">
import type { ButtonBlock } from '~/types/funnel'
import { usePersonalizationContext } from '~/composables/usePersonalizationContext'

const props = defineProps<{
  block: ButtonBlock
  mode: 'editor' | 'live'
}>()

const emit = defineEmits<{
  (e: 'action', action: ButtonBlock['action']): void
}>()

function handleClick(): void {
  if (props.mode === 'live') {
    emit('action', props.block.action)
  }
}

/**
 * Personalisierung (M3.5): Im live-Modus werden {{key}}-Platzhalter im Label ersetzt.
 * Vue-Template-Engine codiert den Wert bei {{ }}-Interpolation automatisch (kein XSS).
 * Im Editor-Modus bleibt das Raw-Label unveraendert sichtbar.
 */
const pCtx = usePersonalizationContext()
const displayLabel = computed<string>(() => {
  if (props.mode !== 'live' || !pCtx) return props.block.label
  return pCtx.interpolateText(props.block.label)
})
</script>

<template>
  <div class="w-full">
    <button
      type="button"
      :class="[
        'w-full rounded-[var(--funnel-radius)] px-6 py-3.5 text-base font-semibold',
        'transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
        mode === 'editor' ? 'cursor-default' : 'cursor-pointer',
        // Outline und Ghost: kein gefuellter Hintergrund
        block.style === 'outline' || block.style === 'ghost' ? 'border' : '',
      ]"
      :style="
        block.style === 'primary'
          ? {
              backgroundColor: 'var(--funnel-primary)',
              color: 'var(--funnel-on-primary)',
              '--tw-ring-color': 'var(--funnel-primary)',
            }
          : block.style === 'secondary'
            ? {
                backgroundColor: '#f1f5f9',
                color: 'var(--funnel-text)',
              }
            : block.style === 'outline'
              ? {
                  backgroundColor: 'transparent',
                  color: 'var(--funnel-primary)',
                  borderColor: 'var(--funnel-primary)',
                  '--tw-ring-color': 'var(--funnel-primary)',
                }
              : /* ghost */ {
                  backgroundColor: 'transparent',
                  color: 'var(--funnel-primary)',
                }
      "
      @click="handleClick"
    >
      {{ displayLabel }}
    </button>
  </div>
</template>
