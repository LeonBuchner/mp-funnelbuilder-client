/**
 * Unit-Tests fuer useFunnels.ts.
 *
 * Geprueft wird:
 * - clone():       POST /funnels/{funnelUuid}/clone (B12 Duplizieren)
 * - Spot-Tests fuer bestehende Endpunkte als Regressionssicherung
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useFunnels } from '../../app/composables/useFunnels'
import type { FunnelListItem } from '../../app/types/funnel'

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

const sampleCloneItem: FunnelListItem = {
  id: 'clone-uuid-1',
  name: 'Mein Funnel (Kopie)',
  slug: 'mein-funnel-kopie',
  status: 'draft',
  updated_at: '2025-06-01T12:00:00Z',
  is_favorite: false,
  thumbnail_url: null,
  views_count: 0,
  leads_count: 0,
  conversion_rate: 0,
  published_version: null,
  branding: null,
}

// ---------------------------------------------------------------------------
// clone()
// ---------------------------------------------------------------------------

describe('useFunnels – clone()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('clone() sendet POST an /funnels/{uuid}/clone', async () => {
    mockApiFn.mockResolvedValue({ data: sampleCloneItem })
    const { clone } = useFunnels()
    await clone('original-uuid-1')
    expect(mockApiFn).toHaveBeenCalledWith(
      '/funnels/original-uuid-1/clone',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('clone() gibt den Klon-Funnel zurueck', async () => {
    mockApiFn.mockResolvedValue({ data: sampleCloneItem })
    const { clone } = useFunnels()
    const result = await clone('original-uuid-1')
    expect(result.data.id).toBe('clone-uuid-1')
    expect(result.data.name).toBe('Mein Funnel (Kopie)')
    expect(result.data.status).toBe('draft')
  })

  it('clone() baut die korrekte UUID in die URL ein', async () => {
    mockApiFn.mockResolvedValue({ data: sampleCloneItem })
    const { clone } = useFunnels()
    await clone('specific-funnel-uuid')
    expect(mockApiFn).toHaveBeenCalledWith(
      '/funnels/specific-funnel-uuid/clone',
      expect.any(Object),
    )
  })

  it('clone() leitet den API-Fehler weiter', async () => {
    mockApiFn.mockRejectedValue(new Error('403 Forbidden'))
    const { clone } = useFunnels()
    await expect(clone('funnel-uuid-1')).rejects.toThrow('403 Forbidden')
  })
})

// ---------------------------------------------------------------------------
// Regressionstests fuer bestehende Endpunkte
// ---------------------------------------------------------------------------

describe('useFunnels – bestehende Endpunkte', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('list() sendet GET an /workspaces/{wsUuid}/funnels', async () => {
    mockApiFn.mockResolvedValue({ data: [], current_page: 1, last_page: 1, per_page: 20, total: 0 })
    const { list } = useFunnels()
    await list('ws-uuid-1')
    expect(mockApiFn).toHaveBeenCalledWith('/workspaces/ws-uuid-1/funnels')
  })

  it('remove() sendet DELETE an /funnels/{uuid}', async () => {
    mockApiFn.mockResolvedValue(undefined)
    const { remove } = useFunnels()
    await remove('funnel-uuid-1')
    expect(mockApiFn).toHaveBeenCalledWith(
      '/funnels/funnel-uuid-1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('toggleFavorite() sendet POST an /funnels/{uuid}/favorite', async () => {
    mockApiFn.mockResolvedValue({ id: 'funnel-uuid-1', is_favorite: true })
    const { toggleFavorite } = useFunnels()
    await toggleFavorite('funnel-uuid-1')
    expect(mockApiFn).toHaveBeenCalledWith(
      '/funnels/funnel-uuid-1/favorite',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
