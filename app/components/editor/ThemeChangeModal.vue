<!--
  EditorThemeChangeModal: Modal "Theme ändern" nach 15-design-themes.jpg.
  Optionen: "Theme auf alle Blöcke anwenden" / "nur unangepasste Blöcke".
  Escape schließt das Modal (Fokus-Trap ist vereinfacht: nur ESC + zwei Buttons).
-->
<script setup lang="ts">
import type { FunnelTheme } from '~/composables/useFunnelThemes'

const props = defineProps<{
  theme: FunnelTheme
}>()

const emit = defineEmits<{
  (e: 'confirm', mode: 'all' | 'unadjusted'): void
  (e: 'cancel'): void
}>()

type ApplyMode = 'all' | 'unadjusted'
const applyMode = ref<ApplyMode>('all')

function confirm(): void {
  emit('confirm', applyMode.value)
}

function cancel(): void {
  emit('cancel')
}

/** Escape schließt das Modal */
function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') cancel()
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
    role="dialog"
    aria-modal="true"
    :aria-label="`Theme ${props.theme.name} anwenden`"
    @click.self="cancel"
  >
    <!-- Modal-Card -->
    <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
      <!-- Titel -->
      <h2 class="mb-1 text-lg font-semibold text-ui-text">
        Theme ändern
      </h2>

      <!-- Erklärungstext -->
      <p class="mb-4 text-sm text-ui-muted">
        Bei der Anwendung des Themes werden Farben und Schriftart Deines Funnels angepasst.
        Du kannst entscheiden, ob das Theme auf alle Blöcke in Deinem Funnel angewendet
        werden soll, oder nur jene, welche Du noch nicht manuell angepasst hast.
      </p>

      <p class="mb-3 text-sm font-medium text-ui-text">
        Was möchtest Du tun?
      </p>

      <!-- Radio-Optionen -->
      <fieldset class="space-y-2">
        <legend class="sr-only">
          Anwendungs-Modus
        </legend>

        <label
          :class="[
            'flex cursor-pointer items-center gap-3 rounded-lg border-2 px-4 py-3 transition-colors',
            applyMode === 'all'
              ? 'border-ui-accent bg-ui-accent/5'
              : 'border-ui-border bg-white hover:border-ui-accent/50',
          ]"
        >
          <input
            v-model="applyMode"
            type="radio"
            name="apply-mode"
            value="all"
            class="h-4 w-4 accent-ui-accent"
          >
          <span class="text-sm text-ui-text">Theme auf alle Blöcke anwenden</span>
        </label>

        <label
          :class="[
            'flex cursor-pointer items-center gap-3 rounded-lg border-2 px-4 py-3 transition-colors',
            applyMode === 'unadjusted'
              ? 'border-ui-accent bg-ui-accent/5'
              : 'border-ui-border bg-white hover:border-ui-accent/50',
          ]"
        >
          <input
            v-model="applyMode"
            type="radio"
            name="apply-mode"
            value="unadjusted"
            class="h-4 w-4 accent-ui-accent"
          >
          <span class="text-sm text-ui-text">Theme nur auf unangepasste Blöcke anwenden</span>
        </label>
      </fieldset>

      <!-- "Nicht noch einmal fragen" Checkbox (Placeholder, keine Persistenz) -->
      <label class="mt-3 flex cursor-pointer items-center gap-2 text-sm text-ui-muted">
        <input
          type="checkbox"
          class="h-4 w-4 accent-ui-accent"
        >
        Nicht noch einmal fragen
      </label>

      <!-- Buttons -->
      <div class="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm font-medium text-ui-muted transition-colors hover:text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-accent"
          @click="cancel"
        >
          Abbrechen
        </button>
        <button
          type="button"
          class="rounded-lg bg-ui-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ui-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ui-accent"
          @click="confirm"
        >
          Theme ändern
        </button>
      </div>
    </div>
  </div>
</template>
