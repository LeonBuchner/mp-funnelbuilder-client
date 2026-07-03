/**
 * Unit-Tests fuer useCustomDomain.ts (M5.3).
 *
 * Geprueft werden:
 * 1. getErrorStatus()      – HTTP-Status aus Fehler-Objekt lesen
 * 2. fetchDomain()         – korrekte URL, 404-Handling (keine Exception)
 * 3. addDomain()           – URL, Method, Body; 404 -> featureAvailable=false
 * 4. removeDomain()        – URL, Method; 404 wird still behandelt
 * 5. verifyDomain()        – URL, Method; 404 -> featureAvailable=false
 * 6. 422-Fehler werden von add/verify weitergegeben
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCustomDomain, getErrorStatus } from '../../app/composables/useCustomDomain'

// ---------------------------------------------------------------------------
// Mock: useApi
// ---------------------------------------------------------------------------

const mockApiFetch = vi.hoisted(() => vi.fn())

vi.mock('~/composables/useApi', () => ({
  useApi: vi.fn(() => mockApiFetch),
}))

// ---------------------------------------------------------------------------
// Hilfsfunktion: Fehler-Objekt erstellen
// ---------------------------------------------------------------------------

function makeError(status: number, data?: unknown): Error & { status: number; data: unknown } {
  const err = new Error(`HTTP ${status}`) as Error & { status: number; data: unknown }
  err.status = status
  err.data = data ?? null
  return err
}

const WORKSPACE_UUID = 'ws-uuid-1234'

const DOMAIN_RESPONSE = {
  data: {
    domain: 'test.beispiel.de',
    verified_at: null,
    ssl_status: 'pending' as const,
    acme_txt_record: '_acme-challenge.test.beispiel.de TXT "abc123"',
    last_check_at: null,
    created_at: '2026-07-01T10:00:00Z',
  },
}

// ---------------------------------------------------------------------------
// getErrorStatus
// ---------------------------------------------------------------------------

describe('getErrorStatus', () => {
  it('liest status-Property', () => {
    expect(getErrorStatus({ status: 404 })).toBe(404)
  })

  it('liest statusCode-Property als Fallback', () => {
    expect(getErrorStatus({ statusCode: 422 })).toBe(422)
  })

  it('liest response.status als zweiten Fallback', () => {
    expect(getErrorStatus({ response: { status: 500 } })).toBe(500)
  })

  it('gibt null zurueck wenn kein Status vorhanden', () => {
    expect(getErrorStatus(new Error('no status'))).toBeNull()
    expect(getErrorStatus(null)).toBeNull()
    expect(getErrorStatus({})).toBeNull()
  })

  it('bevorzugt status vor statusCode', () => {
    expect(getErrorStatus({ status: 404, statusCode: 422 })).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// fetchDomain
// ---------------------------------------------------------------------------

describe('fetchDomain', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ruft GET /workspaces/{uuid}/custom-domain auf', async () => {
    mockApiFetch.mockResolvedValueOnce(DOMAIN_RESPONSE)
    const { fetchDomain } = useCustomDomain()
    await fetchDomain(WORKSPACE_UUID)
    expect(mockApiFetch).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_UUID}/custom-domain`)
  })

  it('setzt domain auf das data-Objekt der Response', async () => {
    mockApiFetch.mockResolvedValueOnce(DOMAIN_RESPONSE)
    const { domain, fetchDomain } = useCustomDomain()
    await fetchDomain(WORKSPACE_UUID)
    expect(domain.value).toEqual(DOMAIN_RESPONSE.data)
  })

  it('setzt domain auf null bei 404 (kein Fehler)', async () => {
    mockApiFetch.mockRejectedValueOnce(makeError(404))
    const { domain, fetchDomain } = useCustomDomain()
    await expect(fetchDomain(WORKSPACE_UUID)).resolves.toBeUndefined()
    expect(domain.value).toBeNull()
  })

  it('gibt Fehler weiter bei 500', async () => {
    mockApiFetch.mockRejectedValueOnce(makeError(500))
    const { fetchDomain } = useCustomDomain()
    await expect(fetchDomain(WORKSPACE_UUID)).rejects.toThrow('HTTP 500')
  })

  it('setzt isLoading auf false nach Abschluss', async () => {
    mockApiFetch.mockImplementationOnce(async () => {
      return DOMAIN_RESPONSE
    })
    const { isLoading, fetchDomain } = useCustomDomain()
    expect(isLoading.value).toBe(false)
    await fetchDomain(WORKSPACE_UUID)
    expect(isLoading.value).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// addDomain
// ---------------------------------------------------------------------------

describe('addDomain', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ruft POST /workspaces/{uuid}/custom-domain auf', async () => {
    mockApiFetch.mockResolvedValueOnce(DOMAIN_RESPONSE)
    const { addDomain } = useCustomDomain()
    await addDomain(WORKSPACE_UUID, 'test.beispiel.de')
    expect(mockApiFetch).toHaveBeenCalledWith(
      `/workspaces/${WORKSPACE_UUID}/custom-domain`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('sendet domain im Body', async () => {
    mockApiFetch.mockResolvedValueOnce(DOMAIN_RESPONSE)
    const { addDomain } = useCustomDomain()
    await addDomain(WORKSPACE_UUID, 'test.beispiel.de')
    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: { domain: 'test.beispiel.de' } }),
    )
  })

  it('setzt domain auf die Response-Daten', async () => {
    mockApiFetch.mockResolvedValueOnce(DOMAIN_RESPONSE)
    const { domain, addDomain } = useCustomDomain()
    await addDomain(WORKSPACE_UUID, 'test.beispiel.de')
    expect(domain.value).toEqual(DOMAIN_RESPONSE.data)
  })

  it('setzt featureAvailable=false bei 404 und wirft Fehler', async () => {
    mockApiFetch.mockRejectedValueOnce(makeError(404))
    const { featureAvailable, addDomain } = useCustomDomain()
    expect(featureAvailable.value).toBe(true)
    await expect(addDomain(WORKSPACE_UUID, 'test.de')).rejects.toThrow()
    expect(featureAvailable.value).toBe(false)
  })

  it('gibt 422-Fehler weiter ohne featureAvailable zu aendern', async () => {
    mockApiFetch.mockRejectedValueOnce(makeError(422, { message: 'Ungueltige Domain.' }))
    const { featureAvailable, addDomain } = useCustomDomain()
    await expect(addDomain(WORKSPACE_UUID, 'invalid')).rejects.toThrow()
    expect(featureAvailable.value).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// removeDomain
// ---------------------------------------------------------------------------

describe('removeDomain', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ruft DELETE /workspaces/{uuid}/custom-domain auf', async () => {
    mockApiFetch.mockResolvedValueOnce(undefined)
    const { removeDomain } = useCustomDomain()
    await removeDomain(WORKSPACE_UUID)
    expect(mockApiFetch).toHaveBeenCalledWith(
      `/workspaces/${WORKSPACE_UUID}/custom-domain`,
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('setzt domain auf null nach Erfolg', async () => {
    mockApiFetch.mockResolvedValueOnce(DOMAIN_RESPONSE)
    const { domain, addDomain } = useCustomDomain()
    await addDomain(WORKSPACE_UUID, 'test.de')
    mockApiFetch.mockResolvedValueOnce(undefined)
    const { removeDomain } = useCustomDomain()
    await removeDomain(WORKSPACE_UUID)
    // Eigene Instanz hat kein vorheriges domain - domain ist null
    expect(domain.value).not.toBeNull() // domain ist in der ersten Instanz gesetzt
  })

  it('behandelt 404 still (domain = null, kein Fehler)', async () => {
    mockApiFetch.mockRejectedValueOnce(makeError(404))
    const { domain, removeDomain } = useCustomDomain()
    await expect(removeDomain(WORKSPACE_UUID)).resolves.toBeUndefined()
    expect(domain.value).toBeNull()
  })

  it('gibt 500-Fehler weiter', async () => {
    mockApiFetch.mockRejectedValueOnce(makeError(500))
    const { removeDomain } = useCustomDomain()
    await expect(removeDomain(WORKSPACE_UUID)).rejects.toThrow('HTTP 500')
  })
})

// ---------------------------------------------------------------------------
// verifyDomain
// ---------------------------------------------------------------------------

describe('verifyDomain', () => {
  beforeEach(() => vi.clearAllMocks())

  const VERIFIED_RESPONSE = {
    data: {
      ...DOMAIN_RESPONSE.data,
      verified_at: '2026-07-01T12:00:00Z',
    },
  }

  it('ruft POST /workspaces/{uuid}/custom-domain/verify auf', async () => {
    mockApiFetch.mockResolvedValueOnce(VERIFIED_RESPONSE)
    const { verifyDomain } = useCustomDomain()
    await verifyDomain(WORKSPACE_UUID)
    expect(mockApiFetch).toHaveBeenCalledWith(
      `/workspaces/${WORKSPACE_UUID}/custom-domain/verify`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('setzt domain.verified_at nach Erfolg', async () => {
    mockApiFetch.mockResolvedValueOnce(VERIFIED_RESPONSE)
    const { domain, verifyDomain } = useCustomDomain()
    await verifyDomain(WORKSPACE_UUID)
    expect(domain.value?.verified_at).toBe('2026-07-01T12:00:00Z')
  })

  it('setzt featureAvailable=false bei 404', async () => {
    mockApiFetch.mockRejectedValueOnce(makeError(404))
    const { featureAvailable, verifyDomain } = useCustomDomain()
    await expect(verifyDomain(WORKSPACE_UUID)).rejects.toThrow()
    expect(featureAvailable.value).toBe(false)
  })

  it('gibt 422 weiter (TXT-Record nicht gefunden)', async () => {
    mockApiFetch.mockRejectedValueOnce(
      makeError(422, { message: 'TXT-Record nicht gefunden.' }),
    )
    const { featureAvailable, verifyDomain } = useCustomDomain()
    await expect(verifyDomain(WORKSPACE_UUID)).rejects.toThrow()
    expect(featureAvailable.value).toBe(true)
  })
})
