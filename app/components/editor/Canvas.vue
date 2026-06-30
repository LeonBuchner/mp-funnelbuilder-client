<!--
  EditorCanvas: Canvas-Bereich mit zentriertem Handy-Frame.
  Rendert den aktuell selektierten Step via BlockRenderer (mode='editor').
  Selektierter Block: blauer 2px-Ring + Label-Tag oben links.
  Floating-Toolbar erscheint rechts neben dem Frame.

  Theme: wird dynamisch aus content.meta.themeId geladen (useFunnelThemes).
  Die CSS-Variablen --funnel-* werden per :style am Frame-Container gesetzt.
  Der öffentliche Renderer nutzt denselben Mechanismus (keine feste .funnel-theme-* Klasse).
-->
<script setup lang="ts">
import type { Block, BlockType } from '~/types/funnel'
import BlockRenderer from '~/components/blocks/BlockRenderer.vue'
import { funnelStepContextKey, type FunnelStepContext } from '~/composables/useFunnelStepContext'
import { useFunnelThemes } from '~/composables/useFunnelThemes'

const props = defineProps<{
  isReadonly: boolean
}>()

const emit = defineEmits<{
  (e: 'open-block-picker'): void
}>()

const editorStore = useEditorStore()
const { getThemeVars } = useFunnelThemes()

const blocks = computed(() => editorStore.selectedStep?.blocks ?? [])
const stepId = computed(() => editorStore.selectedStep?.id ?? '')

// ---------------------------------------------------------------------------
// Dynamisches Theme: CSS-Variablen aus content.meta.themeId
// ---------------------------------------------------------------------------
const activeThemeStyle = computed<Record<string, string>>(() => {
  const themeId = editorStore.content?.meta?.themeId ?? 'mp'
  return getThemeVars(themeId)
})

// ---------------------------------------------------------------------------
// Step-Kontext: provide für BlockProgress und andere Block-Komponenten.
// Nur 'question'- und 'form'-Steps zählen als Frage-Steps.
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
  }
  return map[type] ?? type
}

function onBlockClick(blockId: string): void {
  editorStore.selectBlock(blockId)
}

function onCanvasClick(): void {
  editorStore.deselectBlock()
}

/** Inline-Bearbeitung von TextBlocks: neuen HTML-Inhalt in den Store schreiben */
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
      <!-- Leerer Zustand: kein Step ausgewählt -->
      <div
        v-if="!editorStore.selectedStep"
        class="flex items-center self-center text-sm text-ui-muted"
      >
        Wähle eine Seite oder ein Ergebnis aus, um den Inhalt zu bearbeiten.
      </div>

      <!-- Handy-Frame -->
      <div
        v-else
        class="relative w-[390px] flex-shrink-0 self-start"
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
          Inhalt: theme-getrieben über :style (CSS-Variablen aus activeThemeStyle).
          Keine feste .funnel-theme-* Klasse mehr - der öffentliche Renderer
          nutzt denselben Mechanismus.
        -->
        <div
          class="relative py-6 overflow-hidden rounded-[32px]"
          :style="{
            ...activeThemeStyle,
            backgroundColor: 'var(--funnel-bg)',
            fontFamily: 'var(--funnel-font)',
          }"
        >
          <!-- Keine Blöcke: Hinweis -->
          <div
            v-if="blocks.length === 0"
            class="mx-6 rounded-xl border-2 border-dashed border-ui-border py-10 text-center text-sm text-ui-muted"
          >
            Noch keine Blöcke. Füge einen Block hinzu.
          </div>

          <!-- Block-Liste -->
          <div
            v-for="(block, idx) in blocks"
            :key="block.id"
            class="relative px-4 py-1"
          >
            <!-- Klickbare Block-Flaeche -->
            <div
              class="relative cursor-pointer"
              tabindex="0"
              role="button"
              :aria-label="`Block bearbeiten: ${blockLabel(block.type)}`"
              @click.stop="onBlockClick(block.id)"
              @keyup.enter.stop="onBlockClick(block.id)"
            >
              <!-- Block-Inhalt -->
              <BlockRenderer
                :block="block"
                mode="editor"
                :is-selected="editorStore.selectedBlockId === block.id"
                @update-content="(html: string) => handleTextContentUpdate(block.id, html)"
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
                :total-blocks="blocks.length"
              />
            </div>
          </div>

          <!-- Block hinzufügen -->
          <div
            v-if="!props.isReadonly"
            class="mx-4 mt-4"
          >
            <button
              type="button"
              class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ui-border py-3 text-sm text-ui-muted transition-colors hover:border-ui-accent hover:text-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
              aria-label="Block hinzufügen"
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
              Block hinzufügen
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
