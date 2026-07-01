/**
 * Editor-Store (Pinia Setup-Store).
 * Haelt den gesamten Zustand des Funnel-Editors:
 * - Funnel-Metadaten und Draft-Content
 * - Selektion (Step, Block)
 * - Speicher- und Veröffentlichungsstatus
 * - Auto-Save via watchDebounced (1500 ms nach letzter Mutation)
 * - Undo/Redo via Snapshot-before-Modell (max. 50 Eintraege)
 *
 * Keine Geschäftslogik in Komponenten: alle Mutationen hier.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { useFunnels } from '~/composables/useFunnels'
import {
  createEmptyStep,
  createBlock,
  type Funnel,
  type FunnelContent,
  type FunnelMeta,
  type FunnelSettings,
  type Step,
  type Block,
  type BlockType,
  type StepType,
} from '~/types/funnel'

// ---------------------------------------------------------------------------
// Modul-Hilfsfunktion: Block tief klonen mit neuen UUIDs
// ---------------------------------------------------------------------------

/**
 * Klont einen Block tief mit neuer uuid fuer den Block selbst sowie neuen
 * uuids fuer alle Optionen bei Typen mit options-Array
 * (single_choice, multi_choice, input_dropdown).
 * Nutzt JSON-Roundtrip, um reaktive Vue-Proxies sicher zu traversieren.
 */
export function cloneBlockWithNewIds(block: Block): Block {
  const raw = JSON.parse(JSON.stringify(block)) as Block
  if (raw.type === 'single_choice') {
    return {
      ...raw,
      id: crypto.randomUUID(),
      options: raw.options.map(o => ({ ...o, id: crypto.randomUUID() })),
    }
  }
  if (raw.type === 'multi_choice') {
    return {
      ...raw,
      id: crypto.randomUUID(),
      options: raw.options.map(o => ({ ...o, id: crypto.randomUUID() })),
    }
  }
  if (raw.type === 'input_dropdown') {
    return {
      ...raw,
      id: crypto.randomUUID(),
      options: raw.options.map(o => ({ ...o, id: crypto.randomUUID() })),
    }
  }
  return { ...raw, id: crypto.randomUUID() }
}

export type ValidationErrors = Record<string, string[]>

/** Fehlerstruktur eines $fetch-422-Fehlers */
interface ApiValidationError {
  status?: number
  statusCode?: number
  data?: {
    message?: string
    errors?: ValidationErrors
  }
}

/** Maximale Anzahl an Undo-Eintraegen */
const MAX_HISTORY = 50

export const useEditorStore = defineStore('editor', () => {
  const funnelsApi = useFunnels()

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const funnel = ref<Funnel | null>(null)
  const content = ref<FunnelContent | null>(null)
  const selectedStepId = ref<string | null>(null)
  const selectedBlockId = ref<string | null>(null)
  const isDirty = ref(false)
  const isSaving = ref(false)
  const lastSavedAt = ref<Date | null>(null)
  const publishState = ref<'idle' | 'publishing' | 'published' | 'error'>('idle')
  const validationErrors = ref<ValidationErrors>({})

  /**
   * Vorschau-Modus: wenn true, rendert der Canvas die Bloecke interaktiv (mode='live')
   * ohne Editor-Overlays. Wird per togglePreview() umgeschaltet.
   */
  const previewMode = ref<boolean>(false)

  // ---------------------------------------------------------------------------
  // Undo/Redo-Stacks (Snapshot-before-Modell)
  // ---------------------------------------------------------------------------
  /**
   * Undo-Stack: jeder Eintrag ist ein tiefer Klon des Content-Zustands
   * BEVOR die jeweilige Mutation ausgefuehrt wurde. Maximal MAX_HISTORY Eintraege.
   */
  const history = ref<FunnelContent[]>([])

  /**
   * Redo-Stack: haelt die Zustaende, die durch Undo verworfen wurden.
   * Wird bei jeder neuen Mutation geleert (Redo-Zweig verwerfen).
   */
  const redoStack = ref<FunnelContent[]>([])

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------
  const steps = computed<Step[]>(() => content.value?.steps ?? [])

  const selectedStep = computed<Step | null>(
    () => steps.value.find(s => s.id === selectedStepId.value) ?? null,
  )

  const selectedBlock = computed<Block | null>(() => {
    if (!selectedStep.value || !selectedBlockId.value) return null
    return selectedStep.value.blocks.find(b => b.id === selectedBlockId.value) ?? null
  })

  const canUndo = computed<boolean>(() => history.value.length > 0)
  const canRedo = computed<boolean>(() => redoStack.value.length > 0)

  // ---------------------------------------------------------------------------
  // Auto-Save: feuert 1500 ms nach dem Setzen von isDirty = true
  // ---------------------------------------------------------------------------
  watchDebounced(
    isDirty,
    async (dirty) => {
      if (dirty && !isSaving.value) {
        await saveDraft()
      }
    },
    { debounce: 1500, immediate: false },
  )

  // ---------------------------------------------------------------------------
  // Undo/Redo-Hilfsfunktionen (intern, nicht exportiert)
  // ---------------------------------------------------------------------------

  /**
   * Tiefer Klon via JSON-Roundtrip.
   * structuredClone kann Vue-reaktive Proxy-Objekte nicht klonen (DataCloneError),
   * daher ist JSON.parse(JSON.stringify()) hier die zuverlaessigere Wahl:
   * JSON.stringify traversiert den Proxy und serialisiert die Rohwerte,
   * JSON.parse erzeugt ein frisches, nicht-reaktives Objekt.
   */
  function deepClone(value: FunnelContent): FunnelContent {
    return JSON.parse(JSON.stringify(value)) as FunnelContent
  }

  /**
   * Vor jeder content-veraendernden Mutation aufrufen.
   * Speichert einen tiefen Klon des aktuellen Content in den Undo-Stack
   * und leert den Redo-Stack (neuer Zweig nach Undo verwirft Zukunft).
   */
  function snapshot(): void {
    if (!content.value) return
    redoStack.value = []
    history.value.push(deepClone(content.value))
    if (history.value.length > MAX_HISTORY) {
      history.value.shift()
    }
  }

  /**
   * Nach undo/redo: stellt sicher, dass selectedStepId und selectedBlockId
   * im wiederhergestellten Content noch existieren. Setzt sie andernfalls auf null.
   */
  function validateSelection(): void {
    if (!content.value) {
      selectedStepId.value = null
      selectedBlockId.value = null
      return
    }
    const stepExists = content.value.steps.some(s => s.id === selectedStepId.value)
    if (!stepExists) {
      selectedStepId.value = content.value.steps[0]?.id ?? null
      selectedBlockId.value = null
      return
    }
    const step = content.value.steps.find(s => s.id === selectedStepId.value)
    const blockExists = step?.blocks.some(b => b.id === selectedBlockId.value) ?? false
    if (!blockExists) {
      selectedBlockId.value = null
    }
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /** Lädt einen Funnel und seinen Entwurf-Content */
  async function load(funnelUuid: string): Promise<void> {
    const response = await funnelsApi.get(funnelUuid)
    funnel.value = response.data
    content.value = response.data.draft_version?.content ?? null
    selectedStepId.value = content.value?.steps[0]?.id ?? null
    selectedBlockId.value = null
    isDirty.value = false
    validationErrors.value = {}
    // History beim Laden leeren – kein Undo ueber den Initialzustand hinaus
    history.value = []
    redoStack.value = []
  }

  /** Macht die letzte Mutation rueckgaengig. */
  function undo(): void {
    if (!canUndo.value || !content.value) return
    redoStack.value.push(deepClone(content.value))
    content.value = history.value.pop()!
    isDirty.value = true
    validateSelection()
  }

  /** Stellt die zuletzt rueckgaengig gemachte Mutation wieder her. */
  function redo(): void {
    if (!canRedo.value) return
    if (content.value) {
      history.value.push(deepClone(content.value))
    }
    content.value = redoStack.value.pop()!
    isDirty.value = true
    validateSelection()
  }

  function selectStep(id: string): void {
    selectedStepId.value = id
    selectedBlockId.value = null
  }

  function selectBlock(id: string): void {
    selectedBlockId.value = id
  }

  function deselectBlock(): void {
    selectedBlockId.value = null
  }

  /**
   * Schaltet den In-Editor-Vorschau-Modus um.
   * Beim Aktivieren wird die Block-Selektion aufgehoben,
   * damit keine Editor-Overlays in der Vorschau erscheinen.
   */
  function togglePreview(): void {
    previewMode.value = !previewMode.value
    if (previewMode.value) {
      selectedBlockId.value = null
    }
  }

  function addStep(type: StepType = 'content'): void {
    if (!content.value) return
    snapshot()
    const step = createEmptyStep()
    step.type = type
    if (type === 'result') {
      step.internalTitle = 'Ergebnis'
    }
    content.value.steps.push(step)
    selectedStepId.value = step.id
    selectedBlockId.value = null
    isDirty.value = true
  }

  function removeStep(id: string): void {
    if (!content.value) return
    const idx = content.value.steps.findIndex(s => s.id === id)
    if (idx < 0) return
    snapshot()
    content.value.steps.splice(idx, 1)

    if (selectedStepId.value === id) {
      // Nachbarn selektieren oder auf null setzen
      const next = content.value.steps[idx] ?? content.value.steps[idx - 1]
      selectedStepId.value = next?.id ?? null
      selectedBlockId.value = null
    }
    isDirty.value = true
  }

  function moveStep(id: string, dir: 'up' | 'down'): void {
    if (!content.value) return
    const arr = content.value.steps
    const idx = arr.findIndex(s => s.id === id)
    if (idx < 0) return
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= arr.length) return
    snapshot()
    const step = arr.splice(idx, 1)[0]!
    arr.splice(targetIdx, 0, step)
    isDirty.value = true
  }

  function addBlock(stepId: string, type: BlockType): void {
    if (!content.value) return
    const step = content.value.steps.find(s => s.id === stepId)
    if (!step) return
    snapshot()
    const block = createBlock(type)
    step.blocks.push(block)
    selectedBlockId.value = block.id
    isDirty.value = true
  }

  /**
   * Hängt mehrere vorgefertigte Blöcke (z. B. aus einer Sektions-Vorlage)
   * ans Ende des gewünschten Steps an. Jeder Block trägt bereits eine UUID.
   * Der erste Block der Gruppe wird anschließend selektiert.
   */
  function addBlocks(stepId: string, blocks: Block[]): void {
    if (!content.value || blocks.length === 0) return
    const step = content.value.steps.find(s => s.id === stepId)
    if (!step) return
    snapshot()
    for (const block of blocks) {
      step.blocks.push(block)
    }
    selectedBlockId.value = blocks[0]!.id
    isDirty.value = true
  }

  function removeBlock(stepId: string, blockId: string): void {
    if (!content.value) return
    const step = content.value.steps.find(s => s.id === stepId)
    if (!step) return
    const idx = step.blocks.findIndex(b => b.id === blockId)
    if (idx < 0) return
    snapshot()
    step.blocks.splice(idx, 1)
    if (selectedBlockId.value === blockId) {
      selectedBlockId.value = null
    }
    isDirty.value = true
  }

  function moveBlock(stepId: string, blockId: string, dir: 'up' | 'down'): void {
    if (!content.value) return
    const step = content.value.steps.find(s => s.id === stepId)
    if (!step) return
    const idx = step.blocks.findIndex(b => b.id === blockId)
    if (idx < 0) return
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= step.blocks.length) return
    snapshot()
    const block = step.blocks.splice(idx, 1)[0]!
    step.blocks.splice(targetIdx, 0, block)
    isDirty.value = true
  }

  /**
   * Sortiert Bloecke per Drag-and-Drop um.
   * Verschiebt den Block von fromIndex auf toIndex innerhalb des Steps.
   * Tastatur-Fallback: moveBlock() bleibt weiterhin verfuegbar.
   */
  function reorderBlocks(stepId: string, fromIndex: number, toIndex: number): void {
    if (!content.value) return
    const step = content.value.steps.find(s => s.id === stepId)
    if (!step) return
    if (fromIndex === toIndex) return
    if (fromIndex < 0 || fromIndex >= step.blocks.length) return
    if (toIndex < 0 || toIndex >= step.blocks.length) return
    snapshot()
    const block = step.blocks.splice(fromIndex, 1)[0]!
    step.blocks.splice(toIndex, 0, block)
    isDirty.value = true
  }

  /**
   * Sortiert Steps per Drag-and-Drop um.
   * Arbeitet auf dem globalen content.steps-Array (nicht gefiltert).
   * Tastatur-Fallback: moveStep() bleibt weiterhin verfuegbar.
   */
  function reorderSteps(fromIndex: number, toIndex: number): void {
    if (!content.value) return
    const arr = content.value.steps
    if (fromIndex === toIndex) return
    if (fromIndex < 0 || fromIndex >= arr.length) return
    if (toIndex < 0 || toIndex >= arr.length) return
    snapshot()
    const step = arr.splice(fromIndex, 1)[0]!
    arr.splice(toIndex, 0, step)
    isDirty.value = true
  }

  /**
   * Dupliziert einen Block direkt nach dem Original.
   * Nutzt cloneBlockWithNewIds, sodass auch multi_choice- und
   * input_dropdown-Optionen neue UUIDs erhalten.
   */
  function duplicateBlock(stepId: string, blockId: string): void {
    if (!content.value) return
    const step = content.value.steps.find(s => s.id === stepId)
    if (!step) return
    const idx = step.blocks.findIndex(b => b.id === blockId)
    if (idx < 0) return
    snapshot()
    const duplicate = cloneBlockWithNewIds(step.blocks[idx]!)
    step.blocks.splice(idx + 1, 0, duplicate)
    selectedBlockId.value = duplicate.id
    isDirty.value = true
  }

  /**
   * Kopiert einen Block aus einem Step in einen anderen Step.
   * Erzeugt einen tiefen Klon mit neuer uuid (und neuen option-uuids) und
   * haengt ihn ans Ende des Ziel-Steps. Das Original bleibt unveraendert.
   */
  function copyBlockToStep(blockId: string, fromStepId: string, toStepId: string): void {
    if (!content.value) return
    const fromStep = content.value.steps.find(s => s.id === fromStepId)
    const toStep = content.value.steps.find(s => s.id === toStepId)
    if (!fromStep || !toStep) return
    const block = fromStep.blocks.find(b => b.id === blockId)
    if (!block) return
    snapshot()
    toStep.blocks.push(cloneBlockWithNewIds(block))
    isDirty.value = true
  }

  /**
   * Dupliziert einen kompletten Step mit neuer step-uuid und neuen uuids fuer
   * alle enthaltenen Bloecke (und deren options). Der Klon wird direkt nach
   * dem Original eingefuegt und anschliessend selektiert.
   * Funktioniert fuer alle StepTypes (content, result, usw.).
   */
  function duplicateStep(stepId: string): void {
    if (!content.value) return
    const idx = content.value.steps.findIndex(s => s.id === stepId)
    if (idx < 0) return
    snapshot()
    const rawStep = JSON.parse(JSON.stringify(content.value.steps[idx]!)) as Step
    const clonedStep: Step = {
      ...rawStep,
      id: crypto.randomUUID(),
      blocks: rawStep.blocks.map(cloneBlockWithNewIds),
    }
    content.value.steps.splice(idx + 1, 0, clonedStep)
    selectedStepId.value = clonedStep.id
    selectedBlockId.value = null
    isDirty.value = true
  }

  /**
   * Aktualisiert einzelne Felder eines Blocks.
   * Das `patch`-Objekt wird flach auf den bestehenden Block gemergt.
   * Typkorrektheit des Ergebnisses liegt beim Aufrufer (der kennt den Blocktyp).
   */
  function updateBlock(stepId: string, blockId: string, patch: Partial<Block>): void {
    if (!content.value) return
    const step = content.value.steps.find(s => s.id === stepId)
    if (!step) return
    const idx = step.blocks.findIndex(b => b.id === blockId)
    if (idx < 0) return
    snapshot()
    // Spread ist sicher, da der Aufrufer den konkreten Typ kennt
    step.blocks[idx] = { ...step.blocks[idx]!, ...patch } as Block
    isDirty.value = true
  }

  function updateStep(stepId: string, patch: Partial<Omit<Step, 'id' | 'blocks' | 'logicRules'>>): void {
    if (!content.value) return
    const idx = content.value.steps.findIndex(s => s.id === stepId)
    if (idx < 0) return
    snapshot()
    content.value.steps[idx] = { ...content.value.steps[idx]!, ...patch }
    isDirty.value = true
  }

  function updateSettings(patch: Partial<FunnelSettings>): void {
    if (!content.value) return
    snapshot()
    content.value.settings = { ...content.value.settings, ...patch }
    isDirty.value = true
  }

  function updateMeta(patch: Partial<FunnelMeta>): void {
    if (!content.value) return
    snapshot()
    content.value.meta = { ...content.value.meta, ...patch }
    isDirty.value = true
  }

  /** Speichert den aktuellen Content als Draft. Hält validationErrors bei 422. */
  async function saveDraft(): Promise<void> {
    if (!funnel.value || !content.value || isSaving.value) return
    isSaving.value = true
    try {
      await funnelsApi.saveDraft(funnel.value.id, content.value)
      isDirty.value = false
      lastSavedAt.value = new Date()
      validationErrors.value = {}
    } catch (error: unknown) {
      const err = error as ApiValidationError
      const status = err?.status ?? err?.statusCode
      if (status === 422 && err?.data?.errors) {
        validationErrors.value = err.data.errors
      }
    } finally {
      isSaving.value = false
    }
  }

  /** Veröffentlicht den Funnel (speichert vorher falls isDirty). */
  async function publish(label?: string): Promise<Funnel | null> {
    if (!funnel.value) return null
    publishState.value = 'publishing'
    try {
      if (isDirty.value) {
        await saveDraft()
      }
      const response = await funnelsApi.publish(funnel.value.id, label)
      funnel.value = response.data
      publishState.value = 'published'
      return response.data
    } catch {
      publishState.value = 'error'
      return null
    }
  }

  return {
    // State
    funnel,
    content,
    selectedStepId,
    selectedBlockId,
    isDirty,
    isSaving,
    lastSavedAt,
    publishState,
    validationErrors,
    previewMode,
    // Undo/Redo-State
    history,
    // Getters
    steps,
    selectedStep,
    selectedBlock,
    canUndo,
    canRedo,
    // Actions
    load,
    selectStep,
    selectBlock,
    deselectBlock,
    togglePreview,
    addStep,
    removeStep,
    moveStep,
    addBlock,
    addBlocks,
    removeBlock,
    moveBlock,
    reorderBlocks,
    reorderSteps,
    duplicateBlock,
    copyBlockToStep,
    duplicateStep,
    updateBlock,
    updateStep,
    updateSettings,
    updateMeta,
    saveDraft,
    publish,
    undo,
    redo,
  }
})
