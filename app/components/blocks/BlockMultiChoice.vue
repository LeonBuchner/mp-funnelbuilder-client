<script setup lang="ts">
/**
 * BlockMultiChoice – Mehrfachauswahl-Block.
 *
 * v-model-Konvention (wichtig fuer Lead-Submit):
 *   Der Wert ist ein kommaseparierter String der gewaehlen `value`-Felder,
 *   z. B. "option_a,option_b". Reihenfolge = Klick-Reihenfolge.
 *   Das Backend speichert lead_answer.value als diesen String direkt.
 *   Leere Auswahl = leerer String "".
 *
 * Layouts:
 *   none  – Volle-Breite-Cards mit Checkbox-Indikator
 *   icon  – 2x2-Grid mit Icon + Label
 *   image – Cards mit Bild + Titel (wie single_choice 'full')
 */
import type { MultiChoiceBlock } from '~/types/funnel'

const iconPaths: Record<string, string> = {
  'graduation-cap':
    'M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18V17l7 4 7-4v-3.82L12 17l-7-3.82z',
  'wrench':
    'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z',
  'clock':
    'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z',
  'check':
    'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z',
  'star':
    'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z',
  'user':
    'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  'phone':
    'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z',
  'mail':
    'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
  'calendar':
    'M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z',
  'heart':
    'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
  'lightning':
    'M7 2v11h3v9l7-12h-4l4-8z',
  'gear':
    'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
}

const props = withDefaults(
  defineProps<{
    block: MultiChoiceBlock
    mode: 'editor' | 'live'
    /**
     * Kommaseparierter String der gewaehlen values, z. B. "option_a,option_b".
     * Leer = keine Auswahl.
     */
    modelValue?: string
    error?: string
  }>(),
  { modelValue: undefined, error: undefined },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

/** Aktuell gewaehlete values als Set fuer O(1)-Lookup. */
const selectedValues = computed<Set<string>>(() => {
  if (!props.modelValue) return new Set<string>()
  return new Set(props.modelValue.split(',').filter(Boolean))
})

function isSelected(value: string): boolean {
  return selectedValues.value.has(value)
}

function toggleOption(value: string): void {
  if (props.mode !== 'live') return

  const current = new Set(selectedValues.value)
  if (current.has(value)) {
    current.delete(value)
  } else {
    const max = props.block.maxSelections
    if (max !== undefined && current.size >= max) return
    current.add(value)
  }
  emit('update:modelValue', Array.from(current).join(','))
}

function hasIcon(name: string | undefined): name is string {
  return !!name && name in iconPaths
}

function iconFallback(label: string): string {
  return label.charAt(0).toUpperCase()
}
</script>

<template>
  <fieldset
    class="w-full border-0 p-0"
    :aria-describedby="error ? `field-error-${block.id}` : undefined"
  >
    <!--
      legend: visuell verborgen (sr-only), Frage erscheint als sichtbares p-Element.
      Beide gemeinsam stellen sicher, dass Screenreader den Kontext ansagen.
    -->
    <legend class="sr-only">
      {{ block.question }}
      <span v-if="block.required">(Pflichtfeld)</span>
      <span v-if="block.minSelections"> Mindestens {{ block.minSelections }} waehlen.</span>
      <span v-if="block.maxSelections"> Hoechstens {{ block.maxSelections }} waehlen.</span>
    </legend>

    <!-- Sichtbare Frage -->
    <p
      class="mb-1 text-center text-lg font-bold"
      :style="{ color: 'var(--funnel-text)' }"
    >
      {{ block.question }}
      <span
        v-if="block.required"
        class="ml-1 text-red-500"
        aria-hidden="true"
      >*</span>
    </p>

    <!-- Hinweis fuer Mindest-/Maximalauswahl -->
    <p
      v-if="block.minSelections || block.maxSelections"
      class="mb-3 text-center text-xs"
      :style="{ color: 'var(--funnel-muted)' }"
      aria-hidden="true"
    >
      <template v-if="block.minSelections && block.maxSelections">
        {{ block.minSelections }}&ndash;{{ block.maxSelections }} Optionen waehlen
      </template>
      <template v-else-if="block.minSelections">
        Mindestens {{ block.minSelections }} waehlen
      </template>
      <template v-else-if="block.maxSelections">
        Hoechstens {{ block.maxSelections }} waehlen
      </template>
    </p>

    <!-- Layout: none – Volle-Breite-Cards -->
    <ul
      v-if="block.imageLayout === 'none'"
      class="space-y-3"
      role="list"
    >
      <li
        v-for="option in block.options"
        :key="option.id"
      >
        <label
          class="flex w-full cursor-pointer items-center gap-3 rounded-[var(--funnel-radius)] px-5 py-4 transition-colors"
          :class="mode === 'editor' ? 'cursor-default' : 'cursor-pointer'"
          :style="{
            backgroundColor: isSelected(option.value)
              ? 'var(--funnel-primary-hover)'
              : 'var(--funnel-primary)',
            color: 'var(--funnel-on-primary)',
          }"
        >
          <!-- Visueller Checkbox-Indikator -->
          <span
            class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors"
            :style="{
              borderColor: 'var(--funnel-on-primary)',
              backgroundColor: isSelected(option.value) ? 'var(--funnel-on-primary)' : 'transparent',
            }"
            aria-hidden="true"
          >
            <svg
              v-if="isSelected(option.value)"
              class="h-3 w-3"
              viewBox="0 0 24 24"
              fill="currentColor"
              :style="{ color: 'var(--funnel-primary)' }"
            >
              <path :d="iconPaths['check']" />
            </svg>
          </span>

          <input
            type="checkbox"
            class="sr-only"
            :name="block.fieldKey"
            :value="option.value"
            :checked="isSelected(option.value)"
            :disabled="mode === 'editor'"
            @change="toggleOption(option.value)"
          >

          <span class="text-base font-medium leading-snug">{{ option.label }}</span>
        </label>
      </li>
    </ul>

    <!-- Layout: icon – 2x2-Grid -->
    <ul
      v-else-if="block.imageLayout === 'icon'"
      class="grid grid-cols-2 gap-3"
      role="list"
    >
      <li
        v-for="option in block.options"
        :key="option.id"
      >
        <label
          class="relative flex w-full flex-col items-center justify-center gap-3 rounded-[var(--funnel-radius)] px-3 py-5 text-center transition-colors"
          :class="mode === 'editor' ? 'cursor-default' : 'cursor-pointer'"
          :style="{
            backgroundColor: isSelected(option.value)
              ? 'var(--funnel-primary-hover)'
              : 'var(--funnel-primary)',
            color: 'var(--funnel-on-primary)',
          }"
        >
          <input
            type="checkbox"
            class="sr-only"
            :name="block.fieldKey"
            :value="option.value"
            :checked="isSelected(option.value)"
            :disabled="mode === 'editor'"
            @change="toggleOption(option.value)"
          >

          <!-- Checkbox-Haekchen oben rechts -->
          <span
            v-if="isSelected(option.value)"
            class="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full"
            :style="{ backgroundColor: 'var(--funnel-on-primary)', color: 'var(--funnel-primary)' }"
            aria-hidden="true"
          >
            <svg
              class="h-2.5 w-2.5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path :d="iconPaths['check']" />
            </svg>
          </span>

          <!-- Icon -->
          <span
            v-if="hasIcon(option.iconName)"
            aria-hidden="true"
          >
            <svg
              class="h-10 w-10"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path :d="iconPaths[option.iconName!]" />
            </svg>
          </span>
          <span
            v-else
            class="flex h-10 w-10 items-center justify-center text-2xl font-bold"
            aria-hidden="true"
          >
            {{ iconFallback(option.label) }}
          </span>

          <!-- eslint-disable vue/no-v-html -->
          <span
            class="text-sm leading-tight"
            :class="option.label.length < 20 ? 'font-semibold' : 'font-normal'"
            v-html="option.label"
          />
          <!-- eslint-enable vue/no-v-html -->
        </label>
      </li>
    </ul>

    <!-- Layout: image – Bild-Cards -->
    <ul
      v-else-if="block.imageLayout === 'image'"
      class="space-y-4"
      role="list"
    >
      <li
        v-for="option in block.options"
        :key="option.id"
      >
        <label
          class="flex w-full cursor-pointer overflow-hidden rounded-[var(--funnel-radius)] border transition-colors"
          :class="[
            mode === 'editor' ? 'cursor-default' : 'cursor-pointer',
            isSelected(option.value)
              ? 'border-[var(--funnel-primary)] ring-2 ring-[var(--funnel-primary)]'
              : 'border-gray-200 hover:border-[var(--funnel-primary)]',
          ]"
        >
          <input
            type="checkbox"
            class="sr-only"
            :name="block.fieldKey"
            :value="option.value"
            :checked="isSelected(option.value)"
            :disabled="mode === 'editor'"
            @change="toggleOption(option.value)"
          >

          <!-- Bild -->
          <div class="aspect-video w-full overflow-hidden bg-gray-100">
            <img
              v-if="option.imageUrl"
              :src="option.imageUrl"
              :alt="option.label"
              class="h-full w-full object-cover"
              loading="lazy"
            >
            <div
              v-else
              class="flex h-full items-center justify-center"
              aria-hidden="true"
            >
              <svg
                class="h-8 w-8 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.5"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                />
              </svg>
            </div>
          </div>

          <!-- Label + Checkbox-Indikator -->
          <div
            class="flex items-center justify-between px-4 py-3"
            :style="{ color: 'var(--funnel-text)' }"
          >
            <p class="font-semibold leading-snug">
              {{ option.label }}
            </p>
            <span
              class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors"
              :style="{
                borderColor: isSelected(option.value) ? 'var(--funnel-primary)' : '#d1d5db',
                backgroundColor: isSelected(option.value) ? 'var(--funnel-primary)' : 'transparent',
                color: 'var(--funnel-on-primary)',
              }"
              aria-hidden="true"
            >
              <svg
                v-if="isSelected(option.value)"
                class="h-3 w-3"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path :d="iconPaths['check']" />
              </svg>
            </span>
          </div>
        </label>
      </li>
    </ul>

    <!-- Fehler-Anzeige -->
    <p
      v-if="error"
      :id="`field-error-${block.id}`"
      class="mt-2 text-sm text-red-600"
      role="alert"
    >
      {{ error }}
    </p>
  </fieldset>
</template>
