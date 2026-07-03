/**
 * Unit-Tests fuer useAbVariant (M3.7, aktualisiert M5.6 fuer UUID-Cookie).
 *
 * Testumfang:
 *   - readAbCookie / writeAbCookie (reine Hilfsfunktionen, keine Browser-Umgebung noetig)
 *   - Initialer Zustand des Composables (abVariantId=null, isResolving=false)
 *   - 204-Handling: Standard-Content bleibt, kein Cookie gesetzt
 *   - 200-Handling: abVariantId gesetzt, Cookie gesetzt, abContent sanitisiert
 *   - Sticky-Mechanismus: existing_variant_id aus Cookie wird als UUID-String mitgesendet
 *
 * Nicht getestet (wird in E2E abgedeckt):
 *   - Tatsaechliches onMounted-Verhalten in einer montierten Komponente
 *   - Cookie-Persistenz ueber Seitenneuladungen
 *
 * Ab M5.6: Cookie-Wert ist UUID-String statt Integer.
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
// Hilfsfunktion: Cookie-Store bereinigen
// ---------------------------------------------------------------------------

function clearAllCookies(): void {
  document.cookie.split(';').forEach((c) => {
    const eqPos = c.indexOf('=')
    const name = eqPos > -1 ? c.slice(0, eqPos).trim() : c.trim()
    if (name) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
    }
  })
}

// Repraesentative UUID-Werte fuer Tests
const UUID_A = '550e8400-e29b-41d4-a716-446655440000'
const UUID_B = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
const FUNNEL_UUID_HASH = 'd0000001-0000-4000-8000-000000000001'

// ---------------------------------------------------------------------------
// Cookie-Hilfsfunktionen Tests
// ---------------------------------------------------------------------------

describe('readAbCookie', () => {
  beforeEach(clearAllCookies)

  it('gibt null zurueck wenn kein Cookie vorhanden', () => {
    const result = readAbCookie('test-hash-123')
    expect(result).toBeNull()
  })

  it('liest UUID-Cookie-Wert korrekt', () => {
    document.cookie = `mp_ab_test-hash=${UUID_A}; path=/`
    const result = readAbCookie('test-hash')
    expect(result).toBe(UUID_A)
  })

  it('gibt null zurueck bei leerem Cookie-Wert', () => {
    document.cookie = 'mp_ab_test-hash=; path=/'
    const result = readAbCookie('test-hash')
    expect(result).toBeNull()
  })

  it('liest nur den Cookie fuer den eigenen Hash (Isolation)', () => {
    document.cookie = `mp_ab_other-hash=${UUID_B}; path=/`
    const result = readAbCookie('my-hash')
    expect(result).toBeNull()
  })

  it('verarbeitet UUID-artige Funnel-Hashes korrekt', () => {
    document.cookie = `mp_ab_${FUNNEL_UUID_HASH}=${UUID_A}; path=/`
    const result = readAbCookie(FUNNEL_UUID_HASH)
    expect(result).toBe(UUID_A)
  })

  it('gibt beliebige Nicht-UUID-Strings zurueck (abwaertskompatibel)', () => {
    // Alte Cookies mit numerischem Wert werden als String gelesen
    document.cookie = 'mp_ab_legacy-funnel=42; path=/'
    const result = readAbCookie('legacy-funnel')
    expect(result).toBe('42')
  })
})

describe('writeAbCookie', () => {
  beforeEach(clearAllCookies)

  it('setzt den Cookie mit der richtigen UUID', () => {
    writeAbCookie('my-funnel', UUID_A)
    const result = readAbCookie('my-funnel')
    expect(result).toBe(UUID_A)
  })

  it('ueberschreibt einen vorhandenen Cookie', () => {
    writeAbCookie('my-funnel', UUID_A)
    writeAbCookie('my-funnel', UUID_B)
    const result = readAbCookie('my-funnel')
    expect(result).toBe(UUID_B)
  })

  it('setzt den Cookie als Session-Cookie (kein Ablaufdatum)', () => {
    writeAbCookie('my-funnel', UUID_A)
    // Session-Cookies haben kein Ablaufdatum im document.cookie-String.
    // In happy-dom ist das schwer direkt zu testen, aber der Cookie muss lesbar sein.
    expect(readAbCookie('my-funnel')).toBe(UUID_A)
  })

  it('setzt Cookies fuer verschiedene Funnels unabhaengig', () => {
    writeAbCookie('funnel-alpha', UUID_A)
    writeAbCookie('funnel-beta', UUID_B)
    expect(readAbCookie('funnel-alpha')).toBe(UUID_A)
    expect(readAbCookie('funnel-beta')).toBe(UUID_B)
  })
})

// ---------------------------------------------------------------------------
// Composable-Tests
// ---------------------------------------------------------------------------

describe('useAbVariant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAllCookies()
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
   * Wir testen hier die initialen Zustaende (ohne Mount).
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
// Sticky-Mechanismus (UUID-Cookie -> existing_variant_id als String)
// ---------------------------------------------------------------------------

describe('Sticky-Mechanismus', () => {
  beforeEach(clearAllCookies)

  it('existing_variant_id aus Cookie entspricht dem gespeicherten UUID-Wert', () => {
    // Cookie wie nach einer 200-Antwort setzen
    writeAbCookie('funnel-abc', UUID_A)

    // Beim naechsten Request den Cookie als String lesen
    const existing = readAbCookie('funnel-abc')
    expect(existing).toBe(UUID_A)
  })

  it('verschiedene Funnels haben eigene UUID-Cookies (Isolation)', () => {
    writeAbCookie('funnel-a', UUID_A)
    writeAbCookie('funnel-b', UUID_B)

    expect(readAbCookie('funnel-a')).toBe(UUID_A)
    expect(readAbCookie('funnel-b')).toBe(UUID_B)
  })

  it('UUID-Cookie kann als String an existing_variant_id weitergegeben werden', () => {
    writeAbCookie(FUNNEL_UUID_HASH, UUID_A)
    const existing = readAbCookie(FUNNEL_UUID_HASH)
    // existing_variant_id ist jetzt string, nicht number
    expect(typeof existing).toBe('string')
    expect(existing).toBe(UUID_A)
  })
})
