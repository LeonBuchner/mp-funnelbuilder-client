<script setup lang="ts">
import type { InputDropdownBlock } from '~/types/funnel'

const props = withDefaults(
  defineProps<{
    block: InputDropdownBlock
    mode: 'editor' | 'live'
    modelValue?: string
    error?: string
  }>(),
  { modelValue: undefined, error: undefined },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

function handleChange(event: Event): void {
  if (props.mode === 'live') {
    emit('update:modelValue', (event.target as HTMLSelectElement).value)
  }
}

/**
 * Chevron-SVG als Data-URL fuer den nativen Select-Pfeil.
 * Als computed-Property, damit kein Inline-SVG im Template den Parser bricht.
 */
const chevronStyle = computed<Record<string, string>>(() => ({
  color: props.modelValue ? 'var(--funnel-text)' : '#9ca3af',
  backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")',
  backgroundPosition: 'right 0.75rem center',
  backgroundRepeat: 'no-repeat',
  backgroundSize: '1.25rem',
  paddingRight: '2.5rem',
}))
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

    <select
      :id="block.id"
      :name="block.fieldKey"
      :value="modelValue ?? ''"
      :disabled="mode === 'editor'"
      :required="block.required ?? false"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error ? `field-error-${block.id}` : undefined"
      class="w-full appearance-none rounded-[var(--funnel-radius)] border border-gray-200 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[var(--funnel-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--funnel-accent)]"
      :class="{ 'border-red-400': error }"
      :style="chevronStyle"
      @change="handleChange"
    >
      <!-- Placeholder-Option -->
      <option
        value=""
        disabled
        :selected="!modelValue"
        :style="{ color: '#9ca3af' }"
      >
        {{ block.placeholder ?? 'Bitte wählen' }}
      </option>

      <option
        v-for="option in block.options"
        :key="option.id"
        :value="option.value"
        :style="{ color: 'var(--funnel-text)' }"
      >
        {{ option.label }}
      </option>
    </select>

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
