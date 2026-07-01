/**
 * API-Composable fuer A/B-Test-Verwaltung (M3.9).
 *
 * Kapselt alle schreibenden und lesenden Operationen auf
 * /funnels/{funnelId}/ab-tests/* und /funnels/{funnelId}/versions.
 *
 * Reine Hilfsfunktionen (splitDisplay) sind separat exportiert,
 * damit sie in Vitest ohne Nuxt-Kontext testbar sind.
 */
import type {
  AbTest,
  AbTestListResponse,
  AbTestResponse,
  FunnelVersionListResponse,
} from '~/types/ab-test'

// ---------------------------------------------------------------------------
// Reine Hilfsfunktionen (keine Nuxt-Abhaengigkeit, testbar)
// ---------------------------------------------------------------------------

/**
 * Berechnet den Anteil von Variante B aus dem A-Anteil.
 * Stellt sicher, dass A + B immer 100 ergibt.
 */
export function calcSplitB(splitA: number): number {
  return 100 - splitA
}

/**
 * Formatiert den Traffic-Split als lesbaren String.
 * Beispiel: splitA=70 -> "A 70 % / B 30 %"
 */
export function formatSplitDisplay(splitA: number): string {
  return `A ${splitA} % / B ${calcSplitB(splitA)} %`
}

/**
 * Gibt true zurueck wenn mind. eine Version waehlbar ist als Variante B.
 * Waehlbar = published, aber NICHT die aktuelle Live-Version (is_current_published=false).
 */
export function hasSelectableVersionB(response: FunnelVersionListResponse): boolean {
  return response.data.some((v) => !v.is_current_published)
}

// ---------------------------------------------------------------------------
// Payload-Typen
// ---------------------------------------------------------------------------

export interface CreateAbTestPayload {
  name: string
  variant_b_version_id: number
  traffic_split_pct_a: number
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useAbTests() {
  const api = useApi()

  /**
   * Laedt alle A/B-Tests eines Funnels.
   * GET /funnels/{funnelId}/ab-tests
   */
  async function list(funnelId: string): Promise<AbTestListResponse> {
    return api<AbTestListResponse>(`/funnels/${funnelId}/ab-tests`)
  }

  /**
   * Legt einen neuen A/B-Test an.
   * POST /funnels/{funnelId}/ab-tests
   */
  async function create(
    funnelId: string,
    payload: CreateAbTestPayload,
  ): Promise<AbTestResponse> {
    return api<AbTestResponse>(`/funnels/${funnelId}/ab-tests`, {
      method: 'POST',
      body: payload,
    })
  }

  /**
   * Startet oder setzt einen pausierten Test fort.
   * POST /funnels/{funnelId}/ab-tests/{abTestId}/start
   */
  async function start(funnelId: string, abTestId: number): Promise<AbTestResponse> {
    return api<AbTestResponse>(`/funnels/${funnelId}/ab-tests/${abTestId}/start`, {
      method: 'POST',
    })
  }

  /**
   * Pausiert einen laufenden Test.
   * POST /funnels/{funnelId}/ab-tests/{abTestId}/pause
   */
  async function pause(funnelId: string, abTestId: number): Promise<AbTestResponse> {
    return api<AbTestResponse>(`/funnels/${funnelId}/ab-tests/${abTestId}/pause`, {
      method: 'POST',
    })
  }

  /**
   * Schliesst einen Test ab (kein Gewinner gesetzt).
   * POST /funnels/{funnelId}/ab-tests/{abTestId}/conclude
   */
  async function conclude(funnelId: string, abTestId: number): Promise<AbTestResponse> {
    return api<AbTestResponse>(`/funnels/${funnelId}/ab-tests/${abTestId}/conclude`, {
      method: 'POST',
    })
  }

  /**
   * Loescht einen Test (nur moeglich wenn nicht running).
   * DELETE /funnels/{funnelId}/ab-tests/{abTestId}
   */
  async function remove(funnelId: string, abTestId: number): Promise<void> {
    await api(`/funnels/${funnelId}/ab-tests/${abTestId}`, { method: 'DELETE' })
  }

  /**
   * Setzt den Gewinner eines Tests und uebernimmt die Version als neue Published Version.
   * POST /funnels/{funnelId}/ab-tests/{abTestId}/winner/{variantId}
   */
  async function setWinner(
    funnelId: string,
    abTestId: number,
    variantId: number,
  ): Promise<AbTestResponse> {
    return api<AbTestResponse>(
      `/funnels/${funnelId}/ab-tests/${abTestId}/winner/${variantId}`,
      { method: 'POST' },
    )
  }

  /**
   * Laedt die stabilen (veroeffentlichten) Versionen des Funnels.
   * Nur published Versionen (keine Drafts) werden vom Backend zurueckgegeben.
   * GET /funnels/{funnelId}/versions
   */
  async function listVersions(funnelId: string): Promise<FunnelVersionListResponse> {
    return api<FunnelVersionListResponse>(`/funnels/${funnelId}/versions`)
  }

  return {
    list,
    create,
    start,
    pause,
    conclude,
    remove,
    setWinner,
    listVersions,
  }
}

export type { AbTest, AbTestListResponse, AbTestResponse, FunnelVersionListResponse }
