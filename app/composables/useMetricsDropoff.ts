/**
 * API-Composable fuer Seite-zu-Seite-Konvertierungs-Metriken (M4.7).
 *
 * GET /funnels/{funnelId}/metrics/dropoff
 * -> [{ step_index, step_views, step_completions, dropoff_rate }]
 *
 * Exportiert reine Hilfsfunktionen fuer Unit-Tests.
 */

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

export interface DropoffStep {
  step_index: number
  step_views: number
  step_completions: number
  dropoff_rate: number
}

// ---------------------------------------------------------------------------
// Reine Hilfsfunktionen (testbar ohne Nuxt)
// ---------------------------------------------------------------------------

/**
 * Gibt den Maximalwert der step_views ueber alle Schritte zurueck.
 * Liefert 1 als Fallback, um Division durch 0 zu vermeiden.
 */
export function getDropoffMaxViews(steps: DropoffStep[]): number {
  if (steps.length === 0) return 1
  const max = Math.max(...steps.map((s) => s.step_views))
  return max > 0 ? max : 1
}

/**
 * Berechnet die Balken-Breite eines Steps in Prozent (0-100).
 * Basiert auf step_views / maxViews.
 * Liefert 0 wenn maxViews = 0 (Division durch 0 abgefangen).
 */
export function getDropoffBarPercent(step: DropoffStep, maxViews: number): number {
  if (maxViews <= 0 || step.step_views <= 0) return 0
  return Math.round((step.step_views / maxViews) * 100)
}

/**
 * Formatiert die Absprungrate als deutsche Prozentzahl.
 * Liefert "0,0 %" bei rate=0 (keine Division durch 0 in der Anzeige).
 */
export function formatDropoffRate(rate: number): string {
  return rate.toFixed(1).replace('.', ',') + ' %'
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useMetricsDropoff() {
  const api = useApi()

  /**
   * Laedt Dropoff-Daten je Schritt fuer einen Funnel.
   * GET /funnels/{funnelId}/metrics/dropoff
   */
  async function get(funnelId: string): Promise<DropoffStep[]> {
    return api<DropoffStep[]>(`/funnels/${funnelId}/metrics/dropoff`)
  }

  return { get }
}
