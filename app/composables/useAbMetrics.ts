/**
 * API-Composable fuer A/B-Test-Metriken (M3.8).
 *
 * GET /funnels/{funnelId}/ab-tests/{abTestId}/metrics
 *
 * Exportiert zusaetzlich reine Hilfsfunktionen (formatAbConversionRate,
 * isBestConversion), damit sie in Vitest-Tests direkt und ohne Nuxt-Kontext
 * testbar sind.
 */
import type { AbTestMetricsResponse, AbVariantMetrics } from '~/types/ab-test'

export type { AbTestMetricsResponse, AbVariantMetrics }

// ---------------------------------------------------------------------------
// Reine Hilfsfunktionen (keine Nuxt-Abhaengigkeit, testbar)
// ---------------------------------------------------------------------------

/**
 * Formatiert eine Conversion Rate als Prozentzahl im deutschen Format.
 * Beispiel: 33.33 -> "33,33 %", 0 -> "0,00 %"
 *
 * Verwendet toFixed(2) statt toLocaleString fuer Determinismus
 * in allen Laufzeitumgebungen (Node.js, happy-dom, Browser).
 * views=0 fuehrt zu conversion_rate=0 -> gibt "0,00 %" zurueck.
 */
export function formatAbConversionRate(rate: number): string {
  return rate.toFixed(2).replace('.', ',') + ' %'
}

/**
 * Gibt true zurueck wenn die Variante die hoechste Conversion Rate hat
 * und kein Gleichstand vorliegt.
 *
 * Gleichstand (mehrere Varianten mit derselben Rate) oder nur eine
 * Variante: gibt false zurueck (keine Hervorhebung).
 */
export function isBestConversion(
  variantId: number,
  variants: AbVariantMetrics[],
): boolean {
  if (variants.length <= 1) return false

  const own = variants.find((v) => v.ab_variant_id === variantId)?.conversion_rate ?? 0
  const max = Math.max(...variants.map((v) => v.conversion_rate))

  // Kein Gleichstand: genau diese Variante hat den hoechsten Wert
  const countWithMax = variants.filter((v) => v.conversion_rate === max).length
  return own === max && countWithMax === 1
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useAbMetrics() {
  const api = useApi()

  /**
   * Laedt A/B-Metriken fuer einen Test.
   * GET /funnels/{funnelId}/ab-tests/{abTestId}/metrics
   */
  async function get(funnelId: string, abTestId: number): Promise<AbTestMetricsResponse> {
    return api<AbTestMetricsResponse>(`/funnels/${funnelId}/ab-tests/${abTestId}/metrics`)
  }

  return { get }
}
