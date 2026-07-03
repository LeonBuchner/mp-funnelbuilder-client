/**
 * Unit-Tests fuer useWorkspacePerformance.
 *
 * Getestet werden:
 * 1. getPerformanceDateRange() - Zeitraum-Berechnung (deterministisch, fixes Datum)
 * 2. getPerformanceYMax()     - Y-Achsen-Maximum inkl. Division-by-Zero-Schutz
 * 3. getPerformanceBarPercent() - Balkenhoehe in Prozent inkl. Division-by-Zero
 * 4. formatWorkspaceConversionRate() - Formatierung als deutsche Prozentzahl
 * 5. formatPerformanceDate()  - ISO-Datum -> DD.MM.-Format
 * 6. toPerformanceISODate()   - Date -> YYYY-MM-DD
 * 7. useWorkspacePerformance().get() - API-Aufruf mit gemocktem useApi
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getPerformanceDateRange,
  getPerformanceYMax,
  getPerformanceBarPercent,
  formatWorkspaceConversionRate,
  formatPerformanceDate,
  toPerformanceISODate,
  useWorkspacePerformance,
} from '../../app/composables/useWorkspacePerformance'
import type { WorkspacePerformanceResponse } from '../../app/types/workspace-performance'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockApiFetch = vi.hoisted(() => vi.fn())

vi.mock('~/composables/useApi', () => ({
  useApi: vi.fn(() => mockApiFetch),
}))

// ---------------------------------------------------------------------------
// Hilfsdaten
// ---------------------------------------------------------------------------

const mockResponse: WorkspacePerformanceResponse = {
  data: {
    totals: {
      views: 1000,
      starts: 800,
      leads: 50,
      conversion_rate: 5.0,
    },
    funnels: [
      {
        funnel: { id: 'f-uuid-1', name: 'Funnel A', status: 'published' },
        views: 600,
        starts: 480,
        leads: 30,
        conversion_rate: 5.0,
      },
    ],
    timeline: [
      { date: '2025-01-24', views: 100, leads: 5 },
      { date: '2025-01-25', views: 150, leads: 8 },
    ],
  },
}

// Fixer Zeitpunkt: 31. Januar 2025, 12:00 UTC
const FIXED_NOW = new Date('2025-01-31T12:00:00.000Z')

// ---------------------------------------------------------------------------
// toPerformanceISODate
// ---------------------------------------------------------------------------

describe('toPerformanceISODate', () => {
  it('gibt ein Datum als YYYY-MM-DD zurueck', () => {
    expect(toPerformanceISODate(new Date('2025-06-15T08:00:00.000Z'))).toBe('2025-06-15')
  })

  it('schneidet die Uhrzeit korrekt ab', () => {
    expect(toPerformanceISODate(new Date('2024-12-01T23:59:59.000Z'))).toBe('2024-12-01')
  })
})

// ---------------------------------------------------------------------------
// getPerformanceDateRange
// ---------------------------------------------------------------------------

describe('getPerformanceDateRange', () => {
  it('"all" gibt leere Parameter zurueck (kein Datumsfilter)', () => {
    const result = getPerformanceDateRange('all', FIXED_NOW)
    expect(result).toEqual({})
    expect(result.from).toBeUndefined()
    expect(result.to).toBeUndefined()
  })

  it('"7d" setzt to = 2025-01-31 und from = 2025-01-24', () => {
    const result = getPerformanceDateRange('7d', FIXED_NOW)
    expect(result.to).toBe('2025-01-31')
    expect(result.from).toBe('2025-01-24')
  })

  it('"30d" setzt to = 2025-01-31 und from = 2025-01-01', () => {
    const result = getPerformanceDateRange('30d', FIXED_NOW)
    expect(result.to).toBe('2025-01-31')
    expect(result.from).toBe('2025-01-01')
  })

  it('"90d" setzt to = 2025-01-31 und from = 2024-11-02', () => {
    const result = getPerformanceDateRange('90d', FIXED_NOW)
    expect(result.to).toBe('2025-01-31')
    expect(result.from).toBe('2024-11-02')
  })

  it('from liegt immer vor to', () => {
    for (const period of ['7d', '30d', '90d'] as const) {
      const result = getPerformanceDateRange(period, FIXED_NOW)
      expect(result.from).toBeDefined()
      expect(result.to).toBeDefined()
      expect(result.from! < result.to!).toBe(true)
    }
  })

  it('from und to sind valide ISO-Datum-Strings (YYYY-MM-DD)', () => {
    const isoPattern = /^\d{4}-\d{2}-\d{2}$/
    const r7 = getPerformanceDateRange('7d', FIXED_NOW)
    const r30 = getPerformanceDateRange('30d', FIXED_NOW)
    const r90 = getPerformanceDateRange('90d', FIXED_NOW)
    expect(isoPattern.test(r7.from!)).toBe(true)
    expect(isoPattern.test(r7.to!)).toBe(true)
    expect(isoPattern.test(r30.from!)).toBe(true)
    expect(isoPattern.test(r90.from!)).toBe(true)
  })

  it('benutzt standardmaessig das aktuelle Datum', () => {
    const result = getPerformanceDateRange('7d')
    expect(result.from).toBeDefined()
    expect(result.to).toBeDefined()
    expect(/^\d{4}-\d{2}-\d{2}$/.test(result.from!)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// getPerformanceYMax
// ---------------------------------------------------------------------------

describe('getPerformanceYMax', () => {
  it('gibt 1 zurueck fuer leere Liste (Division-by-Zero-Schutz)', () => {
    expect(getPerformanceYMax([])).toBe(1)
  })

  it('gibt 1 zurueck wenn alle Werte 0 sind', () => {
    expect(getPerformanceYMax([
      { date: '2025-01-01', views: 0, leads: 0 },
    ])).toBe(1)
  })

  it('gibt den Maximum-Wert ueber views und leads zurueck', () => {
    const points = [
      { date: '2025-01-01', views: 100, leads: 5 },
      { date: '2025-01-02', views: 80, leads: 200 },
    ]
    expect(getPerformanceYMax(points)).toBe(200)
  })

  it('nimmt views, wenn views > leads', () => {
    const points = [
      { date: '2025-01-01', views: 500, leads: 50 },
    ]
    expect(getPerformanceYMax(points)).toBe(500)
  })
})

// ---------------------------------------------------------------------------
// getPerformanceBarPercent
// ---------------------------------------------------------------------------

describe('getPerformanceBarPercent', () => {
  it('gibt 0 zurueck wenn yMax 0 ist (Division-by-Zero-Schutz)', () => {
    expect(getPerformanceBarPercent(50, 0)).toBe(0)
  })

  it('gibt 0 zurueck wenn yMax negativ ist', () => {
    expect(getPerformanceBarPercent(50, -1)).toBe(0)
  })

  it('gibt 0 zurueck wenn value 0 ist', () => {
    expect(getPerformanceBarPercent(0, 100)).toBe(0)
  })

  it('gibt 0 zurueck wenn value negativ ist', () => {
    expect(getPerformanceBarPercent(-5, 100)).toBe(0)
  })

  it('gibt 50 zurueck fuer value=50, yMax=100', () => {
    expect(getPerformanceBarPercent(50, 100)).toBe(50)
  })

  it('gibt 100 zurueck wenn value >= yMax', () => {
    expect(getPerformanceBarPercent(100, 100)).toBe(100)
    expect(getPerformanceBarPercent(150, 100)).toBe(100)
  })

  it('rundet auf ganze Zahlen', () => {
    const result = getPerformanceBarPercent(1, 3)
    expect(Number.isInteger(result)).toBe(true)
    expect(result).toBe(33)
  })
})

// ---------------------------------------------------------------------------
// formatWorkspaceConversionRate
// ---------------------------------------------------------------------------

describe('formatWorkspaceConversionRate', () => {
  it('formatiert 2.43 als "2,43 %"', () => {
    expect(formatWorkspaceConversionRate(2.43)).toBe('2,43 %')
  })

  it('formatiert 0 als "0,00 %" (Division-by-Zero-Ergebnis sicher dargestellt)', () => {
    expect(formatWorkspaceConversionRate(0)).toBe('0,00 %')
  })

  it('formatiert 100 als "100,00 %"', () => {
    expect(formatWorkspaceConversionRate(100)).toBe('100,00 %')
  })

  it('nutzt Komma als Dezimaltrennzeichen (deutsch)', () => {
    const result = formatWorkspaceConversionRate(1.5)
    expect(result).toContain(',')
    expect(result).not.toContain('.')
  })

  it('enthaelt das %-Zeichen', () => {
    expect(formatWorkspaceConversionRate(5)).toContain('%')
  })

  it('rundet auf 2 Nachkommastellen', () => {
    expect(formatWorkspaceConversionRate(2.2700001)).toBe('2,27 %')
  })
})

// ---------------------------------------------------------------------------
// formatPerformanceDate
// ---------------------------------------------------------------------------

describe('formatPerformanceDate', () => {
  it('wandelt 2025-01-31 in 31.01. um', () => {
    expect(formatPerformanceDate('2025-01-31')).toBe('31.01.')
  })

  it('wandelt 2025-12-05 in 05.12. um', () => {
    expect(formatPerformanceDate('2025-12-05')).toBe('05.12.')
  })

  it('gibt den Original-String zurueck bei ungueltigem Format', () => {
    expect(formatPerformanceDate('invalid')).toBe('invalid')
  })
})

// ---------------------------------------------------------------------------
// useWorkspacePerformance
// ---------------------------------------------------------------------------

describe('useWorkspacePerformance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('get() ruft den richtigen Endpunkt ohne Parameter auf', async () => {
    mockApiFetch.mockResolvedValueOnce(mockResponse)

    const { get } = useWorkspacePerformance()
    const result = await get('ws-uuid-1')

    expect(mockApiFetch).toHaveBeenCalledOnce()
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/workspaces/ws-uuid-1/performance',
      { query: {} },
    )
    expect(result.data.totals.views).toBe(1000)
    expect(result.data.totals.leads).toBe(50)
  })

  it('get() uebergibt from und to als Query-Parameter', async () => {
    mockApiFetch.mockResolvedValueOnce(mockResponse)

    const { get } = useWorkspacePerformance()
    await get('ws-uuid-1', { from: '2025-01-01', to: '2025-01-31' })

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/workspaces/ws-uuid-1/performance',
      { query: { from: '2025-01-01', to: '2025-01-31' } },
    )
  })

  it('get() uebergibt nur "from", wenn "to" fehlt', async () => {
    mockApiFetch.mockResolvedValueOnce(mockResponse)

    const { get } = useWorkspacePerformance()
    await get('ws-uuid-1', { from: '2025-01-01' })

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/workspaces/ws-uuid-1/performance',
      { query: { from: '2025-01-01' } },
    )
  })

  it('get() uebergibt leere Query-Parameter wenn params leer ist', async () => {
    mockApiFetch.mockResolvedValueOnce(mockResponse)

    const { get } = useWorkspacePerformance()
    await get('ws-uuid-1', {})

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/workspaces/ws-uuid-1/performance',
      { query: {} },
    )
  })

  it('get() wirft den Fehler weiter wenn die API fehlschlaegt', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('Netzwerkfehler'))

    const { get } = useWorkspacePerformance()
    await expect(get('ws-uuid-1')).rejects.toThrow('Netzwerkfehler')
  })

  it('get() gibt vollstaendige WorkspacePerformanceData zurueck', async () => {
    mockApiFetch.mockResolvedValueOnce(mockResponse)

    const { get } = useWorkspacePerformance()
    const result = await get('ws-uuid-2', { from: '2025-01-01', to: '2025-01-31' })

    expect(result.data.totals.conversion_rate).toBe(5.0)
    expect(result.data.funnels).toHaveLength(1)
    expect(result.data.funnels[0]?.funnel.name).toBe('Funnel A')
    expect(result.data.timeline).toHaveLength(2)
    expect(result.data.timeline[0]?.date).toBe('2025-01-24')
  })

  it('get() uebergibt die Workspace-UUID korrekt in der URL', async () => {
    mockApiFetch.mockResolvedValueOnce(mockResponse)

    const { get } = useWorkspacePerformance()
    await get('my-special-workspace-uuid-999')

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/workspaces/my-special-workspace-uuid-999/performance',
      expect.any(Object),
    )
  })
})
