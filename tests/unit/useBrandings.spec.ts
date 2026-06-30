/**
 * Unit-Tests fuer useBrandings.ts.
 * Geprueft wird:
 * - brandingToFunnelVars: korrektes Mapping der Branding-Felder auf CSS-Vars.
 * - list(), create(), update(), remove(): korrekte Endpunkte und Methoden.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useBrandings, brandingToFunnelVars } from '../../app/composables/useBrandings'
import type { Branding } from '../../app/types/funnel'

// ---------------------------------------------------------------------------
// Mock: useApi
// ---------------------------------------------------------------------------

const mockApiFn = vi.hoisted(() => vi.fn())

vi.mock('~/composables/useApi', () => ({
  useApi: () => mockApiFn,
}))

// ---------------------------------------------------------------------------
// Testdaten
// ---------------------------------------------------------------------------

const sampleBranding: Branding = {
  id: 'branding-uuid-1',
  name: 'Testbranding',
  colors: {
    primary: '#e63946',
    secondary: '#457b9d',
    background: '#f1faee',
    surface: '#ffffff',
    text: '#1d3557',
    accent: '#a8dadc',
  },
  font_heading: 'Montserrat',
  font_body: 'Lato',
  logo_path: 'https://example.com/logo.png',
  favicon_path: null,
}

// ---------------------------------------------------------------------------
// brandingToFunnelVars
// ---------------------------------------------------------------------------

describe('brandingToFunnelVars', () => {
  it('mappt primary auf --funnel-primary', () => {
    const vars = brandingToFunnelVars(sampleBranding)
    expect(vars['--funnel-primary']).toBe('#e63946')
  })

  it('mappt background auf --funnel-bg', () => {
    const vars = brandingToFunnelVars(sampleBranding)
    expect(vars['--funnel-bg']).toBe('#f1faee')
  })

  it('mappt surface auf --funnel-surface', () => {
    const vars = brandingToFunnelVars(sampleBranding)
    expect(vars['--funnel-surface']).toBe('#ffffff')
  })

  it('mappt text auf --funnel-text', () => {
    const vars = brandingToFunnelVars(sampleBranding)
    expect(vars['--funnel-text']).toBe('#1d3557')
  })

  it('mappt accent auf --funnel-accent', () => {
    const vars = brandingToFunnelVars(sampleBranding)
    expect(vars['--funnel-accent']).toBe('#a8dadc')
  })

  it('mappt secondary auf --funnel-secondary', () => {
    const vars = brandingToFunnelVars(sampleBranding)
    expect(vars['--funnel-secondary']).toBe('#457b9d')
  })

  it('leitet --funnel-primary-hover als dunklere Variante ab', () => {
    const vars = brandingToFunnelVars(sampleBranding)
    // Hover muss dunkler sein als primary (#e63946)
    expect(vars['--funnel-primary-hover']).toBeDefined()
    expect(vars['--funnel-primary-hover']).not.toBe('#e63946')
    expect(vars['--funnel-primary-hover']!.startsWith('#')).toBe(true)
  })

  it('setzt --funnel-on-primary auf weiss oder schwarz je nach Kontrast', () => {
    const vars = brandingToFunnelVars(sampleBranding)
    expect(['#ffffff', '#000000']).toContain(vars['--funnel-on-primary'])
  })

  it('setzt --funnel-muted als rgba mit Alpha', () => {
    const vars = brandingToFunnelVars(sampleBranding)
    expect(vars['--funnel-muted']).toMatch(/^rgba\(/)
  })

  it('setzt --funnel-radius auf einen Festwert', () => {
    const vars = brandingToFunnelVars(sampleBranding)
    expect(vars['--funnel-radius']).toBeDefined()
    expect(vars['--funnel-radius']).toContain('px')
  })

  it('mappt font_body auf --funnel-font', () => {
    const vars = brandingToFunnelVars(sampleBranding)
    expect(vars['--funnel-font']).toContain('Lato')
  })

  it('mappt font_heading auf --funnel-font-heading', () => {
    const vars = brandingToFunnelVars(sampleBranding)
    expect(vars['--funnel-font-heading']).toContain('Montserrat')
  })

  it('faellt auf Inter zurueck wenn keine Font gesetzt ist', () => {
    const nofont: Branding = { ...sampleBranding, font_body: null, font_heading: null }
    const vars = brandingToFunnelVars(nofont)
    expect(vars['--funnel-font']).toContain('Inter')
  })

  it('weisser Text auf #ffffff als primary waehlt schwarzes onPrimary', () => {
    const lightBranding: Branding = {
      ...sampleBranding,
      colors: { ...sampleBranding.colors, primary: '#ffffff' },
    }
    const vars = brandingToFunnelVars(lightBranding)
    expect(vars['--funnel-on-primary']).toBe('#000000')
  })

  it('weisser Text auf #000000 als primary waehlt weisses onPrimary', () => {
    const darkBranding: Branding = {
      ...sampleBranding,
      colors: { ...sampleBranding.colors, primary: '#000000' },
    }
    const vars = brandingToFunnelVars(darkBranding)
    expect(vars['--funnel-on-primary']).toBe('#ffffff')
  })
})

// ---------------------------------------------------------------------------
// useBrandings API-Calls
// ---------------------------------------------------------------------------

describe('useBrandings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('list() sendet GET an /workspaces/{wsUuid}/brandings', async () => {
    mockApiFn.mockResolvedValue({ data: [sampleBranding] })
    const { list } = useBrandings()
    await list('ws-uuid-1')
    expect(mockApiFn).toHaveBeenCalledWith('/workspaces/ws-uuid-1/brandings')
  })

  it('create() sendet POST mit Payload an /workspaces/{wsUuid}/brandings', async () => {
    mockApiFn.mockResolvedValue({ data: sampleBranding })
    const { create } = useBrandings()
    const payload = {
      name: 'Neues Branding',
      colors: sampleBranding.colors,
    }
    await create('ws-uuid-1', payload)
    expect(mockApiFn).toHaveBeenCalledWith(
      '/workspaces/ws-uuid-1/brandings',
      expect.objectContaining({ method: 'POST', body: payload }),
    )
  })

  it('update() sendet PUT mit Patch an /brandings/{uuid}', async () => {
    mockApiFn.mockResolvedValue({ data: sampleBranding })
    const { update } = useBrandings()
    const patch = { name: 'Umbenannt' }
    await update('branding-uuid-1', patch)
    expect(mockApiFn).toHaveBeenCalledWith(
      '/brandings/branding-uuid-1',
      expect.objectContaining({ method: 'PUT', body: patch }),
    )
  })

  it('remove() sendet DELETE an /brandings/{uuid}', async () => {
    mockApiFn.mockResolvedValue(undefined)
    const { remove } = useBrandings()
    await remove('branding-uuid-1')
    expect(mockApiFn).toHaveBeenCalledWith(
      '/brandings/branding-uuid-1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})
