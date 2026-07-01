<!--
  EditorSkeleton: Skeleton-Loading-Anzeige für den Editor-Artboard.

  Wird in editor.vue während isLoadingFunnel=true angezeigt statt des reinen
  Spinners. Zeigt die Editor-Chrome-Hülle (TopBar + LeftPanel + Canvas) mit
  pulsierenden Block-Platzhaltern im Handy-Frame.

  Accessibility:
  - aria-busy="true" und aria-label am Wurzel-Container
  - Alle dekorativen Skeleton-Elemente aria-hidden="true"
  - Kein Fokusfang
  - motion-reduce:animate-none respektiert prefers-reduced-motion
-->
<template>
  <div
    class="flex flex-1 flex-col overflow-hidden"
    aria-busy="true"
    aria-label="Editor wird geladen"
  >
    <!-- Skeleton Top-Bar (~56px, spiegelt EditorTopBar) -->
    <div
      class="flex h-14 shrink-0 items-center gap-3 border-b border-ui-border bg-white px-4"
      aria-hidden="true"
    >
      <!-- Breadcrumb: Home-Icon-Platzhalter + Funnel-Name -->
      <div class="h-4 w-5 animate-pulse rounded bg-gray-200 motion-reduce:animate-none" />
      <div class="h-4 w-28 animate-pulse rounded bg-gray-200 motion-reduce:animate-none" />
      <!-- Tab-Bereich (Mitte) -->
      <div class="flex flex-1 justify-center gap-2">
        <div class="h-7 w-14 animate-pulse rounded-full bg-gray-200 motion-reduce:animate-none" />
        <div class="h-7 w-16 animate-pulse rounded-full bg-gray-100 motion-reduce:animate-none" />
        <div class="h-7 w-16 animate-pulse rounded-full bg-gray-100 motion-reduce:animate-none" />
      </div>
      <!-- Rechte Buttons -->
      <div class="flex items-center gap-2">
        <div class="h-7 w-7 animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
        <div class="h-7 w-7 animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
        <div class="h-8 w-24 animate-pulse rounded-lg bg-gray-200 motion-reduce:animate-none" />
      </div>
    </div>

    <!-- Hauptfläche: LeftPanel-Placeholder + Canvas -->
    <div
      class="flex flex-1 overflow-hidden"
      aria-hidden="true"
    >
      <!-- Skeleton LeftPanel (spiegelt w-[260px] aus LeftPanel.vue) -->
      <div class="flex w-[260px] shrink-0 flex-col border-r border-ui-border bg-white p-4">
        <!-- Tabs Übersicht / Design -->
        <div class="mb-4 flex gap-1.5">
          <div class="h-7 w-20 animate-pulse rounded-md bg-gray-200 motion-reduce:animate-none" />
          <div class="h-7 w-16 animate-pulse rounded-md bg-gray-100 motion-reduce:animate-none" />
        </div>
        <!-- Sektion-Überschrift -->
        <div class="mb-2 h-3 w-14 animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
        <!-- Seiten-Items -->
        <div class="mb-1.5 h-8 w-full animate-pulse rounded-lg bg-gray-100 motion-reduce:animate-none" />
        <div class="mb-1.5 h-8 w-full animate-pulse rounded-lg bg-gray-100 motion-reduce:animate-none" />
        <div class="mb-4 h-8 w-full animate-pulse rounded-lg bg-gray-100 motion-reduce:animate-none" />
        <!-- Zweite Sektion -->
        <div class="mb-2 h-3 w-16 animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
        <div class="h-8 w-full animate-pulse rounded-lg bg-gray-100 motion-reduce:animate-none" />
      </div>

      <!-- Skeleton Canvas (grauer Hintergrund, zentrierter Handy-Frame) -->
      <div class="relative flex-1 overflow-y-auto bg-ui-bg">
        <div class="flex min-h-full justify-center px-12 py-8">
          <!--
            Handy-Frame: identische Breite und Radius wie Canvas.vue (w-[390px],
            rounded-[32px], shadow). Kein Layout-Shift beim Fertigladen.
          -->
          <div class="relative w-[390px] shrink-0 self-start">
            <!-- Visueller Frame-Hintergrund (spiegelt Canvas.vue absolut-Position) -->
            <div
              class="pointer-events-none absolute inset-0 rounded-[32px] bg-white shadow-[0_4px_32px_rgba(0,0,0,0.10)]"
            />

            <!-- Pulsende Block-Platzhalter im Frame -->
            <div class="relative px-4 py-6">
              <!-- Logo-Kreis -->
              <div class="mb-5 flex justify-center">
                <div
                  class="h-12 w-12 animate-pulse rounded-full bg-gray-200 motion-reduce:animate-none"
                />
              </div>

              <!-- Titelzeile (breit) -->
              <div
                class="mx-4 mb-3 h-5 animate-pulse rounded bg-gray-200 motion-reduce:animate-none"
              />

              <!-- Untertitel-Zeile (kürzer) -->
              <div
                class="mx-10 mb-5 h-3 animate-pulse rounded bg-gray-100 motion-reduce:animate-none"
              />

              <!-- Zwei kurze Textzeilen -->
              <div
                class="mb-2 h-3 animate-pulse rounded bg-gray-100 motion-reduce:animate-none"
              />
              <div
                class="mb-6 h-3 w-3/4 animate-pulse rounded bg-gray-100 motion-reduce:animate-none"
              />

              <!-- Antwort-/Button-Block 1 -->
              <div
                class="mb-2.5 h-12 animate-pulse rounded-xl bg-gray-200 motion-reduce:animate-none"
              />

              <!-- Antwort-/Button-Block 2 -->
              <div
                class="h-12 animate-pulse rounded-xl bg-gray-200 motion-reduce:animate-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
