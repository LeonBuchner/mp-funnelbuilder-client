/**
 * API-Composable fuer Lead-Verwaltung (M4.4).
 *
 * Exportiert zusaetzlich reine Hilfsfunktionen (buildLeadsExportUrl,
 * getLeadStatusLabel, getFirstAnswerPreview), die in Vitest-Tests direkt
 * und ohne Nuxt-Kontext testbar sind.
 *
 * Endpunkte:
 *   GET  /funnels/{funnelId}/leads?status=&from=&to=&page=
 *   GET  /funnels/{funnelId}/leads/{leadId}
 *   DELETE /funnels/{funnelId}/leads/{leadId}
 *   GET  /funnels/{funnelId}/leads/export?status=&from=&to=
 *   GET  /funnels/{funnelId}/leads/{leadId}/files/{fileId}/download
 */

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

export type LeadStatus =
  | 'partial'
  | 'complete'
  | 'double_opt_in_pending'
  | 'double_opt_in_confirmed'

export interface LeadAnswer {
  field_key: string
  block_type: string
  value: string | string[] | number | boolean
}

export interface LeadFile {
  id: string
  original_filename: string
  mime_type: string
  file_size_bytes: number
}

export interface Lead {
  id: string
  status: LeadStatus
  consent_given_at: string | null
  created_at: string
  answers: LeadAnswer[]
  files: LeadFile[]
}

export interface PaginatedLeadsLinks {
  prev: string | null
  next: string | null
}

export interface PaginatedLeadsMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}

export interface PaginatedLeads {
  data: Lead[]
  links: PaginatedLeadsLinks
  meta: PaginatedLeadsMeta
}

export interface LeadResponse {
  data: Lead
}

export interface LeadsFilter {
  status?: LeadStatus | ''
  from?: string
  to?: string
  page?: number
}

export interface FileDownloadResponse {
  url: string
}

// ---------------------------------------------------------------------------
// Reine Hilfsfunktionen (keine Nuxt-Abhaengigkeit, testbar)
// ---------------------------------------------------------------------------

/**
 * Gibt das deutschsprachige Label fuer einen Lead-Status zurueck.
 */
export function getLeadStatusLabel(status: LeadStatus): string {
  const labels: Record<LeadStatus, string> = {
    partial: 'Teilweise',
    complete: 'Abgeschlossen',
    double_opt_in_pending: 'DOI ausstehend',
    double_opt_in_confirmed: 'DOI bestätigt',
  }
  return labels[status] ?? status
}

/**
 * Gibt die Tailwind-Klassen fuer den Status-Badge zurueck.
 * Benutzt -900-Textvarianten auf -50-Hintergruenden fuer WCAG-AA-konformes
 * Kontrastverhältnis auch in Tailwind v4 (OKLCH-basierte Farben).
 */
export function getLeadStatusClass(status: LeadStatus): string {
  const classes: Record<LeadStatus, string> = {
    partial: 'bg-amber-50 text-amber-900',
    complete: 'bg-green-50 text-green-900',
    double_opt_in_pending: 'bg-orange-50 text-orange-900',
    double_opt_in_confirmed: 'bg-blue-50 text-blue-900',
  }
  return classes[status] ?? 'bg-gray-50 text-gray-900'
}

/**
 * Gibt die erste Antwort eines Leads als kurze Vorschau zurueck.
 * Kuerzt auf maximal 50 Zeichen.
 */
export function getFirstAnswerPreview(lead: Lead): string {
  const first = lead.answers[0]
  if (!first) return ''
  const raw = Array.isArray(first.value)
    ? first.value.join(', ')
    : String(first.value)
  if (raw.length > 50) return raw.slice(0, 50) + '…'
  return raw
}

/**
 * Baut die Export-URL mit optionalen Filter-Parametern.
 * Reine Funktion, testbar ohne Nuxt-Kontext.
 *
 * @param baseUrl  API-Basis-URL ohne abschliessenden Slash
 * @param funnelId UUID des Funnels
 * @param filter   Optionale Filter-Parameter
 */
export function buildLeadsExportUrl(
  baseUrl: string,
  funnelId: string,
  filter?: LeadsFilter,
): string {
  const params = new URLSearchParams()
  if (filter?.status) params.set('status', filter.status)
  if (filter?.from) params.set('from', filter.from)
  if (filter?.to) params.set('to', filter.to)
  const qs = params.toString()
  return `${baseUrl}/funnels/${funnelId}/leads/export${qs ? '?' + qs : ''}`
}

/**
 * Formatiert Dateigroesse in lesbaren String (KB/MB).
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

/**
 * Liest die API-Basis-URL aus der Nuxt-Runtime-Config.
 * Faellt auf den Standardwert zurueck wenn kein Nuxt-Kontext vorhanden
 * (z. B. in Vitest-Tests ohne vollstaendige Nuxt-Instanz).
 */
function resolveBaseUrl(): string {
  try {
    const config = useRuntimeConfig()
    return (config.public.apiBase as string) || 'http://localhost:8000/api/admin'
  } catch {
    // Kein Nuxt-Kontext (Unit-Tests): Standardwert
    return 'http://localhost:8000/api/admin'
  }
}

export function useLeads() {
  const api = useApi()

  /**
   * Laedt paginierte Lead-Liste fuer einen Funnel.
   * GET /funnels/{funnelId}/leads?status=&from=&to=&page=
   */
  async function list(funnelId: string, filter?: LeadsFilter): Promise<PaginatedLeads> {
    const query: Record<string, string | number> = {}
    if (filter?.status) query.status = filter.status
    if (filter?.from) query.from = filter.from
    if (filter?.to) query.to = filter.to
    if (filter?.page && filter.page > 1) query.page = filter.page

    return api<PaginatedLeads>(`/funnels/${funnelId}/leads`, { query })
  }

  /**
   * Laedt einen einzelnen Lead mit allen Antworten und Dateien.
   * GET /funnels/{funnelId}/leads/{leadId}
   */
  async function get(funnelId: string, leadId: string): Promise<LeadResponse> {
    return api<LeadResponse>(`/funnels/${funnelId}/leads/${leadId}`)
  }

  /**
   * Loescht einen Lead unwiderruflich.
   * DELETE /funnels/{funnelId}/leads/{leadId}
   */
  async function remove(funnelId: string, leadId: string): Promise<void> {
    await api(`/funnels/${funnelId}/leads/${leadId}`, { method: 'DELETE' })
  }

  /**
   * Gibt die Export-URL fuer CSV-Download zurueck.
   * Nutzt buildLeadsExportUrl mit der Laufzeit-Basis-URL.
   */
  function exportUrl(funnelId: string, filter?: LeadsFilter): string {
    return buildLeadsExportUrl(resolveBaseUrl(), funnelId, filter)
  }

  /**
   * Laedt den CSV-Export und loest einen Browser-Download aus.
   * Liest den Bearer-Token aus localStorage (analog zu useApi).
   * Nur im Browser ausfuehren (Admin ist SSR:off).
   */
  async function downloadExport(funnelId: string, filter?: LeadsFilter): Promise<void> {
    const url = buildLeadsExportUrl(resolveBaseUrl(), funnelId, filter)

    // Token aus localStorage lesen (analog zu useApi.ts)
    const raw = import.meta.client ? localStorage.getItem('mp_token') : null
    let token = raw
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw)
        if (typeof parsed === 'string') token = parsed
      } catch {
        // raw ist bereits der reine Token-String
      }
    }

    const headers: Record<string, string> = { Accept: 'text/csv' }
    if (token) headers.Authorization = `Bearer ${token}`

    const resp = await fetch(url, { headers })
    if (!resp.ok) throw new Error('CSV-Export fehlgeschlagen.')

    const blob = await resp.blob()
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = `leads-${funnelId}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(objectUrl)
  }

  /**
   * Fragt die signierte Download-URL fuer eine Datei-Anlage ab.
   * GET /funnels/{funnelId}/leads/{leadId}/files/{fileId}/download
   * Gibt die signierte URL zurueck, die im neuen Tab geoeffnet werden soll.
   */
  async function fileDownload(
    funnelId: string,
    leadId: string,
    fileId: string,
  ): Promise<string> {
    const response = await api<FileDownloadResponse>(
      `/funnels/${funnelId}/leads/${leadId}/files/${fileId}/download`,
    )
    return response.url
  }

  return { list, get, remove, exportUrl, downloadExport, fileDownload }
}
