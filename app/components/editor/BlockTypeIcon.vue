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

  <!-- Fallback -->
  <span
    v-else
    class="h-4 w-4 rounded bg-ui-border"
    aria-hidden="true"
  />
</template>
