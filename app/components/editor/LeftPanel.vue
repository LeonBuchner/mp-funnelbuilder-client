<!--
  EditorLeftPanel: Linkes Panel im Perspective-Stil.
  - Tabs "Uebersicht / Design" als Segmented Control
  - Kontext-Modus: wenn Block selektiert, Block-Einstellungen statt Uebersicht
  - Seiten-Liste und Ergebnis-Liste sind per Drag-and-Drop sortierbar.
    Tastatur-Fallback: Hoch/Runter-Buttons bleiben vollstaendig erhalten (WCAG).
-->
<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { DraggableEvent } from 'vue-draggable-plus'
import { GripVertical } from 'lucide-vue-next'
import type { Block, Step } from '~/types/funnel'

const props = defineProps<{
  isReadonly: boolean
  showAddPanel?: boolean
}>()

const emit = defineEmits<{
  (e: 'close-add-panel'): void
}>()

const editorStore = useEditorStore()

type LeftTab = 'overview' | 'design'
const activeTab = ref<LeftTab>('overview')

// ---------------------------------------------------------------------------
// Gefilterte Step-Listen
// ---------------------------------------------------------------------------

/** Seiten (alle Steps ohne Ergebnis-Typ) */
const pageSteps = computed<Step[]>(() =>
  editorStore.steps.filter(s => s.type !== 'result'),
)

/** Ergebnis-Steps */
const resultSteps = computed<Step[]>(() =>
  editorStore.steps.filter(s => s.type === 'result'),
)

// ---------------------------------------------------------------------------
// Lokale Refs fuer DnD (vue-draggable-plus braucht beschreibbare Arrays)
// ---------------------------------------------------------------------------

const localPageSteps = ref<Step[]>([...pageSteps.value])
const localResultSteps = ref<Step[]>([...resultSteps.value])

// Deep-Sync: auch Inhaltsaenderungen (z.B. umbenannter Step) sofort spiegeln,
// nicht nur Reihenfolge/Menge. Waehrend eines Drags wird der Store nicht
// veraendert, daher kein Konflikt mit vue-draggable-plus.
watch(
  pageSteps,
  (newSteps) => {
    localPageSteps.value = [...newSteps]
  },
  { immediate: true, deep: true },
)

watch(
  resultSteps,
  (newSteps) => {
    localResultSteps.value = [...newSteps]
  },
  { immediate: true, deep: true },
)

// ---------------------------------------------------------------------------
// Globale Index-Mappings fuer die reorderSteps-Aktion
// reorderSteps arbeitet auf dem globalen content.steps-Array.
// Diese Mappings uebersetzen lokale (gefilterte) Indizes in globale Indizes.
// ---------------------------------------------------------------------------

const pageStepGlobalIndices = computed<number[]>(() =>
  editorStore.steps
    .map((s, i) => ({ step: s, idx: i }))
    .filter(({ step }) => step.type !== 'result')
    .map(({ idx }) => idx),
)

const resultStepGlobalIndices = computed<number[]>(() =>
  editorStore.steps
    .map((s, i) => ({ step: s, idx: i }))
    .filter(({ step }) => step.type === 'result')
    .map(({ idx }) => idx),
)

/**
 * Drag-End-Handler fuer Seiten.
 * oldIndex/newIndex beziehen sich auf localPageSteps (gefiltert).
 * Der Store wird ueber die globalen Indizes aktualisiert.
 * Wichtig: pageStepGlobalIndices wird aus dem Store gelesen, der noch
 * die alte Reihenfolge hat – daher sind die Mappings noch korrekt.
 */
function onPageStepDragEnd(evt: DraggableEvent<Step>): void {
  const { oldIndex, newIndex } = evt
  if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return

  const globalFrom = pageStepGlobalIndices.value[oldIndex]
  const globalTo = pageStepGlobalIndices.value[newIndex]

  if (globalFrom !== undefined && globalTo !== undefined) {
    editorStore.reorderSteps(globalFrom, globalTo)
  }
}

/** Drag-End-Handler fuer Ergebnisse. */
function onResultStepDragEnd(evt: DraggableEvent<Step>): void {
  const { oldIndex, newIndex } = evt
  if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return

  const globalFrom = resultStepGlobalIndices.value[oldIndex]
  const globalTo = resultStepGlobalIndices.value[newIndex]

  if (globalFrom !== undefined && globalTo !== undefined) {
    editorStore.reorderSteps(globalFrom, globalTo)
  }
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

/** Buchstabenindex fuer Ergebnis-Steps (A, B, C ...) */
function resultLabel(idx: number): string {
  return String.fromCharCode(65 + idx)
}

function confirmRemoveStep(step: Step): void {
  if (editorStore.steps.length <= 1) return
  if (window.confirm(`Seite "${step.internalTitle}" wirklich loeschen?`)) {
    editorStore.removeStep(step.id)
  }
}

function handleUpdateBlock(patch: Partial<Block>): void {
  const stepId = editorStore.selectedStep?.id
  const blockId = editorStore.selectedBlock?.id
  if (!stepId || !blockId) return
  editorStore.updateBlock(stepId, blockId, patch)
}

function addPageStep(): void {
  editorStore.addStep('content')
}

function addResultStep(): void {
  editorStore.addStep('result')
}

// Blockname fuer Kontext-Header
const blockContextTitle = computed<string>(() => {
  const type = editorStore.selectedBlock?.type
  if (!type) return ''
  const map: Record<string, string> = {
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
})

const showFormatToolbar = computed<boolean>(
  () => editorStore.selectedBlock?.type === 'text',
)

const showLinkTarget = computed<boolean>(
  () =>
    editorStore.selectedBlock?.type === 'button' ||
    editorStore.selectedBlock?.type === 'single_choice',
)

/** DnD aktiv: nur im Editor-Modus, nicht readonly, nicht Vorschau */
const dndEnabled = computed(() => !props.isReadonly && !editorStore.previewMode)
</script>

<template>
  <aside
    class="flex w-[260px] flex-shrink-0 flex-col border-r border-ui-border bg-white"
    aria-label="Funnel-Struktur"
  >
    <!-- ================================================================== -->
    <!-- ADD-PANEL-MODUS: Sektion hinzufuegen                               -->
    <!-- ================================================================== -->
    <template v-if="props.showAddPanel">
      <div class="flex items-center gap-2 border-b border-ui-border px-3 py-3">
        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded text-ui-muted hover:bg-ui-bg hover:text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
          aria-label="Zurueck zur Uebersicht"
          title="Zurueck"
          @click="emit('close-add-panel')"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <span class="flex-1 text-sm font-semibold text-ui-text">Sektion hinzufuegen</span>
      </div>

      <div
        class="flex-1 overflow-y-auto"
        role="region"
        aria-label="Block- und Sektions-Auswahl"
      >
        <EditorAddPanel @close="emit('close-add-panel')" />
      </div>
    </template>

    <!-- ================================================================== -->
    <!-- NORMAL-MODUS: Tabs + Kontext                                        -->
    <!-- ================================================================== -->
    <template v-else>
      <!-- Segmented Control: Uebersicht / Design -->
      <div
        class="mx-3 mt-3 mb-0 flex rounded-lg bg-ui-bg p-0.5"
        role="tablist"
        aria-label="Panel-Bereiche"
      >
        <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'overview'"
          :class="[
            'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ui-accent/50',
            activeTab === 'overview'
              ? 'bg-white text-ui-text shadow-sm'
              : 'text-ui-muted hover:text-ui-text',
          ]"
          @click="activeTab = 'overview'"
        >
          Uebersicht
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'design'"
          :class="[
            'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ui-accent/50',
            activeTab === 'design'
              ? 'bg-white text-ui-text shadow-sm'
              : 'text-ui-muted hover:text-ui-text',
          ]"
          @click="activeTab = 'design'"
        >
          Design
        </button>
      </div>

      <!-- ------------------------------------------------------------------ -->
      <!-- KONTEXT-MODUS: Block selektiert -> Block-Einstellungen              -->
      <!-- ------------------------------------------------------------------ -->
      <template v-if="editorStore.selectedBlockId">
        <div class="flex items-center gap-2 border-b border-ui-border px-3 py-3 mt-3">
          <button
            type="button"
            class="flex h-7 w-7 items-center justify-center rounded text-ui-muted hover:bg-ui-bg hover:text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
            aria-label="Zurueck zur Uebersicht"
            title="Zurueck"
            @click="editorStore.deselectBlock()"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <span class="flex-1 text-sm font-semibold text-ui-text">
            {{ blockContextTitle }}
          </span>

          <button
            type="button"
            class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-ui-muted hover:text-ui-text focus:outline-none focus:ring-1 focus:ring-ui-accent/50"
            title="Info"
            aria-label="Info zum Block"
          >
            <svg
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.75"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 16v-4m0-4h.01"
              />
            </svg>
          </button>
        </div>

        <div
          class="flex-1 overflow-y-auto"
          role="tabpanel"
          aria-label="Block-Einstellungen"
        >
          <div
            v-if="showFormatToolbar"
            class="border-b border-ui-border px-3 pt-3"
          >
            <EditorFormatToolbar :is-readonly="props.isReadonly" />
          </div>

          <div class="p-3">
            <EditorBlockFields
              :selected-block="editorStore.selectedBlock"
              :is-readonly="props.isReadonly"
              @update-block="handleUpdateBlock"
            />
          </div>

          <div
            v-if="showLinkTarget"
            class="border-t border-ui-border px-3 pb-3 pt-3"
          >
            <EditorBlockLinkTarget :is-readonly="props.isReadonly" />
          </div>
        </div>
      </template>

      <!-- ------------------------------------------------------------------ -->
      <!-- UEBERSICHT-TAB (kein Block selektiert)                              -->
      <!-- ------------------------------------------------------------------ -->
      <template v-else-if="activeTab === 'overview'">
        <div
          class="flex-1 overflow-y-auto"
          role="tabpanel"
          aria-label="Funnel-Uebersicht"
        >
          <!-- SEITEN -->
          <section aria-label="Seiten">
            <div class="flex items-center justify-between px-4 pt-4 pb-2">
              <h2 class="text-xs font-semibold text-ui-text">
                Seiten
              </h2>
              <button
                type="button"
                class="flex h-5 w-5 items-center justify-center rounded-full text-ui-muted hover:text-ui-text focus:outline-none focus:ring-1 focus:ring-ui-accent/50"
                title="Seiten erklaert"
                aria-label="Info zu Seiten"
              >
                <svg
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="1.75"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 16v-4m0-4h.01"
                  />
                </svg>
              </button>
            </div>

            <!--
              Sortierbare Seiten-Liste.
              tag="ol" erhaelt die semantische Listenstruktur.
              handle=".step-drag-handle": Nur der Griff startet den Drag.
              disabled: kein DnD im Vorschau- oder Readonly-Modus.
            -->
            <VueDraggable
              v-model="localPageSteps"
              tag="ol"
              class="px-2"
              aria-label="Seiten-Liste"
              handle=".step-drag-handle"
              :animation="150"
              :force-fallback="true"
              :fallback-on-body="true"
              :disabled="!dndEnabled"
              ghost-class="panel-drag-ghost"
              @end="onPageStepDragEnd"
            >
              <li
                v-for="(step, idx) in localPageSteps"
                :key="step.id"
                :class="[
                  'group mb-0.5 flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-2 transition-colors',
                  editorStore.selectedStepId === step.id
                    ? 'bg-ui-bg text-ui-text'
                    : 'text-ui-text hover:bg-ui-bg/60',
                ]"
                tabindex="0"
                role="button"
                :aria-label="`Seite ${idx + 1}: ${step.internalTitle}`"
                :aria-current="editorStore.selectedStepId === step.id ? 'true' : undefined"
                @click="editorStore.selectStep(step.id)"
                @keyup.enter="editorStore.selectStep(step.id)"
              >
                <!--
                  Drag-Griff: nur sichtbar bei Hover, nur im Editor-Modus.
                  tabindex=-1: Tastatur-Nutzer verwenden stattdessen die
                  Hoch/Runter-Buttons weiter unten (WCAG-konformer Fallback).
                -->
                <button
                  v-if="dndEnabled"
                  type="button"
                  class="step-drag-handle flex h-4 w-4 flex-shrink-0 cursor-grab items-center justify-center text-ui-muted opacity-0 transition-opacity group-hover:opacity-60 active:cursor-grabbing focus-visible:opacity-60 focus-visible:outline-none"
                  aria-label="Seite verschieben"
                  tabindex="-1"
                  @click.stop
                >
                  <GripVertical
                    class="h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                </button>

                <!-- Nummer -->
                <span
                  :class="[
                    'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium',
                    editorStore.selectedStepId === step.id
                      ? 'bg-ui-accent text-white'
                      : 'bg-ui-border text-ui-muted',
                  ]"
                  aria-hidden="true"
                >
                  {{ idx + 1 }}
                </span>

                <!-- Titel -->
                <span class="min-w-0 flex-1 truncate text-sm">
                  {{ step.internalTitle }}
                </span>

                <!-- Hover-Aktionen (Tastatur-Fallback fuer DnD) -->
                <div
                  v-if="!props.isReadonly"
                  class="flex flex-shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                  :class="{ 'opacity-100': editorStore.selectedStepId === step.id }"
                  @click.stop
                >
                  <button
                    type="button"
                    :disabled="idx === 0"
                    class="flex h-5 w-5 items-center justify-center rounded text-ui-muted hover:bg-ui-border disabled:opacity-30 focus:outline-none focus:ring-1 focus:ring-ui-accent/50"
                    aria-label="Seite nach oben"
                    title="Nach oben"
                    @click="editorStore.moveStep(step.id, 'up')"
                  >
                    <svg
                      class="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2.5"
                      aria-hidden="true"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    :disabled="idx === localPageSteps.length - 1"
                    class="flex h-5 w-5 items-center justify-center rounded text-ui-muted hover:bg-ui-border disabled:opacity-30 focus:outline-none focus:ring-1 focus:ring-ui-accent/50"
                    aria-label="Seite nach unten"
                    title="Nach unten"
                    @click="editorStore.moveStep(step.id, 'down')"
                  >
                    <svg
                      class="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2.5"
                      aria-hidden="true"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  <!-- Seite duplizieren -->
                  <button
                    type="button"
                    class="flex h-5 w-5 items-center justify-center rounded text-ui-muted hover:bg-ui-border focus:outline-none focus:ring-1 focus:ring-ui-accent/50"
                    aria-label="Seite duplizieren"
                    title="Duplizieren"
                    @click="editorStore.duplicateStep(step.id)"
                  >
                    <svg
                      class="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2.5"
                      aria-hidden="true"
                    >
                      <rect
                        x="8"
                        y="8"
                        width="10"
                        height="10"
                        rx="1.5"
                        stroke-linejoin="round"
                      />
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M4 14V5a1 1 0 011-1h9"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    :disabled="editorStore.steps.length <= 1"
                    class="flex h-5 w-5 items-center justify-center rounded text-red-400 hover:bg-red-50 disabled:opacity-30 focus:outline-none focus:ring-1 focus:ring-red-400/50"
                    aria-label="Seite loeschen"
                    title="Loeschen"
                    @click="confirmRemoveStep(step)"
                  >
                    <svg
                      class="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2.5"
                      aria-hidden="true"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </li>
            </VueDraggable>

            <!-- Seite hinzufuegen -->
            <button
              v-if="!props.isReadonly"
              type="button"
              class="mt-1 flex w-full items-center gap-2 px-4 py-2 text-sm text-ui-muted transition-colors hover:text-ui-accent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ui-accent/50"
              @click="addPageStep"
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
              Seite hinzufuegen
            </button>
          </section>

          <div class="mx-4 my-2 h-px bg-ui-border" />

          <!-- ERGEBNISSE -->
          <section aria-label="Ergebnisse">
            <div class="flex items-center justify-between px-4 pb-2">
              <h2 class="text-xs font-semibold text-ui-text">
                Ergebnisse
              </h2>
              <button
                type="button"
                class="flex h-5 w-5 items-center justify-center rounded-full text-ui-muted hover:text-ui-text focus:outline-none focus:ring-1 focus:ring-ui-accent/50"
                title="Ergebnisse erklaert"
                aria-label="Info zu Ergebnissen"
              >
                <svg
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="1.75"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 16v-4m0-4h.01"
                  />
                </svg>
              </button>
            </div>

            <VueDraggable
              v-model="localResultSteps"
              tag="ol"
              class="px-2"
              aria-label="Ergebnis-Liste"
              handle=".step-drag-handle"
              :animation="150"
              :force-fallback="true"
              :fallback-on-body="true"
              :disabled="!dndEnabled"
              ghost-class="panel-drag-ghost"
              @end="onResultStepDragEnd"
            >
              <li
                v-for="(step, idx) in localResultSteps"
                :key="step.id"
                :class="[
                  'group mb-0.5 flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-2 transition-colors',
                  editorStore.selectedStepId === step.id
                    ? 'bg-ui-bg text-ui-text'
                    : 'text-ui-text hover:bg-ui-bg/60',
                ]"
                tabindex="0"
                role="button"
                :aria-label="`Ergebnis ${resultLabel(idx)}: ${step.internalTitle}`"
                :aria-current="editorStore.selectedStepId === step.id ? 'true' : undefined"
                @click="editorStore.selectStep(step.id)"
                @keyup.enter="editorStore.selectStep(step.id)"
              >
                <!-- Drag-Griff -->
                <button
                  v-if="dndEnabled"
                  type="button"
                  class="step-drag-handle flex h-4 w-4 flex-shrink-0 cursor-grab items-center justify-center text-ui-muted opacity-0 transition-opacity group-hover:opacity-60 active:cursor-grabbing focus-visible:opacity-60 focus-visible:outline-none"
                  aria-label="Ergebnis verschieben"
                  tabindex="-1"
                  @click.stop
                >
                  <GripVertical
                    class="h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                </button>

                <!-- Buchstabe A/B/C -->
                <span
                  :class="[
                    'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium',
                    editorStore.selectedStepId === step.id
                      ? 'bg-ui-accent text-white'
                      : 'bg-ui-border text-ui-muted',
                  ]"
                  aria-hidden="true"
                >
                  {{ resultLabel(idx) }}
                </span>

                <span class="min-w-0 flex-1 truncate text-sm">
                  {{ step.internalTitle }}
                </span>

                <!-- Hover-Aktionen -->
                <div
                  v-if="!props.isReadonly"
                  class="flex flex-shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                  :class="{ 'opacity-100': editorStore.selectedStepId === step.id }"
                  @click.stop
                >
                  <!-- Ergebnis duplizieren -->
                  <button
                    type="button"
                    class="flex h-5 w-5 items-center justify-center rounded text-ui-muted hover:bg-ui-border focus:outline-none focus:ring-1 focus:ring-ui-accent/50"
                    aria-label="Ergebnis duplizieren"
                    title="Duplizieren"
                    @click="editorStore.duplicateStep(step.id)"
                  >
                    <svg
                      class="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2.5"
                      aria-hidden="true"
                    >
                      <rect
                        x="8"
                        y="8"
                        width="10"
                        height="10"
                        rx="1.5"
                        stroke-linejoin="round"
                      />
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M4 14V5a1 1 0 011-1h9"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    :disabled="editorStore.steps.length <= 1"
                    class="flex h-5 w-5 items-center justify-center rounded text-red-400 hover:bg-red-50 disabled:opacity-30 focus:outline-none focus:ring-1 focus:ring-red-400/50"
                    aria-label="Ergebnis loeschen"
                    title="Loeschen"
                    @click="confirmRemoveStep(step)"
                  >
                    <svg
                      class="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2.5"
                      aria-hidden="true"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </li>

              <li
                v-if="localResultSteps.length === 0"
                class="px-4 py-2 text-xs text-ui-muted"
              >
                Noch keine Ergebnisse.
              </li>
            </VueDraggable>

            <!-- Ergebnis hinzufuegen -->
            <button
              v-if="!props.isReadonly"
              type="button"
              class="mt-1 flex w-full items-center gap-2 px-4 py-2 text-sm text-ui-muted transition-colors hover:text-ui-accent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ui-accent/50"
              @click="addResultStep"
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
              Ergebnis hinzufuegen
            </button>
          </section>

          <div class="mx-4 my-2 h-px bg-ui-border" />

          <!-- NACHRICHTEN (Platzhalter, kommt in M4) -->
          <section aria-label="Nachrichten">
            <div class="flex items-center justify-between px-4 pb-2">
              <h2 class="text-xs font-semibold text-ui-text">
                Nachrichten
              </h2>
              <button
                type="button"
                class="flex h-5 w-5 items-center justify-center rounded-full text-ui-muted hover:text-ui-text focus:outline-none focus:ring-1 focus:ring-ui-accent/50"
                title="Nachrichten erklaert"
                aria-label="Info zu Nachrichten"
              >
                <svg
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="1.75"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 16v-4m0-4h.01"
                  />
                </svg>
              </button>
            </div>

            <p class="px-4 pb-2 text-xs text-ui-muted">
              Noch keine Nachrichten angelegt.
            </p>

            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Nachrichten kommen in einem spaeteren Schritt"
              class="mt-1 flex w-full cursor-not-allowed items-center gap-2 px-4 py-2 text-sm text-ui-muted opacity-40 focus:outline-none"
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
              Neue Nachricht
            </button>
          </section>
        </div>
      </template>

      <!-- ------------------------------------------------------------------ -->
      <!-- DESIGN-TAB: Theme-Galerie                                           -->
      <!-- ------------------------------------------------------------------ -->
      <template v-else-if="activeTab === 'design'">
        <EditorThemeGallery
          :is-readonly="props.isReadonly"
          class="flex flex-1 flex-col"
        />
      </template>
    </template>
  </aside>
</template>

<style>
/*
  Platzhalter-Ghost beim Drag in den Step-Listen des LeftPanels.
*/
.panel-drag-ghost {
  opacity: 0.4;
  background-color: rgba(53, 121, 250, 0.06);
  border-radius: 0.5rem;
}
</style>
