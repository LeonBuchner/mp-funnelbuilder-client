/**
 * Tests fuer sanitizeFunnelContent (app/utils/sanitizeFunnelContent.ts).
 *
 * Prueft, dass alle v-html-Quellen im Funnel-Content beim Laden bereinigt
 * werden, bevor sie in den Nuxt-Payload serialisiert werden. Das ist der
 * kritische Pfad gegen Hydration-Mismatches und XSS.
 */
import { describe, it, expect } from 'vitest'
import { sanitizeFunnelContent } from '../../app/utils/sanitizeFunnelContent'
import type { PublicFunnel } from '../../app/types/public-funnel'
import type {
  FunnelContent,
  TextBlock,
  OptinCheckboxBlock,
  SingleChoiceBlock,
  MultiChoiceBlock,
} from '../../app/types/funnel'

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function makeContent(blocks: FunnelContent['steps'][number]['blocks']): FunnelContent {
  return {
    schemaVersion: '1.0.0',
    meta: { defaultLocale: 'de', personalizationVars: [] },
    settings: {
      progressBar: false,
      progressBarStyle: 'bar',
      animations: 'none',
      confettiOnComplete: false,
      mpBrandingPosition: 'footer',
      startButtonLabel: 'Los',
    },
    steps: [
      {
        id: 'step-1',
        type: 'content',
        internalTitle: 'Schritt 1',
        layout: 'single',
        blocks,
        logicRules: [],
      },
    ],
  }
}

function makeFunnel(content: FunnelContent): PublicFunnel {
  return {
    id: 'funnel-1',
    name: 'Test Funnel',
    schema_version: '1.0.0',
    content,
    settings: {
      seo_title: null,
      seo_description: null,
      og_image_path: null,
      favicon_path: null,
      tracking: { ga4_id: null, meta_pixel_id: null },
    },
    branding: null,
    mp_branding_enabled: true,
    workspace: { name: 'Test Workspace' },
  }
}

// ---------------------------------------------------------------------------
// TextBlock
// ---------------------------------------------------------------------------

describe('sanitizeFunnelContent – TextBlock.content', () => {
  it('entfernt <script> aus block.content', () => {
    const block: TextBlock = {
      id: 'b1',
      type: 'text',
      content: '<p>Text</p>' + '<' + 'script>alert(1)</' + 'script>',
    }
    const result = sanitizeFunnelContent(makeFunnel(makeContent([block])))
    const sanitized = (result.content.steps[0].blocks[0] as TextBlock).content
    expect(sanitized).toContain('<p>Text</p>')
    expect(sanitized).not.toContain('script')
    expect(sanitized).not.toContain('alert')
  })

  it('entfernt onerror-Attribut aus block.content', () => {
    const block: TextBlock = {
      id: 'b2',
      type: 'text',
      content: '<p onerror="alert(1)">Test</p>',
    }
    const result = sanitizeFunnelContent(makeFunnel(makeContent([block])))
    const sanitized = (result.content.steps[0].blocks[0] as TextBlock).content
    expect(sanitized).not.toContain('onerror')
    expect(sanitized).toContain('Test')
  })

  it('behaelt erlaubtes HTML in block.content erhalten', () => {
    const block: TextBlock = {
      id: 'b3',
      type: 'text',
      content: '<p><strong>Hallo</strong> <em>Welt</em></p>',
    }
    const result = sanitizeFunnelContent(makeFunnel(makeContent([block])))
    const sanitized = (result.content.steps[0].blocks[0] as TextBlock).content
    expect(sanitized).toContain('<strong>Hallo</strong>')
    expect(sanitized).toContain('<em>Welt</em>')
  })
})

// ---------------------------------------------------------------------------
// OptinCheckboxBlock
// ---------------------------------------------------------------------------

describe('sanitizeFunnelContent – OptinCheckboxBlock.checkboxLabel', () => {
  it('entfernt onclick aus checkboxLabel', () => {
    const block: OptinCheckboxBlock = {
      id: 'b4',
      type: 'optin_checkbox',
      fieldKey: 'optin',
      required: true,
      checkboxLabel:
        'Ich stimme zu <a href="/ds" onclick="alert(1)">Datenschutz</a>',
    }
    const result = sanitizeFunnelContent(makeFunnel(makeContent([block])))
    const sanitized = (result.content.steps[0].blocks[0] as OptinCheckboxBlock).checkboxLabel
    expect(sanitized).not.toContain('onclick')
    expect(sanitized).toContain('href="/ds"')
    expect(sanitized).toContain('Datenschutz')
  })

  it('setzt rel=noopener auf Links in checkboxLabel', () => {
    const block: OptinCheckboxBlock = {
      id: 'b5',
      type: 'optin_checkbox',
      fieldKey: 'optin',
      required: true,
      checkboxLabel: 'Ich stimme <a href="https://example.com">zu</a>.',
    }
    const result = sanitizeFunnelContent(makeFunnel(makeContent([block])))
    const sanitized = (result.content.steps[0].blocks[0] as OptinCheckboxBlock).checkboxLabel
    expect(sanitized).toContain('rel="noopener noreferrer"')
  })
})

// ---------------------------------------------------------------------------
// SingleChoiceBlock
// ---------------------------------------------------------------------------

describe('sanitizeFunnelContent – SingleChoiceBlock.options[].label', () => {
  it('entfernt <script> aus option.label', () => {
    const block: SingleChoiceBlock = {
      id: 'b6',
      type: 'single_choice',
      fieldKey: 'choice',
      question: 'Wahl?',
      options: [
        {
          id: 'o1',
          label: 'Option A' + '<' + 'script>alert(1)</' + 'script>',
          value: 'a',
        },
      ],
      imageLayout: 'none',
      autoAdvance: false,
    }
    const result = sanitizeFunnelContent(makeFunnel(makeContent([block])))
    const opts = (result.content.steps[0].blocks[0] as SingleChoiceBlock).options
    expect(opts[0].label).not.toContain('script')
    expect(opts[0].label).toContain('Option A')
  })

  it('behaelt normalen Label-Text erhalten', () => {
    const block: SingleChoiceBlock = {
      id: 'b7',
      type: 'single_choice',
      fieldKey: 'choice',
      question: 'Wahl?',
      options: [
        { id: 'o1', label: 'Option A', value: 'a' },
        { id: 'o2', label: 'Option B', value: 'b' },
      ],
      imageLayout: 'icon',
      autoAdvance: false,
    }
    const result = sanitizeFunnelContent(makeFunnel(makeContent([block])))
    const opts = (result.content.steps[0].blocks[0] as SingleChoiceBlock).options
    expect(opts[0].label).toBe('Option A')
    expect(opts[1].label).toBe('Option B')
  })
})

// ---------------------------------------------------------------------------
// MultiChoiceBlock
// ---------------------------------------------------------------------------

describe('sanitizeFunnelContent – MultiChoiceBlock.options[].label', () => {
  it('entfernt XSS aus option.label', () => {
    const block: MultiChoiceBlock = {
      id: 'b8',
      type: 'multi_choice',
      fieldKey: 'multi',
      question: 'Mehrf.?',
      options: [
        {
          id: 'o1',
          label: 'Gut<img onerror="alert(1)" src="x">',
          value: 'gut',
        },
      ],
      imageLayout: 'icon',
    }
    const result = sanitizeFunnelContent(makeFunnel(makeContent([block])))
    const opts = (result.content.steps[0].blocks[0] as MultiChoiceBlock).options
    expect(opts[0].label).not.toContain('onerror')
    expect(opts[0].label).toContain('Gut')
  })
})

// ---------------------------------------------------------------------------
// Andere Block-Typen bleiben unveraendert
// ---------------------------------------------------------------------------

describe('sanitizeFunnelContent – andere Block-Typen unveraendert', () => {
  it('laesst button-Block unveraendert durch', () => {
    const block = {
      id: 'btn1',
      type: 'button' as const,
      label: 'Weiter',
      action: 'next' as const,
      style: 'primary' as const,
    }
    const result = sanitizeFunnelContent(makeFunnel(makeContent([block])))
    expect(result.content.steps[0].blocks[0]).toEqual(block)
  })

  it('behaelt alle uebrigen Funnel-Felder unveraendert', () => {
    const funnel = makeFunnel(makeContent([]))
    const result = sanitizeFunnelContent(funnel)
    expect(result.id).toBe(funnel.id)
    expect(result.name).toBe(funnel.name)
    expect(result.settings).toEqual(funnel.settings)
    expect(result.branding).toBeNull()
    expect(result.mp_branding_enabled).toBe(true)
  })
})
