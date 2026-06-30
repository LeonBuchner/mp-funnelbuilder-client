/**
 * Unit-Tests fuer useRendererState.
 *
 * Kritische Pfade:
 *   - Navigation (next/back)
 *   - Validierung (required / email / consent)
 *   - Antwort-Sammlung fuer den Submit
 *   - autoAdvance
 *
 * Gemockt:
 *   - usePublicApi: verhindert echte HTTP-Aufrufe
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useRendererState } from '../../app/composables/useRendererState'
import type { Step, InputTextBlock, InputEmailBlock, OptinCheckboxBlock, SingleChoiceBlock } from '../../app/types/funnel'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockApiFn = vi.hoisted(() => vi.fn())

vi.mock('~/composables/usePublicApi', () => ({
  usePublicApi: vi.fn(() => mockApiFn),
}))

// ---------------------------------------------------------------------------
// Testdaten-Factories
// ---------------------------------------------------------------------------

function makeTextStep(id = 'step-content'): Step {
  return {
    id,
    type: 'content',
    internalTitle: 'Intro',
    layout: 'single',
    logicRules: [],
    blocks: [
      { id: 'b-text', type: 'text', content: '<p>Willkommen</p>' },
    ],
  }
}

function makeChoiceStep(autoAdvance = false): Step {
  const block: SingleChoiceBlock = {
    id: 'b-choice',
    type: 'single_choice',
    fieldKey: 'standort',
    question: 'Wo bist du?',
    options: [
      { id: 'o1', label: 'Berlin', value: 'berlin' },
      { id: 'o2', label: 'Hamburg', value: 'hamburg' },
    ],
    imageLayout: 'none',
    autoAdvance,
    required: true,
  }
  return {
    id: 'step-choice',
    type: 'question',
    internalTitle: 'Standort',
    layout: 'single',
    logicRules: [],
    blocks: [block],
  }
}

function makeFormStep(): Step {
  const nameBlock: InputTextBlock = {
    id: 'b-name',
    type: 'input_text',
    fieldKey: 'name',
    label: 'Dein Name',
    required: true,
  }
  const emailBlock: InputEmailBlock = {
    id: 'b-email',
    type: 'input_email',
    fieldKey: 'email',
    label: 'Deine E-Mail',
    required: true,
  }
  const optinBlock: OptinCheckboxBlock = {
    id: 'b-optin',
    type: 'optin_checkbox',
    fieldKey: 'consent',
    required: true,
    checkboxLabel: 'Ich stimme der <a href="/datenschutz">Datenschutzerklaerung</a> zu.',
  }
  return {
    id: 'step-form',
    type: 'form',
    internalTitle: 'Kontakt',
    layout: 'single',
    logicRules: [],
    blocks: [nameBlock, emailBlock, optinBlock],
  }
}

function makeResultStep(): Step {
  return {
    id: 'step-result',
    type: 'result',
    internalTitle: 'Danke',
    layout: 'single',
    logicRules: [],
    blocks: [{ id: 'b-result-text', type: 'text', content: '<p>Danke!</p>' }],
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useRendererState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApiFn.mockResolvedValue({}) // Default: Erfolg
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // -------------------------------------------------------------------------
  // Initialer Zustand
  // -------------------------------------------------------------------------

  it('startet bei Step 0 ohne Antworten und Fehler', () => {
    const steps = [makeTextStep(), makeChoiceStep()]
    const state = useRendererState('test-hash', steps)

    expect(state.currentStepIndex.value).toBe(0)
    expect(Object.keys(state.answers.value)).toHaveLength(0)
    expect(Object.keys(state.errors.value)).toHaveLength(0)
    expect(state.isSubmitted.value).toBe(false)
    expect(state.isSubmitting.value).toBe(false)
  })

  it('session_id startet als leerer String (wird erst in onMounted gesetzt)', () => {
    /**
     * Die session_id wird aus SSR-Sicherheitsgruenden erst in onMounted
     * aus dem localStorage gelesen bzw. neu erzeugt. Dadurch stimmen
     * SSR- und Client-Render beim ersten Rendern ueberein (kein Mismatch).
     * Im Test-Kontext ohne Component-Mount bleibt der Wert leer.
     */
    const state = useRendererState('my-funnel', [makeTextStep()])
    expect(typeof state.sessionId.value).toBe('string')
    expect(state.sessionId.value).toBe('')
  })

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  it('next() wechselt auf Step 1 wenn Step 0 keine Pflichtfelder hat', async () => {
    const steps = [makeTextStep(), makeChoiceStep()]
    const state = useRendererState('hash', steps)

    await state.next()
    expect(state.currentStepIndex.value).toBe(1)
  })

  it('next() bleibt auf Step 0 wenn Pflichtfeld leer ist', async () => {
    const steps = [makeChoiceStep(), makeTextStep()]
    const state = useRendererState('hash', steps)

    await state.next()
    expect(state.currentStepIndex.value).toBe(0)
    expect(state.errors.value['standort']).toBeTruthy()
  })

  it('next() ueberschreitet nicht den letzten Step', async () => {
    const steps = [makeTextStep()]
    const state = useRendererState('hash', steps)

    await state.next()
    expect(state.currentStepIndex.value).toBe(0)
  })

  it('back() geht einen Step zurueck', async () => {
    const steps = [makeTextStep(), makeChoiceStep()]
    const state = useRendererState('hash', steps)

    await state.next() // -> Step 1
    state.back() // -> Step 0
    expect(state.currentStepIndex.value).toBe(0)
  })

  it('back() bleibt bei Step 0', () => {
    const steps = [makeTextStep(), makeChoiceStep()]
    const state = useRendererState('hash', steps)

    state.back()
    expect(state.currentStepIndex.value).toBe(0)
  })

  it('reset() setzt alles auf Ausgangszustand', async () => {
    const steps = [makeTextStep(), makeChoiceStep()]
    const state = useRendererState('hash', steps)

    await state.next()
    state.updateAnswer(steps[1]!.blocks[0]!, 'berlin')
    state.reset()

    expect(state.currentStepIndex.value).toBe(0)
    expect(Object.keys(state.answers.value)).toHaveLength(0)
    expect(state.isSubmitted.value).toBe(false)
  })

  // -------------------------------------------------------------------------
  // Validierung
  // -------------------------------------------------------------------------

  it('next() setzt Fehler bei leerem Pflicht-Textfeld', async () => {
    const steps = [makeFormStep()]
    const state = useRendererState('hash', steps)
    // Email und Optin leer lassen, nur Name setzen
    state.updateAnswer(steps[0]!.blocks[0]!, '') // name leer

    await state.next()
    expect(state.errors.value['name']).toBeTruthy()
  })

  it('next() setzt Fehler bei ungueltiger E-Mail', async () => {
    const steps = [makeFormStep()]
    const state = useRendererState('hash', steps)

    // Name gesetzt
    state.updateAnswer(steps[0]!.blocks[0]!, 'Max Mustermann')
    // Ungueltige E-Mail
    state.updateAnswer(steps[0]!.blocks[1]!, 'keine-email')

    await state.next()
    expect(state.errors.value['email']).toContain('gueltige')
  })

  it('next() akzeptiert gueltige E-Mail-Adresse', async () => {
    const steps = [makeFormStep(), makeResultStep()]
    const state = useRendererState('hash', steps)

    state.updateAnswer(steps[0]!.blocks[0]!, 'Max Mustermann')
    state.updateAnswer(steps[0]!.blocks[1]!, 'max@example.de')
    state.updateAnswer(steps[0]!.blocks[2]!, true) // consent

    await state.next()
    expect(state.errors.value['email']).toBeUndefined()
    expect(state.currentStepIndex.value).toBe(1)
  })

  it('next() setzt Fehler bei nicht-akzeptiertem Consent (required)', async () => {
    const steps = [makeFormStep()]
    const state = useRendererState('hash', steps)

    state.updateAnswer(steps[0]!.blocks[0]!, 'Max')
    state.updateAnswer(steps[0]!.blocks[1]!, 'max@test.de')
    state.updateAnswer(steps[0]!.blocks[2]!, false) // consent NICHT akzeptiert

    await state.next()
    expect(state.errors.value['consent']).toBeTruthy()
  })

  it('Fehler wird beim erneuten Tippen geloescht', () => {
    const steps = [makeFormStep()]
    const state = useRendererState('hash', steps)

    // Fehler manuell setzen
    state.errors.value['name'] = 'Pflichtfeld'

    // Antwort aktualisieren -> Fehler loeschen
    state.updateAnswer(steps[0]!.blocks[0]!, 'Max')
    expect(state.errors.value['name']).toBeUndefined()
  })

  // -------------------------------------------------------------------------
  // Antwort-Sammlung fuer Submit
  // -------------------------------------------------------------------------

  it('collectAnswers() sammelt alle Antworten mit korrektem step_index und block_id', () => {
    const steps = [makeChoiceStep(), makeFormStep()]
    const state = useRendererState('hash', steps)

    state.updateAnswer(steps[0]!.blocks[0]!, 'berlin')
    state.updateAnswer(steps[1]!.blocks[0]!, 'Anna')
    state.updateAnswer(steps[1]!.blocks[1]!, 'anna@example.de')
    state.updateAnswer(steps[1]!.blocks[2]!, true)

    const collected = state.collectAnswers()

    expect(collected).toHaveLength(4)

    const choice = collected.find(a => a.field_key === 'standort')
    expect(choice).toBeDefined()
    expect(choice!.step_index).toBe(0)
    expect(choice!.block_type).toBe('single_choice')
    expect(choice!.value).toBe('berlin')

    const email = collected.find(a => a.field_key === 'email')
    expect(email).toBeDefined()
    expect(email!.step_index).toBe(1)
    expect(email!.block_type).toBe('input_email')
    expect(email!.value).toBe('anna@example.de')

    const consent = collected.find(a => a.field_key === 'consent')
    expect(consent).toBeDefined()
    expect(consent!.value).toBe(true)
  })

  it('collectAnswers() enthaelt keine leeren Antworten', () => {
    const steps = [makeChoiceStep()]
    const state = useRendererState('hash', steps)
    // Keine updateAnswer-Aufrufe

    const collected = state.collectAnswers()
    expect(collected).toHaveLength(0)
  })

  // -------------------------------------------------------------------------
  // submitLead
  // -------------------------------------------------------------------------

  it('submitLead() sendet korrekte Payload und setzt isSubmitted', async () => {
    mockApiFn.mockResolvedValueOnce({ id: 'lead-uuid', status: 'pending' })
    const steps = [makeFormStep(), makeResultStep()]
    const state = useRendererState('hash', steps)

    state.updateAnswer(steps[0]!.blocks[0]!, 'Max Mustermann')
    state.updateAnswer(steps[0]!.blocks[1]!, 'max@example.de')
    state.updateAnswer(steps[0]!.blocks[2]!, true)

    await state.submitLead({ utm: { source: 'google' } })

    expect(state.isSubmitted.value).toBe(true)
    expect(state.isSubmitting.value).toBe(false)

    // API wurde aufgerufen
    expect(mockApiFn).toHaveBeenCalledWith(
      '/f/hash/leads',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          consent: true,
          utm: expect.objectContaining({ source: 'google' }),
        }),
      }),
    )
  })

  it('submitLead() navigiert zum result-Step nach Erfolg', async () => {
    mockApiFn.mockResolvedValueOnce({ id: 'lead-1', status: 'pending' })
    const steps = [makeFormStep(), makeResultStep()]
    const state = useRendererState('hash', steps)

    state.updateAnswer(steps[0]!.blocks[0]!, 'Max')
    state.updateAnswer(steps[0]!.blocks[1]!, 'max@test.de')
    state.updateAnswer(steps[0]!.blocks[2]!, true)

    await state.submitLead()

    // Result-Step ist Step 1 (Index 1)
    expect(state.currentStepIndex.value).toBe(1)
  })

  it('submitLead() setzt Feld-Fehler bei 422-Response', async () => {
    mockApiFn.mockRejectedValueOnce({
      status: 422,
      data: {
        errors: {
          'answers.email': ['Die E-Mail-Adresse ist ungueltig.'],
        },
      },
    })

    const steps = [makeFormStep()]
    const state = useRendererState('hash', steps)

    state.updateAnswer(steps[0]!.blocks[0]!, 'Max')
    state.updateAnswer(steps[0]!.blocks[1]!, 'max@test.de')
    state.updateAnswer(steps[0]!.blocks[2]!, true)

    await state.submitLead()

    expect(state.errors.value['email']).toBe('Die E-Mail-Adresse ist ungueltig.')
    expect(state.isSubmitted.value).toBe(false)
  })

  it('submitLead() setzt rateLimitError bei 429-Response', async () => {
    mockApiFn.mockRejectedValueOnce({ status: 429 })

    const steps = [makeFormStep()]
    const state = useRendererState('hash', steps)

    state.updateAnswer(steps[0]!.blocks[0]!, 'Max')
    state.updateAnswer(steps[0]!.blocks[1]!, 'max@test.de')
    state.updateAnswer(steps[0]!.blocks[2]!, true)

    await state.submitLead()

    expect(state.rateLimitError.value).toBe(true)
    expect(state.isSubmitted.value).toBe(false)
  })

  // -------------------------------------------------------------------------
  // autoAdvance
  // -------------------------------------------------------------------------

  it('updateAnswer() mit autoAdvance=true loest next() nach nextTick aus', async () => {
    const steps = [makeChoiceStep(true), makeTextStep()]
    const state = useRendererState('hash', steps)

    state.updateAnswer(steps[0]!.blocks[0]!, 'berlin')
    await nextTick()

    expect(state.currentStepIndex.value).toBe(1)
  })

  it('updateAnswer() mit autoAdvance=false loest kein next() aus', async () => {
    const steps = [makeChoiceStep(false), makeTextStep()]
    const state = useRendererState('hash', steps)

    state.updateAnswer(steps[0]!.blocks[0]!, 'berlin')
    await nextTick()

    expect(state.currentStepIndex.value).toBe(0)
  })

  it('autoAdvance loest kein next() fuer leeren Wert aus', async () => {
    const steps = [makeChoiceStep(true), makeTextStep()]
    const state = useRendererState('hash', steps)

    state.updateAnswer(steps[0]!.blocks[0]!, '') // Leerer Wert
    await nextTick()

    expect(state.currentStepIndex.value).toBe(0)
  })

  // -------------------------------------------------------------------------
  // stepContext
  // -------------------------------------------------------------------------

  it('stepContext.questionNumber ist null bei content-Steps', () => {
    const steps = [makeTextStep(), makeChoiceStep()]
    const state = useRendererState('hash', steps)

    // Step 0 ist content
    expect(state.stepContext.value.questionNumber).toBeNull()
    expect(state.stepContext.value.totalQuestions).toBe(1) // 1 question-Step
  })

  it('stepContext.questionNumber ist 1 beim ersten question-Step', async () => {
    const steps = [makeTextStep(), makeChoiceStep()]
    const state = useRendererState('hash', steps)

    await state.next() // -> Step 1 (question)
    expect(state.stepContext.value.questionNumber).toBe(1)
    expect(state.stepContext.value.totalQuestions).toBe(1)
  })
})
