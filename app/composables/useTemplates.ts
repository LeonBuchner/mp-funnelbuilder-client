/**
 * API-Composable für Vorlagen-Endpunkte (B14 Vorlagen-Galerie).
 * Nutzt useApi() als zentralen $fetch-Wrapper.
 *
 * Endpunkte:
 *   GET  /templates                                         -> list()
 *   POST /workspaces/{wsUuid}/templates/{tplUuid}/create-funnel -> createFunnelFromTemplate()
 *   POST /funnels/{funnelUuid}/save-as-template             -> saveAsTemplate()
 */
import type {
  Funnel,
  TemplateListResponse,
  TemplateResponse,
} from '~/types/funnel'

export interface SaveAsTemplatePayload {
  name: string
  category: string
  description?: string
}

export function useTemplates() {
  const api = useApi()

  /**
   * Lädt alle verfügbaren Vorlagen (System- und Workspace-Vorlagen).
   * GET /templates
   * Zugänglich für alle Workspace-Mitglieder.
   */
  async function list(): Promise<TemplateListResponse> {
    return api<TemplateListResponse>('/templates')
  }

  /**
   * Erstellt einen neuen Funnel auf Basis einer Vorlage.
   * POST /workspaces/{wsUuid}/templates/{templateUuid}/create-funnel
   * Erlaubt: mp_team, mp_admin. Client: 403.
   */
  async function createFunnelFromTemplate(
    wsUuid: string,
    templateUuid: string,
    name?: string,
  ): Promise<{ data: Funnel }> {
    return api<{ data: Funnel }>(
      `/workspaces/${wsUuid}/templates/${templateUuid}/create-funnel`,
      {
        method: 'POST',
        body: name ? { name } : {},
      },
    )
  }

  /**
   * Speichert einen bestehenden Funnel als Vorlage.
   * POST /funnels/{funnelUuid}/save-as-template
   * Nur mp_admin. Gibt die neu erstellte Vorlage zurück.
   */
  async function saveAsTemplate(
    funnelUuid: string,
    payload: SaveAsTemplatePayload,
  ): Promise<TemplateResponse> {
    return api<TemplateResponse>(`/funnels/${funnelUuid}/save-as-template`, {
      method: 'POST',
      body: payload,
    })
  }

  return { list, createFunnelFromTemplate, saveAsTemplate }
}
