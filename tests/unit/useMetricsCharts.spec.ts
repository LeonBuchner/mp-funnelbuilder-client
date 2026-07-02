/**
 * Unit-Tests fuer die vier Metriken-Chart-Composables (M4.7).
 *
 * Getestet werden:
 * 1. useMetricsDropoff: getDropoffMaxViews, getDropoffBarPercent, formatDropoffRate,
 *    Division-durch-Zero-Faelle, API-Aufruf
 * 2. useMetricsDevices: getDeviceLabel, normalizeDevicePercents,
 *    Division-durch-Zero, API-Aufruf
 * 3. useMetricsTimeline: getTimelineYMax, getTimelineBarPercent, formatTimelineDate,
 *    Division-durch-Zero, API-Aufruf
 * 4. useMetricsAnswers: getAnswerDistributionMax, getAnswerBarPercent,
 *    getAnswerBlockTypeLabel, Division-durch-Zero, API-Aufruf
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getDropoffMaxViews,
  getDropoffBarPercent,
  formatDropoffRate,
  useMetricsDropoff,
} from '../../app/composables/useMetricsDropoff'
import type { DropoffStep } from '../../app/composables/useMetricsDropoff'

import {
  getDeviceLabel,
  normalizeDevicePercents,
  useMetricsDevices,
} from '../../app/composables/useMetricsDevices'
import type { DeviceMetric } from '../../app/composables/useMetricsDevices'

import {
  getTimelineYMax,
  getTimelineBarPercent,
  formatTimelineDate,
  useMetricsTimeline,
} from '../../app/composables/useMetricsTimeline'
import type { TimelinePoint } from '../../app/composables/useMetricsTimeline'

import {
  getAnswerDistributionMax,
  getAnswerBarPercent,
  getAnswerBlockTypeLabel,
  useMetricsAnswers,
} from '../../app/composables/useMetricsAnswers'
import type { AnswersBlock } from '../../app/composables/useMetricsAnswers'

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

const dropoffSteps: DropoffStep[] = [
  { step_index: 0, step_views: 100, step_completions: 80, dropoff_rate: 20 },
  { step_index: 1, step_views: 80, step_completions: 50, dropoff_rate: 37.5 },
  { step_index: 2, step_views: 50, step_completions: 50, dropoff_rate: 0 },
]

const deviceMetrics: DeviceMetric[] = [
  { device_type: 'mobile', count: 60, percent: 60 },
  { device_type: 'desktop', count: 35, percent: 35 },
  { device_type: 'tablet', count: 5, percent: 5 },
]

const timelinePoints: TimelinePoint[] = [
  { date: '2026-06-01', views: 100, leads: 10, conversion_rate: 10.0 },
  { date: '2026-06-02', views: 120, leads: 15, conversion_rate: 12.5 },
  { date: '2026-06-03', views: 80, leads: 5, conversion_rate: 6.25 },
]

const answersBlock: AnswersBlock = {
  block_id: 'block-uuid-1',
  field_key: 'interesse',
  block_type: 'single_choice',
  total: 100,
  distribution: [
    { value: 'Marketing', count: 60, percent: 60 },
    { value: 'Sales', count: 30, percent: 30 },
    { value: 'IT', count: 10, percent: 10 },
  ],
}

// ===========================================================================
// useMetricsDropoff
// ===========================================================================

describe('getDropoffMaxViews', () => {
  it('gibt den groessten step_views-Wert zurueck', () => {
    expect(getDropoffMaxViews(dropoffSteps)).toBe(100)
  })

  it('liefert 1 bei leerer Liste (Division-durch-Zero-Schutz)', () => {
    expect(getDropoffMaxViews([])).toBe(1)
  })

  it('liefert 1 wenn alle step_views = 0 sind', () => {
    const steps: DropoffStep[] = [
      { step_index: 0, step_views: 0, step_completions: 0, dropoff_rate: 0 },
    ]
    expect(getDropoffMaxViews(steps)).toBe(1)
  })
})

describe('getDropoffBarPercent', () => {
  it('berechnet den Prozentsatz relativ zum Maximum korrekt', () => {
    const step = dropoffSteps[1]! // 80 von 100
    expect(getDropoffBarPercent(step, 100)).toBe(80)
  })

  it('liefert 100 fuer den ersten Step (Maximum)', () => {
    const step = dropoffSteps[0]! // 100 von 100
    expect(getDropoffBarPercent(step, 100)).toBe(100)
  })

  it('liefert 0 bei maxViews = 0 (Division-durch-Zero-Schutz)', () => {
    expect(getDropoffBarPercent(dropoffSteps[0]!, 0)).toBe(0)
  })

  it('liefert 0 bei step_views = 0', () => {
    const step: DropoffStep = { step_index: 0, step_views: 0, step_completions: 0, dropoff_rate: 0 }
    expect(getDropoffBarPercent(step, 100)).toBe(0)
  })
})

describe('formatDropoffRate', () => {
  it('formatiert 20 als "20,0 %"', () => {
    expect(formatDropoffRate(20)).toBe('20,0 %')
  })

  it('formatiert 0 als "0,0 %" (kein Division-durch-Zero-Problem)', () => {
    expect(formatDropoffRate(0)).toBe('0,0 %')
  })

  it('formatiert 37.5 als "37,5 %"', () => {
    expect(formatDropoffRate(37.5)).toBe('37,5 %')
  })

  it('nutzt ein Komma als Dezimaltrennzeichen', () => {
    expect(formatDropoffRate(12.3)).toContain(',')
    expect(formatDropoffRate(12.3)).not.toContain('.')
  })
})

describe('useMetricsDropoff', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ruft den richtigen Endpunkt auf', async () => {
    mockApiFetch.mockResolvedValueOnce(dropoffSteps)

    const { get } = useMetricsDropoff()
    const result = await get('funnel-uuid-1')

    expect(mockApiFetch).toHaveBeenCalledWith('/funnels/funnel-uuid-1/metrics/dropoff')
    expect(result).toHaveLength(3)
  })

  it('wirft Fehler weiter bei API-Fehler', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('Netzwerkfehler'))

    const { get } = useMetricsDropoff()
    await expect(get('funnel-uuid-1')).rejects.toThrow('Netzwerkfehler')
  })
})

// ===========================================================================
// useMetricsDevices
// ===========================================================================

describe('getDeviceLabel', () => {
  it('gibt "Desktop" fuer desktop zurueck', () => {
    expect(getDeviceLabel('desktop')).toBe('Desktop')
  })

  it('gibt "Mobil" fuer mobile zurueck', () => {
    expect(getDeviceLabel('mobile')).toBe('Mobil')
  })

  it('gibt "Tablet" fuer tablet zurueck', () => {
    expect(getDeviceLabel('tablet')).toBe('Tablet')
  })

  it('gibt "Unbekannt" fuer unknown zurueck', () => {
    expect(getDeviceLabel('unknown')).toBe('Unbekannt')
  })

  it('gibt den Rohwert zurueck fuer unbekannte Typen', () => {
    expect(getDeviceLabel('smarttv')).toBe('smarttv')
  })
})

describe('normalizeDevicePercents', () => {
  it('liefert leere Liste bei leerer Eingabe', () => {
    expect(normalizeDevicePercents([])).toEqual([])
  })

  it('setzt alle Prozente auf 0 wenn Gesamtzahl 0 ist (Division-durch-Zero-Schutz)', () => {
    const devices: DeviceMetric[] = [
      { device_type: 'mobile', count: 0, percent: 0 },
      { device_type: 'desktop', count: 0, percent: 0 },
    ]
    const result = normalizeDevicePercents(devices)
    expect(result.every((d) => d.percent === 0)).toBe(true)
  })

  it('gibt normalisierte Prozentwerte zurueck', () => {
    const result = normalizeDevicePercents(deviceMetrics)
    const total = result.reduce((sum, d) => sum + d.percent, 0)
    expect(total).toBe(100)
  })

  it('letzter Eintrag bekommt den Rundungs-Rest', () => {
    // 3 Eintraege mit je 1/3 -> Rundungsfehler beim letzten ausgleichen
    const devices: DeviceMetric[] = [
      { device_type: 'a', count: 1, percent: 0 },
      { device_type: 'b', count: 1, percent: 0 },
      { device_type: 'c', count: 1, percent: 0 },
    ]
    const result = normalizeDevicePercents(devices)
    const total = result.reduce((sum, d) => sum + d.percent, 0)
    expect(total).toBe(100)
  })
})

describe('useMetricsDevices', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ruft den richtigen Endpunkt auf', async () => {
    mockApiFetch.mockResolvedValueOnce(deviceMetrics)

    const { get } = useMetricsDevices()
    const result = await get('funnel-uuid-1')

    expect(mockApiFetch).toHaveBeenCalledWith('/funnels/funnel-uuid-1/metrics/devices')
    expect(result).toHaveLength(3)
  })
})

// ===========================================================================
// useMetricsTimeline
// ===========================================================================

describe('getTimelineYMax', () => {
  it('gibt den groessten views-Wert zurueck', () => {
    expect(getTimelineYMax(timelinePoints)).toBe(120)
  })

  it('liefert 1 bei leerer Liste (Division-durch-Zero-Schutz)', () => {
    expect(getTimelineYMax([])).toBe(1)
  })

  it('liefert 1 wenn alle Werte 0 sind', () => {
    const points: TimelinePoint[] = [
      { date: '2026-06-01', views: 0, leads: 0, conversion_rate: 0 },
    ]
    expect(getTimelineYMax(points)).toBe(1)
  })

  it('vergleicht views UND leads (nimmt den hoeheren)', () => {
    const points: TimelinePoint[] = [
      { date: '2026-06-01', views: 50, leads: 200, conversion_rate: 100 },
    ]
    expect(getTimelineYMax(points)).toBe(200)
  })
})

describe('getTimelineBarPercent', () => {
  it('berechnet den Prozentwert korrekt', () => {
    expect(getTimelineBarPercent(60, 120)).toBe(50)
  })

  it('liefert 100 wenn value = yMax', () => {
    expect(getTimelineBarPercent(100, 100)).toBe(100)
  })

  it('liefert 0 bei yMax = 0 (Division-durch-Zero-Schutz)', () => {
    expect(getTimelineBarPercent(50, 0)).toBe(0)
  })

  it('liefert 0 bei value = 0', () => {
    expect(getTimelineBarPercent(0, 100)).toBe(0)
  })

  it('clamp auf 100 (kein Ueberlauf)', () => {
    expect(getTimelineBarPercent(150, 100)).toBe(100)
  })
})

describe('formatTimelineDate', () => {
  it('formatiert 2026-06-01 als "01.06."', () => {
    expect(formatTimelineDate('2026-06-01')).toBe('01.06.')
  })

  it('formatiert 2026-12-31 als "31.12."', () => {
    expect(formatTimelineDate('2026-12-31')).toBe('31.12.')
  })

  it('gibt ungueltige Eingaben unveraendert zurueck', () => {
    expect(formatTimelineDate('invalid')).toBe('invalid')
  })
})

describe('useMetricsTimeline', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ruft den richtigen Endpunkt auf', async () => {
    mockApiFetch.mockResolvedValueOnce(timelinePoints)

    const { get } = useMetricsTimeline()
    const result = await get('funnel-uuid-1')

    expect(mockApiFetch).toHaveBeenCalledWith('/funnels/funnel-uuid-1/metrics/timeline')
    expect(result).toHaveLength(3)
  })
})

// ===========================================================================
// useMetricsAnswers
// ===========================================================================

describe('getAnswerDistributionMax', () => {
  it('gibt den hoechsten count-Wert zurueck', () => {
    expect(getAnswerDistributionMax(answersBlock)).toBe(60)
  })

  it('liefert 1 bei leerer Distribution (Division-durch-Zero-Schutz)', () => {
    const block: AnswersBlock = {
      ...answersBlock,
      distribution: [],
    }
    expect(getAnswerDistributionMax(block)).toBe(1)
  })

  it('liefert 1 wenn alle counts 0 sind', () => {
    const block: AnswersBlock = {
      ...answersBlock,
      distribution: [{ value: 'A', count: 0, percent: 0 }],
    }
    expect(getAnswerDistributionMax(block)).toBe(1)
  })
})

describe('getAnswerBarPercent', () => {
  it('berechnet den Prozentwert korrekt', () => {
    const item = answersBlock.distribution[1]! // 30 von 60 max
    expect(getAnswerBarPercent(item, 60)).toBe(50)
  })

  it('liefert 100 fuer den hoeflchsten Eintrag', () => {
    const item = answersBlock.distribution[0]! // 60 von 60 max
    expect(getAnswerBarPercent(item, 60)).toBe(100)
  })

  it('liefert 0 bei maxCount = 0 (Division-durch-Zero-Schutz)', () => {
    const item = answersBlock.distribution[0]!
    expect(getAnswerBarPercent(item, 0)).toBe(0)
  })

  it('liefert 0 bei count = 0', () => {
    const item: AnswersBlock['distribution'][number] = { value: 'X', count: 0, percent: 0 }
    expect(getAnswerBarPercent(item, 60)).toBe(0)
  })
})

describe('getAnswerBlockTypeLabel', () => {
  it('gibt "Einfachauswahl" fuer single_choice zurueck', () => {
    expect(getAnswerBlockTypeLabel('single_choice')).toBe('Einfachauswahl')
  })

  it('gibt "Mehrfachauswahl" fuer multi_choice zurueck', () => {
    expect(getAnswerBlockTypeLabel('multi_choice')).toBe('Mehrfachauswahl')
  })

  it('gibt "Bewertung" fuer rating zurueck', () => {
    expect(getAnswerBlockTypeLabel('rating')).toBe('Bewertung')
  })

  it('gibt den Rohwert fuer unbekannte Typen zurueck', () => {
    expect(getAnswerBlockTypeLabel('unknown_type')).toBe('unknown_type')
  })
})

describe('useMetricsAnswers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ruft den richtigen Endpunkt auf', async () => {
    mockApiFetch.mockResolvedValueOnce([answersBlock])

    const { get } = useMetricsAnswers()
    const result = await get('funnel-uuid-1')

    expect(mockApiFetch).toHaveBeenCalledWith('/funnels/funnel-uuid-1/metrics/answers')
    expect(result).toHaveLength(1)
    expect(result[0]?.field_key).toBe('interesse')
  })

  it('wirft Fehler weiter bei API-Fehler', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('Nicht gefunden'))

    const { get } = useMetricsAnswers()
    await expect(get('funnel-uuid-1')).rejects.toThrow('Nicht gefunden')
  })
})
