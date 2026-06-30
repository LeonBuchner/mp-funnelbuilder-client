<script setup lang="ts">
import type { LogoBlock } from '~/types/funnel'

defineProps<{
  block: LogoBlock
  mode: 'editor' | 'live'
}>()
</script>

<template>
  <div class="flex w-full justify-center py-2">
    <img
      v-if="block.url"
      :src="block.url"
      :alt="block.alt ?? ''"
      :width="block.width ?? undefined"
      :height="block.height ?? undefined"
      loading="lazy"
      class="max-h-12 w-auto object-contain"
    >
    <!-- Platzhalter im Editor -->
    <div
      v-else-if="mode === 'editor'"
      class="flex h-12 w-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-xs"
      :style="{ color: 'var(--funnel-muted)' }"
      aria-label="Kein Logo gesetzt"
    >
      Logo
    </div>
  </div>
</template>
