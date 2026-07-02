/**
 * Typen für den Funnel-Builder (M1 + M2).
 * Alle Block-Typen als Discriminated Union über das Feld `type`.
 */

// ---------------------------------------------------------------------------
// Block-Typen
// ---------------------------------------------------------------------------

export interface TextBlock {
  id: string
  type: 'text'
  content: string
  styles?: Record<string, string>
}

export interface ImageBlock {
  id: string
  type: 'image'
  url: string
  alt: string
  width?: number
  height?: number
}

export type ButtonAction = 'next' | 'submit' | 'external_url' | 'restart'
export type ButtonStyle = 'primary' | 'secondary' | 'outline' | 'ghost'

/**
 * Navigationsziel eines Blocks (single_choice / button).
 * 'next'   -> nächste Seite (Standard)
 * 'step'   -> konkreter Step (stepId)
 * 'result' -> Ergebnis-Step (stepId)
 */
export type BlockTarget =
  | { type: 'next' }
  | { type: 'step'; stepId: string }
  | { type: 'result'; stepId: string }

export interface ButtonBlock {
  id: string
  type: 'button'
  label: string
  action: ButtonAction
  externalUrl?: string
  openInNewTab?: boolean
  style: ButtonStyle
  /** Navigationsziel (M2: Logik-Engine, hier: Persistenz) */
  target?: BlockTarget
  /** Verknüpftes Ergebnis (für Scoring/Analytics, optional) */
  resultStepId?: string | null
}

export interface SingleChoiceOption {
  id: string
  label: string
  value: string
  imageUrl?: string
  iconName?: string
}

/**
 * Gemeinsamer Basis-Layout-Typ fuer Auswahl-Bloecke ('none' und 'icon'
 * sind in single_choice und multi_choice identisch).
 * single_choice ergaenzt 'full' (Vollbild-Card), multi_choice 'image' (Bild-Card).
 */
export type ChoiceImageLayout = 'none' | 'icon' | 'full' | 'image'

/** Layout-Varianten fuer single_choice (Backend-Schema v1.1.0). */
export type ImageLayout = 'none' | 'icon' | 'full'

/** Layout-Varianten fuer multi_choice (Backend-Schema v1.1.0). */
export type MultiChoiceImageLayout = 'none' | 'icon' | 'image'

export interface SingleChoiceBlock {
  id: string
  type: 'single_choice'
  fieldKey: string
  required?: boolean
  question: string
  options: SingleChoiceOption[]
  imageLayout: ImageLayout
  autoAdvance: boolean
  /** Navigationsziel (M2: Logik-Engine, hier: Persistenz) */
  target?: BlockTarget
  /** Verknüpftes Ergebnis (für Scoring/Analytics, optional) */
  resultStepId?: string | null
}

export interface InputTextBlock {
  id: string
  type: 'input_text'
  fieldKey: string
  required?: boolean
  label: string
  placeholder?: string
}

export interface InputEmailBlock {
  id: string
  type: 'input_email'
  fieldKey: string
  required?: boolean
  label: string
  placeholder?: string
}

export interface InputPhoneBlock {
  id: string
  type: 'input_phone'
  fieldKey: string
  required?: boolean
  label: string
  defaultCountryCode: string
  allowedCountryCodes: string[]
}

export interface OptinCheckboxBlock {
  id: string
  type: 'optin_checkbox'
  fieldKey: string
  required: boolean
  checkboxLabel: string
}

/**
 * Double-Opt-in-Block (Schema v1.1.0).
 * Backend setzt den Lead nach Submit auf 'pending' und verschickt eine
 * Bestaetigungs-E-Mail. Der Renderer zeigt danach einen Bestaetigungs-Hinweis.
 */
export interface OptinDoubleBlock {
  id: string
  type: 'optin_double'
  fieldKey: string
  required: boolean
  checkboxLabel: string
  /** Hinweistext unter der Checkbox. Standard: "Du erhältst eine Bestätigungs-E-Mail." */
  hintText?: string
}

/**
 * OTP-Block (Schema v1.2.0).
 * Zeigt ein E-Mail-Feld + N einzelne Ziffernslots.
 * Nach erfolgreicher Verifikation wird otp_verified_token im Renderer-State gesetzt.
 */
export interface OptinOtpBlock {
  id: string
  type: 'optin_otp'
  fieldKey: string
  required: boolean
  /** Anzahl der OTP-Stellen. Standard: 6. */
  digits?: number
  label?: string
  emailLabel?: string
  emailPlaceholder?: string
}

export interface ProgressIndicatorBlock {
  id: string
  type: 'progress_indicator'
  currentStep: number
  totalSteps: number
  /** Bezeichnung vor "X von N", z. B. "Frage" */
  label?: string
  /** Stil des Fortschrittsbalkens, Standard "bar" */
  progressStyle?: ProgressBarStyle
}

export interface LogoBlock {
  id: string
  type: 'logo'
  url?: string
  alt?: string
  width?: number
  height?: number
}

// ---------------------------------------------------------------------------
// M2-Block-Typen (Backend-Schema v1.1.0)
// ---------------------------------------------------------------------------

/** Option fuer multi_choice und input_dropdown */
export interface ChoiceOption {
  id: string
  label: string
  value: string
  /** Nur multi_choice: optionales Bild */
  imageUrl?: string
  /** Nur multi_choice: optionaler Icon-Name (Lucide-kompatibel) */
  iconName?: string
}

/**
 * Mehrfachauswahl-Block.
 *
 * v-model-Konvention: kommaseparierter String der gewaehlten values,
 * z. B. "option_a,option_b". Das Backend speichert lead_answer.value
 * als diesen String direkt. Reihenfolge entspricht der Klick-Reihenfolge.
 */
export interface MultiChoiceBlock {
  id: string
  type: 'multi_choice'
  fieldKey: string
  required?: boolean
  question: string
  options: ChoiceOption[]
  imageLayout: MultiChoiceImageLayout
  minSelections?: number
  maxSelections?: number
}

/** Datums-Eingabe (ISO-8601-Datum, z. B. "2026-01-15"). */
export interface InputDateBlock {
  id: string
  type: 'input_date'
  fieldKey: string
  required?: boolean
  label: string
  /** Minimalwert, ISO-8601-Datum, z. B. "2024-01-01" */
  min?: string
  /** Maximalwert, ISO-8601-Datum */
  max?: string
}

/** Uhrzeit-Eingabe (HH:MM). */
export interface InputTimeBlock {
  id: string
  type: 'input_time'
  fieldKey: string
  required?: boolean
  label: string
  /** Früheste erlaubte Zeit, z. B. "08:00" */
  min?: string
  /** Späteste erlaubte Zeit, z. B. "18:00" */
  max?: string
}

/** Numerische Eingabe. */
export interface InputNumberBlock {
  id: string
  type: 'input_number'
  fieldKey: string
  required?: boolean
  label: string
  placeholder?: string
  min?: number
  max?: number
  step?: number
}

/** Dropdown-Auswahl mit vordefinierten Optionen. */
export interface InputDropdownBlock {
  id: string
  type: 'input_dropdown'
  fieldKey: string
  required?: boolean
  label: string
  placeholder?: string
  options: { id: string; label: string; value: string }[]
}

/** Mehrzeiliges Textfeld. */
export interface InputTextareaBlock {
  id: string
  type: 'input_textarea'
  fieldKey: string
  required?: boolean
  label: string
  placeholder?: string
  rows?: number
}

/**
 * Bewertungs-Block.
 *
 * v-model-Konvention: gewaehlter Wert als String, z. B. "3".
 * Das Backend speichert lead_answer.value als diesen String.
 */
export interface RatingBlock {
  id: string
  type: 'rating'
  fieldKey: string
  required?: boolean
  question: string
  maxRating: number
  style: 'stars' | 'numbers' | 'emoji'
}

/** Visuelle Trennlinie. */
export interface DividerBlock {
  id: string
  type: 'divider'
  styles?: Record<string, string>
}

/** Vertikaler Leerraum. */
export interface SpacerBlock {
  id: string
  type: 'spacer'
  /** Hoehe in Pixeln. Standard: 24. */
  height?: number
}

/** Video-Einbettung (YouTube oder Vimeo). */
export interface VideoBlock {
  id: string
  type: 'video'
  url: string
  provider?: 'youtube' | 'vimeo'
  autoplay?: boolean
  showControls?: boolean
}

/** Einzelnes Icon aus dem Lucide-Icon-Set. */
export interface IconBlock {
  id: string
  type: 'icon'
  iconName: string
  /** Groesse in Pixeln. Standard: 32. */
  size?: number
  styles?: Record<string, string>
}

// ---------------------------------------------------------------------------
// Logik-Engine: Bedingungen, Regeln, Ziele (M3.1, Schema v1.1.0)
// ---------------------------------------------------------------------------

/**
 * Alle 8 Operatoren fuer Logik-Bedingungen (exakt nach Schema v1.1.0).
 * 'is_answered' und 'is_empty' benoetigen keinen value.
 */
export type LogicConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'greater_than'
  | 'less_than'
  | 'is_answered'
  | 'is_empty'
  | 'in_list'

/** Eine einzelne Bedingung innerhalb einer Logik-Regel. */
export interface LogicCondition {
  /** UUID des Blocks, dessen Antwort ausgewertet wird. */
  blockId: string
  operator: LogicConditionOperator
  /** Vergleichswert. Nicht benoetigt fuer 'is_answered' und 'is_empty'. */
  value?: unknown
}

/**
 * Ziel eines Step-Sprungs.
 * Discriminated Union: 'step' erfordert stepId, 'url' erfordert url.
 */
export type LogicTarget =
  | { type: 'next' }
  | { type: 'submit' }
  | { type: 'step'; stepId: string }
  | { type: 'url'; url: string }

/**
 * Steuerungsregel fuer den Step-Sprung (exakt nach Schema v1.1.0).
 * operator: 'AND' = alle conditions muessen zutreffen, 'OR' = mindestens eine.
 */
export interface LogicRule {
  /** UUID der Regel. */
  id: string
  operator: 'AND' | 'OR'
  /** Mindestens eine Bedingung erforderlich (minItems: 1 im Schema). */
  conditions: LogicCondition[]
  target: LogicTarget
}

/**
 * 6 Operatoren fuer Display-Conditions (exakt nach Schema v1.1.0).
 * Kein greater_than/less_than (im Gegensatz zu LogicConditionOperator).
 */
export type DisplayConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'is_answered'
  | 'is_empty'
  | 'in_list'

/** Bedingte Block-Sichtbarkeit: Block wird nur angezeigt wenn Bedingung zutrifft. */
export interface DisplayCondition {
  /** UUID des referenzierten Blocks. */
  blockId: string
  operator: DisplayConditionOperator
  value?: unknown
}

// ---------------------------------------------------------------------------
// Personalisierung (M3.1, Schema v1.1.0)
// ---------------------------------------------------------------------------

/** Quell-Typ fuer Personalisierungs-Variablen (exakt nach Schema v1.1.0). */
export type PersonalizationVarSource = 'utm_param' | 'url_param' | 'answer'

/**
 * Personalisierungs-Variable: Platzhalter in Texten (z. B. {{vorname}}).
 * Felder exakt nach Schema v1.1.0 (key, source, paramName, sourceBlockId, fallback).
 */
export interface PersonalizationVar {
  /** Platzhalter-Schluessel im Text, z. B. 'vorname'. */
  key: string
  source: PersonalizationVarSource
  /** URL-Parameter-Name (fuer source='utm_param' oder 'url_param'). */
  paramName?: string
  /** Block-ID fuer source='answer'. */
  sourceBlockId?: string
  /** Fallback-Wert wenn die Quelle keinen Wert liefert. */
  fallback?: string
}

// ---------------------------------------------------------------------------
// Type-Guards (M3.1)
// ---------------------------------------------------------------------------

/**
 * Prueft die Pflichtfelder einer LogicRule (id, operator, conditions, target).
 * Kein Deep-Check der nested-Typen.
 */
export function isLogicRule(x: unknown): x is LogicRule {
  if (x === null || typeof x !== 'object') return false
  const obj = x as Record<string, unknown>
  return (
    typeof obj['id'] === 'string' &&
    (obj['operator'] === 'AND' || obj['operator'] === 'OR') &&
    Array.isArray(obj['conditions']) &&
    typeof obj['target'] === 'object' &&
    obj['target'] !== null
  )
}

/**
 * Prueft die Pflichtfelder einer DisplayCondition (blockId, operator).
 */
export function isDisplayCondition(x: unknown): x is DisplayCondition {
  if (x === null || typeof x !== 'object') return false
  const obj = x as Record<string, unknown>
  return (
    typeof obj['blockId'] === 'string' &&
    typeof obj['operator'] === 'string'
  )
}

// ---------------------------------------------------------------------------

/**
 * Alle Block-Typen als Discriminated Union.
 * displayConditions ist schema-konform fuer alle Block-Typen optional verfuegbar.
 */
export type Block = (
  | TextBlock
  | ImageBlock
  | ButtonBlock
  | SingleChoiceBlock
  | InputTextBlock
  | InputEmailBlock
  | InputPhoneBlock
  | OptinCheckboxBlock
  | OptinDoubleBlock
  | OptinOtpBlock
  | ProgressIndicatorBlock
  | LogoBlock
  | MultiChoiceBlock
  | InputDateBlock
  | InputTimeBlock
  | InputNumberBlock
  | InputDropdownBlock
  | InputTextareaBlock
  | RatingBlock
  | DividerBlock
  | SpacerBlock
  | VideoBlock
  | IconBlock
) & { displayConditions?: DisplayCondition[] }

export type BlockType = Block['type']

// ---------------------------------------------------------------------------
// Step
// ---------------------------------------------------------------------------

export type StepType = 'content' | 'question' | 'form' | 'result' | 'redirect'
export type StepLayout = 'single' | 'card' | 'split-left' | 'split-right' | 'columns'

export interface Step {
  id: string
  type: StepType
  internalTitle: string
  layout: StepLayout
  blocks: Block[]
  /** Sprung-Regeln fuer diesen Step (exakt nach Schema v1.1.0). */
  logicRules: LogicRule[]
  /** Optionales Analytics-Label fuer diesen Step. */
  trackingLabel?: string
}

// ---------------------------------------------------------------------------
// FunnelContent
// ---------------------------------------------------------------------------

export interface FunnelMeta {
  defaultLocale: string
  /** Personalisierungs-Variablen (exakt nach Schema v1.1.0, vorher string[]). */
  personalizationVars: PersonalizationVar[]
  /** Aktives Theme-ID aus der useFunnelThemes-Registry. Standard: 'mp'. */
  themeId?: string
}

export type ProgressBarStyle = 'dots' | 'bar' | 'steps'
export type AnimationsStyle = 'slide' | 'fade' | 'none'

export interface FunnelTrackingSettings {
  ga4MeasurementId?: string
  metaPixelId?: string
}

export interface FunnelSettings {
  progressBar: boolean
  progressBarStyle: ProgressBarStyle
  animations: AnimationsStyle
  confettiOnComplete: boolean
  mpBrandingPosition: 'footer'
  startButtonLabel: string
  /** Tracking-Einstellungen (GA4 + Meta Pixel). Nur wenn Consent erteilt. */
  tracking?: FunnelTrackingSettings
}

export interface FunnelContent {
  schemaVersion: string
  meta: FunnelMeta
  settings: FunnelSettings
  steps: Step[]
}

// ---------------------------------------------------------------------------
// Funnel + FunnelVersion
// ---------------------------------------------------------------------------

/** Farb-Schema eines Brandings (Hex-Farben). */
export interface BrandingColors {
  primary: string
  secondary: string
  background: string
  surface: string
  text: string
  accent: string
}

/**
 * Workspace-Branding (B11).
 * id ist eine UUID (String), kein Integer mehr.
 */
export interface Branding {
  id: string
  name: string
  colors: BrandingColors
  font_heading: string | null
  font_body: string | null
  logo_path: string | null
  favicon_path: string | null
}

export interface FunnelVersion {
  id: string
  version_number: number
  schema_version: string
  label: string | null
  published_at: string | null
  content?: FunnelContent
  settings?: Record<string, unknown>
}

export type FunnelStatus = 'draft' | 'published' | 'archived'

export interface Funnel {
  id: string
  name: string
  slug: string
  status: FunnelStatus
  branding: Branding | null
  published_version: FunnelVersion | null
  draft_version: FunnelVersion | null
  created_at: string
  updated_at: string
}

export interface PaginatedFunnels {
  data: Funnel[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

// ---------------------------------------------------------------------------
// FunnelListItem (Listenendpunkt, leichter als vollständiger Funnel)
// ---------------------------------------------------------------------------

/** Veröffentlichte Version, wie sie im Listenendpunkt zurückgegeben wird. */
export interface FunnelListPublishedVersion {
  id: string
  version_number: number
  published_at: string
}

/**
 * Listenansicht eines Funnels (GET /workspaces/{uuid}/funnels).
 * Enthält Metriken und Status-Felder, aber kein vollständiges draft_version.content.
 */
export interface FunnelListItem {
  id: string
  name: string
  slug: string
  status: FunnelStatus
  updated_at: string
  is_favorite: boolean
  thumbnail_url: string | null
  views_count: number
  leads_count: number
  /** Conversion Rate in Prozent, z. B. 2.27 */
  conversion_rate: number
  published_version: FunnelListPublishedVersion | null
  branding: Pick<Branding, 'id' | 'name'> | null
}

export interface PaginatedFunnelList {
  data: FunnelListItem[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

/**
 * Funnel-Eintrag mit Workspace-Kontext (WV.8).
 * Wird von GET /funnels (workspace-übergreifend, nur mp_admin) zurückgegeben.
 */
export interface FunnelWithWorkspace extends FunnelListItem {
  workspace: {
    id: string
    name: string
  }
}

export interface AllWorkspacesFunnelList {
  data: FunnelWithWorkspace[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

// ---------------------------------------------------------------------------
// Template (B14 Vorlagen-Galerie)
// ---------------------------------------------------------------------------

/**
 * Funnel-Vorlage (System- oder Workspace-Vorlage).
 * GET /api/admin/templates
 */
export interface Template {
  id: string
  name: string
  category: string
  description: string | null
  thumbnail_url: string | null
  schema_version: string
  is_system: boolean
  sort_order: number
  created_at: string
}

export interface TemplateListMeta {
  current_page?: number
  last_page?: number
  per_page?: number
  total?: number
  [key: string]: unknown
}

export interface TemplateListResponse {
  data: Template[]
  meta: TemplateListMeta
}

export interface TemplateResponse {
  data: Template
}

// ---------------------------------------------------------------------------
// Factory-Funktionen
// ---------------------------------------------------------------------------

/** Legt einen neuen leeren Schritt an */
export function createEmptyStep(): Step {
  return {
    id: crypto.randomUUID(),
    type: 'content',
    internalTitle: 'Neuer Schritt',
    layout: 'single',
    blocks: [],
    logicRules: [],
  }
}

/** Legt einen leeren FunnelContent mit einem ersten Schritt an */
export function createEmptyContent(): FunnelContent {
  return {
    schemaVersion: '1.1.0',
    meta: {
      defaultLocale: 'de',
      personalizationVars: [],
    },
    settings: {
      progressBar: true,
      progressBarStyle: 'dots',
      animations: 'slide',
      confettiOnComplete: false,
      mpBrandingPosition: 'footer',
      startButtonLabel: "Los geht's",
    },
    steps: [createEmptyStep()],
  }
}

/**
 * Erstellt einen Block mit sinnvollen Defaults je nach Typ.
 * Gibt die Discriminated-Union-Basistype `Block` zurück; Aufrufer,
 * die den konkreten Typ benötigen, können den Rückgabewert mit
 * dem Discriminant `type` verengen.
 *
 * Die Funktion ist exhaustiv: jeder der 23 Block-Typen hat einen
 * expliziten case. TypeScript meldet einen Fehler, wenn ein Typ
 * fehlt (kein implizites Fallthrough).
 */
export function createBlock(type: BlockType): Block {
  const id = crypto.randomUUID()
  switch (type) {
    // --- M1-Typen ---
    case 'text':
      return {
        id,
        type: 'text',
        content: '<p>Dein Text kommt hier hin.</p>',
      }
    case 'image':
      return {
        id,
        type: 'image',
        url: '',
        alt: '',
      }
    case 'button':
      return {
        id,
        type: 'button',
        label: 'Weiter',
        action: 'next',
        style: 'primary',
      }
    case 'single_choice':
      return {
        id,
        type: 'single_choice',
        fieldKey: `choice_${id.slice(0, 8)}`,
        question: 'Deine Frage',
        options: [
          { id: crypto.randomUUID(), label: 'Option A', value: 'option_a' },
          { id: crypto.randomUUID(), label: 'Option B', value: 'option_b' },
        ],
        imageLayout: 'none',
        autoAdvance: false,
      }
    case 'input_text':
      return {
        id,
        type: 'input_text',
        fieldKey: `text_${id.slice(0, 8)}`,
        label: 'Deine Eingabe',
        placeholder: '',
      }
    case 'input_email':
      return {
        id,
        type: 'input_email',
        fieldKey: `email_${id.slice(0, 8)}`,
        label: 'Deine E-Mail-Adresse',
        placeholder: 'beispiel@email.de',
      }
    case 'input_phone':
      return {
        id,
        type: 'input_phone',
        fieldKey: `phone_${id.slice(0, 8)}`,
        label: 'Deine Telefonnummer',
        defaultCountryCode: 'DE',
        allowedCountryCodes: ['DE', 'AT', 'CH'],
      }
    case 'optin_checkbox':
      return {
        id,
        type: 'optin_checkbox',
        fieldKey: `optin_${id.slice(0, 8)}`,
        required: true,
        checkboxLabel:
          'Ich stimme den <a href="/datenschutz" class="underline">Datenschutzbestimmungen</a> zu.',
      }
    case 'optin_double':
      return {
        id,
        type: 'optin_double',
        fieldKey: `optin_double_${id.slice(0, 8)}`,
        required: true,
        checkboxLabel:
          'Ich stimme den <a href="/datenschutz" class="underline">Datenschutzbestimmungen</a> zu.',
        hintText: 'Du erhältst eine Bestätigungs-E-Mail.',
      }
    case 'optin_otp':
      return {
        id,
        type: 'optin_otp',
        fieldKey: `optin_otp_${id.slice(0, 8)}`,
        required: true,
        digits: 6,
        label: 'Bestätigungscode',
        emailLabel: 'Deine E-Mail-Adresse',
        emailPlaceholder: 'beispiel@email.de',
      }
    case 'progress_indicator':
      return {
        id,
        type: 'progress_indicator',
        currentStep: 1,
        totalSteps: 3,
        label: 'Frage',
        progressStyle: 'bar',
      }
    case 'logo':
      return {
        id,
        type: 'logo',
        url: '',
        alt: 'Logo',
      }
    // --- M2-Typen ---
    case 'multi_choice':
      return {
        id,
        type: 'multi_choice',
        fieldKey: `multi_${id.slice(0, 8)}`,
        question: 'Welche Optionen treffen zu?',
        options: [
          { id: crypto.randomUUID(), label: 'Option A', value: 'option_a' },
          { id: crypto.randomUUID(), label: 'Option B', value: 'option_b' },
        ],
        imageLayout: 'none',
      }
    case 'input_date':
      return {
        id,
        type: 'input_date',
        fieldKey: `date_${id.slice(0, 8)}`,
        label: 'Datum',
      }
    case 'input_time':
      return {
        id,
        type: 'input_time',
        fieldKey: `time_${id.slice(0, 8)}`,
        label: 'Uhrzeit',
      }
    case 'input_number':
      return {
        id,
        type: 'input_number',
        fieldKey: `number_${id.slice(0, 8)}`,
        label: 'Deine Zahl',
        placeholder: '0',
      }
    case 'input_dropdown':
      return {
        id,
        type: 'input_dropdown',
        fieldKey: `dropdown_${id.slice(0, 8)}`,
        label: 'Deine Auswahl',
        placeholder: 'Bitte wählen',
        options: [
          { id: crypto.randomUUID(), label: 'Option A', value: 'option_a' },
          { id: crypto.randomUUID(), label: 'Option B', value: 'option_b' },
        ],
      }
    case 'input_textarea':
      return {
        id,
        type: 'input_textarea',
        fieldKey: `textarea_${id.slice(0, 8)}`,
        label: 'Deine Nachricht',
        placeholder: 'Schreib hier ...',
        rows: 4,
      }
    case 'rating':
      return {
        id,
        type: 'rating',
        fieldKey: `rating_${id.slice(0, 8)}`,
        question: 'Wie zufrieden bist Du?',
        maxRating: 5,
        style: 'stars',
      }
    case 'divider':
      return {
        id,
        type: 'divider',
      }
    case 'spacer':
      return {
        id,
        type: 'spacer',
        height: 24,
      }
    case 'video':
      return {
        id,
        type: 'video',
        url: '',
        provider: 'youtube',
        showControls: true,
      }
    case 'icon':
      return {
        id,
        type: 'icon',
        iconName: 'star',
        size: 32,
      }
  }
}
