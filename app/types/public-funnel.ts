/**
 * Typen fuer die oeffentliche Funnel-API (/api/public/...).
 * Kein Auth-Token erforderlich, CORS erlaubt alle Origins.
 */
import type { FunnelContent, BrandingColors } from '~/types/funnel'

// ---------------------------------------------------------------------------
// A/B-Varianten-Zuweisung: POST /api/public/f/{hash}/ab-assign
// ---------------------------------------------------------------------------

export interface AbAssignBody {
  session_id: string
  /**
   * UUID der Variante aus dem Session-Cookie (fuer Sticky-Zuweisung).
   * Backend liefert ab M5.6 UUIDs statt Integer-IDs.
   */
  existing_variant_id?: string
}

/**
 * 200-Antwort von /ab-assign.
 * 204 No Content bedeutet: kein laufender A/B-Test -> Standard-Content rendern.
 */
export interface AbAssignResponse {
  /** UUID der zugewiesenen Variante. */
  ab_variant_id: string
  funnel_version: {
    content: FunnelContent
    schema_version: string
  }
}

// ---------------------------------------------------------------------------
// API-Response: GET /api/public/f/{hash}
// ---------------------------------------------------------------------------

export interface PublicFunnelTracking {
  ga4_id: string | null
  meta_pixel_id: string | null
}

export interface PublicFunnelSettings {
  seo_title: string | null
  seo_description: string | null
  og_image_path: string | null
  favicon_path: string | null
  tracking: PublicFunnelTracking
}

/**
 * Branding wie es der oeffentliche Renderer-Endpunkt liefert.
 * Gleiche Felder wie Branding in funnel.ts, aber als eigenstaendiger Typ
 * (kein Import des Admin-Typs in den Public-Bereich).
 */
export interface PublicFunnelBranding {
  id: string
  name: string
  colors: BrandingColors
  font_heading: string | null
  font_body: string | null
  logo_path: string | null
  favicon_path: string | null
}

export interface PublicFunnel {
  id: string
  /** Kurze oeffentliche ID (public_id, z.B. "demo0001") – bevorzugte kanonische URL. */
  public_id: string | null
  name: string
  schema_version: string
  content: FunnelContent
  settings: PublicFunnelSettings
  branding: PublicFunnelBranding | null
  mp_branding_enabled: boolean
  workspace: {
    name: string
    /** Datenschutz-URL des Workspaces. Fallback: '/datenschutz'. */
    privacy_policy_url?: string | null
  }
}

// ---------------------------------------------------------------------------
// Lead-Submit: POST /api/public/f/{hash}/leads
// ---------------------------------------------------------------------------

export interface LeadAnswer {
  step_index: number
  block_id: string
  block_type: string
  field_key: string
  value: string | boolean
}

export interface UtmParams {
  source?: string
  medium?: string
  campaign?: string
  term?: string
  content?: string
}

export interface LeadSubmitBody {
  session_id: string
  answers: LeadAnswer[]
  consent: boolean
  consent_text: string
  utm?: UtmParams
  /** UUID der zugewiesenen A/B-Variante, falls ein A/B-Test laeuft. */
  ab_variant_id?: string
  /** Tracking-Consent (true/false). null = nicht gesetzt (kein Consent-Banner gezeigt). */
  tracking_consent?: boolean | null
  /** OTP-Verifikations-Token, wenn ein optin_otp-Block im Funnel vorhanden ist. */
  otp_verified_token?: string | null
}

export interface LeadSubmitResponse {
  id: string
  status: string
}

// ---------------------------------------------------------------------------
// Events: POST /api/public/f/{hash}/events
// ---------------------------------------------------------------------------

export type EventType =
  | 'view'
  | 'start'
  | 'step_view'
  | 'step_complete'
  | 'step_back'
  | 'lead_submit'
  | 'button_click'

export interface EventBody {
  session_id: string
  event_type: EventType
  step_index?: number
  block_id?: string
  event_value?: string
  device_type?: string
  utm?: Record<string, string>
  referrer?: string
  /** UUID der zugewiesenen A/B-Variante, falls ein A/B-Test laeuft. */
  ab_variant_id?: string
}
