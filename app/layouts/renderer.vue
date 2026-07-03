<script setup lang="ts">
/**
 * Renderer-Layout: minimales Layout fuer den oeffentlichen Funnel-Renderer.
 * Kein Admin-Chrome, kein Header-Nav.
 * Hintergrundfarbe kommt aus --funnel-bg (wird am Funnel-Container via :style gesetzt).
 * Der Footer enthaelt Pflicht-Links (Barrierefreiheit, Impressum, Datenschutz).
 *
 * CSS: Renderer-spezifisches Bundle (renderer.css) ohne Editor-/Admin-Klassen.
 * Damit bleibt die initiale CSS-Nutzlast deutlich kleiner als bei main.css.
 */
</script>

<template>
  <div class="flex min-h-screen flex-col bg-[var(--funnel-bg,#ffffff)]">
    <!-- Zum Inhalt springen (a11y) -->
    <a
      href="#funnel-main"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-[var(--funnel-primary,#1c4687)] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-[var(--funnel-on-primary,#fff)]"
    >
      Zum Inhalt springen
    </a>

    <!-- Funnel-Inhalt -->
    <main
      id="funnel-main"
      class="flex flex-1 flex-col items-center justify-center"
      tabindex="-1"
    >
      <slot />
    </main>

    <!-- Footer: Pflicht-Links gemaess BFSG / DSGVO -->
    <footer
      class="py-4 text-center text-xs"
      style="color: var(--funnel-muted, #6b7280);"
      aria-label="Rechtliche Informationen"
    >
      <nav aria-label="Rechtliche Links">
        <ul class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <li>
            <a
              href="/barrierefreiheit"
              class="underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--funnel-accent,#3579fa)] focus-visible:ring-offset-1 rounded"
              style="color: inherit;"
            >
              Barrierefreiheit
            </a>
          </li>
          <li aria-hidden="true">·</li>
          <li>
            <a
              href="/impressum"
              class="underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--funnel-accent,#3579fa)] focus-visible:ring-offset-1 rounded"
              style="color: inherit;"
            >
              Impressum
            </a>
          </li>
          <li aria-hidden="true">·</li>
          <li>
            <a
              href="/datenschutz"
              class="underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--funnel-accent,#3579fa)] focus-visible:ring-offset-1 rounded"
              style="color: inherit;"
            >
              Datenschutz
            </a>
          </li>
        </ul>
      </nav>
    </footer>
  </div>
</template>

<!-- Renderer-spezifisches CSS-Bundle (ohne Editor-Klassen, kleiner als main.css) -->
<style src="~/assets/css/renderer.css" />
