<script setup lang="ts">
import type { SingleChoiceBlock } from '~/types/funnel'

const props = withDefaults(
  defineProps<{
    block: SingleChoiceBlock
    mode: 'editor' | 'live'
    modelValue?: string
    /** Fehlermeldung vom Renderer. Wird per aria-describedby am fieldset
     *  referenziert, damit Screenreader den Fehler beim Fokus ansagen. */
    error?: string
  }>(),
  { modelValue: undefined, error: undefined },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

function handleSelect(value: string): void {
  if (props.mode === 'live') {
    emit('update:modelValue', value)
  }
}

/**
 * Kompaktes Inline-SVG-Icon-Set.
 * Schlüssel entsprechen option.iconName.
 * Unbekannte Werte landen im Fallback.
 */
const iconPaths: Record<string, string> = {
  'graduation-cap':
    'M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18V17l7 4 7-4v-3.82L12 17l-7-3.82z',
  'wrench':
    'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z',
  'tools':
    'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4zm-6.8-1.7l-1.4-1.4 1.4-1.4 1.4 1.4-1.4 1.4zM2.6 5.6L5 8l1.5-1.5L4.1 4.1C5.3 2.8 7 2 9 2c3.9 0 7 3.1 7 7 0 1-.2 1.9-.5 2.8l1.8 1.8c.6-1.4.9-2.9.9-4.5C18.2 4.3 14 0 9 0 6.6 0 4.5 1 3 2.6L2.6 5.6z',
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
  'location':
    'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
  'briefcase':
    'M20 6h-2.18c.07-.44.18-.86.18-1.3 0-2.07-1.5-3.7-3.5-3.7-1.93 0-3.5 1.63-3.5 3.7 0 .44.11.86.18 1.3H9.18c.07-.44.18-.86.18-1.3 0-2.07-1.5-3.7-3.5-3.7C3.93.7 2.4 2.33 2.4 4.4c0 .44.11.86.18 1.3H2c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7.5-1.3c0-.94.67-1.7 1.5-1.7s1.5.76 1.5 1.7c0 .44-.18.86-.45 1.3H12.9c-.26-.44-.4-.86-.4-1.3zM8 4.7c0-.94.67-1.7 1.5-1.7s1.5.76 1.5 1.7c0 .44-.18.86-.45 1.3H7.9C7.64 5.56 8 5.14 8 4.7zM20 19H2V8h18v11z',
  'rocket':
    'M9.37 5.51A7.35 7.35 0 0 0 9.1 7.5c0 4.08 3.32 7.4 7.4 7.4.68 0 1.35-.09 1.99-.27A7.014 7.014 0 0 1 12 19c-3.86 0-7-3.14-7-7 0-2.93 1.81-5.45 4.37-6.49zM12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z',
  'gear':
    'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
  'brain':
    'M13 3c-4.42 0-8 3.58-8 8v7c0 1.1.9 2 2 2h2v-8H5v-1c0-3.31 2.69-6 6-6s6 2.69 6 6v1h-4v8h2c1.1 0 2-.9 2-2v-7c0-4.42-3.58-8-8-8z',
  'chart':
    'M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z',
  'lightning':
    'M7 2v11h3v9l7-12h-4l4-8z',
  'heart':
    'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
}

/**
 * Fallback: Gibt den ersten Buchstaben des Labels in Großschreibung zurück,
 * wenn kein passender Icon-Name gefunden wird.
 */
function iconFallback(label: string): string {
  return label.charAt(0).toUpperCase()
}

function hasIcon(name: string | undefined): name is string {
  return !!name && name in iconPaths
}
</script>

<template>
  <fieldset
    class="w-full border-0 p-0"
    :aria-describedby="error ? `field-error-${block.id}` : undefined"
  >
    <!--
      Frage: Sichtbar als Headline UND als legend für Screenreader.
      Die legend ist explizit visuell verborgen (sr-only), die Frage erscheint
      als separates p-Element oberhalb der Optionen.
    -->
    <legend class="sr-only">
      {{ block.question }}
      <span v-if="block.required">(Pflichtfeld)</span>
    </legend>

    <!-- Sichtbare Frage -->
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

    <!-- imageLayout === 'none': Volle-Breite-Cards in Theme-Farbe -->
    <ul
      v-if="block.imageLayout === 'none'"
      class="space-y-3"
      role="list"
    >
      <li
        v-for="option in block.options"
        :key="option.id"
      >
        <button
          type="button"
          :class="[
            'w-full rounded-[var(--funnel-radius)] px-6 py-4 text-center',
            'text-base font-medium transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-offset-2',
            mode === 'live' ? 'cursor-pointer' : 'cursor-default',
            modelValue === option.value
              ? 'opacity-90 ring-2 ring-offset-1'
              : '',
          ]"
          :style="{
            backgroundColor: modelValue === option.value
              ? 'var(--funnel-primary-hover)'
              : 'var(--funnel-primary)',
            color: 'var(--funnel-on-primary)',
            '--tw-ring-color': 'var(--funnel-primary)',
          }"
          :aria-pressed="mode === 'live' ? modelValue === option.value : undefined"
          @click="handleSelect(option.value)"
        >
          {{ option.label }}
        </button>
      </li>
    </ul>

    <!-- imageLayout === 'icon': 2x2-Grid mit Icon + Label -->
    <ul
      v-else-if="block.imageLayout === 'icon'"
      class="grid grid-cols-2 gap-3"
      role="list"
    >
      <li
        v-for="option in block.options"
        :key="option.id"
      >
        <button
          type="button"
          :class="[
            'flex w-full flex-col items-center justify-center gap-3',
            'rounded-[var(--funnel-radius)] px-3 py-5 text-center',
            'transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-offset-2',
            mode === 'live' ? 'cursor-pointer' : 'cursor-default',
          ]"
          :style="{
            backgroundColor: modelValue === option.value
              ? 'var(--funnel-primary-hover)'
              : 'var(--funnel-primary)',
            color: 'var(--funnel-on-primary)',
            '--tw-ring-color': 'var(--funnel-primary)',
          }"
          :aria-pressed="mode === 'live' ? modelValue === option.value : undefined"
          @click="handleSelect(option.value)"
        >
          <!-- SVG-Icon oder Fallback -->
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
          <!-- Fallback: erster Buchstabe des Labels -->
          <span
            v-else
            class="flex h-10 w-10 items-center justify-center text-2xl font-bold"
            aria-hidden="true"
          >
            {{ iconFallback(option.label) }}
          </span>

          <!--
            v-html: option.label kommt vom Admin und kann bold/italic enthalten.
            Inhalt wird serverseitig validiert.
          -->
          <!-- eslint-disable vue/no-v-html -->
          <span
            class="text-sm leading-tight"
            :class="option.label.length < 20 ? 'font-semibold' : 'font-normal'"
            v-html="option.label"
          />
          <!-- eslint-enable vue/no-v-html -->
        </button>
      </li>
    </ul>

    <!-- imageLayout === 'full': Card mit Bild oben, Titel + Beschreibung -->
    <ul
      v-else-if="block.imageLayout === 'full'"
      class="space-y-4"
      role="list"
    >
      <li
        v-for="option in block.options"
        :key="option.id"
      >
        <button
          type="button"
          :class="[
            'w-full overflow-hidden rounded-[var(--funnel-radius)] text-left',
            'border transition-colors',
            'focus:outline-none focus:ring-2',
            mode === 'live' ? 'cursor-pointer' : 'cursor-default',
            modelValue === option.value
              ? 'border-[var(--funnel-primary)] ring-2 ring-[var(--funnel-primary)]'
              : 'border-gray-200 hover:border-[var(--funnel-primary)]',
          ]"
          :style="{ '--tw-ring-color': 'var(--funnel-primary)' }"
          :aria-pressed="mode === 'live' ? modelValue === option.value : undefined"
          @click="handleSelect(option.value)"
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
          <!-- Titel und optionale Beschreibung -->
          <div
            class="px-4 py-3"
            :style="{ color: 'var(--funnel-text)' }"
          >
            <p class="font-semibold leading-snug">
              {{ option.label }}
            </p>
          </div>
        </button>
      </li>
    </ul>
  </fieldset>
</template>
