<script setup lang="ts">
import type { DividerBlock } from '~/types/funnel'

defineProps<{
  block: DividerBlock
  mode: 'editor' | 'live'
}>()
</script>

<template>
  <!--
    Rein visuelle Trennlinie. aria-hidden="true", damit Screenreader
    das dekorative Element ueberspringen.
  -->
  <hr
    class="w-full border-0 border-t"
    :style="{
      borderColor: block.styles?.color ?? 'var(--funnel-muted)',
      opacity: block.styles?.opacity ?? '0.4',
    }"
    aria-hidden="true"
  >
</template>
