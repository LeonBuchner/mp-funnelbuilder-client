/**
 * Render-Tests fuer die Block-Komponenten.
 * Prueft: korrekte Anzahl Optionen, sichtbare Texte, A11y-Attribute.
 */
import { describe, it, expect } from 'vitest'
import { defineComponent, computed, provide } from 'vue'
import { mount } from '@vue/test-utils'
import BlockSingleChoice from '../../app/components/blocks/BlockSingleChoice.vue'
import BlockProgress from '../../app/components/blocks/BlockProgress.vue'
import BlockLogo from '../../app/components/blocks/BlockLogo.vue'
import BlockText from '../../app/components/blocks/BlockText.vue'
import BlockButton from '../../app/components/blocks/BlockButton.vue'
import { funnelStepContextKey } from '../../app/composables/useFunnelStepContext'
import type {
  SingleChoiceBlock,
  ProgressIndicatorBlock,
  LogoBlock,
  TextBlock,
  ButtonBlock,
} from '../../app/types/funnel'

// ---------------------------------------------------------------------------
// BlockSingleChoice
// ---------------------------------------------------------------------------

describe('BlockSingleChoice', () => {
  const makeChoiceBlock = (imageLayout: SingleChoiceBlock['imageLayout'] = 'none'): SingleChoiceBlock => ({
    id: 'c1',
    type: 'single_choice',
    fieldKey: 'choice_c1',
    question: 'Welche Option?',
    imageLayout,
    autoAdvance: false,
    options: [
      { id: 'o1', label: 'Option A', value: 'a' },
      { id: 'o2', label: 'Option B', value: 'b' },
      { id: 'o3', label: 'Option C', value: 'c' },
    ],
  })

  it('rendert 3 Optionen im imageLayout "none"', () => {
    const wrapper = mount(BlockSingleChoice, {
      props: { block: makeChoiceBlock('none'), mode: 'editor' },
    })
    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(3)
    expect(buttons[0]!.text()).toContain('Option A')
    expect(buttons[1]!.text()).toContain('Option B')
  })

  it('rendert 2x2-Grid (4 Buttons) im imageLayout "icon"', () => {
    const block: SingleChoiceBlock = {
      ...makeChoiceBlock('icon'),
      options: [
        { id: 'o1', label: 'Keine Ausbildung', value: 'none', iconName: 'wrench' },
        { id: 'o2', label: 'Abschluss', value: 'grad', iconName: 'graduation-cap' },
        { id: 'o3', label: '1-3 Jahre', value: '1_3', iconName: 'gear' },
        { id: 'o4', label: '3+ Jahre', value: '3plus', iconName: 'tools' },
      ],
    }
    const wrapper = mount(BlockSingleChoice, {
      props: { block, mode: 'editor' },
    })
    expect(wrapper.findAll('button')).toHaveLength(4)
    // SVG-Icons gerendert
    expect(wrapper.findAll('svg').length).toBeGreaterThanOrEqual(4)
  })

  it('rendert Bild-Cards im imageLayout "full"', () => {
    const block: SingleChoiceBlock = {
      ...makeChoiceBlock('full'),
      options: [
        { id: 'o1', label: 'Reparatur', value: 'repair', imageUrl: 'https://example.com/img.jpg' },
        { id: 'o2', label: 'Wartung', value: 'maint' },
      ],
    }
    const wrapper = mount(BlockSingleChoice, {
      props: { block, mode: 'editor' },
    })
    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(2)
    // Erstes Item hat ein Bild
    expect(buttons[0]!.find('img').exists()).toBe(true)
    // Zweites Item ohne Bild zeigt Platzhalter-SVG
    expect(buttons[1]!.find('img').exists()).toBe(false)
    expect(buttons[1]!.find('svg').exists()).toBe(true)
  })

  it('emittiert update:modelValue im live-Modus beim Klick', async () => {
    const block = makeChoiceBlock('none')
    const wrapper = mount(BlockSingleChoice, {
      props: { block, mode: 'live', modelValue: undefined },
    })
    await wrapper.findAll('button')[1]!.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['b'])
  })

  it('emittiert keinen Wert im editor-Modus', async () => {
    const block = makeChoiceBlock('none')
    const wrapper = mount(BlockSingleChoice, {
      props: { block, mode: 'editor' },
    })
    await wrapper.findAll('button')[0]!.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('zeigt die Frage sichtbar und in der sr-only legend', () => {
    const block = makeChoiceBlock('none')
    const wrapper = mount(BlockSingleChoice, {
      props: { block, mode: 'editor' },
    })
    // legend fuer Screenreader
    const legend = wrapper.find('legend')
    expect(legend.classes()).toContain('sr-only')
    expect(legend.text()).toContain('Welche Option?')
    // Sichtbares p-Element mit der Frage
    const questionEl = wrapper.find('p')
    expect(questionEl.text()).toContain('Welche Option?')
  })
})

// ---------------------------------------------------------------------------
// BlockProgress
// ---------------------------------------------------------------------------

describe('BlockProgress', () => {
  const makeProgressBlock = (currentStep = 2, totalSteps = 4): ProgressIndicatorBlock => ({
    id: 'p1',
    type: 'progress_indicator',
    currentStep,
    totalSteps,
    label: 'Frage',
    progressStyle: 'bar',
  })

  it('zeigt "Frage X von N" korrekt an', () => {
    const wrapper = mount(BlockProgress, {
      props: { block: makeProgressBlock(2, 4), mode: 'editor' },
    })
    expect(wrapper.text()).toContain('Frage 2 von 4')
  })

  it('rendert Fortschrittsbalken mit korrekter Breite (50%)', () => {
    const wrapper = mount(BlockProgress, {
      props: { block: makeProgressBlock(2, 4), mode: 'editor' },
    })
    const bar = wrapper.find('[role="progressbar"] > div')
    expect(bar.attributes('style')).toContain('width: 50%')
  })

  it('rendert Punkte bei progressStyle "dots"', () => {
    const block: ProgressIndicatorBlock = {
      ...makeProgressBlock(1, 3),
      progressStyle: 'dots',
    }
    const wrapper = mount(BlockProgress, {
      props: { block, mode: 'editor' },
    })
    // 3 Punkte
    const dots = wrapper.findAll('[role="progressbar"] span')
    expect(dots).toHaveLength(3)
  })

  it('setzt aria-valuenow und aria-valuemax', () => {
    const wrapper = mount(BlockProgress, {
      props: { block: makeProgressBlock(3, 5), mode: 'editor' },
    })
    const el = wrapper.find('[role="progressbar"]')
    expect(el.attributes('aria-valuenow')).toBe('3')
    expect(el.attributes('aria-valuemax')).toBe('5')
  })

  it('nutzt inject-Kontext fuer questionNumber/totalQuestions, wenn vorhanden', () => {
    // Provider-Wrapper stellt den Kontext per provide() bereit
    const block = makeProgressBlock(1, 10)
    const ParentWithContext = defineComponent({
      setup() {
        provide(
          funnelStepContextKey,
          computed(() => ({ questionNumber: 3 as number | null, totalQuestions: 5 })),
        )
        return { block }
      },
      components: { BlockProgress },
      template: '<BlockProgress :block="block" mode="editor" />',
    })
    const wrapper = mount(ParentWithContext)
    // Kontext ueberschreibt block.currentStep (1) / block.totalSteps (10)
    expect(wrapper.text()).toContain('Frage 3 von 5')
    const bar = wrapper.find('[role="progressbar"] > div')
    // 3 / 5 = 60%
    expect(bar.attributes('style')).toContain('width: 60%')
  })

  it('zeigt kein "Frage X von N" wenn questionNumber im Kontext null ist', () => {
    // Simuliert einen Content-Step (kein Frage-Step)
    const block = makeProgressBlock(1, 10)
    const ParentWithNull = defineComponent({
      setup() {
        provide(
          funnelStepContextKey,
          computed(() => ({ questionNumber: null as number | null, totalQuestions: 3 })),
        )
        return { block }
      },
      components: { BlockProgress },
      template: '<BlockProgress :block="block" mode="editor" />',
    })
    const wrapper = mount(ParentWithNull)
    // Kein Label-Text, nur Balken
    expect(wrapper.find('p').exists()).toBe(false)
    // Balken ist vorhanden (progressStyle 'bar' ist Standard), bei 0%
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(true)
    const bar = wrapper.find('[role="progressbar"] > div')
    expect(bar.attributes('style')).toContain('width: 0%')
  })
})

// ---------------------------------------------------------------------------
// BlockLogo
// ---------------------------------------------------------------------------

describe('BlockLogo', () => {
  it('rendert ein Bild wenn url gesetzt', () => {
    const block: LogoBlock = {
      id: 'l1',
      type: 'logo',
      url: 'https://example.com/logo.png',
      alt: 'Firmenlogo',
    }
    const wrapper = mount(BlockLogo, {
      props: { block, mode: 'live' },
    })
    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('https://example.com/logo.png')
    expect(img.attributes('alt')).toBe('Firmenlogo')
  })

  it('rendert Platzhalter im editor-Modus ohne url', () => {
    const block: LogoBlock = { id: 'l2', type: 'logo' }
    const wrapper = mount(BlockLogo, {
      props: { block, mode: 'editor' },
    })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain('Logo')
  })

  it('rendert nichts im live-Modus ohne url', () => {
    const block: LogoBlock = { id: 'l3', type: 'logo' }
    const wrapper = mount(BlockLogo, {
      props: { block, mode: 'live' },
    })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('[aria-label]').exists()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// BlockText
// ---------------------------------------------------------------------------

describe('BlockText', () => {
  it('rendert HTML-Inhalt sicher', () => {
    const block: TextBlock = {
      id: 't1',
      type: 'text',
      content: '<p>Hallo <strong>Welt</strong></p>',
    }
    const wrapper = mount(BlockText, { props: { block, mode: 'editor' } })
    expect(wrapper.find('strong').text()).toBe('Welt')
  })

  it('wendet hero-Groesse an', () => {
    const block: TextBlock = {
      id: 't2',
      type: 'text',
      content: '<p>Hero</p>',
      styles: { textSize: 'hero' },
    }
    const wrapper = mount(BlockText, { props: { block, mode: 'editor' } })
    // Fragment-Komponente: wrapper.html() enthaelt alle grenderten Klassen
    expect(wrapper.html()).toContain('font-bold')
  })

  it('wendet center-Ausrichtung an', () => {
    const block: TextBlock = {
      id: 't3',
      type: 'text',
      content: '<p>Zentriert</p>',
      styles: { textAlign: 'center' },
    }
    const wrapper = mount(BlockText, { props: { block, mode: 'editor' } })
    expect(wrapper.html()).toContain('text-center')
  })
})

// ---------------------------------------------------------------------------
// BlockButton
// ---------------------------------------------------------------------------

describe('BlockButton', () => {
  const makeBtn = (style: ButtonBlock['style'] = 'primary'): ButtonBlock => ({
    id: 'b1',
    type: 'button',
    label: 'Weiter',
    action: 'next',
    style,
  })

  it('rendert den Button-Text', () => {
    const wrapper = mount(BlockButton, { props: { block: makeBtn(), mode: 'editor' } })
    expect(wrapper.find('button').text()).toBe('Weiter')
  })

  it('emittiert action im live-Modus', async () => {
    const wrapper = mount(BlockButton, { props: { block: makeBtn(), mode: 'live' } })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('action')?.[0]).toEqual(['next'])
  })

  it('emittiert keine action im editor-Modus', async () => {
    const wrapper = mount(BlockButton, { props: { block: makeBtn(), mode: 'editor' } })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('action')).toBeUndefined()
  })
})
