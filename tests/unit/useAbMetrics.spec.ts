/**
 * Unit-Tests fuer das A/B-Metriken-Feature (M3.8).
 *
 * Getestet werden:
 * 1. formatAbConversionRate() – Formatierung als deutsche Prozentzahl,
 *    inkl. Grenzfall rate=0 (views=0 -> Division durch 0 verhindert).
 * 2. isBestConversion() – Gewinner-Hervorhebungs-Logik:
 *    nur eine Variante, Gleichstand, klarer Gewinner.
 * 3. useAbMetrics().get() – API-Aufruf mit gemocktem useApi.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  formatAbConversionRate,
  isBestConversion,
  useAbMetrics,
} from '../../app/composables/useAbMetrics'
import type { AbVariantMetrics, AbTestMetricsResponse } from '../../app/composables/useAbMetrics'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockApiFetch = vi.hoisted(() => vi.fn())

vi.mock('~/composables/useApi', () => ({
  useApi: vi.fn(() => mockApiFetch),
}))

// ---------------------------------------------------------------------------
// Testdaten
// ---------------------------------------------------------------------------

function makeVariant(
  id: number,
  conversionRate: number,
  isControl = false,
): AbVariantMetrics {
  return {
    ab_variant_id: id,
    label: isControl ? 'Kontrolle' : 'Treatment',
    is_control: isControl,
    views: conversionRate > 0 ? 100 : 0,
    starts: 80,
    leads: conversionRate > 0 ? Math.round(conversionRate) : 0,
    conversion_rate: conversionRate,
  }
}

const mockMetricsResponse: AbTestMetricsResponse = {
  data: {
    id: 1,
    name: 'Mein Test',
    status: 'running',
    winner_variant_id: null,
    started_at: '2026-06-01T00:00:00+00:00',
    ended_at: null,
    variants: [makeVariant(1, 20.0, true), makeVariant(2, 33.33)],
  },
}

// ---------------------------------------------------------------------------
// formatAbConversionRate
// ---------------------------------------------------------------------------

describe('formatAbConversionRate', () => {
  it('formatiert 0 als "0,00 %" (views=0 -> Division durch 0 verhindert)', () => {
    expect(formatAbConversionRate(0)).toBe('0,00 %')
  })

  it('formatiert 20 als "20,00 %"', () => {
    expect(formatAbConversionRate(20)).toBe('20,00 %')
  })

  it('formatiert 33.33 als "33,33 %"', () => {
    expect(formatAbConversionRate(33.33)).toBe('33,33 %')
  })

  it('formatiert 100 als "100,00 %"', () => {
    expect(formatAbConversionRate(100)).toBe('100,00 %')
  })

  it('nutzt ein Komma als Dezimaltrennzeichen', () => {
    expect(formatAbConversionRate(2.5)).toContain(',')
    expect(formatAbConversionRate(2.5)).not.toContain('.')
  })

  it('enthaelt das %-Zeichen', () => {
    expect(formatAbConversionRate(5)).toContain('%')
  })

  it('rundet auf 2 Nachkommastellen', () => {
    // 1/3 = 0.333... -> "0,33 %"
    expect(formatAbConversionRate(0.333333)).toBe('0,33 %')
  })
})

// ---------------------------------------------------------------------------
// isBestConversion
// ---------------------------------------------------------------------------

describe('isBestConversion', () => {
  it('gibt false zurueck bei nur einer Variante', () => {
    const variants = [makeVariant(1, 20.0, true)]
    expect(isBestConversion(1, variants)).toBe(false)
  })

  it('gibt false zurueck bei leerer Varianten-Liste', () => {
    expect(isBestConversion(1, [])).toBe(false)
  })

  it('gibt true fuer den klaren Gewinner zurueck', () => {
    const variants = [makeVariant(1, 20.0, true), makeVariant(2, 33.33)]
    expect(isBestConversion(2, variants)).toBe(true)
    expect(isBestConversion(1, variants)).toBe(false)
  })

  it('gibt false bei Gleichstand (keine Hervorhebung)', () => {
    const variants = [makeVariant(1, 25.0, true), makeVariant(2, 25.0)]
    expect(isBestConversion(1, variants)).toBe(false)
    expect(isBestConversion(2, variants)).toBe(false)
  })

  it('gibt false bei Gleichstand mit drei Varianten', () => {
    const variants = [makeVariant(1, 25.0, true), makeVariant(2, 25.0), makeVariant(3, 25.0)]
    expect(isBestConversion(1, variants)).toBe(false)
    expect(isBestConversion(2, variants)).toBe(false)
    expect(isBestConversion(3, variants)).toBe(false)
  })

  it('gibt true fuer die richtige Variante bei views=0 Szenario', () => {
    // Variante A hat views=0 -> conversion_rate=0
    // Variante B hat normale Conversion
    const variants = [makeVariant(1, 0.0, true), makeVariant(2, 15.0)]
    expect(isBestConversion(2, variants)).toBe(true)
    expect(isBestConversion(1, variants)).toBe(false)
  })

  it('gibt false fuer eine Variante die nicht in der Liste ist', () => {
    const variants = [makeVariant(1, 20.0, true), makeVariant(2, 33.33)]
    expect(isBestConversion(999, variants)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// useAbMetrics
// ---------------------------------------------------------------------------

describe('useAbMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('get() ruft den richtigen Endpunkt auf', async () => {
    mockApiFetch.mockResolvedValueOnce(mockMetricsResponse)

    const { get } = useAbMetrics()
    const result = await get('funnel-uuid-1', 42)

    expect(mockApiFetch).toHaveBeenCalledOnce()
    expect(mockApiFetch).toHaveBeenCalledWith('/funnels/funnel-uuid-1/ab-tests/42/metrics')
    expect(result.data.name).toBe('Mein Test')
    expect(result.data.status).toBe('running')
    expect(result.data.variants).toHaveLength(2)
  })

  it('get() gibt korrekte Varianten-Daten zurueck', async () => {
    mockApiFetch.mockResolvedValueOnce(mockMetricsResponse)

    const { get } = useAbMetrics()
    const result = await get('funnel-uuid-1', 1)

    const [varA, varB] = result.data.variants
    expect(varA.is_control).toBe(true)
    expect(varA.conversion_rate).toBe(20.0)
    expect(varB.is_control).toBe(false)
    expect(varB.conversion_rate).toBe(33.33)
  })

  it('get() wirft den Fehler weiter wenn die API einen Fehler gibt', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('API-Fehler'))

    const { get } = useAbMetrics()
    await expect(get('funnel-uuid-1', 1)).rejects.toThrow('API-Fehler')
  })

  it('get() liefert winner_variant_id wenn Gewinner gesetzt', async () => {
    const withWinner: AbTestMetricsResponse = {
      data: {
        ...mockMetricsResponse.data,
        status: 'concluded',
        winner_variant_id: 2,
      },
    }
    mockApiFetch.mockResolvedValueOnce(withWinner)

    const { get } = useAbMetrics()
    const result = await get('funnel-uuid-1', 1)

    expect(result.data.winner_variant_id).toBe(2)
    expect(result.data.status).toBe('concluded')
  })
})
