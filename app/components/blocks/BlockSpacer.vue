<script setup lang="ts">
import type { SpacerBlock } from '~/types/funnel'

const props = defineProps<{
  block: SpacerBlock
  mode: 'editor' | 'live'
}>()

/** Hoehe in Pixeln (Standard: 24). */
const heightPx = computed(() => `${props.block.height ?? 24}px`)
</script>

<template>
  <!--
    Leerer vertikaler Abstand. aria-hidden="true", da rein dekorativ.
    Im editor-Modus: leicht sichtbarer Hintergrund als Orientierungshilfe.
  -->
  <div
    :style="{ height: heightPx }"
    :class="[
      mode === 'editor'
        ? 'rounded border border-dashed border-gray-200 bg-gray-50'
        : '',
    ]"
    aria-hidden="true"
  >
    <!-- Editors-Hinweis auf Hoehe -->
    <span
      v-if="mode === 'editor'"
      class="flex h-full items-center justify-center text-[10px] text-gray-400 select-none"
      aria-hidden="true"
    >
      {{ block.height ?? 24 }} px
    </span>
  </div>
</template>
