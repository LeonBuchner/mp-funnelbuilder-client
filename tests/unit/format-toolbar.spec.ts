/**
 * Tests für die FormatToolbar-Logik:
 *   1. Reine Util-Funktionen (getActiveFontSizePx, isPxTextSize, getActiveTextAlign)
 *   2. Konstanten (FONT_SIZE_PX_OPTIONS, FONT_SIZE_QUICK_BUTTONS, FONT_SIZE_BADGE)
 *   3. Store-Integration: updateBlock wird mit px-Wert ("30px") aufgerufen
 *
 * Muster analog editor.store.spec.ts: frische Pinia pro Test, useFunnels + watchDebounced gemockt.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import { createEmptyContent, createBlock } from '../../app/types/funnel'
import type { TextBlock } from '../../app/types/funnel'
import { useEditorStore } from '../../app/stores/editor'
import {
  FONT_SIZE_PX_OPTIONS,
  FONT_SIZE_QUICK_BUTTONS,
  FONT_SIZE_BADGE,
  isPxTextSize,
  getActiveFontSizePx,
  getActiveTextAlign,
} from '../../app/utils/textSizes'

// --- Mocks (gehoistet) ---

vi.mock('~/composables/useFunnels', () => ({
  useFunnels: vi.fn(() => ({
    list: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    saveDraft: vi.fn(),
    publish: vi.fn(),
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

// --- Hilfsfunktion: Store mit Text-Block aufsetzen ---

function setupStoreWithTextBlock() {
  const store = useEditorStore()
  const content = createEmptyContent()
  const textBlock = createBlock('text') as TextBlock
  content.steps[0]!.blocks.push(textBlock)
  store.content = content
  store.selectedStepId = content.steps[0]!.id
  store.selectedBlockId = textBlock.id
  store.isDirty = false
  return { store, stepId: content.steps[0]!.id, blockId: textBlock.id }
}

// ---------------------------------------------------------------------------
// isPxTextSize
// ---------------------------------------------------------------------------

describe('isPxTextSize', () => {
  it('gibt true zurück für px-Strings', () => {
    expect(isPxTextSize('16px')).toBe(true)
    expect(isPxTextSize('30px')).toBe(true)
    expect(isPxTextSize('14px')).toBe(true)
    expect(isPxTextSize('64px')).toBe(true)
  })

  it('gibt false zurück für alle anderen Werte', () => {
    expect(isPxTextSize(undefined)).toBe(false)
    expect(isPxTextSize('')).toBe(false)
    expect(isPxTextSize('normal')).toBe(false)
    expect(isPxTextSize('large')).toBe(false)
    expect(isPxTextSize('30')).toBe(false)      // kein px-Suffix
    expect(isPxTextSize('px30')).toBe(false)    // falsches Format
    expect(isPxTextSize('auto')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// getActiveFontSizePx
// ---------------------------------------------------------------------------

describe('getActiveFontSizePx', () => {
  it('gibt 16 zurück wenn kein Wert gesetzt ist (Default = S)', () => {
    expect(getActiveFontSizePx(undefined)).toBe(16)
    expect(getActiveFontSizePx({})).toBe(16)
    expect(getActiveFontSizePx({ textSize: '' })).toBe(16)
  })

  it('liest neue px-Werte korrekt aus', () => {
    expect(getActiveFontSizePx({ textSize: '16px' })).toBe(16)
    expect(getActiveFontSizePx({ textSize: '20px' })).toBe(20)
    expect(getActiveFontSizePx({ textSize: '24px' })).toBe(24)
    expect(getActiveFontSizePx({ textSize: '30px' })).toBe(30)
    expect(getActiveFontSizePx({ textSize: '40px' })).toBe(40)
    expect(getActiveFontSizePx({ textSize: '48px' })).toBe(48)
    expect(getActiveFontSizePx({ textSize: '64px' })).toBe(64)
    expect(getActiveFontSizePx({ textSize: '14px' })).toBe(14)
    expect(getActiveFontSizePx({ textSize: '15px' })).toBe(15)
  })

  it('mappt alte named tokens auf den korrekten px-Wert (Abwärtskompatibilität)', () => {
    expect(getActiveFontSizePx({ textSize: 'small' })).toBe(12)
    expect(getActiveFontSizePx({ textSize: 'lead' })).toBe(14)
    expect(getActiveFontSizePx({ textSize: 'normal' })).toBe(16)
    expect(getActiveFontSizePx({ textSize: 'large' })).toBe(20)
    expect(getActiveFontSizePx({ textSize: 'xl' })).toBe(24)
    expect(getActiveFontSizePx({ textSize: 'hero' })).toBe(28)
  })

  it('gibt 16 zurück bei unbekanntem Wert', () => {
    expect(getActiveFontSizePx({ textSize: 'gigantic' })).toBe(16)
    expect(getActiveFontSizePx({ textSize: 'huge' })).toBe(16)
  })
})

// ---------------------------------------------------------------------------
// FONT_SIZE_PX_OPTIONS
// ---------------------------------------------------------------------------

describe('FONT_SIZE_PX_OPTIONS', () => {
  it('enthält genau 9 Einträge', () => {
    expect(FONT_SIZE_PX_OPTIONS).toHaveLength(9)
  })

  it('enthält alle erwarteten px-Werte', () => {
    expect(FONT_SIZE_PX_OPTIONS).toContain(14)
    expect(FONT_SIZE_PX_OPTIONS).toContain(15)
    expect(FONT_SIZE_PX_OPTIONS).toContain(16)
    expect(FONT_SIZE_PX_OPTIONS).toContain(20)
    expect(FONT_SIZE_PX_OPTIONS).toContain(24)
    expect(FONT_SIZE_PX_OPTIONS).toContain(30)
    expect(FONT_SIZE_PX_OPTIONS).toContain(40)
    expect(FONT_SIZE_PX_OPTIONS).toContain(48)
    expect(FONT_SIZE_PX_OPTIONS).toContain(64)
  })

  it('ist in aufsteigender Reihenfolge', () => {
    for (let i = 1; i < FONT_SIZE_PX_OPTIONS.length; i++) {
      expect(FONT_SIZE_PX_OPTIONS[i]).toBeGreaterThan(FONT_SIZE_PX_OPTIONS[i - 1]!)
    }
  })
})

// ---------------------------------------------------------------------------
// FONT_SIZE_QUICK_BUTTONS
// ---------------------------------------------------------------------------

describe('FONT_SIZE_QUICK_BUTTONS', () => {
  it('enthält genau 4 Schnell-Buttons', () => {
    expect(FONT_SIZE_QUICK_BUTTONS).toHaveLength(4)
  })

  it('hat die Labels S / M / L / XL in dieser Reihenfolge', () => {
    expect(FONT_SIZE_QUICK_BUTTONS.map(b => b.label)).toEqual(['S', 'M', 'L', 'XL'])
  })

  it('hat die px-Werte 16 / 20 / 24 / 30 in dieser Reihenfolge', () => {
    expect(FONT_SIZE_QUICK_BUTTONS.map(b => b.px)).toEqual([16, 20, 24, 30])
  })

  it('alle Schnell-Button-Werte sind in FONT_SIZE_PX_OPTIONS enthalten', () => {
    for (const btn of FONT_SIZE_QUICK_BUTTONS) {
      expect(FONT_SIZE_PX_OPTIONS).toContain(btn.px)
    }
  })
})

// ---------------------------------------------------------------------------
// FONT_SIZE_BADGE
// ---------------------------------------------------------------------------

describe('FONT_SIZE_BADGE', () => {
  it('weist 16px das Badge S zu', () => {
    expect(FONT_SIZE_BADGE[16]).toBe('S')
  })

  it('weist 20px das Badge M zu', () => {
    expect(FONT_SIZE_BADGE[20]).toBe('M')
  })

  it('weist 24px das Badge L zu', () => {
    expect(FONT_SIZE_BADGE[24]).toBe('L')
  })

  it('weist 30px das Badge XL zu', () => {
    expect(FONT_SIZE_BADGE[30]).toBe('XL')
  })

  it('hat kein Badge für 14px, 15px, 40px, 48px, 64px', () => {
    expect(FONT_SIZE_BADGE[14]).toBeUndefined()
    expect(FONT_SIZE_BADGE[15]).toBeUndefined()
    expect(FONT_SIZE_BADGE[40]).toBeUndefined()
    expect(FONT_SIZE_BADGE[48]).toBeUndefined()
    expect(FONT_SIZE_BADGE[64]).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// getActiveTextAlign (unverändert)
// ---------------------------------------------------------------------------

describe('getActiveTextAlign', () => {
  it('gibt "left" zurück wenn kein Wert gesetzt ist', () => {
    expect(getActiveTextAlign(undefined)).toBe('left')
    expect(getActiveTextAlign({})).toBe('left')
  })

  it('gibt "left" zurück bei explizitem "left"', () => {
    expect(getActiveTextAlign({ textAlign: 'left' })).toBe('left')
  })

  it('gibt die korrekte Ausrichtung zurück', () => {
    expect(getActiveTextAlign({ textAlign: 'center' })).toBe('center')
    expect(getActiveTextAlign({ textAlign: 'right' })).toBe('right')
  })

  it('gibt "left" zurück bei unbekanntem Wert', () => {
    expect(getActiveTextAlign({ textAlign: 'justify' })).toBe('left')
  })
})

// ---------------------------------------------------------------------------
// Store-Integration: updateBlock mit px-Wert
// ---------------------------------------------------------------------------

describe('updateBlock – textSize als px-String (Store-Integration)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('speichert "30px" als textSize im Block', () => {
    const { store, stepId, blockId } = setupStoreWithTextBlock()

    store.updateBlock(stepId, blockId, {
      styles: { textSize: '30px' },
    })

    const block = store.content?.steps[0]?.blocks.find(b => b.id === blockId) as TextBlock
    expect(block?.styles?.textSize).toBe('30px')
    expect(store.isDirty).toBe(true)
  })

  it('speichert "16px" als textSize im Block (S = Default-Quickbutton)', () => {
    const { store, stepId, blockId } = setupStoreWithTextBlock()

    store.updateBlock(stepId, blockId, {
      styles: { textSize: '16px' },
    })

    const block = store.content?.steps[0]?.blocks.find(b => b.id === blockId) as TextBlock
    expect(block?.styles?.textSize).toBe('16px')
    expect(getActiveFontSizePx(block?.styles)).toBe(16)
  })

  it('alle 9 FONT_SIZE_PX_OPTIONS können als px-Strings gespeichert werden', () => {
    const { store, stepId, blockId } = setupStoreWithTextBlock()

    for (const px of FONT_SIZE_PX_OPTIONS) {
      store.updateBlock(stepId, blockId, { styles: { textSize: `${px}px` } })
      const block = store.content?.steps[0]?.blocks.find(b => b.id === blockId) as TextBlock
      expect(getActiveFontSizePx(block?.styles)).toBe(px)
    }
  })

  it('textSize und textAlign können unabhängig voneinander gesetzt werden', () => {
    const { store, stepId, blockId } = setupStoreWithTextBlock()

    store.updateBlock(stepId, blockId, {
      styles: { textSize: '24px' },
    })

    const blockAfterSize = store.content?.steps[0]?.blocks.find(b => b.id === blockId) as TextBlock
    store.updateBlock(stepId, blockId, {
      styles: { ...(blockAfterSize.styles ?? {}), textAlign: 'center' },
    })

    const final = store.content?.steps[0]?.blocks.find(b => b.id === blockId) as TextBlock
    expect(final?.styles?.textSize).toBe('24px')
    expect(final?.styles?.textAlign).toBe('center')
  })

  it('speichert "right" als textAlign im Block', () => {
    const { store, stepId, blockId } = setupStoreWithTextBlock()

    store.updateBlock(stepId, blockId, {
      styles: { textAlign: 'right' },
    })

    const block = store.content?.steps[0]?.blocks.find(b => b.id === blockId) as TextBlock
    expect(block?.styles?.textAlign).toBe('right')
    expect(store.isDirty).toBe(true)
  })

  it('leerer String für textAlign wird als "left" interpretiert (Default)', () => {
    const { store, stepId, blockId } = setupStoreWithTextBlock()

    store.updateBlock(stepId, blockId, { styles: { textAlign: '' } })

    const block = store.content?.steps[0]?.blocks.find(b => b.id === blockId) as TextBlock
    expect(getActiveTextAlign(block?.styles)).toBe('left')
  })
})
