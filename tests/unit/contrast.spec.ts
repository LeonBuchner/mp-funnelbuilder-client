/**
 * Unit-Tests fuer app/utils/contrast.ts.
 * Prueft die WCAG-Kontrast-Berechnung gegen bekannte Farbpaare.
 */
import { describe, it, expect } from 'vitest'
import { contrastRatio, meetsAA } from '../../app/utils/contrast'

describe('contrastRatio', () => {
  it('schwarz auf weiss ergibt 21:1', () => {
    // WCAG-Spezifikation: maximaler Kontrast = 21
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0)
  })

  it('weiss auf weiss ergibt 1:1', () => {
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
  })

  it('identische Farben ergeben 1:1', () => {
    expect(contrastRatio('#3579fa', '#3579fa')).toBeCloseTo(1, 5)
  })

  it('ist symmetrisch (Reihenfolge der Argumente spielt keine Rolle)', () => {
    const r1 = contrastRatio('#ff0000', '#ffffff')
    const r2 = contrastRatio('#ffffff', '#ff0000')
    expect(r1).toBeCloseTo(r2, 10)
  })

  it('mp-navy #1c4687 auf weiss ueberschreitet 4.5:1', () => {
    // Gut lesbares dunkles Blau auf weissem Hintergrund
    const ratio = contrastRatio('#1c4687', '#ffffff')
    expect(ratio).toBeGreaterThan(4.5)
  })

  it('helles grau #cccccc auf weiss liegt unter 2:1', () => {
    const ratio = contrastRatio('#cccccc', '#ffffff')
    expect(ratio).toBeLessThan(2)
  })

  it('Kontrastverhältnis liegt immer zwischen 1 und 21', () => {
    const pairs: [string, string][] = [
      ['#000000', '#ffffff'],
      ['#ff0000', '#00ff00'],
      ['#1c4687', '#f3f4f6'],
      ['#aabbcc', '#112233'],
    ]
    for (const [a, b] of pairs) {
      const ratio = contrastRatio(a, b)
      expect(ratio, `${a} vs ${b}`).toBeGreaterThanOrEqual(1)
      expect(ratio, `${a} vs ${b}`).toBeLessThanOrEqual(21.1) // leichter Puffer fuer Rundung
    }
  })
})

describe('meetsAA', () => {
  it('schwarz auf weiss erfuellt WCAG AA', () => {
    expect(meetsAA('#000000', '#ffffff')).toBe(true)
  })

  it('weiss auf weiss erfuellt WCAG AA nicht', () => {
    expect(meetsAA('#ffffff', '#ffffff')).toBe(false)
  })

  it('helles grau auf weiss erfuellt WCAG AA nicht', () => {
    expect(meetsAA('#cccccc', '#ffffff')).toBe(false)
  })

  it('mp-navy #1c4687 auf weiss erfuellt WCAG AA', () => {
    expect(meetsAA('#1c4687', '#ffffff')).toBe(true)
  })

  it('dunkelgrau #374151 auf weiss erfuellt WCAG AA', () => {
    expect(meetsAA('#374151', '#ffffff')).toBe(true)
  })
})
