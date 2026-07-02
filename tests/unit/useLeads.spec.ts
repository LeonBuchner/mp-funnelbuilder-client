/**
 * Unit-Tests fuer das Lead-Verwaltungs-Feature (M4.4).
 *
 * Getestet werden:
 * 1. getLeadStatusLabel() - Status-Badge-Mapping
 * 2. getLeadStatusClass() - CSS-Klassen-Mapping
 * 3. getFirstAnswerPreview() - Vorschau-Texte
 * 4. buildLeadsExportUrl() - URL-Aufbau mit/ohne Filter
 * 5. formatFileSize() - Dateigroessen-Formatierung
 * 6. useLeads().list() - API-Aufruf mit Filter/Pagination-Params
 * 7. useLeads().exportUrl() - URL via Laufzeit-Config
 * 8. useLeads().remove() - DELETE-Aufruf
 * 9. useLeads().fileDownload() - Signed-URL-Abruf
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getLeadStatusLabel,
  getLeadStatusClass,
  getFirstAnswerPreview,
  buildLeadsExportUrl,
  formatFileSize,
  useLeads,
} from '../../app/composables/useLeads'
import type { Lead, LeadStatus } from '../../app/composables/useLeads'

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

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'lead-uuid-1',
    status: 'complete',
    consent_given_at: '2026-06-01T10:00:00Z',
    created_at: '2026-06-01T09:00:00Z',
    answers: [
      { field_key: 'name', block_type: 'input', value: 'Max Mustermann' },
      { field_key: 'interesse', block_type: 'single_choice', value: 'Marketing' },
    ],
    files: [],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// getLeadStatusLabel
// ---------------------------------------------------------------------------

describe('getLeadStatusLabel', () => {
  const cases: ReadonlyArray<[LeadStatus, string]> = [
    ['partial', 'Teilweise'],
    ['complete', 'Abgeschlossen'],
    ['double_opt_in_pending', 'DOI ausstehend'],
    ['double_opt_in_confirmed', 'DOI bestätigt'],
  ]

  it.each(cases)('gibt "%s" als "%s" zurueck', (status, expected) => {
    expect(getLeadStatusLabel(status)).toBe(expected)
  })
})

// ---------------------------------------------------------------------------
// getLeadStatusClass
// ---------------------------------------------------------------------------

describe('getLeadStatusClass', () => {
  it('partial -> amber Klassen', () => {
    const cls = getLeadStatusClass('partial')
    expect(cls).toContain('amber')
  })

  it('complete -> green Klassen', () => {
    const cls = getLeadStatusClass('complete')
    expect(cls).toContain('green')
  })

  it('double_opt_in_pending -> orange Klassen', () => {
    const cls = getLeadStatusClass('double_opt_in_pending')
    expect(cls).toContain('orange')
  })

  it('double_opt_in_confirmed -> blue Klassen', () => {
    const cls = getLeadStatusClass('double_opt_in_confirmed')
    expect(cls).toContain('blue')
  })
})

// ---------------------------------------------------------------------------
// getFirstAnswerPreview
// ---------------------------------------------------------------------------

describe('getFirstAnswerPreview', () => {
  it('gibt leeren String zurueck wenn keine Antworten vorhanden', () => {
    const lead = makeLead({ answers: [] })
    expect(getFirstAnswerPreview(lead)).toBe('')
  })

  it('gibt die erste Antwort als String zurueck', () => {
    const lead = makeLead()
    expect(getFirstAnswerPreview(lead)).toBe('Max Mustermann')
  })

  it('kuerzt auf maximal 50 Zeichen mit Ellipsis', () => {
    const lead = makeLead({
      answers: [{ field_key: 'text', block_type: 'input', value: 'a'.repeat(60) }],
    })
    const preview = getFirstAnswerPreview(lead)
    expect(preview.length).toBeLessThanOrEqual(51) // 50 + Ellipsis-Zeichen
    expect(preview).toContain('…')
  })

  it('verbindet Array-Antworten mit Komma', () => {
    const lead = makeLead({
      answers: [{ field_key: 'wahl', block_type: 'multi_choice', value: ['A', 'B', 'C'] }],
    })
    expect(getFirstAnswerPreview(lead)).toBe('A, B, C')
  })

  it('liefert "true" / "false" fuer Boolean-Antworten', () => {
    const lead = makeLead({
      answers: [{ field_key: 'optin', block_type: 'optin', value: true }],
    })
    expect(getFirstAnswerPreview(lead)).toBe('true')
  })
})

// ---------------------------------------------------------------------------
// buildLeadsExportUrl
// ---------------------------------------------------------------------------

describe('buildLeadsExportUrl', () => {
  const BASE = 'http://localhost:8000/api/admin'
  const FUNNEL = 'funnel-uuid-1'

  it('baut die URL ohne Parameter korrekt auf', () => {
    expect(buildLeadsExportUrl(BASE, FUNNEL)).toBe(
      `${BASE}/funnels/${FUNNEL}/leads/export`,
    )
  })

  it('haengt den Status-Filter als Query-Parameter an', () => {
    const url = buildLeadsExportUrl(BASE, FUNNEL, { status: 'complete' })
    expect(url).toContain('status=complete')
  })

  it('haengt from und to als Query-Parameter an', () => {
    const url = buildLeadsExportUrl(BASE, FUNNEL, {
      from: '2026-01-01',
      to: '2026-06-30',
    })
    expect(url).toContain('from=2026-01-01')
    expect(url).toContain('to=2026-06-30')
  })

  it('ignoriert leere Status-Werte', () => {
    const url = buildLeadsExportUrl(BASE, FUNNEL, { status: '' })
    expect(url).not.toContain('status')
  })

  it('kombiniert mehrere Parameter korrekt', () => {
    const url = buildLeadsExportUrl(BASE, FUNNEL, {
      status: 'complete',
      from: '2026-01-01',
      to: '2026-06-30',
    })
    expect(url).toContain('status=complete')
    expect(url).toContain('from=2026-01-01')
    expect(url).toContain('to=2026-06-30')
  })
})

// ---------------------------------------------------------------------------
// formatFileSize
// ---------------------------------------------------------------------------

describe('formatFileSize', () => {
  it('zeigt Bytes unter 1 KB unveraendert an', () => {
    expect(formatFileSize(512)).toBe('512 B')
  })

  it('formatiert KB korrekt', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })

  it('formatiert MB korrekt', () => {
    expect(formatFileSize(2 * 1024 * 1024)).toBe('2.0 MB')
  })
})

// ---------------------------------------------------------------------------
// useLeads – list()
// ---------------------------------------------------------------------------

describe('useLeads – list()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ruft ohne Filter den richtigen Endpunkt auf', async () => {
    const mockResp = { data: [], links: { prev: null, next: null }, meta: { current_page: 1, last_page: 1, per_page: 25, total: 0, from: null, to: null } }
    mockApiFetch.mockResolvedValueOnce(mockResp)

    const { list } = useLeads()
    await list('funnel-1')

    expect(mockApiFetch).toHaveBeenCalledWith('/funnels/funnel-1/leads', { query: {} })
  })

  it('sendet Status-Filter als Query-Parameter', async () => {
    mockApiFetch.mockResolvedValueOnce({ data: [], links: {}, meta: {} })

    const { list } = useLeads()
    await list('funnel-1', { status: 'complete' })

    expect(mockApiFetch).toHaveBeenCalledWith('/funnels/funnel-1/leads', {
      query: { status: 'complete' },
    })
  })

  it('sendet Datumsbereich als Query-Parameter', async () => {
    mockApiFetch.mockResolvedValueOnce({ data: [], links: {}, meta: {} })

    const { list } = useLeads()
    await list('funnel-1', { from: '2026-01-01', to: '2026-06-30' })

    expect(mockApiFetch).toHaveBeenCalledWith('/funnels/funnel-1/leads', {
      query: { from: '2026-01-01', to: '2026-06-30' },
    })
  })

  it('sendet Seite 1 NICHT als Parameter (default)', async () => {
    mockApiFetch.mockResolvedValueOnce({ data: [], links: {}, meta: {} })

    const { list } = useLeads()
    await list('funnel-1', { page: 1 })

    const call = mockApiFetch.mock.calls[0]
    expect(call?.[1]?.query).not.toHaveProperty('page')
  })

  it('sendet Seiten > 1 als Query-Parameter', async () => {
    mockApiFetch.mockResolvedValueOnce({ data: [], links: {}, meta: {} })

    const { list } = useLeads()
    await list('funnel-1', { page: 3 })

    expect(mockApiFetch).toHaveBeenCalledWith('/funnels/funnel-1/leads', {
      query: { page: 3 },
    })
  })

  it('kombiniert alle Filter korrekt', async () => {
    mockApiFetch.mockResolvedValueOnce({ data: [], links: {}, meta: {} })

    const { list } = useLeads()
    await list('funnel-1', { status: 'partial', from: '2026-01-01', to: '2026-06-30', page: 2 })

    expect(mockApiFetch).toHaveBeenCalledWith('/funnels/funnel-1/leads', {
      query: { status: 'partial', from: '2026-01-01', to: '2026-06-30', page: 2 },
    })
  })
})

// ---------------------------------------------------------------------------
// useLeads – remove()
// ---------------------------------------------------------------------------

describe('useLeads – remove()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('schickt einen DELETE-Request an den richtigen Endpunkt', async () => {
    mockApiFetch.mockResolvedValueOnce(undefined)

    const { remove } = useLeads()
    await remove('funnel-1', 'lead-uuid-1')

    expect(mockApiFetch).toHaveBeenCalledWith('/funnels/funnel-1/leads/lead-uuid-1', {
      method: 'DELETE',
    })
  })

  it('wirft den Fehler weiter wenn die API einen Fehler zurueckgibt', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('Verboten'))

    const { remove } = useLeads()
    await expect(remove('funnel-1', 'lead-uuid-1')).rejects.toThrow('Verboten')
  })
})

// ---------------------------------------------------------------------------
// useLeads – fileDownload()
// ---------------------------------------------------------------------------

describe('useLeads – fileDownload()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gibt die signierte URL zurueck', async () => {
    mockApiFetch.mockResolvedValueOnce({ url: 'https://cdn.example.com/signed-url' })

    const { fileDownload } = useLeads()
    const url = await fileDownload('funnel-1', 'lead-uuid-1', 'file-uuid-1')

    expect(url).toBe('https://cdn.example.com/signed-url')
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/funnels/funnel-1/leads/lead-uuid-1/files/file-uuid-1/download',
    )
  })
})

// ---------------------------------------------------------------------------
// useLeads – exportUrl()
// ---------------------------------------------------------------------------

describe('useLeads – exportUrl()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('baut die Export-URL mit Basis-URL aus runtimeConfig', () => {
    const { exportUrl } = useLeads()
    const url = exportUrl('funnel-1')
    expect(url).toContain('funnel-1/leads/export')
  })

  it('haengt Filter-Parameter an die URL an', () => {
    const { exportUrl } = useLeads()
    const url = exportUrl('funnel-1', { status: 'complete' })
    expect(url).toContain('status=complete')
  })
})
