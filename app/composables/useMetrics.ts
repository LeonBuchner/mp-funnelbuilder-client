/**
 * API-Composable fuer Funnel-Metriken.
 *
 * Exportiert zusaetzlich reine Hilfsfunktionen (getMetricsDateRange,
 * formatConversionRate, toISODate), damit sie in Vitest-Tests direkt
 * und ohne Nuxt-Kontext testbar sind.
 *
 * GET /funnels/{funnelUuid}/metrics?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Ohne from/to -> Gesamt-Zeitraum.
 */

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

export type MetricsPeriod = 'all' | '7d' | '30d' | '90d'

export interface MetricsRange {
  from: string | null
  to: string | null
  label: string
}

export interface MetricsData {
  range: MetricsRange
  views: number
  starts: number
  leads: number
  conversion_rate: number
  completion_rate: number
  messages_sent: number
}

export interface MetricsResponse {
  data: MetricsData
}

export interface MetricsParams {
  from?: string
  to?: string
}

// ---------------------------------------------------------------------------
// Reine Hilfsfunktionen (keine Nuxt-Abhaengigkeit, testbar)
// ---------------------------------------------------------------------------

/**
 * Wandelt ein Date-Objekt in einen ISO-Datum-String (YYYY-MM-DD) um.
 * Nutzt toISOString() -> UTC, also keine Timezone-Ueberraschungen.
 */
export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Berechnet from/to fuer einen Zeitraum relativ zu `now`.
 * `now` ist injizierbar, damit Tests deterministisch laufen.
 *
 * 'all'  -> {}                 (kein Datumsfilter, API gibt Gesamtzeitraum)
 * '7d'   -> letzte 7 Tage
 * '30d'  -> letzte 30 Tage
 * '90d'  -> letzte 90 Tage
 */
export function getMetricsDateRange(
  period: MetricsPeriod,
  now: Date = new Date(),
): MetricsParams {
  if (period === 'all') return {}

  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
  const to = toISODate(now)
  const fromDate = new Date(now)
  fromDate.setDate(fromDate.getDate() - days)
  return { from: toISODate(fromDate), to }
}

/**
 * Formatiert eine Conversion Rate als Prozentzahl im deutschen Format.
 * Beispiel: 2.43 -> '2,43 %'
 *
 * Nutzt toFixed(2) statt toLocaleString, damit das Ergebnis in allen
 * Laufzeitumgebungen (Node.js, happy-dom, Browser) deterministisch ist.
 * Der englische Dezimalpunkt wird durch das deutsche Komma ersetzt.
 */
export function formatConversionRate(rate: number): string {
  return rate.toFixed(2).replace('.', ',') + ' %'
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useMetrics() {
  const api = useApi()

  /**
   * Laedt Metriken fuer einen Funnel.
   * from/to sind optional (ISO-Datum YYYY-MM-DD); ohne Parameter -> Gesamt.
   * GET /funnels/{funnelUuid}/metrics
   */
  async function get(funnelUuid: string, params?: MetricsParams): Promise<MetricsResponse> {
    const query: Record<string, string> = {}
    if (params?.from) query.from = params.from
    if (params?.to) query.to = params.to

    return api<MetricsResponse>(`/funnels/${funnelUuid}/metrics`, { query })
  }

  return { get }
}
