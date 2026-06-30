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
import BlockMultiChoice from '../../app/components/blocks/BlockMultiChoice.vue'
import BlockRating from '../../app/components/blocks/BlockRating.vue'
import BlockVideo from '../../app/components/blocks/BlockVideo.vue'
import { funnelStepContextKey } from '../../app/composables/useFunnelStepContext'
import {
  createBlock,
} from '../../app/types/funnel'
import type {
  SingleChoiceBlock,
  ProgressIndicatorBlock,
  LogoBlock,
  TextBlock,
  ButtonBlock,
  MultiChoiceBlock,
  RatingBlock,
  BlockType,
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

// ---------------------------------------------------------------------------
// BlockMultiChoice
// ---------------------------------------------------------------------------

describe('BlockMultiChoice', () => {
  const makeMultiBlock = (imageLayout: MultiChoiceBlock['imageLayout'] = 'none'): MultiChoiceBlock => ({
    id: 'mc1',
    type: 'multi_choice',
    fieldKey: 'multi_mc1',
    question: 'Welche Optionen?',
    imageLayout,
    options: [
      { id: 'o1', label: 'Option A', value: 'a' },
      { id: 'o2', label: 'Option B', value: 'b' },
      { id: 'o3', label: 'Option C', value: 'c' },
    ],
  })

  it('rendert 3 Optionen im imageLayout "none"', () => {
    const wrapper = mount(BlockMultiChoice, {
      props: { block: makeMultiBlock('none'), mode: 'editor' },
    })
    // 3 checkboxes (sr-only)
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    expect(checkboxes).toHaveLength(3)
  })

  it('rendert labels mit Optionsnamen', () => {
    const wrapper = mount(BlockMultiChoice, {
      props: { block: makeMultiBlock('none'), mode: 'editor' },
    })
    const html = wrapper.html()
    expect(html).toContain('Option A')
    expect(html).toContain('Option B')
    expect(html).toContain('Option C')
  })

  it('rendert 2x2-Grid im imageLayout "icon"', () => {
    const block: MultiChoiceBlock = {
      ...makeMultiBlock('icon'),
      options: [
        { id: 'o1', label: 'Eins', value: '1', iconName: 'star' },
        { id: 'o2', label: 'Zwei', value: '2', iconName: 'heart' },
        { id: 'o3', label: 'Drei', value: '3', iconName: 'check' },
        { id: 'o4', label: 'Vier', value: '4' },
      ],
    }
    const wrapper = mount(BlockMultiChoice, {
      props: { block, mode: 'editor' },
    })
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    expect(checkboxes).toHaveLength(4)
    // Icon-SVGs fuer bekannte iconNames
    expect(wrapper.findAll('svg').length).toBeGreaterThanOrEqual(3)
  })

  it('zeigt Frage und sr-only legend', () => {
    const wrapper = mount(BlockMultiChoice, {
      props: { block: makeMultiBlock(), mode: 'editor' },
    })
    const legend = wrapper.find('legend')
    expect(legend.classes()).toContain('sr-only')
    expect(legend.text()).toContain('Welche Optionen?')
    expect(wrapper.find('p').text()).toContain('Welche Optionen?')
  })

  it('emittiert update:modelValue im live-Modus (Mehrfachauswahl)', async () => {
    const block = makeMultiBlock('none')
    const wrapper = mount(BlockMultiChoice, {
      props: { block, mode: 'live', modelValue: '' },
    })
    // Erste Checkbox anklicken
    await wrapper.findAll('input[type="checkbox"]')[0]!.trigger('change')
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted?.[0]?.[0]).toBe('a')
  })

  it('emittiert kommaseparierten String bei Mehrfachauswahl', async () => {
    const block = makeMultiBlock('none')
    const wrapper = mount(BlockMultiChoice, {
      props: { block, mode: 'live', modelValue: 'a' },
    })
    // Zweite Checkbox hinzufuegen (a ist schon gewaehlt)
    await wrapper.findAll('input[type="checkbox"]')[1]!.trigger('change')
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted?.[0]?.[0]).toBe('a,b')
  })

  it('entfernt Wert beim zweiten Klick (Toggle)', async () => {
    const block = makeMultiBlock('none')
    const wrapper = mount(BlockMultiChoice, {
      props: { block, mode: 'live', modelValue: 'a,b' },
    })
    // Option A abwaehlen
    await wrapper.findAll('input[type="checkbox"]')[0]!.trigger('change')
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted?.[0]?.[0]).toBe('b')
  })

  it('respektiert maxSelections', async () => {
    const block: MultiChoiceBlock = { ...makeMultiBlock(), maxSelections: 2 }
    const wrapper = mount(BlockMultiChoice, {
      props: { block, mode: 'live', modelValue: 'a,b' },
    })
    // Dritte Option wählen – sollte NICHTS emittieren (max erreicht)
    await wrapper.findAll('input[type="checkbox"]')[2]!.trigger('change')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('emittiert keinen Wert im editor-Modus', async () => {
    const block = makeMultiBlock()
    const wrapper = mount(BlockMultiChoice, {
      props: { block, mode: 'editor' },
    })
    await wrapper.findAll('input[type="checkbox"]')[0]!.trigger('change')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// BlockRating
// ---------------------------------------------------------------------------

describe('BlockRating', () => {
  const makeRatingBlock = (style: RatingBlock['style'] = 'stars', maxRating = 5): RatingBlock => ({
    id: 'r1',
    type: 'rating',
    fieldKey: 'rating_r1',
    question: 'Wie zufrieden bist Du?',
    maxRating,
    style,
  })

  it('rendert maxRating Sterne-Buttons', () => {
    const wrapper = mount(BlockRating, {
      props: { block: makeRatingBlock('stars', 5), mode: 'editor' },
    })
    expect(wrapper.findAll('button')).toHaveLength(5)
  })

  it('rendert maxRating Zahlen-Buttons', () => {
    const wrapper = mount(BlockRating, {
      props: { block: makeRatingBlock('numbers', 10), mode: 'editor' },
    })
    expect(wrapper.findAll('button')).toHaveLength(10)
    // Beschriftungen 1 bis 10
    const texts = wrapper.findAll('button').map(b => b.text())
    expect(texts).toContain('1')
    expect(texts).toContain('10')
  })

  it('rendert Emoji-Buttons', () => {
    const wrapper = mount(BlockRating, {
      props: { block: makeRatingBlock('emoji', 5), mode: 'editor' },
    })
    expect(wrapper.findAll('button')).toHaveLength(5)
    // Emojis werden dargestellt
    const html = wrapper.html()
    expect(html).toContain('😄')
    expect(html).toContain('😞')
  })

  it('emittiert update:modelValue mit String im live-Modus', async () => {
    const wrapper = mount(BlockRating, {
      props: { block: makeRatingBlock('stars', 5), mode: 'live' },
    })
    await wrapper.findAll('button')[2]!.trigger('click') // Stern 3
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['3'])
  })

  it('emittiert keinen Wert im editor-Modus', async () => {
    const wrapper = mount(BlockRating, {
      props: { block: makeRatingBlock('numbers', 5), mode: 'editor' },
    })
    await wrapper.findAll('button')[0]!.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('zeigt die Frage', () => {
    const wrapper = mount(BlockRating, {
      props: { block: makeRatingBlock(), mode: 'editor' },
    })
    expect(wrapper.find('p').text()).toContain('Wie zufrieden bist Du?')
  })
})

// ---------------------------------------------------------------------------
// BlockVideo – URL-Parsing
// ---------------------------------------------------------------------------

describe('BlockVideo URL-Parsing', () => {
  /**
   * Testet das URL-Parsing indirekt ueber das gerenderte iframe-src-Attribut.
   * Im happy-dom-Testenv laeuft kein Client-Mount-Hook,
   * daher ist isClient = false und autoplay wird nie gesetzt.
   */

  it('parst YouTube watch?v= korrekt', () => {
    const block = {
      id: 'v1',
      type: 'video' as const,
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      provider: 'youtube' as const,
      showControls: true,
    }
    const wrapper = mount(BlockVideo, { props: { block, mode: 'live' } })
    const iframe = wrapper.find('iframe')
    expect(iframe.exists()).toBe(true)
    expect(iframe.attributes('src')).toContain('youtube.com/embed/dQw4w9WgXcQ')
  })

  it('parst youtu.be-Kurzlink korrekt', () => {
    const block = {
      id: 'v2',
      type: 'video' as const,
      url: 'https://youtu.be/dQw4w9WgXcQ',
    }
    const wrapper = mount(BlockVideo, { props: { block, mode: 'live' } })
    const iframe = wrapper.find('iframe')
    expect(iframe.exists()).toBe(true)
    expect(iframe.attributes('src')).toContain('youtube.com/embed/dQw4w9WgXcQ')
  })

  it('parst Vimeo-URL korrekt', () => {
    const block = {
      id: 'v3',
      type: 'video' as const,
      url: 'https://vimeo.com/123456789',
    }
    const wrapper = mount(BlockVideo, { props: { block, mode: 'live' } })
    const iframe = wrapper.find('iframe')
    expect(iframe.exists()).toBe(true)
    expect(iframe.attributes('src')).toContain('player.vimeo.com/video/123456789')
  })

  it('zeigt Platzhalter im editor-Modus bei leerer URL', () => {
    const block = { id: 'v4', type: 'video' as const, url: '' }
    const wrapper = mount(BlockVideo, { props: { block, mode: 'editor' } })
    expect(wrapper.find('iframe').exists()).toBe(false)
    // Platzhalter-div vorhanden
    expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(true)
  })

  it('rendert kein iframe bei ungueltige URL im live-Modus', () => {
    const block = { id: 'v5', type: 'video' as const, url: 'https://example.com/not-a-video' }
    const wrapper = mount(BlockVideo, { props: { block, mode: 'live' } })
    expect(wrapper.find('iframe').exists()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// createBlock – Defaults fuer alle 11 M2-Typen
// ---------------------------------------------------------------------------

describe('createBlock M2-Defaults', () => {
  const m2Types: BlockType[] = [
    'multi_choice',
    'input_date',
    'input_time',
    'input_number',
    'input_dropdown',
    'input_textarea',
    'rating',
    'divider',
    'spacer',
    'video',
    'icon',
  ]

  it('erstellt einen Block fuer jeden M2-Typ ohne Fehler', () => {
    for (const type of m2Types) {
      expect(() => createBlock(type)).not.toThrow()
      const block = createBlock(type)
      expect(block.type).toBe(type)
      expect(block.id).toMatch(/^[0-9a-f-]{36}$/)
    }
  })

  it('multi_choice hat 2 Optionen und imageLayout "none"', () => {
    const block = createBlock('multi_choice')
    if (block.type === 'multi_choice') {
      expect(block.options).toHaveLength(2)
      expect(block.imageLayout).toBe('none')
      expect(block.question).toBeTruthy()
    }
  })

  it('rating hat maxRating 5 und style "stars"', () => {
    const block = createBlock('rating')
    if (block.type === 'rating') {
      expect(block.maxRating).toBe(5)
      expect(block.style).toBe('stars')
      expect(block.question).toBeTruthy()
    }
  })

  it('spacer hat height 24', () => {
    const block = createBlock('spacer')
    if (block.type === 'spacer') {
      expect(block.height).toBe(24)
    }
  })

  it('video hat provider "youtube" und leere URL', () => {
    const block = createBlock('video')
    if (block.type === 'video') {
      expect(block.provider).toBe('youtube')
      expect(block.url).toBe('')
    }
  })

  it('icon hat iconName "star"', () => {
    const block = createBlock('icon')
    if (block.type === 'icon') {
      expect(block.iconName).toBe('star')
      expect(block.size).toBe(32)
    }
  })

  it('input_dropdown hat 2 Optionen', () => {
    const block = createBlock('input_dropdown')
    if (block.type === 'input_dropdown') {
      expect(block.options).toHaveLength(2)
      expect(block.placeholder).toBeTruthy()
    }
  })

  it('input_textarea hat rows 4', () => {
    const block = createBlock('input_textarea')
    if (block.type === 'input_textarea') {
      expect(block.rows).toBe(4)
    }
  })

  it('alle M1-Typen sind durch createBlock weiterhin erreichbar', () => {
    const m1Types: BlockType[] = [
      'text', 'image', 'button', 'single_choice',
      'input_text', 'input_email', 'input_phone',
      'optin_checkbox', 'progress_indicator', 'logo',
    ]
    for (const type of m1Types) {
      const block = createBlock(type)
      expect(block.type).toBe(type)
    }
  })
})
