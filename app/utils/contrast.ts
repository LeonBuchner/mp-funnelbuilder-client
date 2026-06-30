/**
 * WCAG-Kontrast-Utilities.
 * contrastRatio: berechnet das Kontrastverhältnis nach WCAG 2.x Spec.
 * meetsAA: prueft ob Verhältnis >= 4.5:1 (Normaltext, WCAG AA).
 */

/** Relative Luminanz einer Hex-Farbe (0 = schwarz, 1 = weiss). */
function relativeLuminance(hex: string): number {
  // Kurzschreibweise (#abc) in Vollform expandieren
  const full
    = hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex

  const r = parseInt(full.slice(1, 3), 16) / 255
  const g = parseInt(full.slice(3, 5), 16) / 255
  const b = parseInt(full.slice(5, 7), 16) / 255

  const toLinear = (c: number): number =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

/**
 * Kontrastverhältnis zweier Hex-Farben nach WCAG 2.x.
 * Wertebereich: 1 (identische Farben) bis 21 (schwarz / weiss).
 * Reihenfolge der Parameter ist egal (symmetrische Formel).
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1)
  const l2 = relativeLuminance(hex2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Prueft WCAG AA fuer Normaltext (Kontrast >= 4.5:1).
 * fg: Vordergrundfarbe (Text), bg: Hintergrundfarbe.
 */
export function meetsAA(fg: string, bg: string): boolean {
  return contrastRatio(fg, bg) >= 4.5
}
