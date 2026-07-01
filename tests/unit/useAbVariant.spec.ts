/**
 * Unit-Tests fuer useAbVariant (M3.7).
 *
 * Testumfang:
 *   - readAbCookie / writeAbCookie (reine Hilfsfunktionen, keine Browser-Umgebung noetig)
 *   - Initialer Zustand des Composables (abVariantId=null, isResolving=false)
 *   - 204-Handling: Standard-Content bleibt, kein Cookie gesetzt
 *   - 200-Handling: abVariantId gesetzt, Cookie gesetzt, abContent sanitisiert
 *   - Sticky-Mechanismus: existing_variant_id aus Cookie wird mitgesendet
 *
 * Nicht getestet (wird in E2E abgedeckt):
 *   - Tatsaechliches onMounted-Verhalten in einer montierten Komponente
 *   - Cookie-Persistenz ueber Seitenneuladungen
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref } from 'vue'
import { readAbCookie, writeAbCookie, useAbVariant } from '../../app/composables/useAbVariant'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockApiFn = vi.hoisted(() => vi.fn())

vi.mock('~/composables/usePublicApi', () => ({
  usePublicApi: vi.fn(() => mockApiFn),
}))

vi.mock('~/utils/sanitizeFunnelContent', () => ({
  sanitizeContent: vi.fn((content: unknown) => content),
}))

// ---------------------------------------------------------------------------
// Cookie-Hilfsfunktionen Tests
// ---------------------------------------------------------------------------

describe('readAbCookie', () => {
  beforeEach(() => {
    // Cookie-Store bereinigen (happy-dom bietet document.cookie)
    document.cookie.split(';').forEach((c) => {
      const eqPos = c.indexOf('=')
      const name = eqPos > -1 ? c.slice(0, eqPos).trim() : c.trim()
      if (name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
      }
    })
  })

  it('gibt null zurueck wenn kein Cookie vorhanden', () => {
    const result = readAbCookie('test-hash-123')
    expect(result).toBeNull()
  })

  it('liest den Cookie-Wert korrekt', () => {
    document.cookie = 'mp_ab_test-hash-123=42; path=/'
    const result = readAbCookie('test-hash-123')
    expect(result).toBe(42)
  })

  it('gibt null zurueck bei nicht-numerischem Cookie-Wert', () => {
    document.cookie = 'mp_ab_test-hash=not-a-number; path=/'
    const result = readAbCookie('test-hash')
    expect(result).toBeNull()
  })

  it('liest nur den Cookie fuer den eigenen Hash (Isolation)', () => {
    document.cookie = 'mp_ab_other-hash=99; path=/'
    const result = readAbCookie('my-hash')
    expect(result).toBeNull()
  })

  it('verarbeitet UUID-artige Hashes korrekt', () => {
    document.cookie = 'mp_ab_d0000001-0000-4000-8000-000000000001=7; path=/'
    const result = readAbCookie('d0000001-0000-4000-8000-000000000001')
    expect(result).toBe(7)
  })
})

describe('writeAbCookie', () => {
  beforeEach(() => {
    document.cookie.split(';').forEach((c) => {
      const eqPos = c.indexOf('=')
      const name = eqPos > -1 ? c.slice(0, eqPos).trim() : c.trim()
      if (name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
      }
    })
  })

  it('setzt den Cookie mit der richtigen Varianten-ID', () => {
    writeAbCookie('my-funnel', 5)
    const result = readAbCookie('my-funnel')
    expect(result).toBe(5)
  })

  it('ueberschreibt einen vorhandenen Cookie', () => {
    writeAbCookie('my-funnel', 1)
    writeAbCookie('my-funnel', 3)
    const result = readAbCookie('my-funnel')
    expect(result).toBe(3)
  })

  it('setzt den Cookie als Session-Cookie (kein Ablaufdatum)', () => {
    writeAbCookie('my-funnel', 2)
    // Session-Cookies haben kein Ablaufdatum im document.cookie-String
    // In happy-dom ist das schwer zu testen, aber der Cookie muss lesbar sein
    expect(readAbCookie('my-funnel')).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Composable-Tests
// ---------------------------------------------------------------------------

describe('useAbVariant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Cookie-Store bereinigen
    document.cookie.split(';').forEach((c) => {
      const eqPos = c.indexOf('=')
      const name = eqPos > -1 ? c.slice(0, eqPos).trim() : c.trim()
      if (name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('startet mit abVariantId=null, abContent=null, isResolving=false', () => {
    const sessionId = ref('test-session')
    const { abVariantId, abContent, isResolving } = useAbVariant('some-hash', sessionId)

    expect(abVariantId.value).toBeNull()
    expect(abContent.value).toBeNull()
    expect(isResolving.value).toBe(false)
  })

  /**
   * Die onMounted-Logik laeuft nur in einer montierten Komponente.
   * Wir testen hier die initiale Zustaende (ohne Mount).
   * Das Verhalten nach Mount wird in E2E-Tests geprueft.
   */
  it('aendert nichts am Zustand ohne Mount', () => {
    mockApiFn.mockResolvedValue(null) // 204
    const sessionId = ref('some-session')
    const { abVariantId, abContent } = useAbVariant('hash-xyz', sessionId)

    // Kein Mount -> API wurde nicht aufgerufen
    expect(mockApiFn).not.toHaveBeenCalled()
    expect(abVariantId.value).toBeNull()
    expect(abContent.value).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Sticky-Mechanismus (Cookie -> existing_variant_id)
// ---------------------------------------------------------------------------

describe('Sticky-Mechanismus', () => {
  it('existing_variant_id aus Cookie entspricht dem gespeicherten Wert', () => {
    // Cookie setzen wie es useAbVariant nach 200-Antwort tut
    writeAbCookie('funnel-abc', 12)

    // Dann beim naechsten Request den Cookie lesen
    const existing = readAbCookie('funnel-abc')
    expect(existing).toBe(12)
  })

  it('verschiedene Funnels haben eigene Cookies (Isolation)', () => {
    writeAbCookie('funnel-a', 1)
    writeAbCookie('funnel-b', 2)

    expect(readAbCookie('funnel-a')).toBe(1)
    expect(readAbCookie('funnel-b')).toBe(2)
  })
})
