/**
 * useFunnelThemes: Theme-Registry für den Funnel-Renderer.
 * Jedes Theme definiert --funnel-* CSS-Variablen, die am Frame-Container
 * gesetzt werden (Canvas.vue im Editor, Layout-Renderer im Public-Bereich).
 *
 * Struktur:
 *   id        eindeutiger Schlüssel (in content.meta.themeId gespeichert)
 *   name      Anzeigename
 *   swatches  3-4 repräsentative Farben für die Galerie-Vorschau
 *   vars      vollständige --funnel-* Variablen-Werte
 */

export interface FunnelThemeVars {
  primary: string
  primaryHover: string
  onPrimary: string
  bg: string
  surface: string
  text: string
  muted: string
  accent: string
  radius: string
  font: string
}

export interface FunnelTheme {
  id: string
  name: string
  /** 2 bis 4 repräsentative Farben für die Galerie-Vorschau */
  swatches: [string, string] | [string, string, string] | [string, string, string, string]
  vars: FunnelThemeVars
}

const FONT_DEFAULT = 'Inter, system-ui, sans-serif'

const themes: FunnelTheme[] = [
  {
    id: 'mp',
    name: 'MP',
    swatches: ['#1c4687', '#ffffff', '#3579fa', '#f3f4f6'],
    vars: {
      primary: '#1c4687',
      primaryHover: '#163872',
      onPrimary: '#ffffff',
      bg: '#ffffff',
      surface: '#ffffff',
      text: '#1f2937',
      muted: '#6b7280',
      accent: '#3579fa',
      radius: '12px',
      font: FONT_DEFAULT,
    },
  },
  {
    id: 'agency-onboarding',
    name: 'Agency Onboarding',
    swatches: ['#111111', '#c0392b', '#e74c3c'],
    vars: {
      primary: '#c0392b',
      primaryHover: '#a93226',
      onPrimary: '#ffffff',
      bg: '#111111',
      surface: '#1a1a1a',
      text: '#f5f5f5',
      muted: '#9ca3af',
      accent: '#e74c3c',
      radius: '8px',
      font: FONT_DEFAULT,
    },
  },
  {
    id: 'amazon',
    name: 'Amazon',
    swatches: ['#131921', '#febd69', '#ff9900'],
    vars: {
      primary: '#ff9900',
      primaryHover: '#e68a00',
      onPrimary: '#111111',
      bg: '#131921',
      surface: '#232f3e',
      text: '#f5f5f5',
      muted: '#adb7c3',
      accent: '#febd69',
      radius: '4px',
      font: FONT_DEFAULT,
    },
  },
  {
    id: 'appart',
    name: 'Appart',
    swatches: ['#8c7b6b', '#3d3530', '#1a1412'],
    vars: {
      primary: '#8c7b6b',
      primaryHover: '#7a6a5c',
      onPrimary: '#ffffff',
      bg: '#faf8f5',
      surface: '#ffffff',
      text: '#1a1412',
      muted: '#8c7b6b',
      accent: '#c4a882',
      radius: '6px',
      font: FONT_DEFAULT,
    },
  },
  {
    id: 'application-quiz',
    name: 'Application Quiz',
    swatches: ['#1e293b', '#60a5fa', '#bfdbfe'],
    vars: {
      primary: '#1e293b',
      primaryHover: '#0f172a',
      onPrimary: '#ffffff',
      bg: '#f8fafc',
      surface: '#ffffff',
      text: '#1e293b',
      muted: '#64748b',
      accent: '#60a5fa',
      radius: '10px',
      font: FONT_DEFAULT,
    },
  },
  {
    id: 'artsy',
    name: 'Artsy',
    swatches: ['#d97706', '#ea580c', '#dc2626'],
    vars: {
      primary: '#ea580c',
      primaryHover: '#c2410c',
      onPrimary: '#ffffff',
      bg: '#fffbf0',
      surface: '#ffffff',
      text: '#1c1917',
      muted: '#78716c',
      accent: '#d97706',
      radius: '16px',
      font: FONT_DEFAULT,
    },
  },
  {
    id: 'autohaus',
    name: 'Autohaus',
    swatches: ['#0f0f0f', '#ea580c', '#dc2626'],
    vars: {
      primary: '#ea580c',
      primaryHover: '#c2410c',
      onPrimary: '#ffffff',
      bg: '#0f0f0f',
      surface: '#1a1a1a',
      text: '#f5f5f5',
      muted: '#a3a3a3',
      accent: '#dc2626',
      radius: '6px',
      font: FONT_DEFAULT,
    },
  },
  {
    id: 'brisk',
    name: 'Brisk',
    swatches: ['#fbbf24', '#d97706', '#2563eb'],
    vars: {
      primary: '#2563eb',
      primaryHover: '#1d4ed8',
      onPrimary: '#ffffff',
      bg: '#fefce8',
      surface: '#ffffff',
      text: '#1c1917',
      muted: '#78716c',
      accent: '#fbbf24',
      radius: '10px',
      font: FONT_DEFAULT,
    },
  },
  {
    id: 'bundle-checkout',
    name: 'Bundle Checkout',
    swatches: ['#0f172a', '#7c3aed', '#1e1b4b'],
    vars: {
      primary: '#7c3aed',
      primaryHover: '#6d28d9',
      onPrimary: '#ffffff',
      bg: '#0f172a',
      surface: '#1e1b4b',
      text: '#f1f5f9',
      muted: '#94a3b8',
      accent: '#a78bfa',
      radius: '12px',
      font: FONT_DEFAULT,
    },
  },
  {
    id: 'calm',
    name: 'Calm',
    swatches: ['#1e3a5f', '#334e7a'],
    vars: {
      primary: '#1e3a5f',
      primaryHover: '#16304f',
      onPrimary: '#ffffff',
      bg: '#f0f4f8',
      surface: '#ffffff',
      text: '#1e3a5f',
      muted: '#64748b',
      accent: '#334e7a',
      radius: '8px',
      font: FONT_DEFAULT,
    },
  },
  {
    id: 'careers-page',
    name: 'Careers Page',
    swatches: ['#0f172a', '#2563eb', '#93c5fd'],
    vars: {
      primary: '#2563eb',
      primaryHover: '#1d4ed8',
      onPrimary: '#ffffff',
      bg: '#0f172a',
      surface: '#1e293b',
      text: '#f8fafc',
      muted: '#94a3b8',
      accent: '#93c5fd',
      radius: '8px',
      font: FONT_DEFAULT,
    },
  },
]

/**
 * Gibt die CSS-Variablen-Map für ein Theme als Inline-Style-Objekt zurück.
 * Wird am Frame-Container per :style gesetzt.
 */
export function getThemeCssVars(theme: FunnelTheme): Record<string, string> {
  return {
    '--funnel-primary': theme.vars.primary,
    '--funnel-primary-hover': theme.vars.primaryHover,
    '--funnel-on-primary': theme.vars.onPrimary,
    '--funnel-bg': theme.vars.bg,
    '--funnel-surface': theme.vars.surface,
    '--funnel-text': theme.vars.text,
    '--funnel-muted': theme.vars.muted,
    '--funnel-accent': theme.vars.accent,
    '--funnel-radius': theme.vars.radius,
    '--funnel-font': theme.vars.font,
  }
}

export function useFunnelThemes() {
  function getTheme(id: string): FunnelTheme {
    return themes.find(t => t.id === id) ?? themes[0]!
  }

  function getThemeVars(id: string): Record<string, string> {
    return getThemeCssVars(getTheme(id))
  }

  return {
    themes,
    getTheme,
    getThemeVars,
  }
}
