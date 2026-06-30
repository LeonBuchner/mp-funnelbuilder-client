/**
 * API-Composable fuer alle Funnel-Endpunkte.
 * Nutzt useApi() als zentralen $fetch-Wrapper.
 */
import type {
  Funnel,
  FunnelContent,
  FunnelVersion,
  PaginatedFunnelList,
} from '~/types/funnel'

export interface CreateFunnelPayload {
  name: string
  slug?: string
  branding_id?: string
}

export interface UpdateFunnelPayload {
  name?: string
  slug?: string
  /** null entfernt das Branding (zurueck zum Theme-Preset). */
  branding_id?: string | null
}

export interface FunnelResponse {
  data: Funnel
}

export interface FunnelVersionResponse {
  data: FunnelVersion
}

export interface ToggleFavoriteResponse {
  id: string
  is_favorite: boolean
}

export function useFunnels() {
  const api = useApi()

  /**
   * Lädt alle Funnels eines Workspaces (paginiert, Listenansicht).
   * GET /workspaces/{workspaceUuid}/funnels
   * Gibt FunnelListItem-Objekte mit Metriken zurück.
   */
  async function list(workspaceUuid: string): Promise<PaginatedFunnelList> {
    return api<PaginatedFunnelList>(`/workspaces/${workspaceUuid}/funnels`)
  }

  /**
   * Setzt oder entfernt den Favorit-Status eines Funnels.
   * POST /funnels/{funnelUuid}/favorite
   */
  async function toggleFavorite(uuid: string): Promise<ToggleFavoriteResponse> {
    return api<ToggleFavoriteResponse>(`/funnels/${uuid}/favorite`, { method: 'POST' })
  }

  /**
   * Legt einen neuen Funnel an.
   * POST /workspaces/{workspaceUuid}/funnels
   */
  async function create(
    workspaceUuid: string,
    payload: CreateFunnelPayload,
  ): Promise<FunnelResponse> {
    return api<FunnelResponse>(`/workspaces/${workspaceUuid}/funnels`, {
      method: 'POST',
      body: payload,
    })
  }

  /**
   * Lädt einen einzelnen Funnel mit vollständigem draft_version.content.
   * GET /funnels/{funnelUuid}
   */
  async function get(uuid: string): Promise<FunnelResponse> {
    return api<FunnelResponse>(`/funnels/${uuid}`)
  }

  /**
   * Aktualisiert Name/Slug/Branding eines Funnels.
   * PUT /funnels/{funnelUuid}
   */
  async function update(uuid: string, payload: UpdateFunnelPayload): Promise<FunnelResponse> {
    return api<FunnelResponse>(`/funnels/${uuid}`, {
      method: 'PUT',
      body: payload,
    })
  }

  /**
   * Löscht einen Funnel (Soft-Delete).
   * DELETE /funnels/{funnelUuid}
   */
  async function remove(uuid: string): Promise<void> {
    await api(`/funnels/${uuid}`, { method: 'DELETE' })
  }

  /**
   * Speichert den Entwurf (Content + optionale Settings).
   * PUT /funnels/{funnelUuid}/draft
   * Wirft bei 422 einen Fehler mit { errors } für Schema-Verletzungen.
   */
  async function saveDraft(
    uuid: string,
    content: FunnelContent,
    settings?: Record<string, unknown>,
  ): Promise<FunnelVersionResponse> {
    return api<FunnelVersionResponse>(`/funnels/${uuid}/draft`, {
      method: 'PUT',
      body: settings ? { content, settings } : { content },
    })
  }

  /**
   * Veröffentlicht einen Funnel.
   * POST /funnels/{funnelUuid}/publish
   */
  async function publish(uuid: string, label?: string): Promise<FunnelResponse> {
    return api<FunnelResponse>(`/funnels/${uuid}/publish`, {
      method: 'POST',
      body: label ? { label } : {},
    })
  }

  return { list, create, get, update, remove, saveDraft, publish, toggleFavorite }
}
