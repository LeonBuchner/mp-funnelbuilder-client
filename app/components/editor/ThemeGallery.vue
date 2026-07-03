<!--
  EditorThemeGallery: Design-Tab nach 15-design-themes.jpg.
  Abschnitte:
    - "Deine Themes": aktuell aktives Theme mit bunter Kante
    - "Perspective Themes": alle Registry-Themes als Galerie mit Farb-Swatches
  Klick öffnet ThemeChangeModal. Nach Bestätigung: themeId in content.meta setzen + Auto-Save.
-->
<script setup lang="ts">
import { useFunnelThemes } from '~/composables/useFunnelThemes'
import type { FunnelTheme } from '~/composables/useFunnelThemes'

const props = defineProps<{
  isReadonly: boolean
}>()

const editorStore = useEditorStore()
const { themes, getTheme } = useFunnelThemes()

/** Aktives Theme aus content.meta.themeId, Fallback 'mp' */
const activeThemeId = computed<string>(
  () => editorStore.content?.meta?.themeId ?? 'mp',
)

const activeTheme = computed<FunnelTheme>(() => getTheme(activeThemeId.value))

/** Modal-Zustand */
const pendingTheme = ref<FunnelTheme | null>(null)

function openModal(theme: FunnelTheme): void {
  if (props.isReadonly) return
  pendingTheme.value = theme
}

function onModalConfirm(_mode: 'all' | 'unadjusted'): void {
  if (!pendingTheme.value) return
  // Theme-ID in content.meta speichern (Auto-Save via watchDebounced im Store)
  editorStore.updateMeta({ themeId: pendingTheme.value.id })
  // Bei 'all': zukünftig könnte hier block-spezifische Styles resettet werden (M3)
  // Vorerst: themeId reicht, der Frame und der Renderer wenden es an
  pendingTheme.value = null
}

function onModalCancel(): void {
  pendingTheme.value = null
}

/** "Perspective Themes" sind alle Themes AUSSER dem aktiv gespeicherten */
const perspectiveThemes = computed<FunnelTheme[]>(() =>
  themes.filter(t => t.id !== 'mp' || true),
)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-3 py-4">
    <!-- ------------------------------------------------------------------ -->
    <!-- Dein Branding (B11): oberhalb der Perspective-Presets               -->
    <!-- ------------------------------------------------------------------ -->
    <EditorBrandingSection :is-readonly="props.isReadonly" />

    <!-- Trennlinie -->
    <div class="mb-4 h-px bg-ui-border" />

    <!-- ------------------------------------------------------------------ -->
    <!-- Deine Themes                                                         -->
    <!-- ------------------------------------------------------------------ -->
    <section
      class="mb-4"
      aria-label="Deine Themes"
    >
      <div class="mb-2 flex items-center justify-between">
        <h2 class="text-xs font-semibold text-ui-text">
          Deine Themes
        </h2>
        <button
          type="button"
          class="flex h-5 w-5 items-center justify-center rounded text-ui-muted hover:text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-accent"
          aria-label="Neues Theme erstellen (kommt später)"
          title="Neues Theme"
          disabled
          aria-disabled="true"
        >
          <svg
            class="h-4 w-4 opacity-40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>

      <!-- Aktives Theme-Eintrag -->
      <button
        type="button"
        :class="[
          'group flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition-colors',
          'border-ui-accent bg-ui-accent/5',
        ]"
        :aria-label="`Aktives Theme: ${activeTheme.name}`"
        :aria-pressed="true"
        :disabled="props.isReadonly"
        @click="openModal(activeTheme)"
      >
        <!-- Farb-Swatches -->
        <div
          class="flex flex-shrink-0 gap-0.5"
          aria-hidden="true"
        >
          <span
            v-for="color in activeTheme.swatches"
            :key="color"
            class="h-4 w-4 rounded-full border border-black/10"
            :style="{ backgroundColor: color }"
          />
        </div>
        <!-- Name -->
        <span class="flex-1 truncate text-sm font-medium text-ui-text">
          {{ activeTheme.name }}
        </span>
        <!-- Check-Icon -->
        <svg
          class="h-4 w-4 flex-shrink-0 text-ui-accent"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2.5"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </button>
    </section>

    <!-- Trennlinie -->
    <div class="mb-4 h-px bg-ui-border" />

    <!-- ------------------------------------------------------------------ -->
    <!-- Perspective Themes                                                   -->
    <!-- ------------------------------------------------------------------ -->
    <section aria-label="Perspective Themes">
      <h2 class="mb-2 text-xs font-semibold text-ui-text">
        Perspective Themes
      </h2>

      <ul
        class="space-y-1"
        aria-label="Theme-Auswahl"
      >
        <li
          v-for="theme in perspectiveThemes"
          :key="theme.id"
        >
          <button
            type="button"
            :class="[
              'group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ui-accent',
              theme.id === activeThemeId
                ? 'border-ui-accent bg-ui-accent/5'
                : 'border-transparent bg-white hover:border-ui-border hover:bg-ui-bg/60',
              props.isReadonly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
            ]"
            :aria-label="`Theme ${theme.name} anwenden`"
            :aria-pressed="theme.id === activeThemeId"
            :disabled="props.isReadonly"
            @click="openModal(theme)"
          >
            <!-- Farb-Swatches -->
            <div
              class="flex flex-shrink-0 gap-0.5"
              aria-hidden="true"
            >
              <span
                v-for="color in theme.swatches"
                :key="color"
                class="h-4 w-4 rounded-full border border-black/10"
                :style="{ backgroundColor: color }"
              />
            </div>

            <!-- Name -->
            <span class="flex-1 truncate text-sm text-ui-text">
              {{ theme.name }}
            </span>

            <!-- Aktiv-Indikator -->
            <svg
              v-if="theme.id === activeThemeId"
              class="h-4 w-4 flex-shrink-0 text-ui-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2.5"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </button>
        </li>
      </ul>
    </section>
  </div>

  <!-- Modal: Theme ändern -->
  <Teleport to="body">
    <EditorThemeChangeModal
      v-if="pendingTheme"
      :theme="pendingTheme"
      @confirm="onModalConfirm"
      @cancel="onModalCancel"
    />
  </Teleport>
</template>
