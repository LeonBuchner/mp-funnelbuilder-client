/**
 * useRendererState: Zustand und Logik des oeffentlichen Funnel-Renderers.
 *
 * Verwaltet:
 *   - session_id (stabil pro Funnel/Besucher, in localStorage)
 *   - currentStepIndex + Navigation (next/back) mit Logik-Engine
 *   - answers: Record<fieldKey, value> (in-memory)
 *   - Validierung pro Step vor next()/submit (nur sichtbare Bloecke)
 *   - Lead-Submit via POST /api/public/f/{hash}/leads
 *   - Event-Tracking via POST /api/public/f/{hash}/events (best-effort, clientseitig)
 *   - autoAdvance bei single_choice mit autoAdvance=true
 *   - FunnelStepContext fuer provide() in der Page-Komponente
 *   - visibleBlocksForCurrentStep: aktueller Step gefiltert durch DisplayConditions (M3)
 *   - setActiveSteps: reaktiver Schritt-Swap fuer A/B-Varianten (M3.7)
 *   - setAbVariantId: uebergibt die zugewiesene Varianten-ID an Tracking/Lead-Submit (M3.7)
 *
 * Navigations-Prioritaet in next():
 *   1. Step.logicRules (evaluateLogicRules) -> erstes passendes Ziel
 *   2. block.target des ausloesenden Blocks (single_choice / button)
 *   3. Lineare Navigation (+1)
 *
 * Ungueltige stepIds in Sprungzielen werden als graceful-Fallback auf
 * lineare Navigation behandelt (kein Crash).
 */
import { ref, computed, nextTick, onMounted, shallowRef } from 'vue'
import { usePublicApi } from '~/composables/usePublicApi'
import { evaluateLogicRules, evaluateDisplayConditions } from '~/composables/useLogicEngine'
import type { FunnelStepContext } from '~/composables/useFunnelStepContext'
import type { Step, Block, SingleChoiceBlock, ButtonBlock, OptinCheckboxBlock } from '~/types/funnel'
import type { EventType, EventBody, LeadSubmitBody, LeadAnswer, UtmParams } from '~/types/public-funnel'

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

/** Typ-Guard: gibt true zurueck wenn Block ein fieldKey-Attribut hat */
function hasFieldKey(block: Block): block is Block & { fieldKey: string; required?: boolean } {
  return 'fieldKey' in block && typeof (block as { fieldKey?: unknown }).fieldKey === 'string'
}

/** Entfernt HTML-Tags fuer Klartext (Consent-Text) */
function stripHtml(html: string): string {
  if (import.meta.client) {
    const div = document.createElement('div')
    div.innerHTML = html
    return div.textContent?.trim() ?? ''
  }
  return html.replace(/<[^>]*>/g, '').trim()
}

/** Bestimmt den Geraete-Typ grob anhand des User-Agents */
function getDeviceType(): string {
  if (!import.meta.client) return 'unknown'
  return /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
}

/**
 * Prueft ob eine URL fuer externe Navigation sicher ist.
 * Erlaubt nur http:// und https:// – blockiert javascript:, data:, vbscript: usw.
 */
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  }
  catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useRendererState(hash: string, initialSteps: Step[]) {
  const api = usePublicApi()

  /**
   * Aktive Steps: reaktiv per shallowRef, damit setActiveSteps() einen
   * vollstaendigen Schritt-Swap (z. B. fuer A/B-Varianten) ausloesen kann,
   * ohne Deep-Tracking des Inhalts einzelner Bloecke.
   */
  const activeSteps = shallowRef<Step[]>(initialSteps)

  /**
   * Zugewiesene A/B-Varianten-UUID (null = kein A/B-Test).
   * Wird per setAbVariantId() aus useAbVariant gesetzt und in
   * trackEvent / submitLead an die API uebergeben.
   * Ab M5.6: UUID-String statt Integer.
   */
  const internalAbVariantId = ref<string | null>(null)

  /**
   * Stabile Session-ID pro Funnel und Besucher.
   * Wird erst in onMounted aus localStorage gelesen (oder neu erzeugt).
   * Damit ist SSR- und Client-DOM beim ersten Render identisch (kein localStorage-Zugriff waehrend SSR/Hydration).
   */
  const sessionId = ref<string>('')

  onMounted(() => {
    const key = `mp_funnel_session_${hash}`
    try {
      const stored = window.localStorage.getItem(key)
      if (stored) {
        sessionId.value = stored
      }
      else {
        const id = crypto.randomUUID()
        window.localStorage.setItem(key, id)
        sessionId.value = id
      }
    }
    catch {
      // localStorage nicht verfuegbar (privater Modus, einige Browser)
      sessionId.value = crypto.randomUUID()
    }
  })

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const currentStepIndex = ref<number>(0)
  const answers = ref<Record<string, string | boolean>>({})
  const errors = ref<Record<string, string>>({})
  const isSubmitting = ref<boolean>(false)
  const isSubmitted = ref<boolean>(false)
  const submitError = ref<string | null>(null)
  const rateLimitError = ref<boolean>(false)

  /**
   * OTP-Verifikations-Token (optin_otp-Block).
   * Wird von BlockOptinOtp gesetzt, sobald otp/verify erfolgreich war.
   * Fliesst beim Lead-Submit in den Request-Body.
   */
  const otpVerifiedToken = ref<string | null>(null)

  /**
   * Tracking-Consent des Besuchers (aus localStorage, vom ConsentBanner gesetzt).
   * null = noch keine Entscheidung getroffen (Banner noch aktiv oder nicht gezeigt).
   * true/false = bewusste Entscheidung des Nutzers.
   */
  const trackingConsent = ref<boolean | null>(null)

  /**
   * Double-Opt-in ausstehend: true wenn Lead submitted und ein optin_double-Block
   * im Funnel vorhanden ist. Renderer zeigt dann den Bestaetigungs-Screen.
   */
  const doubleOptinPending = ref<boolean>(false)

  // ---------------------------------------------------------------------------
  // Computed: Navigation und Sichtbarkeit
  // ---------------------------------------------------------------------------

  const currentStep = computed<Step | undefined>(() => activeSteps.value[currentStepIndex.value])

  /** Alle Steps, die als Frage-Steps zaehlen (question | form). */
  const questionSteps = computed<Step[]>(() =>
    activeSteps.value.filter(s => s.type === 'question' || s.type === 'form'),
  )

  /**
   * Kontext fuer BlockProgress / useFunnelStepContext.
   * Wird per provide(funnelStepContextKey, stepContext) in der Page-Komponente bereitgestellt.
   */
  const stepContext = computed<FunnelStepContext>(() => {
    const step = currentStep.value
    const total = questionSteps.value.length
    if (!step) return { questionNumber: null, totalQuestions: total }
    if (step.type === 'question' || step.type === 'form') {
      const idx = questionSteps.value.findIndex(s => s.id === step.id)
      return { questionNumber: idx >= 0 ? idx + 1 : null, totalQuestions: total }
    }
    return { questionNumber: null, totalQuestions: total }
  })

  /**
   * Antworten nach Block-ID indiziert (fuer die Logik-Engine).
   * Die Logik-Engine arbeitet mit blockId als Schluessel; useRendererState
   * speichert intern nach fieldKey. Diese Computed erzeugt die Bruecke.
   *
   * Reaktiv: aktualisiert sich wenn sich answers.value aendert.
   * SSR-sicher: auf dem Server ist answers.value leer -> leere Map.
   */
  const answersByBlockId = computed<Record<string, string | boolean>>(() => {
    const map: Record<string, string | boolean> = {}
    for (const step of activeSteps.value) {
      for (const block of step.blocks) {
        if (hasFieldKey(block)) {
          const val = answers.value[block.fieldKey]
          if (val !== undefined) {
            map[block.id] = val
          }
        }
      }
    }
    return map
  })

  /**
   * Bloecke des aktuellen Steps, gefiltert durch ihre DisplayConditions.
   *
   * SSR-Hydration-Sicherheit: answers.value startet auf SSR und Client
   * identisch als leeres Objekt. evaluateDisplayConditions ist deterministisch,
   * daher erzeugt diese Computed keinen Hydration-Mismatch.
   *
   * Bloecke ohne displayConditions (oder leeres Array) sind immer sichtbar.
   */
  const visibleBlocksForCurrentStep = computed<Block[]>(() => {
    const step = currentStep.value
    if (!step) return []
    return step.blocks.filter(block =>
      evaluateDisplayConditions(block.displayConditions, answersByBlockId.value),
    )
  })

  // ---------------------------------------------------------------------------
  // Antworten
  // ---------------------------------------------------------------------------

  /** Gibt den gespeicherten Wert fuer einen Block zurueck (oder undefined). */
  function getAnswerForBlock(block: Block): string | boolean | undefined {
    if (!hasFieldKey(block)) return undefined
    return answers.value[block.fieldKey]
  }

  /**
   * Speichert eine Antwort und loescht den Fehler fuer das Feld.
   * Bei single_choice mit autoAdvance=true wird naechster Step automatisch aufgerufen.
   * Der ausloesende Block wird an next() weitergegeben, damit block.target ausgewertet werden kann.
   */
  function updateAnswer(block: Block, value: string | boolean): void {
    if (!hasFieldKey(block)) return
    answers.value[block.fieldKey] = value

    // Fehler beim Tippen/Auswaehlen sofort entfernen
    if (errors.value[block.fieldKey]) {
      const fk = block.fieldKey
      errors.value = Object.fromEntries(
        Object.entries(errors.value).filter(([k]) => k !== fk),
      ) as Record<string, string>
    }

    // autoAdvance: bei single_choice automatisch weiterschalten.
    // Block wird an next() uebergeben, damit block.target beruecksichtigt wird.
    if (
      block.type === 'single_choice'
      && (block as SingleChoiceBlock).autoAdvance
      && typeof value === 'string'
      && value !== ''
    ) {
      nextTick(() => {
        next(block).catch(() => { /* Validierungsfehler unkritisch */ })
      })
    }
  }

  // ---------------------------------------------------------------------------
  // Validierung
  // ---------------------------------------------------------------------------

  /** Loescht alle Fehler des aktuellen Steps (alle Bloecke, auch unsichtbare). */
  function clearCurrentStepErrors(): void {
    const step = currentStep.value
    if (!step) return
    const keysToRemove = new Set(
      step.blocks
        .filter(hasFieldKey)
        .map(b => (b as { fieldKey: string }).fieldKey),
    )
    if (keysToRemove.size === 0) return
    errors.value = Object.fromEntries(
      Object.entries(errors.value).filter(([k]) => !keysToRemove.has(k)),
    ) as Record<string, string>
  }

  /**
   * Prueft alle Pflichtfelder des aktuellen Steps.
   * Nur sichtbare Bloecke (visibleBlocksForCurrentStep) werden validiert –
   * ausgeblendete Pflichtfelder blockieren die Navigation nicht.
   * Setzt errors.value[fieldKey] bei Verstoss.
   * Gibt true zurueck wenn der Step valide ist.
   */
  function validateCurrentStep(): boolean {
    const step = currentStep.value
    if (!step) return true

    clearCurrentStepErrors()
    let valid = true

    for (const block of visibleBlocksForCurrentStep.value) {
      if (!hasFieldKey(block) || !block.required) continue

      const value = answers.value[block.fieldKey]

      if (block.type === 'optin_checkbox' || block.type === 'optin_double') {
        if (!value) {
          errors.value[block.fieldKey] = 'Bitte stimme den Bedingungen zu.'
          valid = false
        }
      }
      else if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
        errors.value[block.fieldKey] = 'Dieses Feld ist erforderlich.'
        valid = false
      }
      else if (block.type === 'input_email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value as string)) {
          errors.value[block.fieldKey] = 'Bitte gib eine gueltige E-Mail-Adresse ein.'
          valid = false
        }
      }
      else if (block.type === 'input_phone') {
        const phoneVal = typeof value === 'string' ? value.replace(/\D/g, '') : ''
        if (phoneVal.length < 6) {
          errors.value[block.fieldKey] = 'Bitte gib eine gueltige Telefonnummer ein.'
          valid = false
        }
      }
    }

    return valid
  }

  // ---------------------------------------------------------------------------
  // Event-Tracking (best-effort, nur clientseitig)
  // ---------------------------------------------------------------------------

  function trackEvent(
    eventType: EventType,
    extras?: { step_index?: number; block_id?: string; event_value?: string },
  ): void {
    if (!import.meta.client) return

    const body: EventBody = {
      session_id: sessionId.value,
      event_type: eventType,
      device_type: getDeviceType(),
      referrer: document.referrer || undefined,
      ...extras,
      // A/B-Varianten-ID einschliessen wenn ein Test laeuft (M3.7)
      ...(internalAbVariantId.value !== null ? { ab_variant_id: internalAbVariantId.value } : {}),
    }

    api(`/f/${hash}/events`, { method: 'POST', body })
      .catch(() => { /* Fehler beim Event-Tracking stoeren den Funnel nicht */ })
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  /**
   * Navigiert zu einem Step anhand seiner ID.
   * Gibt den neuen Index zurueck oder -1 wenn nicht gefunden (Fallback: linear).
   */
  function findStepIndex(stepId: string): number {
    return activeSteps.value.findIndex(s => s.id === stepId)
  }

  /**
   * Wechselt zum naechsten Step unter Beruecksichtigung der Logik-Engine.
   *
   * Prioritaet:
   *   1. Step.logicRules (evaluateLogicRules) -> erstes passendes Ziel
   *   2. block.target des ausloesenden Blocks (single_choice / button)
   *   3. Lineare Navigation (+1)
   *
   * Ungueltige stepIds in targets werden als Fallback auf linear behandelt.
   * target.type='url' navigiert sicher extern (nur http/https).
   * target.type='submit' loest submitLead() aus.
   *
   * @param triggerBlock - Optionaler Block, der die Navigation ausgeloest hat
   *                       (fuer block.target-Auswertung in Prioritaet 2)
   */
  async function next(triggerBlock?: Block): Promise<void> {
    if (!validateCurrentStep()) return

    const step = currentStep.value
    const prevIndex = currentStepIndex.value

    if (step) {
      // --- Prioritaet 1: Step-level LogicRules ---
      const logicTarget = evaluateLogicRules(step, answersByBlockId.value)
      if (logicTarget !== null) {
        if (logicTarget.type === 'submit') {
          trackEvent('step_complete', { step_index: prevIndex })
          await submitLead()
          return
        }

        trackEvent('step_complete', { step_index: prevIndex })

        if (logicTarget.type === 'step') {
          const idx = findStepIndex(logicTarget.stepId)
          currentStepIndex.value = idx >= 0 ? idx : Math.min(prevIndex + 1, activeSteps.value.length - 1)
          trackEvent('step_view', { step_index: currentStepIndex.value })
          return
        }

        if (logicTarget.type === 'next') {
          currentStepIndex.value = Math.min(prevIndex + 1, activeSteps.value.length - 1)
          trackEvent('step_view', { step_index: currentStepIndex.value })
          return
        }

        if (logicTarget.type === 'url') {
          // Externe Navigation – kein step_view, kein currentStepIndex-Update
          if (import.meta.client && isSafeUrl(logicTarget.url)) {
            window.location.href = logicTarget.url
          }
          return
        }
      }

      // --- Prioritaet 2: Block-level target ---
      if (
        triggerBlock
        && (triggerBlock.type === 'button' || triggerBlock.type === 'single_choice')
      ) {
        const blockTarget = (triggerBlock as ButtonBlock | SingleChoiceBlock).target
        if (blockTarget && (blockTarget.type === 'step' || blockTarget.type === 'result')) {
          const idx = findStepIndex(blockTarget.stepId)
          if (idx >= 0) {
            trackEvent('step_complete', { step_index: prevIndex })
            currentStepIndex.value = idx
            trackEvent('step_view', { step_index: currentStepIndex.value })
            return
          }
          // Ungueltige stepId -> Fallback auf linear (weiter unten)
        }
        // blockTarget.type === 'next' oder kein target -> Fallback auf linear
      }
    }

    // --- Prioritaet 3: Lineare Navigation ---
    if (currentStepIndex.value >= activeSteps.value.length - 1) return
    trackEvent('step_complete', { step_index: prevIndex })
    currentStepIndex.value++
    trackEvent('step_view', { step_index: currentStepIndex.value })
  }

  function back(): void {
    if (currentStepIndex.value <= 0) return
    trackEvent('step_back', { step_index: currentStepIndex.value })
    currentStepIndex.value--
    trackEvent('step_view', { step_index: currentStepIndex.value })
  }

  function reset(): void {
    currentStepIndex.value = 0
    answers.value = {}
    errors.value = {}
    submitError.value = null
    rateLimitError.value = false
    isSubmitted.value = false
    doubleOptinPending.value = false
    otpVerifiedToken.value = null
  }

  // ---------------------------------------------------------------------------
  // Lead-Submit
  // ---------------------------------------------------------------------------

  /** Sammelt alle Antworten aus allen Steps im API-Format. */
  function collectAnswers(): LeadAnswer[] {
    const result: LeadAnswer[] = []
    activeSteps.value.forEach((step, stepIdx) => {
      step.blocks.forEach((block) => {
        if (!hasFieldKey(block)) return
        const value = answers.value[block.fieldKey]
        if (value !== undefined) {
          result.push({
            step_index: stepIdx,
            block_id: block.id,
            block_type: block.type,
            field_key: block.fieldKey,
            value,
          })
        }
      })
    })
    return result
  }

  /**
   * Sendet den Lead an die API.
   * Navigiert bei Erfolg zum result-Step (oder letzten Step).
   * Setzt inline-Fehler bei 422, rateLimitError bei 429.
   */
  async function submitLead(opts?: { utm?: UtmParams }): Promise<void> {
    if (!validateCurrentStep()) return

    isSubmitting.value = true
    submitError.value = null
    rateLimitError.value = false

    try {
      const allAnswers = collectAnswers()

      // Consent-Wert und -Text aus dem optin_checkbox-Block ermitteln
      let consentValue = false
      let consentText = ''

      outerLoop: for (const step of activeSteps.value) {
        for (const block of step.blocks) {
          if (block.type === 'optin_checkbox') {
            const optin = block as OptinCheckboxBlock
            consentValue = (answers.value[optin.fieldKey] as boolean) ?? false
            consentText = stripHtml(optin.checkboxLabel)
            break outerLoop
          }
        }
      }

      // Pruefen ob ein optin_double-Block vorhanden ist (fuer Bestaetigungs-Screen)
      let hasDoubleOptin = false
      for (const step of activeSteps.value) {
        for (const block of step.blocks) {
          if (block.type === 'optin_double') {
            hasDoubleOptin = true
            break
          }
        }
        if (hasDoubleOptin) break
      }

      // Pruefen ob ein optin_otp-Block vorhanden ist (fuer Token-Anforderung)
      let hasOtpBlock = false
      for (const step of activeSteps.value) {
        for (const block of step.blocks) {
          if (block.type === 'optin_otp') {
            hasOtpBlock = true
            break
          }
        }
        if (hasOtpBlock) break
      }

      const body: LeadSubmitBody = {
        session_id: sessionId.value,
        answers: allAnswers,
        consent: consentValue,
        consent_text: consentText,
        ...(opts?.utm ? { utm: opts.utm } : {}),
        // A/B-Varianten-ID einschliessen wenn ein Test laeuft (M3.7)
        ...(internalAbVariantId.value !== null ? { ab_variant_id: internalAbVariantId.value } : {}),
        // Tracking-Consent (M4.11)
        ...(trackingConsent.value !== null ? { tracking_consent: trackingConsent.value } : {}),
        // OTP-Token (M4.10) - nur wenn optin_otp-Block vorhanden
        ...(hasOtpBlock && otpVerifiedToken.value !== null
          ? { otp_verified_token: otpVerifiedToken.value }
          : {}),
      }

      await api(`/f/${hash}/leads`, { method: 'POST', body })

      isSubmitted.value = true
      trackEvent('lead_submit')

      if (hasDoubleOptin) {
        // Double-Opt-in: Bestaetigungs-Screen anzeigen statt result-Step
        doubleOptinPending.value = true
        return
      }

      // Zum result-Step navigieren (oder letztem Step)
      const resultIdx = activeSteps.value.findIndex(s => s.type === 'result')
      currentStepIndex.value = resultIdx >= 0 ? resultIdx : activeSteps.value.length - 1
    }
    catch (err: unknown) {
      type ApiError = {
        status?: number
        statusCode?: number
        data?: { errors?: Record<string, string | string[]> }
      }
      const e = err as ApiError
      const status = e.status ?? e.statusCode

      if (status === 422 && e.data?.errors) {
        for (const [key, msgs] of Object.entries(e.data.errors)) {
          // API liefert z. B. 'answers.email_xxx' oder direkt 'email_xxx'
          const fieldKey = key.startsWith('answers.') ? key.slice(8) : key
          errors.value[fieldKey] = Array.isArray(msgs)
            ? (msgs[0] ?? 'Fehler')
            : String(msgs)
        }
      }
      else if (status === 429) {
        rateLimitError.value = true
      }
      else {
        submitError.value = 'Etwas ist schiefgelaufen. Bitte versuche es erneut.'
      }
    }
    finally {
      isSubmitting.value = false
    }
  }

  // ---------------------------------------------------------------------------
  // Action-Handler (aus BlockButton / handleBlockAction in [slug].vue)
  // ---------------------------------------------------------------------------

  /**
   * Verarbeitet eine Block-Aktion.
   *
   * @param action  - Aktions-Bezeichner ('next' | 'submit' | 'external_url' | 'restart')
   * @param extras  - Optionale Zusatzdaten fuer external_url (rueckwaertskompatibel)
   * @param block   - Optionaler ausloesender Block fuer block.target-Auswertung (M3)
   */
  async function handleAction(
    action: string,
    extras?: { externalUrl?: string; openInNewTab?: boolean },
    block?: Block,
  ): Promise<void> {
    switch (action) {
      case 'next':
        await next(block)
        break
      case 'submit':
        await submitLead()
        break
      case 'external_url': {
        // Nur http/https erlauben – blockiert javascript:, data:, vbscript: usw.
        const url = extras?.externalUrl
        if (url && import.meta.client && isSafeUrl(url)) {
          if (extras?.openInNewTab) {
            window.open(url, '_blank', 'noopener,noreferrer')
          }
          else {
            window.location.href = url
          }
        }
        break
      }
      case 'restart':
        reset()
        break
    }
  }

  // ---------------------------------------------------------------------------
  // OTP + Tracking-Consent (M4.10 / M4.11)
  // ---------------------------------------------------------------------------

  /**
   * Setzt den OTP-Verifikations-Token nach erfolgreichem otp/verify.
   * Wird von BlockOptinOtp aufgerufen.
   */
  function setOtpVerifiedToken(token: string): void {
    otpVerifiedToken.value = token
  }

  /**
   * Setzt den Tracking-Consent des Besuchers.
   * Wird vom ConsentBanner aufgerufen (true = akzeptiert, false = abgelehnt).
   */
  function setTrackingConsent(value: boolean): void {
    trackingConsent.value = value
  }

  // ---------------------------------------------------------------------------
  // A/B-Varianten-Swap (M3.7)
  // ---------------------------------------------------------------------------

  /**
   * Tauscht die aktiven Steps gegen die Schritte der A/B-Variante aus.
   * Setzt den Renderer-Zustand zurueck (currentStepIndex = 0, answers = {}).
   *
   * Wird von [slug].vue aufgerufen, wenn useAbVariant eine Variante zuweist.
   * Der Swap geschieht reaktiv NACH der Hydration (kein Hydration-Mismatch).
   */
  function setActiveSteps(newSteps: Step[]): void {
    activeSteps.value = newSteps
    reset()
  }

  /**
   * Setzt die zugewiesene A/B-Varianten-UUID fuer Tracking und Lead-Submit.
   * Wird von [slug].vue aufgerufen, sobald useAbVariant.abVariantId verfuegbar ist.
   * Ab M5.6: id ist eine UUID-String statt Integer.
   */
  function setAbVariantId(id: string | null): void {
    internalAbVariantId.value = id
  }

  // ---------------------------------------------------------------------------
  // Expose
  // ---------------------------------------------------------------------------

  return {
    // State (readonly von aussen)
    sessionId,
    currentStepIndex,
    currentStep,
    answers,
    errors,
    isSubmitting,
    isSubmitted,
    submitError,
    rateLimitError,
    // M4: OTP + Consent + Double-Optin
    otpVerifiedToken,
    trackingConsent,
    doubleOptinPending,
    // Computed
    stepContext,
    questionSteps,
    answersByBlockId,
    visibleBlocksForCurrentStep,
    // Methoden
    getAnswerForBlock,
    updateAnswer,
    next,
    back,
    reset,
    validateCurrentStep,
    collectAnswers,
    submitLead,
    trackEvent,
    handleAction,
    // OTP + Tracking-Consent (M4)
    setOtpVerifiedToken,
    setTrackingConsent,
    // A/B-Varianten (M3.7)
    setActiveSteps,
    setAbVariantId,
  }
}

export type RendererState = ReturnType<typeof useRendererState>
