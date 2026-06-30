/**
 * Editor-Store (Pinia Setup-Store).
 * Haelt den gesamten Zustand des Funnel-Editors:
 * - Funnel-Metadaten und Draft-Content
 * - Selektion (Step, Block)
 * - Speicher- und Veröffentlichungsstatus
 * - Auto-Save via watchDebounced (1500 ms nach letzter Mutation)
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

  function addStep(type: StepType = 'content'): void {
    if (!content.value) return
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
    const step = arr.splice(idx, 1)[0]!
    arr.splice(targetIdx, 0, step)
    isDirty.value = true
  }

  function addBlock(stepId: string, type: BlockType): void {
    if (!content.value) return
    const step = content.value.steps.find(s => s.id === stepId)
    if (!step) return
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
    const block = step.blocks.splice(idx, 1)[0]!
    step.blocks.splice(targetIdx, 0, block)
    isDirty.value = true
  }

  /**
   * Dupliziert einen Block direkt nach dem Original.
   * SingleChoiceBlock-Optionen erhalten neue UUIDs damit sie unabhängig sind.
   */
  function duplicateBlock(stepId: string, blockId: string): void {
    if (!content.value) return
    const step = content.value.steps.find(s => s.id === stepId)
    if (!step) return
    const idx = step.blocks.findIndex(b => b.id === blockId)
    if (idx < 0) return
    const original = step.blocks[idx]!
    const duplicate: Block =
      original.type === 'single_choice'
        ? {
            ...original,
            id: crypto.randomUUID(),
            options: original.options.map(o => ({ ...o, id: crypto.randomUUID() })),
          }
        : { ...original, id: crypto.randomUUID() }
    step.blocks.splice(idx + 1, 0, duplicate)
    selectedBlockId.value = duplicate.id
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
    // Spread ist sicher, da der Aufrufer den konkreten Typ kennt
    step.blocks[idx] = { ...step.blocks[idx]!, ...patch } as Block
    isDirty.value = true
  }

  function updateStep(stepId: string, patch: Partial<Omit<Step, 'id' | 'blocks' | 'logicRules'>>): void {
    if (!content.value) return
    const idx = content.value.steps.findIndex(s => s.id === stepId)
    if (idx < 0) return
    content.value.steps[idx] = { ...content.value.steps[idx]!, ...patch }
    isDirty.value = true
  }

  function updateSettings(patch: Partial<FunnelSettings>): void {
    if (!content.value) return
    content.value.settings = { ...content.value.settings, ...patch }
    isDirty.value = true
  }

  function updateMeta(patch: Partial<FunnelMeta>): void {
    if (!content.value) return
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
    // Getters
    steps,
    selectedStep,
    selectedBlock,
    // Actions
    load,
    selectStep,
    selectBlock,
    deselectBlock,
    addStep,
    removeStep,
    moveStep,
    addBlock,
    addBlocks,
    removeBlock,
    moveBlock,
    duplicateBlock,
    updateBlock,
    updateStep,
    updateSettings,
    updateMeta,
    saveDraft,
    publish,
  }
})
