<!--
  SectionThumbnail: Echtes Mini-Rendering der Sektions-Vorlage.

  Die Blöcke werden wie im Editor (Canvas.vue) dargestellt und per
  CSS transform: scale() auf Thumbnail-Größe verkleinert. Das gibt
  dem Nutzer ein realistisches Vorschau-Bild mit echten Farben,
  Platzhaltern und Typografie, statt eines abstrakten SVG-Wireframes.

  Struktur:
    - Outer-Wrapper: w-full, feste Höhe (200 px), overflow-hidden
    - Inner-Container: 390 px breit (identisch zum Handy-Frame), per
      scale() verkleinert auf die Wrapper-Breite (gemessen via useElementSize).
      transform-origin: top left – Inhalt beginnt oben links.
    - pointer-events: none, aria-hidden – kein Fokus, keine Interaktion.

  Blöcke werden einmalig beim Mounting erzeugt (template.create() = neue UUIDs
  nur einmal pro Akkordeon-Öffnung, da AddPanel v-if nutzt).

  BlockRenderer wird explizit importiert, da der Nuxt-Auto-Import-Präfix
  "Blocks" hinzufügt und <BlockRenderer> im Template sonst nicht aufgelöst wird.
-->
<script setup lang="ts">
import BlockRenderer from '~/components/blocks/BlockRenderer.vue'
import { useSectionTemplates, type SectionKey } from '~/composables/useSectionTemplates'
import { useFunnelThemes } from '~/composables/useFunnelThemes'
import type { Block } from '~/types/funnel'

const props = defineProps<{
  sectionKey: SectionKey
}>()

// ---------------------------------------------------------------------------
// Blöcke einmalig erzeugen (keine UUID-Neugenerierung bei Re-Renders).
// Da AddPanel dieses Element per v-if nur beim Aufklappen mountet, passiert
// dies genau einmal pro Öffnung.
// ---------------------------------------------------------------------------
const { sectionTemplates } = useSectionTemplates()
const blocks: Block[] = sectionTemplates.find(t => t.key === props.sectionKey)?.create() ?? []

// ---------------------------------------------------------------------------
// Maße: Wrapper-Breite messen → Skalierungsfaktor berechnen
// ---------------------------------------------------------------------------

/** Breite des inneren Render-Containers in px. Identisch zum Handy-Frame in Canvas.vue. */
const RENDER_WIDTH = 390

/** Sichtbare Höhe der Thumbnail-Box in px. */
const THUMB_HEIGHT = 200

const wrapperEl = ref<HTMLDivElement | null>(null)
const { width: wrapperWidth } = useElementSize(wrapperEl)

/**
 * Skalierungsfaktor: wrapperWidth / RENDER_WIDTH.
 * Fallback 0.6 bis useElementSize die erste Messung geliefert hat
 * (das LeftPanel ist 260 px breit, daraus ergibt sich ~234 / 390 ≈ 0.60).
 */
const scale = computed<number>(() =>
  wrapperWidth.value > 0 ? wrapperWidth.value / RENDER_WIDTH : 0.6,
)

// ---------------------------------------------------------------------------
// Theme-Variablen (MP-Default, identisch zu Canvas.vue activeThemeStyle)
// ---------------------------------------------------------------------------
const { getThemeVars } = useFunnelThemes()
const themeVars: Record<string, string> = getThemeVars('mp')
</script>

<template>
  <!--
    Outer-Wrapper: begrenzt die sichtbare Fläche per overflow-hidden.
    aria-hidden="true" ergänzt das aria-hidden im Elternelement (AddPanel).
  -->
  <div
    ref="wrapperEl"
    class="relative w-full overflow-hidden"
    :style="{ height: `${THUMB_HEIGHT}px` }"
    aria-hidden="true"
  >
    <!--
      Inner-Container: RENDER_WIDTH px breit, per scale() verkleinert.
      transform-origin: top left – Inhalt wird von der oberen linken Ecke aus skaliert.
      pointer-events-none – kein Klick, kein Hover, kein Fokus.
    -->
    <div
      class="pointer-events-none absolute left-0 top-0"
      :style="{
        width: `${RENDER_WIDTH}px`,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
      }"
    >
      <!--
        Gleiche Struktur wie Canvas.vue:
        py-6 am Theme-Container, px-4 py-1 je Block.
        Funnel-Theme-Variablen per Inline-Style (wie activeThemeStyle in Canvas.vue).
      -->
      <div
        class="py-6"
        :style="{
          ...themeVars,
          backgroundColor: 'var(--funnel-bg)',
          fontFamily: 'var(--funnel-font)',
        }"
      >
        <div
          v-for="block in blocks"
          :key="block.id"
          class="px-4 py-1"
        >
          <BlockRenderer
            :block="block"
            mode="editor"
            :is-selected="false"
          />
        </div>
      </div>
    </div>
  </div>
</template>
