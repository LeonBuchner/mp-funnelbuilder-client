/**
 * API-Composable fuer workspace-weite Performance-Metriken.
 *
 * Exportiert reine Hilfsfunktionen (getPerformanceDateRange,
 * getPerformanceYMax, getPerformanceBarPercent, formatWorkspaceConversionRate),
 * damit sie in Vitest-Tests direkt und ohne Nuxt-Kontext testbar sind.
 *
 * GET /workspaces/{workspaceUuid}/performance?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Ohne from/to -> Gesamt-Zeitraum.
 */
import type {
  WorkspacePerformanceResponse,
  WorkspacePerformanceTimelinePoint,
} from '~/types/workspace-performance'

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

export type PerformancePeriod = 'all' | '7d' | '30d' | '90d'

export interface PerformanceParams {
  from?: string
  to?: string
}

// ---------------------------------------------------------------------------
// Reine Hilfsfunktionen (keine Nuxt-Abhaengigkeit, testbar)
// ---------------------------------------------------------------------------

/**
 * Wandelt ein Date-Objekt in einen ISO-Datum-String (YYYY-MM-DD) um.
 */
export function toPerformanceISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Berechnet from/to fuer einen Zeitraum relativ zu `now`.
 * `now` ist injizierbar, damit Tests deterministisch laufen.
 *
 * 'all'  -> {}  (kein Datumsfilter, API gibt Gesamtzeitraum)
 * '7d'   -> letzte 7 Tage
 * '30d'  -> letzte 30 Tage
 * '90d'  -> letzte 90 Tage
 */
export function getPerformanceDateRange(
  period: PerformancePeriod,
  now: Date = new Date(),
): PerformanceParams {
  if (period === 'all') return {}

  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
  const to = toPerformanceISODate(now)
  const fromDate = new Date(now)
  fromDate.setDate(fromDate.getDate() - days)
  return { from: toPerformanceISODate(fromDate), to }
}

/**
 * Gibt den gemeinsamen Maximalwert (views oder leads) ueber alle Timeline-Punkte zurueck.
 * Liefert 1 als Fallback, um Division durch 0 zu vermeiden.
 */
export function getPerformanceYMax(points: WorkspacePerformanceTimelinePoint[]): number {
  if (points.length === 0) return 1
  const max = Math.max(...points.map(p => Math.max(p.views, p.leads)))
  return max > 0 ? max : 1
}

/**
 * Berechnet die Balkenhoehe als Prozentwert (0-100) relativ zu yMax.
 * Liefert 0 bei yMax <= 0 (Division durch 0 abgefangen).
 */
export function getPerformanceBarPercent(value: number, yMax: number): number {
  if (yMax <= 0 || value <= 0) return 0
  return Math.min(100, Math.round((value / yMax) * 100))
}

/**
 * Formatiert eine Conversion Rate als Prozentzahl im deutschen Format.
 * Beispiel: 2.43 -> '2,43 %'
 *
 * Division durch 0 wird durch Normalisierung auf den uebergebenen Wert verhindert.
 * Nutzt toFixed(2) fuer deterministisches Ergebnis in allen Umgebungen.
 */
export function formatWorkspaceConversionRate(rate: number): string {
  return rate.toFixed(2).replace('.', ',') + ' %'
}

/**
 * Formatiert ein ISO-Datum (YYYY-MM-DD) in ein kurzes deutsches Format (DD.MM.).
 */
export function formatPerformanceDate(isoDate: string): string {
  const parts = isoDate.split('-')
  if (parts.length !== 3) return isoDate
  return `${parts[2]}.${parts[1]}.`
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useWorkspacePerformance() {
  const api = useApi()

  /**
   * Laedt workspace-weite Performance-Daten.
   * from/to sind optional (ISO-Datum YYYY-MM-DD); ohne Parameter -> Gesamt.
   * GET /workspaces/{workspaceUuid}/performance
   */
  async function get(
    workspaceUuid: string,
    params?: PerformanceParams,
  ): Promise<WorkspacePerformanceResponse> {
    const query: Record<string, string> = {}
    if (params?.from) query.from = params.from
    if (params?.to) query.to = params.to

    return api<WorkspacePerformanceResponse>(
      `/workspaces/${workspaceUuid}/performance`,
      { query },
    )
  }

  return { get }
}
