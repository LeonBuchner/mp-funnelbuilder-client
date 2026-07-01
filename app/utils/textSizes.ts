/**
 * Text-Größen-Palette und Ausrichtungstypen für den Text-Block-Editor.
 *
 * SPEICHERFORMAT: styles.textSize speichert px-Werte als String mit "px"-Suffix,
 * z.B. "16px". Ältere Funnels können noch named tokens enthalten
 * ("small" / "lead" / "normal" / "large" / "xl" / "hero"). Diese werden via
 * LEGACY_TOKEN_PX auf px abgebildet (read-only; beim nächsten Schreiben wird
 * der echte px-Wert als "30px" etc. gespeichert).
 */

export type TextAlignKey = 'left' | 'center' | 'right'

/**
 * Legacy named tokens aus alten Funnels.
 * @deprecated Neue Daten verwenden px-Strings ("16px").
 */
export type LegacyTextSizeToken = 'small' | 'normal' | 'lead' | 'large' | 'xl' | 'hero'

// ---------------------------------------------------------------------------
// Pixel-Palette
// ---------------------------------------------------------------------------

/** Alle verfügbaren Schriftgrößen in Pixel, aufsteigend. */
export const FONT_SIZE_PX_OPTIONS = [14, 15, 16, 20, 24, 30, 40, 48, 64] as const

export type FontSizePx = (typeof FONT_SIZE_PX_OPTIONS)[number]

/**
 * Badge-Labels für Schnell-Button-Größen.
 * Verwendung: FONT_SIZE_BADGE[16] === 'S'
 */
export const FONT_SIZE_BADGE: Partial<Record<number, string>> = {
  16: 'S',
  20: 'M',
  24: 'L',
  30: 'XL',
}

/** Schnell-Buttons S / M / L / XL mit Pixel-Wert und Label. */
export const FONT_SIZE_QUICK_BUTTONS: ReadonlyArray<{ px: number; label: string }> = [
  { px: 16, label: 'S' },
  { px: 20, label: 'M' },
  { px: 24, label: 'L' },
  { px: 30, label: 'XL' },
]

// ---------------------------------------------------------------------------
// Legacy-Mapping (named token -> px)
// ---------------------------------------------------------------------------

/**
 * Bildet alte named tokens auf den px-Äquivalent ab.
 *   small  = 12px
 *   lead   = 14px
 *   normal = 16px (Default)
 *   large  = 20px
 *   xl     = 24px
 *   hero   = 28px
 */
const LEGACY_TOKEN_PX: Record<LegacyTextSizeToken, number> = {
  small: 12,
  lead: 14,
  normal: 16,
  large: 20,
  xl: 24,
  hero: 28,
}

// ---------------------------------------------------------------------------
// Pure Functions
// ---------------------------------------------------------------------------

/**
 * Gibt true zurück, wenn der Wert im neuen px-Speicherformat ist (z.B. "16px").
 * Falsy-Werte und named tokens geben false zurück.
 */
export function isPxTextSize(value: string | undefined): value is string {
  return typeof value === 'string' && /^\d+px$/.test(value)
}

/**
 * Gibt die aktive Schriftgröße in Pixel zurück.
 *   "30px"   -> 30   (neues Format)
 *   "large"  -> 20   (legacy token mapping)
 *   "" / undefined -> 16 (Default = S)
 *   unbekannter Wert -> 16
 */
export function getActiveFontSizePx(styles?: Record<string, string>): number {
  const s = styles?.textSize
  if (!s) return 16
  if (isPxTextSize(s)) return parseInt(s, 10)
  if (s in LEGACY_TOKEN_PX) return LEGACY_TOKEN_PX[s as LegacyTextSizeToken]
  return 16
}

/**
 * Gibt die aktuell gesetzte Textausrichtung zurück.
 * Fallback ist 'left'.
 */
export function getActiveTextAlign(styles?: Record<string, string>): TextAlignKey {
  const a = styles?.textAlign
  if (a === 'center' || a === 'right') return a
  return 'left'
}
