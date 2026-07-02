/**
 * Unit-Tests fuer M4-Optin-Logik.
 *
 * Testet:
 *   - OTP-Slot-Logik (Eingabe, Paste, Backspace)
 *   - Consent-localStorage-Helfer (lesen/schreiben)
 *   - Tracking-Script-Bedingung (nur bei Consent + ID)
 *   - useRendererState: doubleOptinPending, otpVerifiedToken, trackingConsent
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useRendererState } from '../../app/composables/useRendererState'
import type { Step, OptinDoubleBlock, OptinOtpBlock } from '../../app/types/funnel'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockApiFn = vi.hoisted(() => vi.fn())

vi.mock('~/composables/usePublicApi', () => ({
  usePublicApi: vi.fn(() => mockApiFn),
}))

// ---------------------------------------------------------------------------
// Consent-Helfer (aus [slug].vue, hier inline getestet)
// ---------------------------------------------------------------------------

function readTrackingConsent(funnelSlug: string): boolean | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(`mp_consent:${funnelSlug}:tracking`)
    if (raw === 'true') return true
    if (raw === 'false') return false
    return null
  }
  catch {
    return null
  }
}

function writeTrackingConsent(funnelSlug: string, value: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(`mp_consent:${funnelSlug}:tracking`, String(value))
  }
  catch { /* localStorage nicht verfuegbar */ }
}

// ---------------------------------------------------------------------------
// OTP-Slot-Hilfsfunktionen (aus BlockOptinOtp, hier isoliert getestet)
// ---------------------------------------------------------------------------

/** Baut Slots aus einem Pastes-String auf (nur Ziffern, max. digits). */
function applyPaste(slots: string[], pastedText: string, startIndex: number, digits: number): string[] {
  const digitsOnly = pastedText.replace(/\D/g, '').slice(0, digits)
  const result = [...slots]
  digitsOnly.split('').forEach((char, i) => {
    if (startIndex + i < digits) {
      result[startIndex + i] = char
    }
  })
  return result
}

/** Prueft ob alle Slots belegt sind. */
function isCodeComplete(slots: string[]): boolean {
  return slots.every(s => s.length === 1)
}

/** Zusammenfuehren der Slots zum OTP-Code. */
function joinSlots(slots: string[]): string {
  return slots.join('')
}

// ---------------------------------------------------------------------------
// Testdaten
// ---------------------------------------------------------------------------

function makeDoubleOptinStep(): Step {
  const block: OptinDoubleBlock = {
    id: 'b-double',
    type: 'optin_double',
    fieldKey: 'optin_double_field',
    required: true,
    checkboxLabel: 'Ich stimme zu.',
    hintText: 'Du erhältst eine Bestätigungs-E-Mail.',
  }
  return {
    id: 'step-1',
    type: 'form',
    internalTitle: 'Opt-in',
    layout: 'single',
    logicRules: [],
    blocks: [block],
  }
}

function makeOtpStep(): Step {
  const block: OptinOtpBlock = {
    id: 'b-otp',
    type: 'optin_otp',
    fieldKey: 'otp_email',
    required: true,
    digits: 6,
  }
  return {
    id: 'step-2',
    type: 'form',
    internalTitle: 'OTP',
    layout: 'single',
    logicRules: [],
    blocks: [block],
  }
}

// ---------------------------------------------------------------------------
// Tests: Consent-localStorage-Helfer
// ---------------------------------------------------------------------------

describe('Consent-localStorage-Helfer', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('readTrackingConsent gibt null zurueck wenn kein Eintrag vorhanden', () => {
    expect(readTrackingConsent('test-funnel')).toBeNull()
  })

  it('writeTrackingConsent + readTrackingConsent: true speichern und lesen', () => {
    writeTrackingConsent('test-funnel', true)
    expect(readTrackingConsent('test-funnel')).toBe(true)
  })

  it('writeTrackingConsent + readTrackingConsent: false speichern und lesen', () => {
    writeTrackingConsent('test-funnel', false)
    expect(readTrackingConsent('test-funnel')).toBe(false)
  })

  it('verschiedene Funnel-Slugs sind voneinander unabhaengig', () => {
    writeTrackingConsent('funnel-a', true)
    writeTrackingConsent('funnel-b', false)
    expect(readTrackingConsent('funnel-a')).toBe(true)
    expect(readTrackingConsent('funnel-b')).toBe(false)
    expect(readTrackingConsent('funnel-c')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Tests: OTP-Slot-Logik
// ---------------------------------------------------------------------------

describe('OTP-Slot-Logik', () => {
  it('applyPaste: fuellt Slots ab Startindex', () => {
    const slots = Array.from({ length: 6 }, () => '')
    const result = applyPaste(slots, '123456', 0, 6)
    expect(result).toEqual(['1', '2', '3', '4', '5', '6'])
  })

  it('applyPaste: schneidet bei digits-Grenze ab', () => {
    const slots = Array.from({ length: 4 }, () => '')
    const result = applyPaste(slots, '12345678', 0, 4)
    expect(result).toEqual(['1', '2', '3', '4'])
  })

  it('applyPaste: ignoriert Nicht-Ziffern', () => {
    const slots = Array.from({ length: 6 }, () => '')
    const result = applyPaste(slots, 'A1B2C3', 0, 6)
    expect(result).toEqual(['1', '2', '3', '', '', ''])
  })

  it('applyPaste: fuellt ab Mittel-Index', () => {
    const slots = ['1', '2', '', '', '', '']
    const result = applyPaste(slots, '345', 2, 6)
    expect(result).toEqual(['1', '2', '3', '4', '5', ''])
  })

  it('isCodeComplete: gibt true zurueck wenn alle Slots belegt', () => {
    expect(isCodeComplete(['1', '2', '3', '4', '5', '6'])).toBe(true)
  })

  it('isCodeComplete: gibt false zurueck wenn ein Slot leer', () => {
    expect(isCodeComplete(['1', '2', '', '4', '5', '6'])).toBe(false)
  })

  it('joinSlots: verbindet alle Slots', () => {
    expect(joinSlots(['1', '2', '3', '4', '5', '6'])).toBe('123456')
  })
})

// ---------------------------------------------------------------------------
// Tests: useRendererState - Double-Opt-in + OTP + Tracking-Consent
// ---------------------------------------------------------------------------

describe('useRendererState - M4-Erweiterungen', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('doubleOptinPending startet auf false', () => {
    const renderer = useRendererState('test-hash', [makeDoubleOptinStep()])
    expect(renderer.doubleOptinPending.value).toBe(false)
  })

  it('otpVerifiedToken startet auf null', () => {
    const renderer = useRendererState('test-hash', [makeOtpStep()])
    expect(renderer.otpVerifiedToken.value).toBeNull()
  })

  it('trackingConsent startet auf null', () => {
    const renderer = useRendererState('test-hash', [])
    expect(renderer.trackingConsent.value).toBeNull()
  })

  it('setOtpVerifiedToken setzt den Token', () => {
    const renderer = useRendererState('test-hash', [makeOtpStep()])
    renderer.setOtpVerifiedToken('test-token-123')
    expect(renderer.otpVerifiedToken.value).toBe('test-token-123')
  })

  it('setTrackingConsent setzt den Consent-Wert', () => {
    const renderer = useRendererState('test-hash', [])
    renderer.setTrackingConsent(true)
    expect(renderer.trackingConsent.value).toBe(true)
    renderer.setTrackingConsent(false)
    expect(renderer.trackingConsent.value).toBe(false)
  })

  it('reset() setzt doubleOptinPending und otpVerifiedToken zurueck', () => {
    const renderer = useRendererState('test-hash', [makeDoubleOptinStep()])
    renderer.setOtpVerifiedToken('some-token')
    // doubleOptinPending direkt setzen (kein oeffentlicher Setter, nur via Submit)
    renderer.doubleOptinPending.value = true
    renderer.reset()
    expect(renderer.doubleOptinPending.value).toBe(false)
    expect(renderer.otpVerifiedToken.value).toBeNull()
  })

  it('submitLead setzt doubleOptinPending=true wenn optin_double-Block vorhanden', async () => {
    const step = makeDoubleOptinStep()
    const renderer = useRendererState('test-hash', [step])
    // Consent geben (required)
    renderer.answers.value['optin_double_field'] = true
    mockApiFn.mockResolvedValue({ id: 'lead-1', status: 'pending' })

    await renderer.submitLead()

    expect(renderer.doubleOptinPending.value).toBe(true)
    expect(renderer.isSubmitted.value).toBe(true)
  })

  it('submitLead inkludiert tracking_consent wenn gesetzt', async () => {
    const renderer = useRendererState('test-hash', [])
    renderer.setTrackingConsent(true)
    mockApiFn.mockResolvedValue({ id: 'lead-1', status: 'submitted' })

    await renderer.submitLead()

    const callBody = mockApiFn.mock.calls[0]?.[1]?.body
    expect(callBody?.tracking_consent).toBe(true)
  })

  it('submitLead inkludiert otp_verified_token wenn optin_otp-Block vorhanden und Token gesetzt', async () => {
    const step = makeOtpStep()
    const renderer = useRendererState('test-hash', [step])
    // E-Mail-Antwort setzen damit die Validierung durchlaeuft
    renderer.answers.value['otp_email'] = 'test@example.com'
    renderer.setOtpVerifiedToken('verified-token-xyz')
    mockApiFn.mockResolvedValue({ id: 'lead-1', status: 'submitted' })

    await renderer.submitLead()

    const callBody = mockApiFn.mock.calls[0]?.[1]?.body
    expect(callBody?.otp_verified_token).toBe('verified-token-xyz')
  })
})

// ---------------------------------------------------------------------------
// Tests: Tracking-Script-Bedingung
// ---------------------------------------------------------------------------

describe('Tracking-Script-Bedingung', () => {
  it('GA4-Script wird nur bei Consent=true UND gesetzter ID geladen', () => {
    // Hilfsfunktion nachbilden (aus [slug].vue)
    function shouldLoadTracking(consent: boolean | null, id: string | null): boolean {
      return consent === true && !!id
    }

    expect(shouldLoadTracking(true, 'G-ABC123')).toBe(true)
    expect(shouldLoadTracking(false, 'G-ABC123')).toBe(false)
    expect(shouldLoadTracking(null, 'G-ABC123')).toBe(false)
    expect(shouldLoadTracking(true, null)).toBe(false)
    expect(shouldLoadTracking(true, '')).toBe(false)
  })
})
