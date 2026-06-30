<script setup lang="ts">
import type { OptinCheckboxBlock } from '~/types/funnel'
import { sanitizeHtml } from '~/utils/sanitizeHtml'

const props = withDefaults(
  defineProps<{
    block: OptinCheckboxBlock
    mode: 'editor' | 'live'
    modelValue?: boolean
    /** Fehlermeldung vom Renderer. Setzt aria-invalid und aria-describedby
     *  auf die Checkbox, damit Screenreader den Fehler beim Fokus ansagen. */
    error?: string
  }>(),
  { modelValue: false, error: undefined },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

function handleChange(event: Event): void {
  if (props.mode === 'live') {
    emit('update:modelValue', (event.target as HTMLInputElement).checked)
  }
}

/**
 * Im live-Modus ist checkboxLabel bereits durch den Renderer-Lade-Transform
 * bereinigt. Kein erneuter sanitizeHtml-Aufruf im Render (verhindert
 * Hydration-Mismatch durch jsdom/Browser-DOMPurify-Divergenz).
 * Im editor-Modus (client-only) wird clientseitig sanitisiert.
 */
const safeLabel = computed<string>(() =>
  props.mode === 'live' ? props.block.checkboxLabel : sanitizeHtml(props.block.checkboxLabel),
)
</script>

<template>
  <div class="flex items-start gap-2.5">
    <input
      :id="block.id"
      type="checkbox"
      :name="block.fieldKey"
      :checked="modelValue"
      :required="block.required"
      :disabled="mode === 'editor'"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error ? `field-error-${block.id}` : undefined"
      class="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300"
      :style="{ accentColor: 'var(--funnel-accent)' }"
      @change="handleChange"
    >
    <label
      :for="block.id"
      class="text-xs leading-relaxed"
      :style="{ color: 'var(--funnel-muted)' }"
    >
      <!--
        v-html: checkboxLabel kann Link-HTML zur Datenschutzerklaerung enthalten.
        safeLabel: Im live-Modus bereits beim Laden sanitisiert, im editor-Modus
        clientseitig. Kein erneuter Aufruf im Render (kein Hydration-Mismatch).
      -->
      <!-- eslint-disable vue/no-v-html -->
      <span
        class="[&_a]:underline [&_a]:text-[var(--funnel-accent)]"
        v-html="safeLabel"
      />
      <!-- eslint-enable vue/no-v-html -->
      <span
        v-if="block.required"
        class="ml-0.5 text-red-500"
        aria-label="Pflichtfeld"
      >*</span>
    </label>
  </div>
</template>
