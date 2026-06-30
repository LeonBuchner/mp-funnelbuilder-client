/**
 * Typen für den Funnel-Builder (M1).
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

export type ImageLayout = 'none' | 'icon' | 'full'

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

/** Alle Block-Typen als Discriminated Union */
export type Block =
  | TextBlock
  | ImageBlock
  | ButtonBlock
  | SingleChoiceBlock
  | InputTextBlock
  | InputEmailBlock
  | InputPhoneBlock
  | OptinCheckboxBlock
  | ProgressIndicatorBlock
  | LogoBlock

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
  logicRules: []
}

// ---------------------------------------------------------------------------
// FunnelContent
// ---------------------------------------------------------------------------

export interface FunnelMeta {
  defaultLocale: string
  personalizationVars: string[]
  /** Aktives Theme-ID aus der useFunnelThemes-Registry. Standard: 'mp'. */
  themeId?: string
}

export type ProgressBarStyle = 'dots' | 'bar' | 'steps'
export type AnimationsStyle = 'slide' | 'fade' | 'none'

export interface FunnelSettings {
  progressBar: boolean
  progressBarStyle: ProgressBarStyle
  animations: AnimationsStyle
  confettiOnComplete: boolean
  mpBrandingPosition: 'footer'
  startButtonLabel: string
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

export interface Branding {
  id: string
  name: string
  is_default: boolean
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
    schemaVersion: '1.0.0',
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
 */
export function createBlock(type: BlockType): Block {
  const id = crypto.randomUUID()
  switch (type) {
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
  }
}
