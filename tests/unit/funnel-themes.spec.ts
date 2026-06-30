/**
 * Unit-Tests fuer useFunnelThemes und themeId-Persistenz im Editor-Store.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import { useFunnelThemes, getThemeCssVars } from '../../app/composables/useFunnelThemes'
import { createEmptyContent } from '../../app/types/funnel'
import type { Funnel } from '../../app/types/funnel'
import { useEditorStore } from '../../app/stores/editor'

// --- Mocks (gehoisted) ---

vi.mock('~/composables/useFunnels', () => ({
  useFunnels: vi.fn(() => ({
    list: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    saveDraft: vi.fn().mockResolvedValue({
      data: { id: 'v1', version_number: 1, schema_version: '1.0.0', label: null, published_at: null },
    }),
    publish: vi.fn(),
    toggleFavorite: vi.fn(),
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

const mockFunnel: Funnel = {
  id: 'funnel-1',
  name: 'Theme-Test Funnel',
  slug: 'theme-test',
  status: 'draft',
  branding: null,
  published_version: null,
  draft_version: {
    id: 'v1',
    version_number: 1,
    schema_version: '1.0.0',
    label: null,
    published_at: null,
    content: createEmptyContent(),
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

function setupStore() {
  const store = useEditorStore()
  store.funnel = { ...mockFunnel }
  store.content = createEmptyContent()
  store.selectedStepId = store.content.steps[0]?.id ?? null
  store.isDirty = false
  return store
}

// ---------------------------------------------------------------------------
// useFunnelThemes
// ---------------------------------------------------------------------------

describe('useFunnelThemes', () => {
  it('enthaelt mindestens 10 Themes', () => {
    const { themes } = useFunnelThemes()
    expect(themes.length).toBeGreaterThanOrEqual(10)
  })

  it('erstes Theme hat ID "mp"', () => {
    const { themes } = useFunnelThemes()
    expect(themes[0]?.id).toBe('mp')
  })

  it('getTheme("mp") gibt das MP-Theme zurueck', () => {
    const { getTheme } = useFunnelThemes()
    const theme = getTheme('mp')
    expect(theme.id).toBe('mp')
    expect(theme.name).toBe('MP')
    expect(theme.vars.primary).toBeDefined()
  })

  it('getTheme mit unbekannter ID faellt auf MP zurueck', () => {
    const { getTheme } = useFunnelThemes()
    const theme = getTheme('nicht-vorhanden')
    expect(theme.id).toBe('mp')
  })

  it('getTheme("calm") gibt das Calm-Theme zurueck', () => {
    const { getTheme } = useFunnelThemes()
    const theme = getTheme('calm')
    expect(theme.id).toBe('calm')
    expect(theme.name).toBe('Calm')
  })

  it('jedes Theme hat alle erforderlichen CSS-Variablen-Felder', () => {
    const { themes } = useFunnelThemes()
    const requiredKeys: (keyof typeof themes[0]['vars'])[] = [
      'primary', 'primaryHover', 'onPrimary', 'bg', 'surface',
      'text', 'muted', 'accent', 'radius', 'font',
    ]
    for (const theme of themes) {
      for (const key of requiredKeys) {
        expect(theme.vars[key], `${theme.id}.vars.${key}`).toBeTruthy()
      }
    }
  })

  it('jedes Theme hat 2 bis 4 Farb-Swatches', () => {
    const { themes } = useFunnelThemes()
    for (const theme of themes) {
      expect(theme.swatches.length, `${theme.id} swatches`).toBeGreaterThanOrEqual(2)
      expect(theme.swatches.length, `${theme.id} swatches`).toBeLessThanOrEqual(4)
    }
  })
})

// ---------------------------------------------------------------------------
// getThemeCssVars (Hilfsfunktion, exportiert fuer Renderer)
// ---------------------------------------------------------------------------

describe('getThemeCssVars', () => {
  it('gibt ein Objekt mit allen --funnel-* Variablen zurueck', () => {
    const { getTheme } = useFunnelThemes()
    const vars = getThemeCssVars(getTheme('mp'))
    expect(vars['--funnel-primary']).toBe('#1c4687')
    expect(vars['--funnel-on-primary']).toBe('#ffffff')
    expect(vars['--funnel-bg']).toBeDefined()
    expect(vars['--funnel-accent']).toBeDefined()
    expect(vars['--funnel-radius']).toBeDefined()
    expect(vars['--funnel-font']).toContain('Inter')
  })

  it('gibt korrekte Vars fuer das Amazon-Theme zurueck', () => {
    const { getTheme } = useFunnelThemes()
    const vars = getThemeCssVars(getTheme('amazon'))
    expect(vars['--funnel-primary']).toBe('#ff9900')
    expect(vars['--funnel-bg']).toBe('#131921')
  })
})

// ---------------------------------------------------------------------------
// updateMeta: themeId im Editor-Store persistieren
// ---------------------------------------------------------------------------

describe('useEditorStore.updateMeta', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('setzt themeId in content.meta und markiert isDirty', () => {
    const store = setupStore()
    expect(store.content?.meta.themeId).toBeUndefined()

    store.updateMeta({ themeId: 'calm' })

    expect(store.content?.meta.themeId).toBe('calm')
    expect(store.isDirty).toBe(true)
  })

  it('ueberschreibt bestehende themeId', () => {
    const store = setupStore()
    store.updateMeta({ themeId: 'mp' })
    store.updateMeta({ themeId: 'artsy' })

    expect(store.content?.meta.themeId).toBe('artsy')
  })

  it('behalt andere meta-Felder beim Update bei', () => {
    const store = setupStore()
    const originalLocale = store.content?.meta.defaultLocale

    store.updateMeta({ themeId: 'brisk' })

    expect(store.content?.meta.defaultLocale).toBe(originalLocale)
    expect(store.content?.meta.themeId).toBe('brisk')
  })

  it('tut nichts wenn kein content vorhanden', () => {
    const store = useEditorStore()
    store.content = null

    // Kein Fehler, kein Update
    expect(() => store.updateMeta({ themeId: 'calm' })).not.toThrow()
    expect(store.isDirty).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Block-Target: textSize-Update (Format-Toolbar Logik)
// ---------------------------------------------------------------------------

describe('Format-Toolbar: textSize via updateBlock', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('setzt textSize auf "hero" im styles-Objekt', () => {
    const store = setupStore()
    const stepId = store.selectedStepId!
    store.addBlock(stepId, 'text')
    const blockId = store.selectedBlockId!

    store.updateBlock(stepId, blockId, { styles: { textSize: 'hero' } })

    const block = store.selectedStep?.blocks.find(b => b.id === blockId)
    expect(block?.type).toBe('text')
    if (block?.type === 'text') {
      expect(block.styles?.textSize).toBe('hero')
    }
    expect(store.isDirty).toBe(true)
  })

  it('mergt bestehende styles beim textSize-Update', () => {
    const store = setupStore()
    const stepId = store.selectedStepId!
    store.addBlock(stepId, 'text')
    const blockId = store.selectedBlockId!

    // Erst color setzen
    store.updateBlock(stepId, blockId, { styles: { color: '#ff0000', textSize: 'large' } })
    // Dann textSize ueberschreiben (color soll erhalten bleiben)
    const block = store.selectedStep?.blocks.find(b => b.id === blockId)
    if (block?.type === 'text') {
      store.updateBlock(stepId, blockId, {
        styles: { ...block.styles, textSize: 'hero' },
      })
    }

    const updated = store.selectedStep?.blocks.find(b => b.id === blockId)
    if (updated?.type === 'text') {
      expect(updated.styles?.textSize).toBe('hero')
      expect(updated.styles?.color).toBe('#ff0000')
    }
  })
})
