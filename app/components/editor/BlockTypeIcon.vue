<!--
  BlockTypeIcon: Kleines SVG-Icon pro Block-Typ.
  Verwendet als Inline-Icon in Listen (Einfache/Interaktive Blöcke).
-->
<script setup lang="ts">
import type { BlockType } from '~/types/funnel'

defineProps<{
  type: BlockType
}>()
</script>

<template>
  <!-- Text -->
  <svg
    v-if="type === 'text'"
    class="h-4 w-4 text-ui-muted"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    aria-hidden="true"
  >
    <path d="M2 4h12M2 8h8M2 12h10" />
  </svg>

  <!-- Bild -->
  <svg
    v-else-if="type === 'image'"
    class="h-4 w-4 text-ui-muted"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <rect x="1.5" y="3" width="13" height="10" rx="1.5" />
    <circle cx="5.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    <path d="M1.5 11l3-3 2.5 2.5 2-2 4 4" />
  </svg>

  <!-- Button -->
  <svg
    v-else-if="type === 'button'"
    class="h-4 w-4 text-ui-muted"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <rect x="1.5" y="5" width="13" height="6" rx="2" />
    <path d="M5 8h6" />
  </svg>

  <!-- Logo -->
  <svg
    v-else-if="type === 'logo'"
    class="h-4 w-4 text-ui-muted"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <polygon points="8,2 10,6 14,6 11,9 12,13 8,11 4,13 5,9 2,6 6,6" />
  </svg>

  <!-- Fortschritt -->
  <svg
    v-else-if="type === 'progress_indicator'"
    class="h-4 w-4 text-ui-muted"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    aria-hidden="true"
  >
    <rect x="1.5" y="6.5" width="13" height="3" rx="1.5" />
    <rect x="1.5" y="6.5" width="7" height="3" rx="1.5" fill="currentColor" stroke="none" />
  </svg>

  <!-- Einfachauswahl -->
  <svg
    v-else-if="type === 'single_choice'"
    class="h-4 w-4 text-ui-muted"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <circle cx="8" cy="8" r="6" />
    <circle cx="8" cy="8" r="2.5" fill="currentColor" stroke="none" />
  </svg>

  <!-- Texteingabe -->
  <svg
    v-else-if="type === 'input_text'"
    class="h-4 w-4 text-ui-muted"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <rect x="1.5" y="5" width="13" height="6" rx="1.5" />
    <path d="M4 8h1.5" />
  </svg>

  <!-- E-Mail -->
  <svg
    v-else-if="type === 'input_email'"
    class="h-4 w-4 text-ui-muted"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" />
    <path d="M1.5 5.5l6.5 4 6.5-4" />
  </svg>

  <!-- Telefon -->
  <svg
    v-else-if="type === 'input_phone'"
    class="h-4 w-4 text-ui-muted"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M3 3.5C3 3 3.5 2.5 4 2.5c.3 0 1.5 1.5 1.5 1.5s.5.5 0 1l-1 1c.5 1 1.5 2 2.5 2.5l1-1c.5-.5 1 0 1 0S10.5 9 10.5 9.5c0 .5-.5 1-1 1C8 11 4 8 4 5l-1-1.5z" />
  </svg>

  <!-- Opt-in -->
  <svg
    v-else-if="type === 'optin_checkbox'"
    class="h-4 w-4 text-ui-muted"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <rect x="2" y="2" width="8" height="8" rx="1.5" />
    <path d="M4 6l2 2 4-4" stroke-width="1.5" />
  </svg>

  <!-- Mehrfachauswahl -->
  <svg
    v-else-if="type === 'multi_choice'"
    class="h-4 w-4 text-ui-muted"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <rect x="2" y="2.5" width="4.5" height="4.5" rx="1" />
    <path d="M3 5l1 1.5 2-2.5" />
    <rect x="2" y="9" width="4.5" height="4.5" rx="1" />
    <path d="M8.5 5h5M8.5 11.5h5" />
  </svg>

  <!-- Bewertung -->
  <svg
    v-else-if="type === 'rating'"
    class="h-4 w-4 text-ui-muted"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M8 2l1.5 3.5H13l-3 2.5 1.5 4L8 10l-3.5 2 1.5-4L3 5.5h3.5z" />
  </svg>

  <!-- Video -->
  <svg
    v-else-if="type === 'video'"
    class="h-4 w-4 text-ui-muted"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <rect x="1.5" y="4" width="9" height="8" rx="1.5" />
    <path d="M10.5 6.5l4-2.5v8l-4-2.5" />
  </svg>

  <!-- Icon -->
  <svg
    v-else-if="type === 'icon'"
    class="h-4 w-4 text-ui-muted"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <circle cx="8" cy="8" r="6" />
    <path d="M6 9.5s.75 1 2 1 2-1 2-1M6 7h.5M9.5 7h.5" />
  </svg>

  <!-- Trenner (divider) -->
  <svg
    v-else-if="type === 'divider'"
    class="h-4 w-4 text-ui-muted"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    aria-hidden="true"
  >
    <path d="M2 8h12" />
    <path d="M4 6v4M12 6v4" />
  </svg>

  <!-- Abstand (spacer) -->
  <svg
    v-else-if="type === 'spacer'"
    class="h-4 w-4 text-ui-muted"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M8 3v10" />
    <path d="M5 5.5l3-3 3 3M5 10.5l3 3 3-3" />
  </svg>

  <!-- Datum (input_date) -->
  <svg
    v-else-if="type === 'input_date'"
    class="h-4 w-4 text-ui-muted"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <rect x="2" y="3" width="12" height="10" rx="1.5" />
    <path d="M5 2v2M11 2v2M2 6.5h12" />
  </svg>

  <!-- Uhrzeit (input_time) -->
  <svg
    v-else-if="type === 'input_time'"
    class="h-4 w-4 text-ui-muted"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <circle cx="8" cy="8" r="6" />
    <path d="M8 5v4l2.5 1.5" />
  </svg>

  <!-- Zahl (input_number) -->
  <svg
    v-else-if="type === 'input_number'"
    class="h-4 w-4 text-ui-muted"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    aria-hidden="true"
  >
    <path d="M5 3v10M11 3v10M3 6.5h10M3 9.5h10" />
  </svg>

  <!-- Dropdown (input_dropdown) -->
  <svg
    v-else-if="type === 'input_dropdown'"
    class="h-4 w-4 text-ui-muted"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <rect x="1.5" y="5" width="13" height="6" rx="1.5" />
    <path d="M4 8h4M11 7l1.5 1.5L14 7" />
  </svg>

  <!-- Textfeld (input_textarea) -->
  <svg
    v-else-if="type === 'input_textarea'"
    class="h-4 w-4 text-ui-muted"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    aria-hidden="true"
  >
    <rect x="1.5" y="3" width="13" height="10" rx="1.5" />
    <path d="M4 6h8M4 8.5h8M4 11h5" />
  </svg>

  <!-- Fallback -->
  <span
    v-else
    class="h-4 w-4 rounded bg-ui-border"
    aria-hidden="true"
  />
</template>
