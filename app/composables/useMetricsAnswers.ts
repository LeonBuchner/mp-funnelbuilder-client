/**
 * API-Composable fuer Antworten-Insights-Metriken (M4.7).
 *
 * GET /funnels/{funnelId}/metrics/answers
 * -> [{ block_id, field_key, block_type, total, distribution:[{value,count,percent}] }]
 *
 * Exportiert reine Hilfsfunktionen fuer Unit-Tests.
 */

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

export interface AnswerDistributionItem {
  value: string
  count: number
  percent: number
}

export interface AnswersBlock {
  block_id: string
  field_key: string
  block_type: string
  total: number
  distribution: AnswerDistributionItem[]
}

// ---------------------------------------------------------------------------
// Reine Hilfsfunktionen (testbar ohne Nuxt)
// ---------------------------------------------------------------------------

/**
 * Gibt die maximale Antwortanzahl (count) innerhalb einer Distribution zurueck.
 * Liefert 1 als Fallback um Division durch 0 zu vermeiden.
 */
export function getAnswerDistributionMax(block: AnswersBlock): number {
  if (block.distribution.length === 0) return 1
  const max = Math.max(...block.distribution.map((d) => d.count))
  return max > 0 ? max : 1
}

/**
 * Berechnet die Balken-Breite eines Antwort-Items als Prozentwert (0-100).
 * Liefert 0 bei maxCount=0 (Division durch 0 abgefangen).
 */
export function getAnswerBarPercent(item: AnswerDistributionItem, maxCount: number): number {
  if (maxCount <= 0 || item.count <= 0) return 0
  return Math.min(100, Math.round((item.count / maxCount) * 100))
}

/**
 * Gibt einen lesbaren Label fuer einen Block-Typ zurueck.
 */
export function getAnswerBlockTypeLabel(blockType: string): string {
  const labels: Record<string, string> = {
    single_choice: 'Einfachauswahl',
    multi_choice: 'Mehrfachauswahl',
    input: 'Texteingabe',
    input_dropdown: 'Dropdown',
    input_number: 'Zahleingabe',
    input_date: 'Datum',
    rating: 'Bewertung',
  }
  return labels[blockType] ?? blockType
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useMetricsAnswers() {
  const api = useApi()

  /**
   * Laedt die Antworten-Insights fuer alle Frage-Bloecke eines Funnels.
   * GET /funnels/{funnelId}/metrics/answers
   */
  async function get(funnelId: string): Promise<AnswersBlock[]> {
    return api<AnswersBlock[]>(`/funnels/${funnelId}/metrics/answers`)
  }

  return { get }
}
