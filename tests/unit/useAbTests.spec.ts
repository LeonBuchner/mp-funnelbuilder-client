/**
 * Unit-Tests fuer useAbTests.ts (M3.9).
 *
 * Geprueft werden:
 * 1. calcSplitB()          – B = 100 - A, Summe immer 100
 * 2. formatSplitDisplay()  – lesbarer Split-String
 * 3. hasSelectableVersionB() – ob eine Zweit-Version waehlbar ist
 * 4. Composable-Methoden   – korrekte Request-URL + HTTP-Method
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  calcSplitB,
  formatSplitDisplay,
  hasSelectableVersionB,
  useAbTests,
} from '../../app/composables/useAbTests'
import type { FunnelVersionListResponse } from '../../app/types/ab-test'

// ---------------------------------------------------------------------------
// Mock: useApi
// ---------------------------------------------------------------------------

const mockApiFetch = vi.hoisted(() => vi.fn())

vi.mock('~/composables/useApi', () => ({
  useApi: vi.fn(() => mockApiFetch),
}))

// ---------------------------------------------------------------------------
// calcSplitB
// ---------------------------------------------------------------------------

describe('calcSplitB', () => {
  it('gibt 100 - splitA zurueck', () => {
    expect(calcSplitB(50)).toBe(50)
    expect(calcSplitB(70)).toBe(30)
    expect(calcSplitB(1)).toBe(99)
    expect(calcSplitB(99)).toBe(1)
  })

  it('Summe A + B ergibt immer 100', () => {
    for (let a = 1; a <= 99; a++) {
      expect(a + calcSplitB(a)).toBe(100)
    }
  })
})

// ---------------------------------------------------------------------------
// formatSplitDisplay
// ---------------------------------------------------------------------------

describe('formatSplitDisplay', () => {
  it('formatiert 50/50 korrekt', () => {
    expect(formatSplitDisplay(50)).toBe('A 50 % / B 50 %')
  })

  it('formatiert 70/30 korrekt', () => {
    expect(formatSplitDisplay(70)).toBe('A 70 % / B 30 %')
  })

  it('formatiert Grenzwerte 1 und 99 korrekt', () => {
    expect(formatSplitDisplay(1)).toBe('A 1 % / B 99 %')
    expect(formatSplitDisplay(99)).toBe('A 99 % / B 1 %')
  })

  it('enthaelt das %-Zeichen fuer beide Varianten', () => {
    const result = formatSplitDisplay(60)
    expect(result).toContain('%')
    expect(result).toContain('A')
    expect(result).toContain('B')
  })
})

// ---------------------------------------------------------------------------
// hasSelectableVersionB
// ---------------------------------------------------------------------------

describe('hasSelectableVersionB', () => {
  const makeVersionResponse = (
    versions: Array<{ id: number; is_current_published: boolean }>,
  ): FunnelVersionListResponse => ({
    data: versions.map((v) => ({
      id: v.id,
      version_number: v.id,
      label: `Version ${v.id}`,
      published_at: '2026-06-01T00:00:00+00:00',
      is_current_published: v.is_current_published,
    })),
  })

  it('gibt false zurueck wenn keine Versionen vorhanden', () => {
    expect(hasSelectableVersionB(makeVersionResponse([]))).toBe(false)
  })

  it('gibt false zurueck wenn nur die aktuelle Live-Version vorhanden ist', () => {
    const response = makeVersionResponse([{ id: 1, is_current_published: true }])
    expect(hasSelectableVersionB(response)).toBe(false)
  })

  it('gibt true zurueck wenn eine nicht-aktive Version vorhanden ist', () => {
    const response = makeVersionResponse([
      { id: 2, is_current_published: true },
      { id: 1, is_current_published: false },
    ])
    expect(hasSelectableVersionB(response)).toBe(true)
  })

  it('gibt true zurueck wenn mehrere waehlbare Versionen vorhanden sind', () => {
    const response = makeVersionResponse([
      { id: 3, is_current_published: true },
      { id: 2, is_current_published: false },
      { id: 1, is_current_published: false },
    ])
    expect(hasSelectableVersionB(response)).toBe(true)
  })

  it('gibt false zurueck wenn alle Versionen is_current_published=true haben (Sonderfall)', () => {
    // Pathologischer Fall: darf in der Praxis nicht auftreten, aber sicher ist sicher
    const response = makeVersionResponse([
      { id: 1, is_current_published: true },
      { id: 2, is_current_published: true },
    ])
    expect(hasSelectableVersionB(response)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// useAbTests – Composable-Methoden
// ---------------------------------------------------------------------------

describe('useAbTests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const funnelId = 'funnel-abc-123'

  it('list() ruft GET /funnels/{id}/ab-tests auf', async () => {
    mockApiFetch.mockResolvedValueOnce({ data: [] })
    const { list } = useAbTests()
    await list(funnelId)
    expect(mockApiFetch).toHaveBeenCalledWith(`/funnels/${funnelId}/ab-tests`)
  })

  it('create() ruft POST /funnels/{id}/ab-tests auf', async () => {
    mockApiFetch.mockResolvedValueOnce({ data: {} })
    const { create } = useAbTests()
    await create(funnelId, { name: 'Test', variant_b_version_id: 2, traffic_split_pct_a: 50 })
    expect(mockApiFetch).toHaveBeenCalledWith(
      `/funnels/${funnelId}/ab-tests`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('create() sendet den Payload korrekt', async () => {
    mockApiFetch.mockResolvedValueOnce({ data: {} })
    const { create } = useAbTests()
    const payload = { name: 'Mein Test', variant_b_version_id: 5, traffic_split_pct_a: 70 }
    await create(funnelId, payload)
    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: payload }),
    )
  })

  it('start() ruft POST .../start auf', async () => {
    mockApiFetch.mockResolvedValueOnce({ data: {} })
    const { start } = useAbTests()
    await start(funnelId, 42)
    expect(mockApiFetch).toHaveBeenCalledWith(
      `/funnels/${funnelId}/ab-tests/42/start`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('pause() ruft POST .../pause auf', async () => {
    mockApiFetch.mockResolvedValueOnce({ data: {} })
    const { pause } = useAbTests()
    await pause(funnelId, 42)
    expect(mockApiFetch).toHaveBeenCalledWith(
      `/funnels/${funnelId}/ab-tests/42/pause`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('conclude() ruft POST .../conclude auf', async () => {
    mockApiFetch.mockResolvedValueOnce({ data: {} })
    const { conclude } = useAbTests()
    await conclude(funnelId, 42)
    expect(mockApiFetch).toHaveBeenCalledWith(
      `/funnels/${funnelId}/ab-tests/42/conclude`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('remove() ruft DELETE /funnels/{id}/ab-tests/{abTestId} auf', async () => {
    mockApiFetch.mockResolvedValueOnce(undefined)
    const { remove } = useAbTests()
    await remove(funnelId, 42)
    expect(mockApiFetch).toHaveBeenCalledWith(
      `/funnels/${funnelId}/ab-tests/42`,
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('setWinner() ruft POST .../winner/{variantId} auf', async () => {
    mockApiFetch.mockResolvedValueOnce({ data: {} })
    const { setWinner } = useAbTests()
    await setWinner(funnelId, 42, 99)
    expect(mockApiFetch).toHaveBeenCalledWith(
      `/funnels/${funnelId}/ab-tests/42/winner/99`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('listVersions() ruft GET /funnels/{id}/versions auf', async () => {
    mockApiFetch.mockResolvedValueOnce({ data: [] })
    const { listVersions } = useAbTests()
    await listVersions(funnelId)
    expect(mockApiFetch).toHaveBeenCalledWith(`/funnels/${funnelId}/versions`)
  })

  it('list() leitet API-Fehler weiter', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('403 Forbidden'))
    const { list } = useAbTests()
    await expect(list(funnelId)).rejects.toThrow('403 Forbidden')
  })

  it('remove() leitet API-Fehler weiter', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('422 Validation'))
    const { remove } = useAbTests()
    await expect(remove(funnelId, 1)).rejects.toThrow('422 Validation')
  })
})
