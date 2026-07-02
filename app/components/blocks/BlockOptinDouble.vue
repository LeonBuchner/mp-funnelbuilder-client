<script setup lang="ts">
import type { OptinDoubleBlock } from '~/types/funnel'
import { sanitizeHtml } from '~/utils/sanitizeHtml'

const props = withDefaults(
  defineProps<{
    block: OptinDoubleBlock
    mode: 'editor' | 'live'
    modelValue?: boolean
    /** Fehlermeldung vom Renderer. Setzt aria-invalid und aria-describedby. */
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
 * Im live-Modus ist checkboxLabel bereits sanitisiert (aus dem Renderer-Lade-Transform).
 * Im editor-Modus clientseitig sanitisieren.
 */
const safeLabel = computed<string>(() =>
  props.mode === 'live' ? props.block.checkboxLabel : sanitizeHtml(props.block.checkboxLabel),
)

const hintText = computed<string>(() =>
  props.block.hintText ?? 'Du erhältst eine Bestätigungs-E-Mail.',
)
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-start gap-2.5">
      <input
        :id="block.id"
        type="checkbox"
        :name="block.fieldKey"
        :checked="modelValue"
        :required="block.required"
        :disabled="mode === 'editor'"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="[
          error ? `field-error-${block.id}` : null,
          `optin-double-hint-${block.id}`,
        ].filter(Boolean).join(' ') || undefined"
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

    <!-- Hinweistext zum Double-Opt-in-Prozess -->
    <p
      :id="`optin-double-hint-${block.id}`"
      class="flex items-center gap-1.5 text-xs"
      :style="{ color: 'var(--funnel-muted)' }"
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
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
      {{ hintText }}
    </p>
  </div>
</template>
