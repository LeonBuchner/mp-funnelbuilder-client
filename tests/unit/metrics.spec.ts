/**
 * Unit-Tests fuer das Metriken-Feature (M1.9).
 *
 * Getestet werden:
 * 1. getMetricsDateRange() - Zeitraum-Berechnung fuer 7/30/90 Tage relativ zu
 *    einem fixen Datum (deterministisch, kein Date.now()-Aufruf im Test).
 * 2. formatConversionRate() - Formatierung als deutsche Prozentzahl.
 * 3. toISODate() - Hilfsfunktion fuer ISO-Datum-Strings.
 * 4. useMetrics().get() - API-Aufruf mit gemocktem useApi.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getMetricsDateRange,
  formatConversionRate,
  toISODate,
  useMetrics,
} from '../../app/composables/useMetrics'
import type { MetricsResponse } from '../../app/composables/useMetrics'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockApiFetch = vi.hoisted(() => vi.fn())

vi.mock('~/composables/useApi', () => ({
  useApi: vi.fn(() => mockApiFetch),
}))

// ---------------------------------------------------------------------------
// Hilfsdaten fuer Tests
// ---------------------------------------------------------------------------

const mockMetricsData: MetricsResponse = {
  data: {
    range: { from: null, to: null, label: 'Gesamt' },
    views: 309,
    starts: 250,
    leads: 7,
    conversion_rate: 2.27,
    completion_rate: 85.0,
    messages_sent: 0,
  },
}

// Fixer Zeitpunkt: 31. Januar 2025, 12:00 UTC
// Mittags gewaehlt, damit Timezone-Offsets (+/-12h) den Kalendertag nicht verschieben.
const FIXED_NOW = new Date('2025-01-31T12:00:00.000Z')

// ---------------------------------------------------------------------------
// toISODate
// ---------------------------------------------------------------------------

describe('toISODate', () => {
  it('gibt das Datum als YYYY-MM-DD-String zurueck', () => {
    const date = new Date('2025-06-15T08:00:00.000Z')
    expect(toISODate(date)).toBe('2025-06-15')
  })

  it('schneidet die Uhrzeit korrekt ab', () => {
    const date = new Date('2024-12-01T23:59:59.000Z')
    expect(toISODate(date)).toBe('2024-12-01')
  })
})

// ---------------------------------------------------------------------------
// getMetricsDateRange
// ---------------------------------------------------------------------------

describe('getMetricsDateRange', () => {
  it('"all" gibt leere Parameter zurueck (kein Datumsfilter)', () => {
    const result = getMetricsDateRange('all', FIXED_NOW)
    expect(result).toEqual({})
    expect(result.from).toBeUndefined()
    expect(result.to).toBeUndefined()
  })

  it('"7d" setzt to = 2025-01-31 und from = 2025-01-24', () => {
    const result = getMetricsDateRange('7d', FIXED_NOW)
    expect(result.to).toBe('2025-01-31')
    expect(result.from).toBe('2025-01-24')
  })

  it('"30d" setzt to = 2025-01-31 und from = 2025-01-01', () => {
    const result = getMetricsDateRange('30d', FIXED_NOW)
    expect(result.to).toBe('2025-01-31')
    expect(result.from).toBe('2025-01-01')
  })

  it('"90d" setzt to = 2025-01-31 und from = 2024-11-02', () => {
    // 90 Tage vor dem 31. Januar 2025: November 2, 2024
    const result = getMetricsDateRange('90d', FIXED_NOW)
    expect(result.to).toBe('2025-01-31')
    expect(result.from).toBe('2024-11-02')
  })

  it('from liegt immer vor to', () => {
    for (const period of ['7d', '30d', '90d'] as const) {
      const result = getMetricsDateRange(period, FIXED_NOW)
      expect(result.from).toBeDefined()
      expect(result.to).toBeDefined()
      expect(result.from! < result.to!).toBe(true)
    }
  })

  it('benutzt standardmaessig das aktuelle Datum', () => {
    // Kein "now"-Parameter -> Ergebnis hat ein "to" nahe am aktuellen Datum.
    const result = getMetricsDateRange('7d')
    expect(result.from).toBeDefined()
    expect(result.to).toBeDefined()
    // from muss ein gueltiges ISO-Datum sein
    expect(/^\d{4}-\d{2}-\d{2}$/.test(result.from!)).toBe(true)
  })

  it('from und to sind valide ISO-Datum-Strings (YYYY-MM-DD)', () => {
    const isoPattern = /^\d{4}-\d{2}-\d{2}$/
    const r7 = getMetricsDateRange('7d', FIXED_NOW)
    const r30 = getMetricsDateRange('30d', FIXED_NOW)
    const r90 = getMetricsDateRange('90d', FIXED_NOW)
    expect(isoPattern.test(r7.from!)).toBe(true)
    expect(isoPattern.test(r7.to!)).toBe(true)
    expect(isoPattern.test(r30.from!)).toBe(true)
    expect(isoPattern.test(r90.from!)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// formatConversionRate
// ---------------------------------------------------------------------------

describe('formatConversionRate', () => {
  it('formatiert 2.43 als "2,43 %"', () => {
    expect(formatConversionRate(2.43)).toBe('2,43 %')
  })

  it('formatiert 0 als "0,00 %"', () => {
    expect(formatConversionRate(0)).toBe('0,00 %')
  })

  it('formatiert 100 als "100,00 %"', () => {
    expect(formatConversionRate(100)).toBe('100,00 %')
  })

  it('rundet auf 2 Nachkommastellen (2.2700... -> "2,27 %")', () => {
    expect(formatConversionRate(2.27)).toBe('2,27 %')
  })

  it('nutzt ein Komma als Dezimaltrennzeichen (deutsche Locale)', () => {
    const result = formatConversionRate(1.5)
    expect(result).toContain(',')
    expect(result).not.toContain('.')
  })

  it('enthaelt das %-Zeichen', () => {
    expect(formatConversionRate(5)).toContain('%')
  })
})

// ---------------------------------------------------------------------------
// useMetrics
// ---------------------------------------------------------------------------

describe('useMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('get() ruft den richtigen Endpunkt ohne Parameter auf', async () => {
    mockApiFetch.mockResolvedValueOnce(mockMetricsData)

    const { get } = useMetrics()
    const result = await get('funnel-uuid-1')

    expect(mockApiFetch).toHaveBeenCalledOnce()
    expect(mockApiFetch).toHaveBeenCalledWith('/funnels/funnel-uuid-1/metrics', { query: {} })
    expect(result.data.views).toBe(309)
    expect(result.data.leads).toBe(7)
  })

  it('get() uebergibt from und to als Query-Parameter', async () => {
    mockApiFetch.mockResolvedValueOnce(mockMetricsData)

    const { get } = useMetrics()
    await get('funnel-uuid-1', { from: '2025-01-01', to: '2025-01-31' })

    expect(mockApiFetch).toHaveBeenCalledWith('/funnels/funnel-uuid-1/metrics', {
      query: { from: '2025-01-01', to: '2025-01-31' },
    })
  })

  it('get() uebergibt nur "from", wenn "to" fehlt', async () => {
    mockApiFetch.mockResolvedValueOnce(mockMetricsData)

    const { get } = useMetrics()
    await get('funnel-uuid-1', { from: '2025-01-01' })

    expect(mockApiFetch).toHaveBeenCalledWith('/funnels/funnel-uuid-1/metrics', {
      query: { from: '2025-01-01' },
    })
  })

  it('get() gibt leere query-Parameter weiter, wenn params leer ist', async () => {
    mockApiFetch.mockResolvedValueOnce(mockMetricsData)

    const { get } = useMetrics()
    await get('funnel-uuid-1', {})

    expect(mockApiFetch).toHaveBeenCalledWith('/funnels/funnel-uuid-1/metrics', {
      query: {},
    })
  })

  it('get() wirft den Fehler weiter, wenn die API einen Fehler zurueckgibt', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('Netzwerkfehler'))

    const { get } = useMetrics()
    await expect(get('funnel-uuid-1')).rejects.toThrow('Netzwerkfehler')
  })

  it('get() gibt korrekte MetricsData-Werte zurueck', async () => {
    const customData: MetricsResponse = {
      data: {
        range: { from: '2025-01-01', to: '2025-01-31', label: 'Januar 2025' },
        views: 1000,
        starts: 800,
        leads: 50,
        conversion_rate: 5.0,
        completion_rate: 62.5,
        messages_sent: 48,
      },
    }
    mockApiFetch.mockResolvedValueOnce(customData)

    const { get } = useMetrics()
    const result = await get('funnel-uuid-2', { from: '2025-01-01', to: '2025-01-31' })

    expect(result.data.views).toBe(1000)
    expect(result.data.conversion_rate).toBe(5.0)
    expect(result.data.messages_sent).toBe(48)
    expect(result.data.range.label).toBe('Januar 2025')
  })
})
