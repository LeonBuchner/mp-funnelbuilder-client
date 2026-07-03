/**
 * Typen fuer A/B-Tests (M3.6 bis M3.8).
 * Entsprechen der Ausgabe von AbTestResource und AbTestMetricsController.
 */

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export type AbTestStatus = 'draft' | 'running' | 'paused' | 'concluded'

// ---------------------------------------------------------------------------
// Variante (aus AbTestResource)
// ---------------------------------------------------------------------------

export interface AbVariant {
  id: string
  ab_test_id: string
  funnel_version_id: number
  label: string
  is_control: boolean
}

// ---------------------------------------------------------------------------
// A/B-Test (aus AbTestResource)
// ---------------------------------------------------------------------------

export interface AbTest {
  id: string
  // funnel_id wurde entfernt: wird vom Backend nicht mehr ausgegeben (Integer-Enumeration).
  // Der Funnel-Kontext ist immer aus dem URL-Parameter bekannt.
  name: string
  status: AbTestStatus
  traffic_split_pct_a: number
  winner_variant_id: string | null
  started_at: string | null
  ended_at: string | null
  created_at: string
  updated_at: string
  variants: AbVariant[]
}

export interface AbTestListResponse {
  data: AbTest[]
}

export interface AbTestResponse {
  data: AbTest
}

// ---------------------------------------------------------------------------
// Funnel-Versionen (fuer Variante-B-Auswahl beim A/B-Test anlegen)
// ---------------------------------------------------------------------------

/**
 * Stabile (veroeffentlichte) Funnel-Version fuer die Variant-B-Auswahl.
 * Nur published Versionen (published_at != null) werden zurueckgegeben.
 * is_current_published markiert die aktuell live geschaltete Version (= Kontrolle A).
 */
export interface FunnelVersionListItem {
  id: number
  version_number: number
  label: string | null
  published_at: string
  is_current_published: boolean
}

export interface FunnelVersionListResponse {
  data: FunnelVersionListItem[]
}

// ---------------------------------------------------------------------------
// Metriken je Variante (aus AbTestMetricsController, M3.8)
// ---------------------------------------------------------------------------

export interface AbVariantMetrics {
  ab_variant_id: string
  label: string
  is_control: boolean
  views: number
  starts: number
  leads: number
  /** Conversion Rate in Prozent (leads/views*100), 0 wenn views=0. */
  conversion_rate: number
}

export interface AbTestMetrics {
  id: string
  name: string
  status: AbTestStatus
  winner_variant_id: string | null
  started_at: string | null
  ended_at: string | null
  variants: AbVariantMetrics[]
}

export interface AbTestMetricsResponse {
  data: AbTestMetrics
}
