/**
 * Typen fuer die oeffentliche Funnel-API (/api/public/...).
 * Kein Auth-Token erforderlich, CORS erlaubt alle Origins.
 */
import type { FunnelContent } from '~/types/funnel'

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

export interface PublicFunnelBranding {
  id: string
  name: string
  is_default: boolean
}

export interface PublicFunnel {
  id: string
  name: string
  schema_version: string
  content: FunnelContent
  settings: PublicFunnelSettings
  branding: PublicFunnelBranding | null
  mp_branding_enabled: boolean
  workspace: { name: string }
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
}
