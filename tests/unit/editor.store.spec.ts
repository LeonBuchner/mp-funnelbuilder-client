/**
 * Unit-Tests fuer den Editor-Store.
 *
 * Gemockt werden:
 * - ~/composables/useFunnels  -> verhindert echte HTTP-Aufrufe
 * - @vueuse/core -> watchDebounced wird durch no-op ersetzt (kein Timer-Overhead)
 *                   useLocalStorage gibt regulaere refs zurueck
 *
 * Der Store wird vor jedem Test neu instanziiert (frische Pinia).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import { createEmptyContent, createEmptyStep, createBlock } from '../../app/types/funnel'
import type { Funnel, FunnelContent } from '../../app/types/funnel'
import { useEditorStore } from '../../app/stores/editor'

// --- Mocks (gehoisted) ---

const mockGet = vi.hoisted(() => vi.fn())
const mockSaveDraft = vi.hoisted(() => vi.fn())
const mockPublish = vi.hoisted(() => vi.fn())

vi.mock('~/composables/useFunnels', () => ({
  useFunnels: vi.fn(() => ({
    list: vi.fn(),
    create: vi.fn(),
    get: mockGet,
    update: vi.fn(),
    remove: vi.fn(),
    saveDraft: mockSaveDraft,
    publish: mockPublish,
  })),
}))

// watchDebounced: kein automatisches Feuern in Tests (wir testen saveDraft direkt)
vi.mock('@vueuse/core', async () => {
  const actual = await vi.importActual<typeof import('@vueuse/core')>('@vueuse/core')
  return {
    ...actual,
    watchDebounced: vi.fn(),
    useLocalStorage: vi.fn(<T>(_key: string, initialValue: T) => ref<T>(initialValue)),
  }
})

// --- Testdaten ---

const mockFunnel: Funnel = {
  id: 'funnel-uuid-1',
  name: 'Test Funnel',
  slug: 'test-funnel',
  status: 'draft',
  branding: null,
  published_version: null,
  draft_version: {
    id: 'version-uuid-1',
    version_number: 1,
    schema_version: '1.0.0',
    label: null,
    published_at: null,
    content: createEmptyContent(),
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

/** Hilfsfunktion: Store mit vorgeladenem Content aufsetzen */
function setupStoreWithContent(content?: FunnelContent) {
  const store = useEditorStore()
  store.funnel = { ...mockFunnel }
  store.content = content ?? createEmptyContent()
  store.selectedStepId = store.content.steps[0]?.id ?? null
  store.selectedBlockId = null
  store.isDirty = false
  return store
}

// ---

describe('useEditorStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // Initialer Zustand
  // -------------------------------------------------------------------------

  it('startet mit leerem Zustand', () => {
    const store = useEditorStore()
    expect(store.funnel).toBeNull()
    expect(store.content).toBeNull()
    expect(store.isDirty).toBe(false)
    expect(store.isSaving).toBe(false)
    expect(store.steps).toHaveLength(0)
  })

  // -------------------------------------------------------------------------
  // load()
  // -------------------------------------------------------------------------

  it('load() laedt Funnel und selektiert ersten Schritt', async () => {
    mockGet.mockResolvedValueOnce({ data: mockFunnel })

    const store = useEditorStore()
    await store.load('funnel-uuid-1')

    expect(store.funnel?.name).toBe('Test Funnel')
    expect(store.content).not.toBeNull()
    expect(store.steps.length).toBeGreaterThan(0)
    expect(store.selectedStepId).toBe(store.steps[0]?.id)
    expect(store.isDirty).toBe(false)
  })

  // -------------------------------------------------------------------------
  // addStep / removeStep / moveStep
  // -------------------------------------------------------------------------

  it('addStep() fuegt einen Schritt hinzu und selektiert ihn', () => {
    const store = setupStoreWithContent()
    const initialCount = store.steps.length

    store.addStep()

    expect(store.steps.length).toBe(initialCount + 1)
    expect(store.isDirty).toBe(true)
    expect(store.selectedStepId).toBe(store.steps[store.steps.length - 1]?.id)
  })

  it('removeStep() entfernt einen Schritt und passt Selektion an', () => {
    const store = setupStoreWithContent()
    store.addStep()
    store.addStep()
    const initialCount = store.steps.length
    const secondStepId = store.steps[1]!.id

    store.selectStep(secondStepId)
    store.removeStep(secondStepId)

    expect(store.steps.length).toBe(initialCount - 1)
    expect(store.isDirty).toBe(true)
    // Selektion auf benachbarten Schritt gewechselt
    expect(store.selectedStepId).not.toBe(secondStepId)
  })

  it('moveStep() veraendert die Reihenfolge der Schritte', () => {
    const store = setupStoreWithContent()
    store.addStep()
    store.addStep()

    const [first, second, third] = [
      store.steps[0]!.id,
      store.steps[1]!.id,
      store.steps[2]!.id,
    ]

    store.moveStep(third, 'up')

    expect(store.steps[1]!.id).toBe(third)
    expect(store.steps[2]!.id).toBe(second)
    expect(store.steps[0]!.id).toBe(first)
    expect(store.isDirty).toBe(true)
  })

  it('moveStep() ignoriert ungueltigen Index (erster Schritt nach oben)', () => {
    const store = setupStoreWithContent()
    store.addStep()
    const originalOrder = store.steps.map(s => s.id)

    store.moveStep(store.steps[0]!.id, 'up')

    expect(store.steps.map(s => s.id)).toEqual(originalOrder)
  })

  // -------------------------------------------------------------------------
  // addBlock / removeBlock / moveBlock / updateBlock
  // -------------------------------------------------------------------------

  it('addBlock() fuegt einen Block zum selektierten Schritt hinzu', () => {
    const store = setupStoreWithContent()
    const stepId = store.selectedStepId!

    store.addBlock(stepId, 'text')

    expect(store.selectedStep?.blocks.length).toBe(1)
    expect(store.selectedStep?.blocks[0]?.type).toBe('text')
    expect(store.selectedBlockId).toBe(store.selectedStep?.blocks[0]?.id)
    expect(store.isDirty).toBe(true)
  })

  it('removeBlock() entfernt einen Block und setzt selectedBlockId zurueck', () => {
    const store = setupStoreWithContent()
    const stepId = store.selectedStepId!

    store.addBlock(stepId, 'button')
    const blockId = store.selectedBlockId!

    store.removeBlock(stepId, blockId)

    expect(store.selectedStep?.blocks.length).toBe(0)
    expect(store.selectedBlockId).toBeNull()
    expect(store.isDirty).toBe(true)
  })

  it('moveBlock() veraendert die Block-Reihenfolge innerhalb eines Schritts', () => {
    const store = setupStoreWithContent()
    const stepId = store.selectedStepId!

    store.addBlock(stepId, 'text')
    store.addBlock(stepId, 'image')
    store.addBlock(stepId, 'button')

    const [b1, b2, b3] = store.selectedStep!.blocks.map(b => b.id)

    store.moveBlock(stepId, b3!, 'up')

    expect(store.selectedStep!.blocks[1]!.id).toBe(b3)
    expect(store.selectedStep!.blocks[2]!.id).toBe(b2)
    expect(store.selectedStep!.blocks[0]!.id).toBe(b1)
  })

  it('updateBlock() patcht ein Feld des Blocks', () => {
    const store = setupStoreWithContent()
    const stepId = store.selectedStepId!

    store.addBlock(stepId, 'button')
    const blockId = store.selectedBlockId!

    store.updateBlock(stepId, blockId, { label: 'Jetzt anmelden' })

    const block = store.selectedStep?.blocks.find(b => b.id === blockId)
    expect(block?.type).toBe('button')
    if (block?.type === 'button') {
      expect(block.label).toBe('Jetzt anmelden')
    }
    expect(store.isDirty).toBe(true)
  })

  // -------------------------------------------------------------------------
  // isDirty-Flag
  // -------------------------------------------------------------------------

  it('isDirty wird nach jeder Mutation auf true gesetzt', () => {
    const store = setupStoreWithContent()
    expect(store.isDirty).toBe(false)

    store.addStep()
    expect(store.isDirty).toBe(true)
  })

  // -------------------------------------------------------------------------
  // createBlock-Defaults
  // -------------------------------------------------------------------------

  it('createBlock("button") hat Label "Weiter" und Aktion "next"', () => {
    const block = createBlock('button')
    expect(block.type).toBe('button')
    expect(block.label).toBe('Weiter')
    expect(block.action).toBe('next')
    expect(block.style).toBe('primary')
  })

  it('createBlock("input_email") hat sinnvollen Platzhalter', () => {
    const block = createBlock('input_email')
    expect(block.type).toBe('input_email')
    expect(block.placeholder).toBeTruthy()
    expect(block.label).toContain('E-Mail')
  })

  it('createEmptyStep() hat leeres blocks-Array und internalTitle', () => {
    const step = createEmptyStep()
    expect(step.blocks).toHaveLength(0)
    expect(step.internalTitle).toBeTruthy()
    expect(step.type).toBe('content')
  })

  // -------------------------------------------------------------------------
  // saveDraft()
  // -------------------------------------------------------------------------

  it('saveDraft() ruft API auf und setzt isDirty auf false', async () => {
    mockSaveDraft.mockResolvedValueOnce({
      data: { id: 'v1', version_number: 1, schema_version: '1.0.0', label: null, published_at: null },
    })

    const store = setupStoreWithContent()
    store.isDirty = true

    await store.saveDraft()

    expect(mockSaveDraft).toHaveBeenCalledOnce()
    expect(mockSaveDraft).toHaveBeenCalledWith('funnel-uuid-1', store.content)
    expect(store.isDirty).toBe(false)
    expect(store.lastSavedAt).toBeInstanceOf(Date)
  })

  it('saveDraft() speichert Validierungsfehler bei 422', async () => {
    const validationError = Object.assign(new Error('Unprocessable'), {
      status: 422,
      data: {
        message: 'Schema-Verletzung',
        errors: {
          'content.steps.0.blocks.0.type': ['Ungueltiger Block-Typ'],
        },
      },
    })
    mockSaveDraft.mockRejectedValueOnce(validationError)

    const store = setupStoreWithContent()
    store.isDirty = true

    await store.saveDraft()

    expect(store.validationErrors).toHaveProperty('content.steps.0.blocks.0.type')
    expect(store.isDirty).toBe(true) // bleibt dirty bei Fehler
  })

  // -------------------------------------------------------------------------
  // publish()
  // -------------------------------------------------------------------------

  it('publish() veroeffentlicht den Funnel und aktualisiert funnel-State', async () => {
    mockSaveDraft.mockResolvedValueOnce({
      data: { id: 'v1', version_number: 1, schema_version: '1.0.0', label: null, published_at: null },
    })
    const publishedFunnel: Funnel = {
      ...mockFunnel,
      status: 'published',
      published_version: {
        id: 'v1',
        version_number: 1,
        schema_version: '1.0.0',
        label: null,
        published_at: '2024-01-02T00:00:00Z',
      },
    }
    mockPublish.mockResolvedValueOnce({ data: publishedFunnel })

    const store = setupStoreWithContent()
    store.isDirty = true

    const result = await store.publish()

    expect(mockPublish).toHaveBeenCalledWith('funnel-uuid-1', undefined)
    expect(result?.status).toBe('published')
    expect(store.funnel?.status).toBe('published')
    expect(store.publishState).toBe('published')
  })

  it('publish() setzt publishState auf "error" bei Fehlschlag', async () => {
    mockPublish.mockRejectedValueOnce(new Error('Server-Fehler'))

    const store = setupStoreWithContent()
    store.isDirty = false

    const result = await store.publish()

    expect(result).toBeNull()
    expect(store.publishState).toBe('error')
  })

  // -------------------------------------------------------------------------
  // duplicateBlock()
  // -------------------------------------------------------------------------

  it('duplicateBlock() fuegt eine Kopie direkt nach dem Original ein', () => {
    const store = setupStoreWithContent()
    const stepId = store.selectedStepId!

    store.addBlock(stepId, 'text')
    store.addBlock(stepId, 'button')
    const textBlockId = store.selectedStep!.blocks[0]!.id

    store.duplicateBlock(stepId, textBlockId)

    expect(store.selectedStep!.blocks.length).toBe(3)
    // Kopie sitzt an Index 1 (direkt nach dem Original an Index 0)
    expect(store.selectedStep!.blocks[1]!.type).toBe('text')
    expect(store.selectedStep!.blocks[1]!.id).not.toBe(textBlockId)
    // Kopie ist selektiert
    expect(store.selectedBlockId).toBe(store.selectedStep!.blocks[1]!.id)
    expect(store.isDirty).toBe(true)
  })

  it('duplicateBlock() gibt single_choice-Optionen neue UUIDs', () => {
    const store = setupStoreWithContent()
    const stepId = store.selectedStepId!

    store.addBlock(stepId, 'single_choice')
    const originalId = store.selectedStep!.blocks[0]!.id

    store.duplicateBlock(stepId, originalId)

    const original = store.selectedStep!.blocks[0]!
    const copy = store.selectedStep!.blocks[1]!

    expect(original.type).toBe('single_choice')
    expect(copy.type).toBe('single_choice')

    if (original.type === 'single_choice' && copy.type === 'single_choice') {
      // Optionen sollen neue IDs haben
      original.options.forEach((opt, i) => {
        expect(opt.id).not.toBe(copy.options[i]!.id)
        expect(opt.label).toBe(copy.options[i]!.label)
      })
    }
  })

  it('duplicateBlock() tut nichts bei ungueltiger blockId', () => {
    const store = setupStoreWithContent()
    const stepId = store.selectedStepId!
    store.addBlock(stepId, 'text')
    const initialLength = store.selectedStep!.blocks.length

    store.duplicateBlock(stepId, 'kein-gueltiger-block-id')

    expect(store.selectedStep!.blocks.length).toBe(initialLength)
  })

  // -------------------------------------------------------------------------
  // togglePreview()
  // -------------------------------------------------------------------------

  it('togglePreview() schaltet previewMode von false auf true', () => {
    const store = useEditorStore()
    expect(store.previewMode).toBe(false)

    store.togglePreview()

    expect(store.previewMode).toBe(true)
  })

  it('togglePreview() schaltet previewMode wieder zurueck auf false', () => {
    const store = useEditorStore()

    store.togglePreview()
    expect(store.previewMode).toBe(true)

    store.togglePreview()
    expect(store.previewMode).toBe(false)
  })

  it('togglePreview() setzt selectedBlockId beim Aktivieren auf null', () => {
    const store = setupStoreWithContent()
    const stepId = store.selectedStepId!

    store.addBlock(stepId, 'text')
    expect(store.selectedBlockId).not.toBeNull()

    store.togglePreview()

    expect(store.previewMode).toBe(true)
    expect(store.selectedBlockId).toBeNull()
  })

  it('togglePreview() beendet Vorschau-Modus beim zweiten Aufruf', () => {
    const store = setupStoreWithContent()

    store.togglePreview()
    store.togglePreview()

    expect(store.previewMode).toBe(false)
  })

  // -------------------------------------------------------------------------
  // deselectBlock()
  // -------------------------------------------------------------------------

  it('deselectBlock() setzt selectedBlockId auf null', () => {
    const store = setupStoreWithContent()
    const stepId = store.selectedStepId!

    store.addBlock(stepId, 'text')
    expect(store.selectedBlockId).not.toBeNull()

    store.deselectBlock()

    expect(store.selectedBlockId).toBeNull()
  })

  // -------------------------------------------------------------------------
  // addStep() mit type-Parameter
  // -------------------------------------------------------------------------

  it('addStep("result") legt einen Ergebnis-Schritt an', () => {
    const store = setupStoreWithContent()

    store.addStep('result')

    const lastStep = store.steps[store.steps.length - 1]!
    expect(lastStep.type).toBe('result')
    expect(lastStep.internalTitle).toBe('Ergebnis')
    expect(store.isDirty).toBe(true)
  })

  it('addStep() ohne Parameter legt content-Schritt an (Standardverhalten)', () => {
    const store = setupStoreWithContent()
    const initialCount = store.steps.length

    store.addStep()

    expect(store.steps.length).toBe(initialCount + 1)
    expect(store.steps[store.steps.length - 1]!.type).toBe('content')
  })

  // -------------------------------------------------------------------------
  // updateStep()
  // -------------------------------------------------------------------------

  it('updateStep() patcht Felder eines Steps und setzt isDirty', () => {
    const store = setupStoreWithContent()
    const stepId = store.selectedStepId!

    store.updateStep(stepId, { internalTitle: 'Umbenannt', type: 'question' })

    expect(store.selectedStep?.internalTitle).toBe('Umbenannt')
    expect(store.selectedStep?.type).toBe('question')
    expect(store.isDirty).toBe(true)
  })

  it('updateStep() tut nichts bei ungueltiger stepId', () => {
    const store = setupStoreWithContent()
    const originalTitle = store.selectedStep?.internalTitle

    store.updateStep('kein-gueltiger-step', { internalTitle: 'Fehler' })

    expect(store.selectedStep?.internalTitle).toBe(originalTitle)
  })

  // -------------------------------------------------------------------------
  // updateSettings()
  // -------------------------------------------------------------------------

  it('updateSettings() patcht globale Funnel-Einstellungen und setzt isDirty', () => {
    const store = setupStoreWithContent()
    expect(store.isDirty).toBe(false)

    store.updateSettings({ progressBar: true, animations: 'fade' })

    expect(store.content?.settings.progressBar).toBe(true)
    expect(store.content?.settings.animations).toBe('fade')
    expect(store.isDirty).toBe(true)
  })

  it('updateSettings() behaelt unveraenderte Felder (partial merge)', () => {
    const store = setupStoreWithContent()
    const originalLabel = store.content?.settings.startButtonLabel

    store.updateSettings({ progressBar: true })

    expect(store.content?.settings.startButtonLabel).toBe(originalLabel)
    expect(store.content?.settings.progressBar).toBe(true)
  })

  // -------------------------------------------------------------------------
  // reorderBlocks()
  // -------------------------------------------------------------------------

  it('reorderBlocks() verschiebt einen Block von vorne nach hinten', () => {
    const store = setupStoreWithContent()
    const stepId = store.selectedStepId!

    store.addBlock(stepId, 'text')
    store.addBlock(stepId, 'image')
    store.addBlock(stepId, 'button')

    const [b1, b2, b3] = store.selectedStep!.blocks.map(b => b.id)

    // Block 0 (text) an Position 2 verschieben -> [image, button, text]
    store.reorderBlocks(stepId, 0, 2)

    expect(store.selectedStep!.blocks[0]!.id).toBe(b2)
    expect(store.selectedStep!.blocks[1]!.id).toBe(b3)
    expect(store.selectedStep!.blocks[2]!.id).toBe(b1)
  })

  it('reorderBlocks() verschiebt einen Block von hinten nach vorne', () => {
    const store = setupStoreWithContent()
    const stepId = store.selectedStepId!

    store.addBlock(stepId, 'text')
    store.addBlock(stepId, 'image')
    store.addBlock(stepId, 'button')

    const [b1, b2, b3] = store.selectedStep!.blocks.map(b => b.id)

    // Block 2 (button) an Position 0 verschieben -> [button, text, image]
    store.reorderBlocks(stepId, 2, 0)

    expect(store.selectedStep!.blocks[0]!.id).toBe(b3)
    expect(store.selectedStep!.blocks[1]!.id).toBe(b1)
    expect(store.selectedStep!.blocks[2]!.id).toBe(b2)
  })

  it('reorderBlocks() setzt isDirty auf true', () => {
    const store = setupStoreWithContent()
    const stepId = store.selectedStepId!

    store.addBlock(stepId, 'text')
    store.addBlock(stepId, 'image')
    store.isDirty = false

    store.reorderBlocks(stepId, 0, 1)

    expect(store.isDirty).toBe(true)
  })

  it('reorderBlocks() tut nichts bei gleichem from/to-Index', () => {
    const store = setupStoreWithContent()
    const stepId = store.selectedStepId!

    store.addBlock(stepId, 'text')
    store.addBlock(stepId, 'image')
    store.isDirty = false

    const originalOrder = store.selectedStep!.blocks.map(b => b.id)
    store.reorderBlocks(stepId, 1, 1)

    expect(store.selectedStep!.blocks.map(b => b.id)).toEqual(originalOrder)
    expect(store.isDirty).toBe(false)
  })

  it('reorderBlocks() tut nichts bei ungueltigem Index (zu gross)', () => {
    const store = setupStoreWithContent()
    const stepId = store.selectedStepId!

    store.addBlock(stepId, 'text')
    store.addBlock(stepId, 'image')
    store.isDirty = false

    const originalOrder = store.selectedStep!.blocks.map(b => b.id)
    store.reorderBlocks(stepId, 0, 99)

    expect(store.selectedStep!.blocks.map(b => b.id)).toEqual(originalOrder)
    expect(store.isDirty).toBe(false)
  })

  it('reorderBlocks() tut nichts bei ungueltigem Index (negativ)', () => {
    const store = setupStoreWithContent()
    const stepId = store.selectedStepId!

    store.addBlock(stepId, 'text')
    store.addBlock(stepId, 'image')
    store.isDirty = false

    const originalOrder = store.selectedStep!.blocks.map(b => b.id)
    store.reorderBlocks(stepId, -1, 1)

    expect(store.selectedStep!.blocks.map(b => b.id)).toEqual(originalOrder)
    expect(store.isDirty).toBe(false)
  })

  // -------------------------------------------------------------------------
  // reorderSteps()
  // -------------------------------------------------------------------------

  it('reorderSteps() verschiebt einen Step von vorne nach hinten', () => {
    const store = setupStoreWithContent()

    store.addStep()
    store.addStep()

    const [s1, s2, s3] = store.steps.map(s => s.id)

    // Step 0 an Position 2 verschieben -> [s2, s3, s1]
    store.reorderSteps(0, 2)

    expect(store.steps[0]!.id).toBe(s2)
    expect(store.steps[1]!.id).toBe(s3)
    expect(store.steps[2]!.id).toBe(s1)
  })

  it('reorderSteps() verschiebt einen Step von hinten nach vorne', () => {
    const store = setupStoreWithContent()

    store.addStep()
    store.addStep()

    const [s1, s2, s3] = store.steps.map(s => s.id)

    // Step 2 an Position 0 verschieben -> [s3, s1, s2]
    store.reorderSteps(2, 0)

    expect(store.steps[0]!.id).toBe(s3)
    expect(store.steps[1]!.id).toBe(s1)
    expect(store.steps[2]!.id).toBe(s2)
  })

  it('reorderSteps() setzt isDirty auf true', () => {
    const store = setupStoreWithContent()

    store.addStep()
    store.isDirty = false

    store.reorderSteps(0, 1)

    expect(store.isDirty).toBe(true)
  })

  it('reorderSteps() tut nichts bei gleichem from/to-Index', () => {
    const store = setupStoreWithContent()

    store.addStep()
    store.isDirty = false

    const originalOrder = store.steps.map(s => s.id)
    store.reorderSteps(0, 0)

    expect(store.steps.map(s => s.id)).toEqual(originalOrder)
    expect(store.isDirty).toBe(false)
  })

  it('reorderSteps() tut nichts bei ungueltigem Index (zu gross)', () => {
    const store = setupStoreWithContent()

    store.addStep()
    store.isDirty = false

    const originalOrder = store.steps.map(s => s.id)
    store.reorderSteps(0, 99)

    expect(store.steps.map(s => s.id)).toEqual(originalOrder)
    expect(store.isDirty).toBe(false)
  })

  it('reorderSteps() tut nichts bei ungueltigem Index (negativ)', () => {
    const store = setupStoreWithContent()

    store.addStep()
    store.isDirty = false

    const originalOrder = store.steps.map(s => s.id)
    store.reorderSteps(-1, 1)

    expect(store.steps.map(s => s.id)).toEqual(originalOrder)
    expect(store.isDirty).toBe(false)
  })

  // -------------------------------------------------------------------------
  // Undo / Redo
  // -------------------------------------------------------------------------

  it('3 Mutationen -> undo 3x -> content deep-equal mit Initialzustand', () => {
    const store = setupStoreWithContent()
    const stepId = store.selectedStepId!

    // Initialzustand festhalten
    const initialContent = JSON.parse(JSON.stringify(store.content))

    // Mutation 1: Block hinzufuegen
    store.addBlock(stepId, 'text')
    const blockId = store.selectedBlockId!

    // Mutation 2: Block aktualisieren
    store.updateBlock(stepId, blockId, { content: 'Hallo Welt' })

    // Mutation 3: Block entfernen
    store.removeBlock(stepId, blockId)

    expect(store.history.length).toBe(3)

    store.undo()
    store.undo()
    store.undo()

    expect(store.history.length).toBe(0)
    expect(store.content).toEqual(initialContent)
  })

  it('3 Mutationen -> undo 2x -> redo 1x -> Stand nach 2. Mutation', () => {
    const store = setupStoreWithContent()
    const stepId = store.selectedStepId!

    // Mutation 1
    store.addBlock(stepId, 'text')
    const blockId = store.selectedBlockId!

    // Mutation 2: Zustand nach dieser Mutation festhalten
    store.updateBlock(stepId, blockId, { content: 'Stand Mutation 2' })
    const contentAfterMutation2 = JSON.parse(JSON.stringify(store.content))

    // Mutation 3
    store.removeBlock(stepId, blockId)

    // 2x zurueck, dann 1x vor
    store.undo()
    store.undo()
    store.redo()

    expect(store.content).toEqual(contentAfterMutation2)
    expect(store.canRedo).toBe(true)
  })

  it('mehr als 50 Mutationen -> history.length <= 50', () => {
    const store = setupStoreWithContent()
    const stepId = store.selectedStepId!

    // 55 Mutationen ausfuehren
    for (let i = 0; i < 55; i++) {
      store.addBlock(stepId, 'text')
    }

    expect(store.history.length).toBeLessThanOrEqual(50)
  })

  it('undo + neue Mutation verwirft den Redo-Zweig', () => {
    const store = setupStoreWithContent()
    const stepId = store.selectedStepId!

    store.addBlock(stepId, 'text')
    store.addBlock(stepId, 'button')

    // Einen Schritt zurueck
    store.undo()
    expect(store.canRedo).toBe(true)

    // Neue Mutation nach dem Undo
    store.addBlock(stepId, 'image')

    // Redo-Zweig muss verworfen sein
    expect(store.canRedo).toBe(false)
  })

  it('load() leert History und Redo-Stack', async () => {
    mockGet.mockResolvedValueOnce({ data: mockFunnel })

    const store = setupStoreWithContent()
    const stepId = store.selectedStepId!

    // Mutation erzeugt History-Eintrag
    store.addBlock(stepId, 'text')
    expect(store.history.length).toBeGreaterThan(0)

    // Undo erzeugt Redo-Eintrag
    store.undo()
    expect(store.canRedo).toBe(true)

    // Laden muss beides leeren
    await store.load('funnel-uuid-1')

    expect(store.history.length).toBe(0)
    expect(store.canRedo).toBe(false)
  })

  it('undo setzt selectedBlockId auf null wenn Block nicht mehr existiert', () => {
    const store = setupStoreWithContent()
    const stepId = store.selectedStepId!

    // Block hinzufuegen und selektieren
    store.addBlock(stepId, 'text')
    const blockId = store.selectedBlockId!
    expect(blockId).not.toBeNull()

    // Rueckgaengig: Block war vorher nicht vorhanden
    store.undo()

    expect(store.selectedBlockId).toBeNull()
  })

  it('canUndo ist false bei leerem Store, true nach Mutation', () => {
    const store = setupStoreWithContent()
    expect(store.canUndo).toBe(false)

    store.addStep()
    expect(store.canUndo).toBe(true)
  })

  it('undo setzt isDirty auf true', () => {
    const store = setupStoreWithContent()
    const stepId = store.selectedStepId!

    store.addBlock(stepId, 'text')
    store.isDirty = false

    store.undo()

    expect(store.isDirty).toBe(true)
  })

  // -------------------------------------------------------------------------
  // copyBlockToStep()
  // -------------------------------------------------------------------------

  it('copyBlockToStep() erzeugt im Ziel-Step einen Block mit anderer uuid', () => {
    const store = setupStoreWithContent()
    store.addStep()
    const step1Id = store.steps[0]!.id
    const step2Id = store.steps[1]!.id

    store.addBlock(step1Id, 'text')
    const originalBlockId = store.steps[0]!.blocks[0]!.id

    store.copyBlockToStep(originalBlockId, step1Id, step2Id)

    const step2Blocks = store.steps[1]!.blocks
    expect(step2Blocks).toHaveLength(1)
    expect(step2Blocks[0]!.id).not.toBe(originalBlockId)
    expect(step2Blocks[0]!.type).toBe('text')
    expect(store.isDirty).toBe(true)
  })

  it('copyBlockToStep() laesst Original-Block und Original-Step unveraendert', () => {
    const store = setupStoreWithContent()
    store.addStep()
    const step1Id = store.steps[0]!.id
    const step2Id = store.steps[1]!.id

    store.addBlock(step1Id, 'button')
    const originalBlockId = store.steps[0]!.blocks[0]!.id

    store.copyBlockToStep(originalBlockId, step1Id, step2Id)

    // Original-Step unveraendert
    expect(store.steps[0]!.blocks).toHaveLength(1)
    expect(store.steps[0]!.blocks[0]!.id).toBe(originalBlockId)
  })

  it('copyBlockToStep() gibt options bei single_choice neue uuids', () => {
    const store = setupStoreWithContent()
    store.addStep()
    const step1Id = store.steps[0]!.id
    const step2Id = store.steps[1]!.id

    store.addBlock(step1Id, 'single_choice')
    const originalBlock = store.steps[0]!.blocks[0]!

    store.copyBlockToStep(originalBlock.id, step1Id, step2Id)

    const copiedBlock = store.steps[1]!.blocks[0]!
    expect(copiedBlock.type).toBe('single_choice')

    if (originalBlock.type === 'single_choice' && copiedBlock.type === 'single_choice') {
      originalBlock.options.forEach((opt, i) => {
        expect(opt.id).not.toBe(copiedBlock.options[i]!.id)
        expect(opt.label).toBe(copiedBlock.options[i]!.label)
      })
    }
  })

  it('copyBlockToStep() gibt options bei multi_choice neue uuids', () => {
    const store = setupStoreWithContent()
    store.addStep()
    const step1Id = store.steps[0]!.id
    const step2Id = store.steps[1]!.id

    store.addBlock(step1Id, 'multi_choice')
    const originalBlock = store.steps[0]!.blocks[0]!

    store.copyBlockToStep(originalBlock.id, step1Id, step2Id)

    const copiedBlock = store.steps[1]!.blocks[0]!
    expect(copiedBlock.type).toBe('multi_choice')

    if (originalBlock.type === 'multi_choice' && copiedBlock.type === 'multi_choice') {
      originalBlock.options.forEach((opt, i) => {
        expect(opt.id).not.toBe(copiedBlock.options[i]!.id)
      })
    }
  })

  it('copyBlockToStep() gibt options bei input_dropdown neue uuids', () => {
    const store = setupStoreWithContent()
    store.addStep()
    const step1Id = store.steps[0]!.id
    const step2Id = store.steps[1]!.id

    store.addBlock(step1Id, 'input_dropdown')
    const originalBlock = store.steps[0]!.blocks[0]!

    store.copyBlockToStep(originalBlock.id, step1Id, step2Id)

    const copiedBlock = store.steps[1]!.blocks[0]!
    expect(copiedBlock.type).toBe('input_dropdown')

    if (originalBlock.type === 'input_dropdown' && copiedBlock.type === 'input_dropdown') {
      originalBlock.options.forEach((opt, i) => {
        expect(opt.id).not.toBe(copiedBlock.options[i]!.id)
      })
    }
  })

  it('copyBlockToStep() ist undobar', () => {
    const store = setupStoreWithContent()
    store.addStep()
    const step1Id = store.steps[0]!.id
    const step2Id = store.steps[1]!.id

    store.addBlock(step1Id, 'text')
    const originalBlockId = store.steps[0]!.blocks[0]!.id

    const contentBefore = JSON.parse(JSON.stringify(store.content))

    store.copyBlockToStep(originalBlockId, step1Id, step2Id)
    store.undo()

    expect(store.content).toEqual(contentBefore)
  })

  it('copyBlockToStep() tut nichts bei ungueltigem blockId', () => {
    const store = setupStoreWithContent()
    store.addStep()
    const step1Id = store.steps[0]!.id
    const step2Id = store.steps[1]!.id
    const contentBefore = JSON.parse(JSON.stringify(store.content))
    store.isDirty = false

    store.copyBlockToStep('kein-gueltiger-block', step1Id, step2Id)

    expect(store.content).toEqual(contentBefore)
    expect(store.isDirty).toBe(false)
  })

  // -------------------------------------------------------------------------
  // duplicateStep()
  // -------------------------------------------------------------------------

  it('duplicateStep() erzeugt einen neuen Step direkt nach dem Original', () => {
    const store = setupStoreWithContent()
    store.addStep()
    const step1Id = store.steps[0]!.id
    const originalCount = store.steps.length

    store.duplicateStep(step1Id)

    expect(store.steps).toHaveLength(originalCount + 1)
    // Klon sitzt an Index 1, direkt nach dem Original an Index 0
    expect(store.steps[1]!.id).not.toBe(step1Id)
    expect(store.isDirty).toBe(true)
  })

  it('duplicateStep() selektiert den geklonten Step', () => {
    const store = setupStoreWithContent()
    const step1Id = store.steps[0]!.id

    store.duplicateStep(step1Id)

    // Klon ist an Index 1
    expect(store.selectedStepId).toBe(store.steps[1]!.id)
    expect(store.selectedBlockId).toBeNull()
  })

  it('duplicateStep() vergibt neue uuids fuer Bloecke und deren options', () => {
    const store = setupStoreWithContent()
    const stepId = store.steps[0]!.id

    store.addBlock(stepId, 'single_choice')
    const originalBlock = store.steps[0]!.blocks[0]!

    store.duplicateStep(stepId)

    const clonedStep = store.steps[1]!
    const clonedBlock = clonedStep.blocks[0]!

    expect(clonedStep.id).not.toBe(stepId)
    expect(clonedBlock.id).not.toBe(originalBlock.id)

    if (originalBlock.type === 'single_choice' && clonedBlock.type === 'single_choice') {
      originalBlock.options.forEach((opt, i) => {
        expect(opt.id).not.toBe(clonedBlock.options[i]!.id)
        expect(opt.label).toBe(clonedBlock.options[i]!.label)
      })
    }
  })

  it('duplicateStep() laesst den Original-Step unveraendert', () => {
    const store = setupStoreWithContent()
    const stepId = store.steps[0]!.id

    store.addBlock(stepId, 'text')
    store.addBlock(stepId, 'button')
    const originalBlockIds = store.steps[0]!.blocks.map(b => b.id)
    const originalTitle = store.steps[0]!.internalTitle

    store.duplicateStep(stepId)

    expect(store.steps[0]!.id).toBe(stepId)
    expect(store.steps[0]!.internalTitle).toBe(originalTitle)
    expect(store.steps[0]!.blocks.map(b => b.id)).toEqual(originalBlockIds)
  })

  it('duplicateStep() dupliziert auch result-Steps', () => {
    const store = setupStoreWithContent()
    store.addStep('result')
    const resultStepId = store.steps[store.steps.length - 1]!.id

    const totalBefore = store.steps.length

    store.duplicateStep(resultStepId)

    expect(store.steps).toHaveLength(totalBefore + 1)
    // Klon hat type 'result'
    const clonedStep = store.steps.find(s => s.id === store.selectedStepId)
    expect(clonedStep?.type).toBe('result')
  })

  it('duplicateStep() ist undobar', () => {
    const store = setupStoreWithContent()
    const step1Id = store.steps[0]!.id

    store.addBlock(step1Id, 'text')
    const contentBefore = JSON.parse(JSON.stringify(store.content))

    store.duplicateStep(step1Id)
    store.undo()

    expect(store.content).toEqual(contentBefore)
  })

  it('duplicateStep() tut nichts bei ungueltigem stepId', () => {
    const store = setupStoreWithContent()
    const originalCount = store.steps.length
    store.isDirty = false

    store.duplicateStep('kein-gueltiger-step')

    expect(store.steps).toHaveLength(originalCount)
    expect(store.isDirty).toBe(false)
  })
})
