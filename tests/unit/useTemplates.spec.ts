/**
 * Unit-Tests fuer useTemplates.ts (B14 Vorlagen-Galerie).
 *
 * Geprueft wird:
 * - list():                    GET /templates
 * - createFunnelFromTemplate(): POST /workspaces/{wsUuid}/templates/{tplUuid}/create-funnel
 * - saveAsTemplate():          POST /funnels/{funnelUuid}/save-as-template
 *   - Mit und ohne description-Feld
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTemplates } from '../../app/composables/useTemplates'
import type { Funnel, Template, TemplateListResponse, TemplateResponse } from '../../app/types/funnel'

// ---------------------------------------------------------------------------
// Mock: useApi
// ---------------------------------------------------------------------------

const mockApiFn = vi.hoisted(() => vi.fn())

vi.mock('~/composables/useApi', () => ({
  useApi: () => mockApiFn,
}))

// ---------------------------------------------------------------------------
// Testdaten
// ---------------------------------------------------------------------------

const sampleTemplate: Template = {
  id: 'tpl-uuid-1',
  name: 'Leadgenerierung Basis',
  category: 'Leadgenerierung',
  description: 'Einfacher Lead-Funnel mit E-Mail-Capture.',
  thumbnail_url: null,
  schema_version: '1.0.0',
  is_system: true,
  sort_order: 1,
  created_at: '2025-01-01T00:00:00Z',
}

const sampleTemplateListResponse: TemplateListResponse = {
  data: [sampleTemplate],
  meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
}

const sampleTemplateResponse: TemplateResponse = {
  data: sampleTemplate,
}

const sampleFunnel: Funnel = {
  id: 'funnel-uuid-new',
  name: 'Leadgenerierung Basis',
  slug: 'leadgenerierung-basis',
  status: 'draft',
  branding: null,
  published_version: null,
  draft_version: {
    id: 'version-uuid-1',
    version_number: 1,
    schema_version: '1.0.0',
    label: null,
    published_at: null,
  },
  created_at: '2025-06-01T00:00:00Z',
  updated_at: '2025-06-01T00:00:00Z',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --- list() ---

  it('list() sendet GET an /templates', async () => {
    mockApiFn.mockResolvedValue(sampleTemplateListResponse)
    const { list } = useTemplates()
    const result = await list()
    expect(mockApiFn).toHaveBeenCalledWith('/templates')
    expect(result.data).toHaveLength(1)
    expect(result.data[0]?.id).toBe('tpl-uuid-1')
  })

  it('list() leitet den API-Fehler weiter', async () => {
    mockApiFn.mockRejectedValue(new Error('Netzwerkfehler'))
    const { list } = useTemplates()
    await expect(list()).rejects.toThrow('Netzwerkfehler')
  })

  // --- createFunnelFromTemplate() ---

  it('createFunnelFromTemplate() sendet POST an den korrekten Endpunkt', async () => {
    mockApiFn.mockResolvedValue({ data: sampleFunnel })
    const { createFunnelFromTemplate } = useTemplates()
    await createFunnelFromTemplate('ws-uuid-1', 'tpl-uuid-1')
    expect(mockApiFn).toHaveBeenCalledWith(
      '/workspaces/ws-uuid-1/templates/tpl-uuid-1/create-funnel',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('createFunnelFromTemplate() schickt leeren Body wenn kein Name angegeben', async () => {
    mockApiFn.mockResolvedValue({ data: sampleFunnel })
    const { createFunnelFromTemplate } = useTemplates()
    await createFunnelFromTemplate('ws-uuid-1', 'tpl-uuid-1')
    expect(mockApiFn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: {} }),
    )
  })

  it('createFunnelFromTemplate() schickt name im Body wenn angegeben', async () => {
    mockApiFn.mockResolvedValue({ data: sampleFunnel })
    const { createFunnelFromTemplate } = useTemplates()
    await createFunnelFromTemplate('ws-uuid-1', 'tpl-uuid-1', 'Mein Funnel')
    expect(mockApiFn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: { name: 'Mein Funnel' } }),
    )
  })

  it('createFunnelFromTemplate() gibt den neuen Funnel zurueck', async () => {
    mockApiFn.mockResolvedValue({ data: sampleFunnel })
    const { createFunnelFromTemplate } = useTemplates()
    const result = await createFunnelFromTemplate('ws-uuid-2', 'tpl-uuid-1')
    expect(result.data.id).toBe('funnel-uuid-new')
    expect(result.data.status).toBe('draft')
  })

  it('createFunnelFromTemplate() baut die UUID korrekt in die URL ein', async () => {
    mockApiFn.mockResolvedValue({ data: sampleFunnel })
    const { createFunnelFromTemplate } = useTemplates()
    await createFunnelFromTemplate('my-workspace', 'my-template')
    expect(mockApiFn).toHaveBeenCalledWith(
      '/workspaces/my-workspace/templates/my-template/create-funnel',
      expect.any(Object),
    )
  })

  // --- saveAsTemplate() ---

  it('saveAsTemplate() sendet POST an /funnels/{uuid}/save-as-template', async () => {
    mockApiFn.mockResolvedValue(sampleTemplateResponse)
    const { saveAsTemplate } = useTemplates()
    await saveAsTemplate('funnel-uuid-1', {
      name: 'Neue Vorlage',
      category: 'Leadgenerierung',
    })
    expect(mockApiFn).toHaveBeenCalledWith(
      '/funnels/funnel-uuid-1/save-as-template',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('saveAsTemplate() sendet name und category im Body', async () => {
    mockApiFn.mockResolvedValue(sampleTemplateResponse)
    const { saveAsTemplate } = useTemplates()
    await saveAsTemplate('funnel-uuid-1', {
      name: 'Quiz-Vorlage',
      category: 'Quiz',
    })
    expect(mockApiFn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.objectContaining({
          name: 'Quiz-Vorlage',
          category: 'Quiz',
        }),
      }),
    )
  })

  it('saveAsTemplate() sendet description wenn angegeben', async () => {
    mockApiFn.mockResolvedValue(sampleTemplateResponse)
    const { saveAsTemplate } = useTemplates()
    await saveAsTemplate('funnel-uuid-1', {
      name: 'Vorlage mit Beschreibung',
      category: 'Sonstiges',
      description: 'Eine kurze Erklärung.',
    })
    expect(mockApiFn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.objectContaining({
          description: 'Eine kurze Erklärung.',
        }),
      }),
    )
  })

  it('saveAsTemplate() gibt die erstellte Vorlage zurueck', async () => {
    mockApiFn.mockResolvedValue(sampleTemplateResponse)
    const { saveAsTemplate } = useTemplates()
    const result = await saveAsTemplate('funnel-uuid-1', {
      name: 'Test',
      category: 'Quiz',
    })
    expect(result.data.id).toBe('tpl-uuid-1')
    expect(result.data.is_system).toBe(true)
  })

  it('saveAsTemplate() leitet den API-Fehler weiter', async () => {
    mockApiFn.mockRejectedValue(new Error('403 Forbidden'))
    const { saveAsTemplate } = useTemplates()
    await expect(
      saveAsTemplate('funnel-uuid-1', { name: 'X', category: 'Y' }),
    ).rejects.toThrow('403 Forbidden')
  })
})
