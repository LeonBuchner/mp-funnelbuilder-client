<template>
  <div class="flex min-h-screen items-center justify-center bg-mp-surface p-4">
    <main
      class="w-full max-w-md"
      aria-label="Authentifizierung"
    >
      <!-- Logo-Bereich -->
      <div class="mb-8 flex items-center gap-3">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-lg bg-mp-accent text-sm font-bold text-white"
          aria-hidden="true"
        >
          MP
        </div>
        <span class="text-lg font-semibold text-mp-text">Funnel-Builder</span>
      </div>

      <!-- Card -->
      <div class="rounded-xl border border-mp-border bg-white p-8 shadow-sm">
        <slot />
      </div>
    </main>
  </div>
</template>

<!-- Volles CSS-Bundle fuer Auth-Seiten (benoetigt mp-* Farb-Tokens) -->
<style src="~/assets/css/main.css" />
