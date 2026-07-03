<script setup lang="ts">
import type { InputDateBlock } from '~/types/funnel'

const props = withDefaults(
  defineProps<{
    block: InputDateBlock
    mode: 'editor' | 'live'
    modelValue?: string
    error?: string
  }>(),
  { modelValue: undefined, error: undefined },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

function handleInput(event: Event): void {
  if (props.mode === 'live') {
    emit('update:modelValue', (event.target as HTMLInputElement).value)
  }
}
</script>

<template>
  <div class="w-full">
    <label
      :for="block.id"
      class="mb-1.5 block text-sm font-medium"
      :style="{ color: 'var(--funnel-text)' }"
    >
      {{ block.label }}
      <span
        v-if="block.required"
        class="ml-0.5 text-red-500"
        aria-label="Pflichtfeld"
      >*</span>
    </label>

    <input
      :id="block.id"
      type="date"
      :name="block.fieldKey"
      :value="modelValue ?? ''"
      :min="block.min"
      :max="block.max"
      :readonly="mode === 'editor'"
      :required="block.required ?? false"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error ? `field-error-${block.id}` : undefined"
      class="w-full rounded-[var(--funnel-radius)] border border-gray-200 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[var(--funnel-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--funnel-accent)]"
      :class="{ 'border-red-400': error }"
      :style="{ color: 'var(--funnel-text)' }"
      @input="handleInput"
    >

    <p
      v-if="error"
      :id="`field-error-${block.id}`"
      class="mt-1.5 text-sm text-red-600"
      role="alert"
    >
      {{ error }}
    </p>
  </div>
</template>
