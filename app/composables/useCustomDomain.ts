/**
 * API-Composable fuer Custom-Domain-Verwaltung (M5.3).
 *
 * Endpunkte (nur mp_admin):
 *   GET    /workspaces/{uuid}/custom-domain  -> CustomDomainResponse | 404
 *   POST   /workspaces/{uuid}/custom-domain  -> CustomDomainResponse | 422 | 404 (Feature aus)
 *   DELETE /workspaces/{uuid}/custom-domain  -> 204 | 404
 *   POST   /workspaces/{uuid}/custom-domain/verify -> CustomDomainResponse | 422 | 404 (Feature aus)
 *
 * Feature-Flag-Handling:
 *   Das Backend-Flag CUSTOM_DOMAINS_ENABLED steuert die Verfuegbarkeit.
 *   GET 404 bedeutet entweder "keine Domain gesetzt" oder "Feature aus".
 *   Da ein 404 im GET keine Unterscheidung erlaubt, wird er optimistisch als
 *   "keine Domain konfiguriert" behandelt. Erst wenn POST 404 zurueckgibt,
 *   wissen wir sicher, dass das Feature deaktiviert ist -> featureAvailable = false.
 */

import type { CustomDomain, CustomDomainResponse } from '~/types/api'

// ---------------------------------------------------------------------------
// Interne Hilfsfunktion
// ---------------------------------------------------------------------------

/**
 * Liest den HTTP-Status aus einem Fetch-Fehler-Objekt.
 * $fetch von Nuxt wirft ein FetchError mit status-Property.
 */
export function getErrorStatus(error: unknown): number | null {
  const err = error as {
    status?: number
    statusCode?: number
    response?: { status?: number }
  }
  return err?.status ?? err?.statusCode ?? err?.response?.status ?? null
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useCustomDomain() {
  const api = useApi()

  /** Aktuell konfigurierte Domain oder null wenn keine gesetzt. */
  const domain = ref<CustomDomain | null>(null)

  /** Ladeindikator fuer alle asynchronen Operationen. */
  const isLoading = ref(false)

  /**
   * Gibt an ob das Custom-Domains-Feature im Backend aktiv ist.
   * Startet als true (optimistisch). Wird auf false gesetzt wenn POST 404 liefert.
   */
  const featureAvailable = ref(true)

  /**
   * Laedt die aktuelle Custom-Domain des Workspaces.
   * GET /workspaces/{uuid}/custom-domain
   *
   * 404 -> domain = null (keine Domain oder Feature aus - wird optimistisch als "keine Domain" behandelt)
   * Andere Fehler werden weitergegeben.
   */
  async function fetchDomain(workspaceUuid: string): Promise<void> {
    isLoading.value = true
    try {
      const res = await api<CustomDomainResponse>(`/workspaces/${workspaceUuid}/custom-domain`)
      domain.value = res.data
    }
    catch (error) {
      if (getErrorStatus(error) === 404) {
        domain.value = null
        // 404 beim GET koennte auch "Feature aus" bedeuten, aber das koennen
        // wir erst nach dem POST-Versuch sicher wissen.
      }
      else {
        throw error
      }
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Registriert eine neue Custom-Domain.
   * POST /workspaces/{uuid}/custom-domain
   *
   * 201 -> domain wird gesetzt (inkl. acme_txt_record fuer DNS-Verifikation)
   * 404 -> Feature ist deaktiviert -> featureAvailable = false
   * 422 -> Validierungsfehler (Domain ungueltig / interne Domain) -> wird weitergegeben
   */
  async function addDomain(workspaceUuid: string, domainName: string): Promise<void> {
    isLoading.value = true
    try {
      const res = await api<CustomDomainResponse>(`/workspaces/${workspaceUuid}/custom-domain`, {
        method: 'POST',
        body: { domain: domainName },
      })
      domain.value = res.data
    }
    catch (error) {
      if (getErrorStatus(error) === 404) {
        featureAvailable.value = false
      }
      throw error
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Entfernt die Custom-Domain des Workspaces.
   * DELETE /workspaces/{uuid}/custom-domain
   *
   * 204 -> Erfolg, domain = null
   * 404 -> Domain bereits entfernt, domain = null (kein Fehler)
   * Andere Fehler werden weitergegeben.
   */
  async function removeDomain(workspaceUuid: string): Promise<void> {
    isLoading.value = true
    try {
      await api(`/workspaces/${workspaceUuid}/custom-domain`, { method: 'DELETE' })
      domain.value = null
    }
    catch (error) {
      if (getErrorStatus(error) === 404) {
        // Domain ist bereits entfernt - kein Fehlerzustand
        domain.value = null
      }
      else {
        throw error
      }
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Prueft den DNS-TXT-Record und setzt verified_at bei Erfolg.
   * POST /workspaces/{uuid}/custom-domain/verify
   *
   * 200 -> verified_at wird gesetzt
   * 422 -> TXT-Record noch nicht gefunden -> wird weitergegeben
   * 404 -> Feature deaktiviert -> featureAvailable = false
   */
  async function verifyDomain(workspaceUuid: string): Promise<void> {
    isLoading.value = true
    try {
      const res = await api<CustomDomainResponse>(
        `/workspaces/${workspaceUuid}/custom-domain/verify`,
        { method: 'POST' },
      )
      domain.value = res.data
    }
    catch (error) {
      if (getErrorStatus(error) === 404) {
        featureAvailable.value = false
      }
      throw error
    }
    finally {
      isLoading.value = false
    }
  }

  return {
    domain,
    isLoading,
    featureAvailable,
    fetchDomain,
    addDomain,
    removeDomain,
    verifyDomain,
  }
}

export type { CustomDomain }
