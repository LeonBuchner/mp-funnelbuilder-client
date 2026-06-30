/**
 * Composable fuer Workspace-Branding-Endpunkte (B11).
 * list, create, update, remove: CRUD ueber /api/admin/...
 *
 * brandingToFunnelVars: mappt ein Branding-Objekt auf --funnel-* CSS-Variablen.
 * Wird von Canvas.vue (Editor) und f/[slug].vue (Renderer) gleichermassen genutzt.
 */
import { contrastRatio } from '~/utils/contrast'
import type { Branding, BrandingColors } from '~/types/funnel'

// ---------------------------------------------------------------------------
// Font-Whitelist
// ---------------------------------------------------------------------------

export type BrandingFont = 'Inter' | 'Lato' | 'Roboto' | 'Montserrat' | 'Open Sans'

export const BRANDING_FONT_WHITELIST: BrandingFont[] = [
  'Inter',
  'Lato',
  'Roboto',
  'Montserrat',
  'Open Sans',
]

// ---------------------------------------------------------------------------
// Payload-Typen
// ---------------------------------------------------------------------------

export interface BrandingPayload {
  name: string
  colors: BrandingColors
  font_heading?: string | null
  font_body?: string | null
  logo_path?: string | null
  favicon_path?: string | null
  custom_css?: string | null
}

export interface BrandingResponse {
  data: Branding
}

export interface BrandingListResponse {
  data: Branding[]
}

// ---------------------------------------------------------------------------
// Interne Helfer
// ---------------------------------------------------------------------------

/** Hex in RGB-Komponenten zerlegen. */
function hexToRgb(hex: string): [number, number, number] {
  const full
    = hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex
  return [
    parseInt(full.slice(1, 3), 16),
    parseInt(full.slice(3, 5), 16),
    parseInt(full.slice(5, 7), 16),
  ]
}

/** Dunklere Hex-Farbe (fester RGB-Kanal-Offset) fuer Hover-Effekte. */
function darkenHex(hex: string, amount = 20): string {
  const [r, g, b] = hexToRgb(hex)
  const clamp = (n: number): number => Math.max(0, Math.min(255, n))
  return (
    '#'
    + clamp(r - amount).toString(16).padStart(2, '0')
    + clamp(g - amount).toString(16).padStart(2, '0')
    + clamp(b - amount).toString(16).padStart(2, '0')
  )
}

/** rgba-String aus Hex + Alpha-Wert. */
function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Berechnet onPrimary: weiss (#ffffff) oder schwarz (#000000),
 * je nachdem welche Farbe den hoeheren WCAG-Kontrast zur Primaerfarbe hat.
 */
function computeOnPrimary(primary: string): string {
  const whiteContrast = contrastRatio('#ffffff', primary)
  const blackContrast = contrastRatio('#000000', primary)
  return whiteContrast >= blackContrast ? '#ffffff' : '#000000'
}

// ---------------------------------------------------------------------------
// brandingToFunnelVars (exportiert fuer Editor + Renderer)
// ---------------------------------------------------------------------------

const FONT_FALLBACK = ', system-ui, sans-serif'

/**
 * Mappt ein Branding-Objekt auf die --funnel-* CSS-Variablen.
 * Wird von Canvas.vue (Editor-Frame) und f/[slug].vue (oeffentlicher Renderer) genutzt.
 * Hat Vorrang gegenueber dem Theme-Preset.
 */
export function brandingToFunnelVars(
  branding: Pick<Branding, 'colors' | 'font_heading' | 'font_body'>,
): Record<string, string> {
  const { colors, font_heading, font_body } = branding
  const onPrimary = computeOnPrimary(colors.primary)

  const bodyFont = font_body ? `${font_body}${FONT_FALLBACK}` : `Inter${FONT_FALLBACK}`
  const headingFont = font_heading ? `${font_heading}${FONT_FALLBACK}` : bodyFont

  return {
    '--funnel-primary': colors.primary,
    '--funnel-primary-hover': darkenHex(colors.primary),
    '--funnel-on-primary': onPrimary,
    '--funnel-bg': colors.background,
    '--funnel-surface': colors.surface,
    '--funnel-text': colors.text,
    '--funnel-muted': hexToRgba(colors.text, 0.55),
    '--funnel-accent': colors.accent,
    '--funnel-secondary': colors.secondary,
    '--funnel-radius': '12px',
    '--funnel-font': bodyFont,
    '--funnel-font-heading': headingFont,
  }
}

// ---------------------------------------------------------------------------
// API-Composable
// ---------------------------------------------------------------------------

export function useBrandings() {
  const api = useApi()

  /**
   * GET /workspaces/{wsUuid}/brandings
   * Liefert alle Brandings des Workspaces.
   */
  async function list(wsUuid: string): Promise<BrandingListResponse> {
    return api<BrandingListResponse>(`/workspaces/${wsUuid}/brandings`)
  }

  /**
   * POST /workspaces/{wsUuid}/brandings
   * Legt ein neues Branding an (nur mp_team / mp_admin).
   */
  async function create(wsUuid: string, payload: BrandingPayload): Promise<BrandingResponse> {
    return api<BrandingResponse>(`/workspaces/${wsUuid}/brandings`, {
      method: 'POST',
      body: payload,
    })
  }

  /**
   * PUT /brandings/{brandingUuid}
   * Aktualisiert ein bestehendes Branding (partial Update).
   */
  async function update(
    brandingUuid: string,
    patch: Partial<BrandingPayload>,
  ): Promise<BrandingResponse> {
    return api<BrandingResponse>(`/brandings/${brandingUuid}`, {
      method: 'PUT',
      body: patch,
    })
  }

  /**
   * DELETE /brandings/{brandingUuid}
   * Loescht ein Branding (nur mp_admin).
   */
  async function remove(brandingUuid: string): Promise<void> {
    await api(`/brandings/${brandingUuid}`, { method: 'DELETE' })
  }

  return { list, create, update, remove }
}
