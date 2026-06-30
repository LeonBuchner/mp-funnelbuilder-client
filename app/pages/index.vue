<script setup lang="ts">
// Startseite leitet direkt zum Admin-Bereich weiter.
// Die Auth-Middleware auf /admin prueft, ob der User eingeloggt ist.
await navigateTo('/admin', { replace: true })
</script>

<template>
  <!-- Kein sichtbarer Inhalt: nur Weiterleitung -->
  <span />
</template>
