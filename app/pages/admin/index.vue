<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
})

// Kein separates Dashboard: direkt zur Funnel-Liste.
await navigateTo('/admin/funnels', { replace: true })
</script>

<template>
  <span />
</template>
