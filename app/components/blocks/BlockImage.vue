<script setup lang="ts">
import type { ImageBlock } from '~/types/funnel'

defineProps<{
  block: ImageBlock
  mode: 'editor' | 'live'
}>()
</script>

<template>
  <div class="w-full">
    <img
      v-if="block.url"
      :src="block.url"
      :alt="block.alt"
      :width="block.width ?? undefined"
      :height="block.height ?? undefined"
      loading="lazy"
      class="mx-auto max-w-full rounded-[var(--funnel-radius)]"
    >
    <!-- Platzhalter im Editor wenn keine URL gesetzt -->
    <div
      v-else-if="mode === 'editor'"
      class="flex h-36 flex-col items-center justify-center gap-2 rounded-[var(--funnel-radius)] border-2 border-dashed border-gray-200 bg-gray-50 text-sm"
      :style="{ color: 'var(--funnel-muted)' }"
      aria-label="Kein Bild gewaehlt"
    >
      <svg
        class="h-8 w-8 opacity-40"
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
      <span>Bild-URL in den Einstellungen eintragen</span>
    </div>
  </div>
</template>
