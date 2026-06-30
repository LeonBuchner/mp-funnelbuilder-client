<!--
  EditorLeftPanel: Linkes Panel im Perspective-Stil.
  - Tabs "Übersicht / Design" als Segmented Control
  - Kontext-Modus: wenn Block selektiert, Block-Einstellungen statt Übersicht
    - Text-Blöcke: FormatToolbar oben + (legacy) HTML-Feld
    - Button/SingleChoice: Block-Felder + Verknüpfungs-Sektion
    - Alle Typen: EditorBlockFields
  - Add-Modus: wenn showAddPanel=true, zeigt das Sektion-hinzufügen-Panel
  - Design-Tab: Theme-Galerie (ThemeGallery)
-->
<script setup lang="ts">
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

/** Seiten (alle Steps die kein Ergebnis sind) */
const pageSteps = computed<Step[]>(() =>
  editorStore.steps.filter(s => s.type !== 'result'),
)

/** Ergebnis-Steps */
const resultSteps = computed<Step[]>(() =>
  editorStore.steps.filter(s => s.type === 'result'),
)

/** Buchstabenindex für Ergebnis-Steps (A, B, C ...) */
function resultLabel(idx: number): string {
  return String.fromCharCode(65 + idx)
}

function confirmRemoveStep(step: Step): void {
  if (editorStore.steps.length <= 1) return
  if (window.confirm(`Seite "${step.internalTitle}" wirklich löschen?`)) {
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

/** Zeige Format-Toolbar (nur für Text-Blöcke) */
const showFormatToolbar = computed<boolean>(
  () => editorStore.selectedBlock?.type === 'text',
)

/** Zeige Verknüpfungs-Sektion (nur für Button und Single-Choice) */
const showLinkTarget = computed<boolean>(
  () =>
    editorStore.selectedBlock?.type === 'button' ||
    editorStore.selectedBlock?.type === 'single_choice',
)
</script>

<template>
  <aside
    class="flex w-[260px] flex-shrink-0 flex-col border-r border-ui-border bg-white"
    aria-label="Funnel-Struktur"
  >
    <!-- ================================================================== -->
    <!-- ADD-PANEL-MODUS: Sektion hinzufügen                                -->
    <!-- ================================================================== -->
    <template v-if="props.showAddPanel">
      <!-- Header mit Zurück-Button -->
      <div class="flex items-center gap-2 border-b border-ui-border px-3 py-3">
        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded text-ui-muted hover:bg-ui-bg hover:text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
          aria-label="Zurück zur Übersicht"
          title="Zurück"
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
        <span class="flex-1 text-sm font-semibold text-ui-text">Sektion hinzufügen</span>
      </div>

      <!-- AddPanel-Inhalt (scrollbar) -->
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
      <!-- Segmented Control: Übersicht / Design -->
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
          Übersicht
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
        <!-- Header mit Zurück-Button -->
        <div class="flex items-center gap-2 border-b border-ui-border px-3 py-3 mt-3">
          <button
            type="button"
            class="flex h-7 w-7 items-center justify-center rounded text-ui-muted hover:bg-ui-bg hover:text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
            aria-label="Zurück zur Übersicht"
            title="Zurück"
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

          <!-- Info-Icon -->
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

        <!-- Block-Felder (scrollbar) -->
        <div
          class="flex-1 overflow-y-auto"
          role="tabpanel"
          aria-label="Block-Einstellungen"
        >
          <!-- Format-Toolbar: nur für Text-Blöcke -->
          <div
            v-if="showFormatToolbar"
            class="border-b border-ui-border px-3 pt-3"
          >
            <EditorFormatToolbar :is-readonly="props.isReadonly" />
          </div>

          <!-- Block-Typ-spezifische Felder -->
          <div class="p-3">
            <EditorBlockFields
              :selected-block="editorStore.selectedBlock"
              :is-readonly="props.isReadonly"
              @update-block="handleUpdateBlock"
            />
          </div>

          <!-- Verknüpfungs-Sektion: für Button und Single-Choice -->
          <div
            v-if="showLinkTarget"
            class="border-t border-ui-border px-3 pb-3 pt-3"
          >
            <EditorBlockLinkTarget :is-readonly="props.isReadonly" />
          </div>
        </div>
      </template>

      <!-- ------------------------------------------------------------------ -->
      <!-- ÜBERSICHT-TAB (kein Block selektiert)                              -->
      <!-- ------------------------------------------------------------------ -->
      <template v-else-if="activeTab === 'overview'">
        <div
          class="flex-1 overflow-y-auto"
          role="tabpanel"
          aria-label="Funnel-Übersicht"
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
                title="Seiten erklärt"
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

            <ol
              class="px-2"
              aria-label="Seiten-Liste"
            >
              <li
                v-for="(step, idx) in pageSteps"
                :key="step.id"
                :class="[
                  'group mb-0.5 flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 transition-colors',
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

                <!-- Hover-Aktionen -->
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
                    :disabled="idx === pageSteps.length - 1"
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
                  <button
                    type="button"
                    :disabled="editorStore.steps.length <= 1"
                    class="flex h-5 w-5 items-center justify-center rounded text-red-400 hover:bg-red-50 disabled:opacity-30 focus:outline-none focus:ring-1 focus:ring-red-400/50"
                    aria-label="Seite löschen"
                    title="Löschen"
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
            </ol>

            <!-- Seite hinzufügen -->
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
              Seite hinzufügen
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
                title="Ergebnisse erklärt"
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

            <ol
              class="px-2"
              aria-label="Ergebnis-Liste"
            >
              <li
                v-for="(step, idx) in resultSteps"
                :key="step.id"
                :class="[
                  'group mb-0.5 flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 transition-colors',
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
                  <button
                    type="button"
                    :disabled="editorStore.steps.length <= 1"
                    class="flex h-5 w-5 items-center justify-center rounded text-red-400 hover:bg-red-50 disabled:opacity-30 focus:outline-none focus:ring-1 focus:ring-red-400/50"
                    aria-label="Ergebnis löschen"
                    title="Löschen"
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
                v-if="resultSteps.length === 0"
                class="px-4 py-2 text-xs text-ui-muted"
              >
                Noch keine Ergebnisse.
              </li>
            </ol>

            <!-- Ergebnis hinzufügen -->
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
              Ergebnis hinzufügen
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
                title="Nachrichten erklärt"
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
              title="Nachrichten kommen in einem späteren Schritt"
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
    <!-- Ende NORMAL-MODUS (v-else) -->
  </aside>
</template>
