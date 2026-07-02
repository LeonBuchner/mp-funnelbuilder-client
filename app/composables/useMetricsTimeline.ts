/**
 * API-Composable fuer Conversion-Timeline-Metriken (M4.7).
 *
 * GET /funnels/{funnelId}/metrics/timeline
 * -> [{ date, views, leads, conversion_rate }]
 *
 * Exportiert reine Hilfsfunktionen fuer Unit-Tests.
 */

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

export interface TimelinePoint {
  date: string
  views: number
  leads: number
  conversion_rate: number
}

// ---------------------------------------------------------------------------
// Reine Hilfsfunktionen (testbar ohne Nuxt)
// ---------------------------------------------------------------------------

/**
 * Gibt den Maximalwert von views ueber alle Punkte zurueck.
 * Liefert 1 als Fallback, um Division durch 0 zu vermeiden.
 */
export function getTimelineMaxViews(points: TimelinePoint[]): number {
  if (points.length === 0) return 1
  const max = Math.max(...points.map((p) => p.views))
  return max > 0 ? max : 1
}

/**
 * Gibt den Maximalwert von leads ueber alle Punkte zurueck.
 * Liefert 1 als Fallback.
 */
export function getTimelineMaxLeads(points: TimelinePoint[]): number {
  if (points.length === 0) return 1
  const max = Math.max(...points.map((p) => p.leads))
  return max > 0 ? max : 1
}

/**
 * Gibt den gemeinsamen Maximalwert (views oder leads) zurueck.
 * Wird fuer eine einheitliche Y-Achse verwendet.
 * Liefert 1 als Fallback.
 */
export function getTimelineYMax(points: TimelinePoint[]): number {
  if (points.length === 0) return 1
  const max = Math.max(...points.map((p) => Math.max(p.views, p.leads)))
  return max > 0 ? max : 1
}

/**
 * Formatiert ein ISO-Datum (YYYY-MM-DD) in ein kurzes deutsches Format (DD.MM.).
 */
export function formatTimelineDate(isoDate: string): string {
  // Parst YYYY-MM-DD sicher ohne Timezone-Verschiebung
  const parts = isoDate.split('-')
  if (parts.length !== 3) return isoDate
  return `${parts[2]}.${parts[1]}.`
}

/**
 * Berechnet die Balkenhoehe als Prozentwert (0-100) relativ zu yMax.
 * Liefert 0 bei yMax=0 (Division durch 0 abgefangen).
 */
export function getTimelineBarPercent(value: number, yMax: number): number {
  if (yMax <= 0 || value <= 0) return 0
  return Math.min(100, Math.round((value / yMax) * 100))
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useMetricsTimeline() {
  const api = useApi()

  /**
   * Laedt die Conversion-Timeline fuer einen Funnel.
   * GET /funnels/{funnelId}/metrics/timeline
   */
  async function get(funnelId: string): Promise<TimelinePoint[]> {
    return api<TimelinePoint[]>(`/funnels/${funnelId}/metrics/timeline`)
  }

  return { get }
}
