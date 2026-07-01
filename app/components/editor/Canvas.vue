<!--
  EditorCanvas: Canvas-Bereich mit zentriertem Handy-Frame.
  Rendert den aktuell selektierten Step via BlockRenderer (mode='editor').
  Selektierter Block: blauer 2px-Ring + Label-Tag oben links.
  Floating-Toolbar erscheint rechts neben dem Frame.

  Drag-and-Drop (Editor-Modus): Bloecke koennen per Griff-Icon (links, sichtbar
  bei Hover) umsortiert werden. Klick auf den Block selektiert ihn weiterhin.
  Im Vorschau-Modus ist DnD deaktiviert; stattdessen einfaches v-for.

  Theme: wird dynamisch aus content.meta.themeId geladen (useFunnelThemes).
  Die CSS-Variablen --funnel-* werden per :style am Frame-Container gesetzt.
-->
<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { DraggableEvent } from 'vue-draggable-plus'
import { GripVertical } from 'lucide-vue-next'
import type { Block, BlockType } from '~/types/funnel'
import BlockRenderer from '~/components/blocks/BlockRenderer.vue'
import { funnelStepContextKey, type FunnelStepContext } from '~/composables/useFunnelStepContext'
import { useFunnelThemes } from '~/composables/useFunnelThemes'
import { brandingToFunnelVars } from '~/composables/useBrandings'

const props = defineProps<{
  isReadonly: boolean
}>()

const emit = defineEmits<{
  (e: 'open-block-picker'): void
}>()

const editorStore = useEditorStore()
const { getThemeVars } = useFunnelThemes()

// ---------------------------------------------------------------------------
// Block-Liste: lokalem Ref fuer vue-draggable-plus (braucht beschreibbares Array)
// ---------------------------------------------------------------------------

const storeBlocks = computed(() => editorStore.selectedStep?.blocks ?? [])
const stepId = computed(() => editorStore.selectedStep?.id ?? '')

/**
 * Lokale Kopie der Block-Liste fuer DnD.
 * vue-draggable-plus mutiert das Array beim Drop – wir rufen danach reorderBlocks
 * auf, um den Store zu synchronisieren.
 */
const localBlocks = ref<Block[]>([...storeBlocks.value])

watch(
  storeBlocks,
  (newBlocks) => {
    // Bei JEDER Aenderung im Store neu spiegeln: Reihenfolge, Hinzufuegen/Loeschen
    // UND Inhaltsaenderungen (updateBlock ersetzt das Block-Objekt). Nur so ist
    // eine Bearbeitung sofort im Frame sichtbar, ohne Reload.
    // Waehrend eines Drags wird der Store nicht veraendert, daher kein Konflikt;
    // nach dem Drop synchronisiert reorderBlocks -> gleiche Reihenfolge, kein Glitch.
    localBlocks.value = [...newBlocks]
  },
  { immediate: true, deep: true },
)

function onBlockDragEnd(evt: DraggableEvent<Block>): void {
  const { oldIndex, newIndex } = evt
  if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return
  // Der Store wird aus den globalen Indizes aktualisiert.
  // localBlocks ist bereits in der neuen Reihenfolge (vue-draggable-plus).
  editorStore.reorderBlocks(stepId.value, oldIndex, newIndex)
}

// ---------------------------------------------------------------------------
// Vorschau-Modus: lokaler Antwort-State (veraendert nicht den Store-Content)
// ---------------------------------------------------------------------------

const previewAnswers = ref<Record<string, string | boolean>>({})

watch(
  () => editorStore.previewMode,
  (active) => {
    if (active) {
      previewAnswers.value = {}
    }
  },
)

function updatePreviewAnswer(blockId: string, value: string | boolean): void {
  previewAnswers.value[blockId] = value
}

// ---------------------------------------------------------------------------
// Dynamisches Theme / Branding: CSS-Variablen
// Prioritaet: Branding (editorStore.funnel.branding) > Theme-Preset (themeId)
// Reagiert sofort auf Branding-Wechsel im BrandingSection.
// ---------------------------------------------------------------------------
const activeThemeStyle = computed<Record<string, string>>(() => {
  const branding = editorStore.funnel?.branding
  if (branding) {
    return brandingToFunnelVars(branding)
  }
  const themeId = editorStore.content?.meta?.themeId ?? 'mp'
  return getThemeVars(themeId)
})

// ---------------------------------------------------------------------------
// Step-Kontext: provide fuer BlockProgress und andere Block-Komponenten.
// ---------------------------------------------------------------------------
const questionSteps = computed(() =>
  editorStore.steps.filter(s => s.type === 'question' || s.type === 'form'),
)

const stepContext = computed<FunnelStepContext>(() => {
  const step = editorStore.selectedStep
  const total = questionSteps.value.length
  if (!step) return { questionNumber: null, totalQuestions: total }
  const idx = questionSteps.value.findIndex(s => s.id === step.id)
  return {
    questionNumber: idx >= 0 ? idx + 1 : null,
    totalQuestions: total,
  }
})

provide(funnelStepContextKey, stepContext)

/** Benutzerfreundliche Bezeichnung je Block-Typ */
function blockLabel(type: BlockType): string {
  const map: Record<BlockType, string> = {
    text: 'Text',
    image: 'Bild',
    button: 'Button',
    single_choice: 'Antwort',
    input_text: 'Texteingabe',
    input_email: 'E-Mail',
    input_phone: 'Telefon',
    optin_checkbox: 'Opt-in',
    progress_indicator: 'Fortschritt',
    logo: 'Logo',
    multi_choice: 'Mehrfachauswahl',
    input_date: 'Datum',
    input_time: 'Uhrzeit',
    input_number: 'Zahl',
    input_dropdown: 'Dropdown',
    input_textarea: 'Textfeld',
    rating: 'Bewertung',
    divider: 'Trenner',
    spacer: 'Abstand',
    video: 'Video',
    icon: 'Icon',
  }
  return map[type] ?? type
}

function onBlockClick(blockId: string): void {
  if (!editorStore.previewMode) {
    editorStore.selectBlock(blockId)
  }
}

function onCanvasClick(): void {
  if (!editorStore.previewMode) {
    editorStore.deselectBlock()
  }
}

/** Inline-Bearbeitung von TextBlocks */
function handleTextContentUpdate(blockId: string, html: string): void {
  const sid = stepId.value
  if (!sid) return
  editorStore.updateBlock(sid, blockId, { content: html } as Partial<Block>)
}
</script>

<template>
  <!-- Canvas-Hintergrund (grau, scrollbar) -->
  <section
    class="relative flex-1 overflow-y-auto bg-ui-bg"
    aria-label="Canvas"
    @click="onCanvasClick"
  >
    <div class="flex min-h-full justify-center py-8 px-12">
      <!-- Leerer Zustand: kein Step ausgewaehlt -->
      <div
        v-if="!editorStore.selectedStep"
        class="flex items-center self-center text-sm text-ui-muted"
      >
        Waehle eine Seite oder ein Ergebnis aus, um den Inhalt zu bearbeiten.
      </div>

      <!--
        Handy-Frame.
        Breite: 375px im Vorschau-Modus (Mobile-Standard), 390px im Editor.
      -->
      <div
        v-else
        class="relative flex-shrink-0 self-start"
        :class="editorStore.previewMode ? 'w-[375px]' : 'w-[390px]'"
        @click.stop
      >
        <!--
          Visueller Frame-Hintergrund (weisse Karte, abgerundet, Schatten).
          Absolut positioniert, damit Floating-Toolbar rechts rausragt.
        -->
        <div
          class="pointer-events-none absolute inset-0 rounded-[32px] bg-white shadow-[0_4px_32px_rgba(0,0,0,0.10)]"
          aria-hidden="true"
        />

        <!--
          Inhalt: theme-getrieben ueber :style (CSS-Variablen aus activeThemeStyle).
          overflow-hidden wird fuer DnD auf overflow-visible gestellt; das Erscheinungsbild
          der runden Ecken bleibt erhalten, weil der visuelle Hintergrund (Karte oben)
          separat absolut positioniert ist.
        -->
        <div
          class="relative py-6"
          :class="editorStore.previewMode ? 'overflow-hidden rounded-[32px]' : 'overflow-visible'"
          :style="{
            ...activeThemeStyle,
            backgroundColor: 'var(--funnel-bg)',
            fontFamily: 'var(--funnel-font)',
          }"
        >
          <!-- ================================================================ -->
          <!-- EDITOR-MODUS: DnD aktiv                                          -->
          <!-- ================================================================ -->
          <template v-if="!editorStore.previewMode">
            <!-- Keine Bloecke: Hinweis -->
            <div
              v-if="localBlocks.length === 0"
              class="mx-6 rounded-xl border-2 border-dashed border-ui-border py-10 text-center text-sm text-ui-muted"
            >
              Noch keine Bloecke. Fuege einen Block hinzu.
            </div>

            <!--
              Sortierbare Block-Liste.
              handle=".block-drag-handle": Nur der Griff startet den Drag.
              Klick auf den Block selbst selektiert ihn (keine Interferenz).
              forceFallback + fallbackOnBody: Der Drag-Clone wird an document.body
              angehaengt, damit er nicht durch overflow geclippt wird.
            -->
            <VueDraggable
              v-model="localBlocks"
              tag="div"
              handle=".block-drag-handle"
              :animation="150"
              :force-fallback="true"
              :fallback-on-body="true"
              ghost-class="canvas-drag-ghost"
              fallback-class="canvas-drag-fallback"
              @end="onBlockDragEnd"
            >
              <div
                v-for="(block, idx) in localBlocks"
                :key="block.id"
                class="group relative px-4 py-1"
              >
                <!--
                  Drag-Griff: im linken Padding-Bereich (px-4 = 16px).
                  Nur bei Hover sichtbar; Klick wird gestoppt, damit er nicht
                  zur Block-Selektion durchbricht.
                  aria-label und tabindex=-1 (DnD ist kein Tastatur-Flow –
                  der Button-Fallback in der FloatingToolbar bleibt die
                  barrierefreie Variante).
                -->
                <button
                  v-if="!props.isReadonly"
                  type="button"
                  class="block-drag-handle absolute left-0 top-0 z-20 flex h-full w-4 cursor-grab items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent/50"
                  aria-label="Block verschieben"
                  tabindex="-1"
                  @click.stop
                >
                  <GripVertical
                    class="h-3.5 w-3.5 text-ui-muted"
                    aria-hidden="true"
                  />
                </button>

                <!--
                  Klickbare Block-Flaeche: Selektion per Klick oder Enter.
                -->
                <div
                  class="relative cursor-pointer"
                  tabindex="0"
                  role="button"
                  :aria-label="`Block bearbeiten: ${blockLabel(block.type)}`"
                  @click.stop="onBlockClick(block.id)"
                  @keyup.enter.stop="onBlockClick(block.id)"
                >
                  <BlockRenderer
                    :block="block"
                    mode="editor"
                    :is-selected="editorStore.selectedBlockId === block.id"
                    @update-content="(html: string) => handleTextContentUpdate(block.id, html)"
                  />

                  <!-- Hover: gestrichelte graue Umrandung (nur wenn nicht selektiert) -->
                  <div
                    v-if="editorStore.selectedBlockId !== block.id"
                    class="pointer-events-none absolute inset-0 z-10 rounded-lg border border-dashed border-gray-300 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden="true"
                  />

                  <!-- Selektion: blauer Ring -->
                  <div
                    v-if="editorStore.selectedBlockId === block.id"
                    class="pointer-events-none absolute inset-0 z-10 rounded-lg ring-2 ring-ui-accent"
                    aria-hidden="true"
                  />

                  <!-- Label-Tag oben links -->
                  <span
                    v-if="editorStore.selectedBlockId === block.id"
                    class="absolute -top-2.5 left-2 z-20 select-none rounded bg-ui-accent px-1.5 py-0.5 text-xs font-medium text-white"
                    aria-hidden="true"
                  >
                    {{ blockLabel(block.type) }}
                  </span>
                </div>

                <!-- Floating-Toolbar: rechts vom Frame, absolute zur Block-Zeile -->
                <div
                  v-if="editorStore.selectedBlockId === block.id && !props.isReadonly"
                  class="absolute left-full top-1 z-30 ml-2"
                  @click.stop
                >
                  <EditorFloatingToolbar
                    :step-id="stepId"
                    :block-id="block.id"
                    :block-index="idx"
                    :total-blocks="localBlocks.length"
                  />
                </div>
              </div>
            </VueDraggable>
          </template>

          <!-- ================================================================ -->
          <!-- VORSCHAU-MODUS: mode='live', kein DnD, keine Editor-Overlays     -->
          <!-- ================================================================ -->
          <template v-else>
            <!-- Keine Bloecke im Vorschau-Modus -->
            <div
              v-if="storeBlocks.length === 0"
              class="mx-6 rounded-xl border-2 border-dashed border-ui-border py-10 text-center text-sm text-ui-muted"
            >
              Noch keine Bloecke.
            </div>

            <div
              v-for="block in storeBlocks"
              :key="block.id"
              class="relative px-4 py-1"
            >
              <BlockRenderer
                :block="block"
                mode="live"
                :model-value="previewAnswers[block.id]"
                @update:model-value="updatePreviewAnswer(block.id, $event)"
              />
            </div>
          </template>

          <!-- Block hinzufuegen (nur im Editor-Modus) -->
          <div
            v-if="!props.isReadonly && !editorStore.previewMode"
            class="mx-4 mt-4"
          >
            <button
              type="button"
              class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ui-border py-3 text-sm text-ui-muted transition-colors hover:border-ui-accent hover:text-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
              aria-label="Block hinzufuegen"
              @click.stop="emit('open-block-picker')"
            >
              <svg
                class="h-4 w-4"
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
              Block hinzufuegen
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style>
/*
  Ghost-Element (Platzhalter an der Ziel-Position) waehrend des Drags.
  Halbdurchsichtig + Akzent-Hintergrund zeigt an, wo der Block landen wird.
*/
.canvas-drag-ghost {
  opacity: 0.4;
  background-color: rgba(53, 121, 250, 0.08);
  border-radius: 0.5rem;
}

/*
  Fallback-Klon (folgt dem Cursor). Leichter Schatten macht ihn abgrenzbar.
*/
.canvas-drag-fallback {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  border-radius: 0.5rem;
  opacity: 0.95;
}
</style>
