<script setup lang="ts">
import type { OptinCheckboxBlock } from '~/types/funnel'

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
        v-html: checkboxLabel kann Link-HTML zur Datenschutzerklärung enthalten.
        Inhalt kommt vom Admin und wird serverseitig validiert.
      -->
      <!-- eslint-disable vue/no-v-html -->
      <span
        class="[&_a]:underline [&_a]:text-[var(--funnel-accent)]"
        v-html="block.checkboxLabel"
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
