<script setup lang="ts">
/**
 * MpBranding: Pflicht-Branding "Erstellt mit Marketing Planet".
 * Wird am Ende des Funnels (result-Step / letzter Step) angezeigt.
 * Nicht entfernbar, unabhaengig von mp_branding_enabled.
 * Position: Footer gemaess settings.mpBrandingPosition ('footer').
 */
</script>

<template>
  <aside
    class="mt-6 flex items-center justify-center gap-2 py-3"
    aria-label="Erstellt mit Marketing Planet"
  >
    <!-- Logo-Platzhalter: Stern-Icon in Akzentfarbe -->
    <span
      class="flex h-6 w-6 items-center justify-center rounded-full"
      style="background-color: var(--funnel-primary, #1c4687);"
      aria-hidden="true"
    >
      <svg
        class="h-3.5 w-3.5"
        viewBox="0 0 24 24"
        fill="currentColor"
        style="color: var(--funnel-on-primary, #fff);"
        aria-hidden="true"
      >
        <!-- Stern (Sternchen fuer "Planet") -->
        <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" />
      </svg>
    </span>
    <span
      class="text-xs"
      style="color: var(--funnel-muted, #6b7280);"
    >
      Erstellt mit
      <a
        href="https://marketing-planet.de"
        target="_blank"
        rel="noopener noreferrer"
        class="font-medium underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--funnel-accent,#3579fa)] focus:ring-offset-1 rounded"
        style="color: var(--funnel-text, #1f2937);"
      >
        Marketing Planet
      </a>
    </span>
  </aside>
</template>
