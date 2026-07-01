/**
 * Berechnet das anzuzeigende Seitenfenster fuer eine Pagination.
 *
 * Gibt ein Array aus Seitenzahlen und 'ellipsis'-Markierungen zurueck.
 * Erste und letzte Seite sind immer enthalten. Um die aktuelle Seite
 * herum erscheinen je eine Nachbarseite links und rechts.
 *
 * Wenn die Luecke zwischen zwei aufeinanderfolgenden Bloecken genau
 * eine Seite betraegt, wird diese Seite direkt eingefuegt statt einer
 * Ellipsis (z. B. [1, 2, 3] statt [1, '...', 3]).
 *
 * Beispiele:
 *   pageWindow(1, 1) -> []                                    (kein Paginator noetig)
 *   pageWindow(1, 3) -> [1, 2, 3]                             (wenige Seiten)
 *   pageWindow(1, 10) -> [1, 2, 'ellipsis', 10]
 *   pageWindow(5, 10) -> [1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]
 *   pageWindow(3, 10) -> [1, 2, 3, 4, 'ellipsis', 10]
 */
export type PageItem = number | 'ellipsis'

export function pageWindow(current: number, last: number): PageItem[] {
  if (last <= 1) return []

  // Bis zu 7 Seiten: komplett ohne Ellipsis anzeigen
  if (last <= 7) {
    return Array.from({ length: last }, (_, i) => i + 1) as PageItem[]
  }

  // Seiten, die immer erscheinen: erste, letzte und Nachbarn der aktuellen
  const show = new Set<number>([1, last])
  for (let i = Math.max(1, current - 1); i <= Math.min(last, current + 1); i++) {
    show.add(i)
  }

  const sorted = Array.from(show).sort((a, b) => a - b)
  const result: PageItem[] = []
  let prev = 0

  for (const p of sorted) {
    const gap = p - prev
    if (gap > 2) {
      // Luecke gross genug fuer eine Ellipsis
      result.push('ellipsis')
    }
    else if (gap === 2) {
      // Nur eine Seite fehlt: direkt einfuegen, kein Ellipsis
      result.push(prev + 1)
    }
    result.push(p)
    prev = p
  }

  return result
}
