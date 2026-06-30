/**
 * Composable fuer die Workspace-Mediathek (B9).
 * Kapselt drei Endpunkte:
 * - POST /workspaces/{uuid}/uploads  (Datei hochladen, multipart)
 * - GET  /workspaces/{uuid}/uploads?page=N  (paginierte Liste)
 * - DELETE /uploads/{uuid}  (loeschen, Uploader oder mp_admin)
 *
 * Kein manuelles Content-Type-Setzen: $fetch erkennt FormData automatisch.
 */

export interface UploadItem {
  id: string
  url: string
  width: number
  height: number
  alt_text: string | null
  original_filename: string
  file_size_bytes: number
  created_at: string
}

export interface UploadListMeta {
  current_page: number
  last_page: number
  total: number
}

export interface UploadListResponse {
  data: UploadItem[]
  meta: UploadListMeta
}

export function useUploads() {
  const api = useApi()

  /**
   * Laedt eine Bilddatei in den Workspace hoch.
   * POST /workspaces/{workspaceUuid}/uploads
   * Rate-Limit: 30/min (wirft 429 bei Ueberschreitung).
   */
  async function upload(workspaceUuid: string, file: File, altText?: string): Promise<UploadItem> {
    const form = new FormData()
    form.append('file', file)
    if (altText) {
      form.append('alt_text', altText)
    }
    // Kein Content-Type setzen: $fetch setzt multipart/form-data mit Boundary automatisch.
    const res = await api<{ data: UploadItem }>(`/workspaces/${workspaceUuid}/uploads`, {
      method: 'POST',
      body: form,
    })
    return res.data
  }

  /**
   * Gibt die paginierte Mediathek eines Workspaces zurueck (24 Eintraege/Seite).
   * GET /workspaces/{workspaceUuid}/uploads?page=N
   * Alle Workspace-Mitglieder duerfen lesen.
   */
  async function list(workspaceUuid: string, page = 1): Promise<UploadListResponse> {
    return api<UploadListResponse>(`/workspaces/${workspaceUuid}/uploads`, {
      query: { page },
    })
  }

  /**
   * Loescht ein Upload-Objekt (Uploader oder mp_admin).
   * DELETE /uploads/{uploadUuid}
   * Wirft 403 wenn weder Uploader noch mp_admin.
   */
  async function remove(uploadUuid: string): Promise<void> {
    await api(`/uploads/${uploadUuid}`, { method: 'DELETE' })
  }

  return { upload, list, remove }
}
