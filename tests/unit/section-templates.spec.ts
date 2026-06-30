/**
 * Tests fuer die Sektions-Vorlagen und die addBlocks-Store-Action.
 *
 * Geprueft wird:
 * - addBlocks() haengt N Bloecke mit frischen UUIDs an einen Step an
 * - Jede Sektions-Factory liefert Bloecke mit einzigartigen UUIDs (keine Kollisionen)
 * - Jede Factory liefert bei zwei aufeinanderfolgenden Aufrufen verschiedene IDs
 * - Titelbereich-Vorlage hat die erwarteten Blocktypen
 * - Quiz-Vorlage enthaelt einen progress_indicator und single_choice
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import { createEmptyContent, createBlock } from '../../app/types/funnel'
import type { FunnelContent } from '../../app/types/funnel'
import { useEditorStore } from '../../app/stores/editor'
import { useSectionTemplates } from '../../app/composables/useSectionTemplates'

// --- Mocks ---

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

vi.mock('@vueuse/core', async () => {
  const actual = await vi.importActual<typeof import('@vueuse/core')>('@vueuse/core')
  return {
    ...actual,
    watchDebounced: vi.fn(),
    useLocalStorage: vi.fn(<T>(_key: string, initialValue: T) => ref<T>(initialValue)),
  }
})

// --- Hilfsfunktion ---

const mockFunnel = {
  id: 'funnel-uuid-1',
  name: 'Test Funnel',
  slug: 'test-funnel',
  status: 'draft' as const,
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

function setupStore(content?: FunnelContent) {
  const store = useEditorStore()
  store.funnel = { ...mockFunnel }
  store.content = content ?? createEmptyContent()
  store.selectedStepId = store.content.steps[0]?.id ?? null
  store.selectedBlockId = null
  store.isDirty = false
  return store
}

// ---------------------------------------------------------------------------
// Store: addBlocks()
// ---------------------------------------------------------------------------

describe('useEditorStore.addBlocks()', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('haengt mehrere Bloecke ans Ende des Steps an', () => {
    const store = setupStore()
    const stepId = store.selectedStepId!

    const blocks = [createBlock('text'), createBlock('button')]
    store.addBlocks(stepId, blocks)

    expect(store.selectedStep?.blocks.length).toBe(2)
    expect(store.selectedStep?.blocks[0]?.type).toBe('text')
    expect(store.selectedStep?.blocks[1]?.type).toBe('button')
  })

  it('selektiert den ersten Block der Gruppe', () => {
    const store = setupStore()
    const stepId = store.selectedStepId!

    const blocks = [createBlock('logo'), createBlock('text'), createBlock('button')]
    store.addBlocks(stepId, blocks)

    expect(store.selectedBlockId).toBe(blocks[0]!.id)
  })

  it('setzt isDirty auf true', () => {
    const store = setupStore()
    const stepId = store.selectedStepId!

    expect(store.isDirty).toBe(false)
    store.addBlocks(stepId, [createBlock('text')])
    expect(store.isDirty).toBe(true)
  })

  it('fuegt Bloecke hinter bestehende Bloecke an', () => {
    const store = setupStore()
    const stepId = store.selectedStepId!

    store.addBlock(stepId, 'image')
    const existingBlockId = store.selectedStep!.blocks[0]!.id

    const newBlocks = [createBlock('text'), createBlock('button')]
    store.addBlocks(stepId, newBlocks)

    expect(store.selectedStep?.blocks.length).toBe(3)
    expect(store.selectedStep?.blocks[0]!.id).toBe(existingBlockId)
    expect(store.selectedStep?.blocks[1]!.type).toBe('text')
    expect(store.selectedStep?.blocks[2]!.type).toBe('button')
  })

  it('tut nichts bei leerem Bloecke-Array', () => {
    const store = setupStore()
    const stepId = store.selectedStepId!

    store.addBlocks(stepId, [])

    expect(store.selectedStep?.blocks.length).toBe(0)
    expect(store.isDirty).toBe(false)
  })

  it('tut nichts bei unbekannter stepId', () => {
    const store = setupStore()

    store.addBlocks('kein-gueltiger-step', [createBlock('text')])

    expect(store.isDirty).toBe(false)
  })

  it('behaelt den stepId-Scope (kein Cross-Step-Einfuegen)', () => {
    const store = setupStore()
    store.addStep('content')
    const stepIds = store.steps.map(s => s.id)
    const firstStepId = stepIds[0]!
    const secondStepId = stepIds[1]!

    store.addBlocks(firstStepId, [createBlock('text')])

    const firstStep = store.steps.find(s => s.id === firstStepId)!
    const secondStep = store.steps.find(s => s.id === secondStepId)!
    expect(firstStep.blocks.length).toBe(1)
    expect(secondStep.blocks.length).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// useSectionTemplates: Factories
// ---------------------------------------------------------------------------

describe('useSectionTemplates', () => {
  it('liefert 8 Vorlagen', () => {
    const { sectionTemplates } = useSectionTemplates()
    expect(sectionTemplates.length).toBe(8)
  })

  it('jede Factory erzeugt Bloecke mit einzigartigen IDs (kein Duplikat innerhalb eines Aufrufs)', () => {
    const { sectionTemplates } = useSectionTemplates()
    for (const template of sectionTemplates) {
      const blocks = template.create()
      const ids = blocks.map(b => b.id)
      expect(new Set(ids).size, `Vorlage "${template.key}": doppelte IDs`).toBe(ids.length)
    }
  })

  it('zwei aufeinanderfolgende Aufrufe derselben Factory ergeben verschiedene UUIDs', () => {
    const { sectionTemplates } = useSectionTemplates()
    for (const template of sectionTemplates) {
      const blocks1 = template.create()
      const blocks2 = template.create()
      const ids1 = new Set(blocks1.map(b => b.id))
      const ids2 = blocks2.map(b => b.id)
      const hasCollision = ids2.some(id => ids1.has(id))
      expect(
        hasCollision,
        `Vorlage "${template.key}": IDs zwischen Aufrufen identisch`,
      ).toBe(false)
    }
  })

  it('titelbereich: liefert 4 Bloecke (logo, text, text, button)', () => {
    const { sectionTemplates } = useSectionTemplates()
    const template = sectionTemplates.find(t => t.key === 'titelbereich')
    expect(template).toBeDefined()
    const blocks = template!.create()
    expect(blocks).toHaveLength(4)
    expect(blocks[0]?.type).toBe('logo')
    expect(blocks[1]?.type).toBe('text')
    expect(blocks[2]?.type).toBe('text')
    expect(blocks[3]?.type).toBe('button')
  })

  it('titelbereich: Hero-Block hat styles.textSize "hero"', () => {
    const { sectionTemplates } = useSectionTemplates()
    const blocks = sectionTemplates.find(t => t.key === 'titelbereich')!.create()
    const heroBlock = blocks[1]
    expect(heroBlock?.type).toBe('text')
    if (heroBlock?.type === 'text') {
      expect(heroBlock.styles?.textSize).toBe('hero')
    }
  })

  it('titelbereich: Button-Block hat action "next"', () => {
    const { sectionTemplates } = useSectionTemplates()
    const blocks = sectionTemplates.find(t => t.key === 'titelbereich')!.create()
    const buttonBlock = blocks[3]
    expect(buttonBlock?.type).toBe('button')
    if (buttonBlock?.type === 'button') {
      expect(buttonBlock.action).toBe('next')
      expect(buttonBlock.style).toBe('primary')
    }
  })

  it('quiz: enthaelt progress_indicator, text und single_choice', () => {
    const { sectionTemplates } = useSectionTemplates()
    const blocks = sectionTemplates.find(t => t.key === 'quiz')!.create()
    expect(blocks).toHaveLength(3)
    expect(blocks[0]?.type).toBe('progress_indicator')
    expect(blocks[1]?.type).toBe('text')
    expect(blocks[2]?.type).toBe('single_choice')
  })

  it('quiz: single_choice hat 3 Optionen', () => {
    const { sectionTemplates } = useSectionTemplates()
    const blocks = sectionTemplates.find(t => t.key === 'quiz')!.create()
    const choice = blocks[2]
    expect(choice?.type).toBe('single_choice')
    if (choice?.type === 'single_choice') {
      expect(choice.options.length).toBe(3)
      // Alle Options-IDs einzigartig
      const optionIds = choice.options.map(o => o.id)
      expect(new Set(optionIds).size).toBe(3)
    }
  })

  it('handlungsaufforderung: text + text + button', () => {
    const { sectionTemplates } = useSectionTemplates()
    const blocks = sectionTemplates.find(t => t.key === 'handlungsaufforderung')!.create()
    expect(blocks).toHaveLength(3)
    expect(blocks[0]?.type).toBe('text')
    expect(blocks[1]?.type).toBe('text')
    expect(blocks[2]?.type).toBe('button')
  })

  it('alle Vorlagen haben label und description', () => {
    const { sectionTemplates } = useSectionTemplates()
    for (const t of sectionTemplates) {
      expect(t.label, `Kein label bei "${t.key}"`).toBeTruthy()
      expect(t.description, `Keine description bei "${t.key}"`).toBeTruthy()
    }
  })

  it('alle expected Keys sind vorhanden', () => {
    const { sectionTemplates } = useSectionTemplates()
    const keys = sectionTemplates.map(t => t.key)
    expect(keys).toContain('titelbereich')
    expect(keys).toContain('produkt')
    expect(keys).toContain('handlungsaufforderung')
    expect(keys).toContain('ueber-uns')
    expect(keys).toContain('quiz')
    expect(keys).toContain('team')
    expect(keys).toContain('kundenstimmen')
    expect(keys).toContain('vertrauen')
  })
})
