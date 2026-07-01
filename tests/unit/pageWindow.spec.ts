/**
 * Unit-Tests fuer app/utils/pageWindow.ts
 *
 * Prueft:
 * - Kein Array bei 0 oder 1 Seite
 * - Vollstaendige Liste bei wenigen Seiten (<=7)
 * - Ellipsis nur am Ende (fruehe Seite)
 * - Ellipsis nur am Anfang (spaete Seite)
 * - Ellipsis beiderseits (mittlere Seite)
 * - Kein Ellipsis bei Einseitiger Luecke (Seite wird direkt eingefuegt)
 * - Erste und letzte Seite immer enthalten
 */
import { describe, it, expect } from 'vitest'
import { pageWindow } from '../../app/utils/pageWindow'
import type { PageItem } from '../../app/utils/pageWindow'

function nums(items: PageItem[]): number[] {
  return items.filter((i): i is number => i !== 'ellipsis')
}

describe('pageWindow', () => {
  it('gibt leeres Array bei einer Seite zurueck', () => {
    expect(pageWindow(1, 1)).toEqual([])
  })

  it('gibt leeres Array bei 0 Seiten zurueck', () => {
    expect(pageWindow(1, 0)).toEqual([])
  })

  it('gibt alle Seiten bei 2 Seiten zurueck', () => {
    expect(pageWindow(1, 2)).toEqual([1, 2])
    expect(pageWindow(2, 2)).toEqual([1, 2])
  })

  it('gibt alle Seiten bei 7 Seiten zurueck (Grenzwert ohne Ellipsis)', () => {
    expect(pageWindow(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('enthaelt immer die erste und letzte Seite', () => {
    for (const [cur, last] of [[1, 10], [5, 10], [10, 10]] as [number, number][]) {
      const result = pageWindow(cur, last)
      const pages = nums(result)
      expect(pages).toContain(1)
      expect(pages).toContain(last)
    }
  })

  it('fuegt Ellipsis am Ende ein bei Seite 1 (viele Seiten)', () => {
    const result = pageWindow(1, 10)
    expect(result).toEqual([1, 2, 'ellipsis', 10])
  })

  it('fuegt Ellipsis am Anfang ein bei letzter Seite (viele Seiten)', () => {
    const result = pageWindow(10, 10)
    expect(result).toEqual([1, 'ellipsis', 9, 10])
  })

  it('fuegt Ellipsis an beiden Seiten ein bei mittlerer Seite', () => {
    const result = pageWindow(5, 10)
    expect(result).toEqual([1, 'ellipsis', 4, 5, 6, 'ellipsis', 10])
  })

  it('ersetzt Ellipsis durch echte Seite wenn Luecke nur 1 Seite betraegt', () => {
    // show = {1, 2, 3, 4, 10}: Luecke 1->3 hat Abstand 2 -> Seite 2 direkt einfuegen
    // Zwischen 4 und 10 bleibt eine echte Ellipsis (Abstand 6)
    const result = pageWindow(3, 10)
    expect(result).toEqual([1, 2, 3, 4, 'ellipsis', 10])
    // Genau eine Ellipsis (am Ende), keine zwischen 1 und 4
    expect(result.filter(i => i === 'ellipsis')).toHaveLength(1)
    // Seitenzahlen 1 bis 4 sind lueckenlos
    expect(nums(result).slice(0, 4)).toEqual([1, 2, 3, 4])
  })

  it('fuegt bei Luecke von 2 Seiten die fehlende Seite direkt ein', () => {
    // show = {1, 3, 4, 5, 8}: Luecke 1->3 hat Abstand 2 -> Seite 2 direkt einfuegen
    // Zwischen 5 und 8 bleibt eine echte Ellipsis (Abstand 3)
    const result = pageWindow(4, 8)
    expect(result).toEqual([1, 2, 3, 4, 5, 'ellipsis', 8])
    expect(result).toContain(2)
    // Genau eine Ellipsis (am Ende)
    expect(result.filter(i => i === 'ellipsis')).toHaveLength(1)
  })

  it('enthaelt hoechstens zwei Ellipsis-Eintraege', () => {
    for (let cur = 1; cur <= 20; cur++) {
      const result = pageWindow(cur, 20)
      const count = result.filter(i => i === 'ellipsis').length
      expect(count, `bei Seite ${cur} von 20`).toBeLessThanOrEqual(2)
    }
  })

  it('Seitenzahlen sind aufsteigend sortiert', () => {
    const result = pageWindow(7, 20)
    const pages = nums(result)
    for (let i = 1; i < pages.length; i++) {
      expect(pages[i]).toBeGreaterThan(pages[i - 1]!)
    }
  })

  it('keine doppelten Seitenzahlen im Ergebnis', () => {
    const result = pageWindow(5, 12)
    const pages = nums(result)
    const unique = new Set(pages)
    expect(unique.size).toBe(pages.length)
  })

  it('Seite 2 von 10: keine Ellipsis am Anfang', () => {
    const result = pageWindow(2, 10)
    expect(result[0]).toBe(1)
    expect(result[1]).not.toBe('ellipsis')
  })

  it('Seite 9 von 10: keine Ellipsis am Ende', () => {
    const result = pageWindow(9, 10)
    const last = result[result.length - 1]
    const beforeLast = result[result.length - 2]
    expect(last).toBe(10)
    expect(beforeLast).not.toBe('ellipsis')
  })
})
