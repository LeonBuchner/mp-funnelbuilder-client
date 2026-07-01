/**
 * Unit-Tests fuer usePersonalization (app/composables/usePersonalization.ts).
 *
 * Geprueft:
 *   - resolveVar: Quelle url_param, utm_param, answer; Fallback bei fehlendem Wert
 *   - interpolate: bekannte Keys ersetzen, unbekannte Keys unveraendert lassen
 *   - HTML-Escaping: XSS-Vektoren werden im htmlContext escaped
 *   - Rich-Text-Kontext: erlaubtes Markup im Autoren-HTML bleibt erhalten,
 *     Variablenwert wird escaped
 *   - Hydration-Sicherheit: vor onMounted (urlParams null) gibt es Fallback
 *
 * Hinweis: onMounted wird im Test-Kontext (kein Vue-Komponenten-Context) nicht
 * ausgefuehrt. urlParams.value bleibt null und wird in den Tests manuell gesetzt.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { usePersonalization } from '../../app/composables/usePersonalization'
import type { PersonalizationVar } from '../../app/types/funnel'

// ---------------------------------------------------------------------------
// Testdaten-Factories
// ---------------------------------------------------------------------------

function makeUrlVar(key: string, paramName: string, fallback?: string): PersonalizationVar {
  return { key, source: 'url_param', paramName, fallback }
}

function makeUtmVar(key: string, paramName: string, fallback?: string): PersonalizationVar {
  return { key, source: 'utm_param', paramName, fallback }
}

function makeAnswerVar(key: string, sourceBlockId: string, fallback?: string): PersonalizationVar {
  return { key, source: 'answer', sourceBlockId, fallback }
}

// ---------------------------------------------------------------------------
// Tests: resolveVar
// ---------------------------------------------------------------------------

describe('usePersonalization – resolveVar', () => {
  it('url_param: gibt den URL-Parameter-Wert zurueck', () => {
    const p = usePersonalization()
    p.urlParams.value = { vorname: 'Max' }

    const varDef = makeUrlVar('vorname', 'vorname')
    expect(p.resolveVar(varDef, {})).toBe('Max')
  })

  it('url_param: gibt den Fallback zurueck wenn Parameter fehlt', () => {
    const p = usePersonalization()
    p.urlParams.value = {}

    const varDef = makeUrlVar('vorname', 'vorname', 'Gast')
    expect(p.resolveVar(varDef, {})).toBe('Gast')
  })

  it('url_param: gibt leeren String zurueck wenn Parameter fehlt und kein Fallback', () => {
    const p = usePersonalization()
    p.urlParams.value = {}

    const varDef = makeUrlVar('vorname', 'vorname')
    expect(p.resolveVar(varDef, {})).toBe('')
  })

  it('utm_param: gibt UTM-Parameter-Wert zurueck', () => {
    const p = usePersonalization()
    p.urlParams.value = { utm_source: 'google', utm_medium: 'cpc' }

    const varDef = makeUtmVar('quelle', 'utm_source')
    expect(p.resolveVar(varDef, {})).toBe('google')
  })

  it('utm_param: gibt Fallback zurueck wenn UTM-Parameter fehlt', () => {
    const p = usePersonalization()
    p.urlParams.value = {}

    const varDef = makeUtmVar('quelle', 'utm_source', 'organisch')
    expect(p.resolveVar(varDef, {})).toBe('organisch')
  })

  it('answer: gibt Antwort aus answersByBlockId zurueck', () => {
    const p = usePersonalization()
    const blockId = 'block-uuid-001'
    const answers = { [blockId]: 'Berlin' }

    const varDef = makeAnswerVar('stadt', blockId)
    expect(p.resolveVar(varDef, answers)).toBe('Berlin')
  })

  it('answer: konvertiert Boolean-Antwort in String', () => {
    const p = usePersonalization()
    const blockId = 'block-uuid-002'
    const answers = { [blockId]: true }

    const varDef = makeAnswerVar('zustimmung', blockId)
    expect(p.resolveVar(varDef, answers)).toBe('true')
  })

  it('answer: gibt Fallback zurueck wenn Block-ID nicht in Antworten', () => {
    const p = usePersonalization()
    const varDef = makeAnswerVar('stadt', 'unbekannte-block-id', 'Unbekannt')
    expect(p.resolveVar(varDef, {})).toBe('Unbekannt')
  })

  it('answer: gibt leeren String zurueck wenn keine Antwort und kein Fallback', () => {
    const p = usePersonalization()
    const varDef = makeAnswerVar('stadt', 'block-id-xyz')
    expect(p.resolveVar(varDef, {})).toBe('')
  })

  it('gibt Fallback zurueck wenn urlParams noch null ist (vor onMounted)', () => {
    const p = usePersonalization()
    // urlParams.value ist null (onMounted wird im Test-Kontext nicht ausgefuehrt)
    expect(p.urlParams.value).toBeNull()

    const varDef = makeUrlVar('vorname', 'vorname', 'Gast')
    expect(p.resolveVar(varDef, {})).toBe('Gast')
  })
})

// ---------------------------------------------------------------------------
// Tests: interpolate – bekannte und unbekannte Keys
// ---------------------------------------------------------------------------

describe('usePersonalization – interpolate: Key-Matching', () => {
  let p: ReturnType<typeof usePersonalization>

  beforeEach(() => {
    p = usePersonalization()
    p.urlParams.value = { vorname: 'Max', ort: 'Berlin' }
  })

  it('ersetzt einen bekannten Platzhalter', () => {
    const vars = [makeUrlVar('vorname', 'vorname')]
    const result = p.interpolate('Hallo {{vorname}}!', vars, {})
    expect(result).toBe('Hallo Max!')
  })

  it('ersetzt mehrere bekannte Platzhalter', () => {
    const vars = [makeUrlVar('vorname', 'vorname'), makeUrlVar('ort', 'ort')]
    const result = p.interpolate('{{vorname}} aus {{ort}}', vars, {})
    expect(result).toBe('Max aus Berlin')
  })

  it('laesst unbekannte Platzhalter unveraendert', () => {
    const vars = [makeUrlVar('vorname', 'vorname')]
    const result = p.interpolate('Hallo {{vorname}} und {{unbekannt}}!', vars, {})
    expect(result).toBe('Hallo Max und {{unbekannt}}!')
  })

  it('gibt den Text unveraendert zurueck wenn keine Variablen definiert', () => {
    const result = p.interpolate('Hallo {{vorname}}!', [], {})
    expect(result).toBe('Hallo {{vorname}}!')
  })

  it('gibt den Text unveraendert zurueck bei leerem String', () => {
    const vars = [makeUrlVar('vorname', 'vorname')]
    const result = p.interpolate('', vars, {})
    expect(result).toBe('')
  })

  it('ersetzt Platzhalter auch wenn Key Leerzeichen hat (Trimming)', () => {
    const vars = [makeUrlVar('vorname', 'vorname')]
    const result = p.interpolate('Hallo {{ vorname }}!', vars, {})
    expect(result).toBe('Hallo Max!')
  })

  it('setzt Fallback ein wenn URL-Parameter nicht vorhanden', () => {
    p.urlParams.value = {}
    const vars = [makeUrlVar('vorname', 'vorname', 'Freund')]
    const result = p.interpolate('Hallo {{vorname}}!', vars, {})
    expect(result).toBe('Hallo Freund!')
  })
})

// ---------------------------------------------------------------------------
// Tests: interpolate – HTML-Escaping (XSS-Schutz)
// ---------------------------------------------------------------------------

describe('usePersonalization – interpolate: HTML-Escaping in htmlContext', () => {
  let p: ReturnType<typeof usePersonalization>

  beforeEach(() => {
    p = usePersonalization()
  })

  it('escaped < > & " \' im Ersatzwert (htmlContext=true)', () => {
    p.urlParams.value = { name: '<b>Hallo</b>' }
    const vars = [makeUrlVar('name', 'name')]
    const result = p.interpolate('{{name}}', vars, {}, { htmlContext: true })
    expect(result).toBe('&lt;b&gt;Hallo&lt;/b&gt;')
    expect(result).not.toContain('<b>')
  })

  it('XSS-Vektor: <img onerror=alert(1)> wird escaped (kein aktives Tag)', () => {
    p.urlParams.value = { vorname: '<img src=x onerror=alert(1)>' }
    const vars = [makeUrlVar('vorname', 'vorname')]
    const result = p.interpolate('<p>Hallo {{vorname}}</p>', vars, {}, { htmlContext: true })
    // Kein aktives <img>-Tag: < ist zu &lt; escapt
    expect(result).not.toContain('<img')
    // &lt;img ist vorhanden (escaped Darstellung)
    expect(result).toContain('&lt;img')
    expect(result).toContain('&gt;')
    // Gesamtergebnis: erlaubtes Autoren-Markup bleibt, Wert ist vollstaendig escaped
    expect(result).toBe('<p>Hallo &lt;img src=x onerror=alert(1)&gt;</p>')
  })

  it('XSS-Vektor: <script>...</script> wird escaped', () => {
    p.urlParams.value = { name: '<script>alert("xss")</script>' }
    const vars = [makeUrlVar('name', 'name')]
    const result = p.interpolate('{{name}}', vars, {}, { htmlContext: true })
    expect(result).not.toContain('<script')
    expect(result).toContain('&lt;script&gt;')
  })

  it('XSS-Vektor: javascript:-URL wird escaped', () => {
    p.urlParams.value = { link: 'javascript:alert(1)' }
    const vars = [makeUrlVar('link', 'link')]
    const result = p.interpolate('{{link}}', vars, {}, { htmlContext: true })
    // javascript: enthaelt kein HTML-Zeichen, aber kein Tag-Markup
    expect(result).toBe('javascript:alert(1)')
    expect(result).not.toContain('<')
  })

  it('Ampersand & wird zu &amp;', () => {
    p.urlParams.value = { firma: 'Meier & Sohn' }
    const vars = [makeUrlVar('firma', 'firma')]
    const result = p.interpolate('{{firma}}', vars, {}, { htmlContext: true })
    expect(result).toBe('Meier &amp; Sohn')
  })

  it('Anführungszeichen " werden zu &quot;', () => {
    p.urlParams.value = { zitat: '"Hallo"' }
    const vars = [makeUrlVar('zitat', 'zitat')]
    const result = p.interpolate('{{zitat}}', vars, {}, { htmlContext: true })
    expect(result).toBe('&quot;Hallo&quot;')
  })

  it('htmlContext=false lasst Wert roh (Vue-Template-Engine codiert selbst)', () => {
    p.urlParams.value = { name: '<Max>' }
    const vars = [makeUrlVar('name', 'name')]
    // Kein htmlContext -> kein Escaping -> fuer {{ }}-Template-Kontext korrekt
    const result = p.interpolate('{{name}}', vars, {}, { htmlContext: false })
    expect(result).toBe('<Max>')
  })
})

// ---------------------------------------------------------------------------
// Tests: interpolate auf sanitisiertem Rich-Text
// ---------------------------------------------------------------------------

describe('usePersonalization – interpolate auf sanitisiertem Rich-Text', () => {
  it('erlaubtes HTML-Markup im Autoren-Inhalt bleibt erhalten', () => {
    const p = usePersonalization()
    p.urlParams.value = { name: 'Max' }
    const vars = [makeUrlVar('name', 'name')]

    const sanitizedHtml = '<p><strong>Hallo</strong> {{name}}, willkommen!</p>'
    const result = p.interpolate(sanitizedHtml, vars, {}, { htmlContext: true })

    // Bestehende Tags bleiben unveraendert
    expect(result).toContain('<p>')
    expect(result).toContain('<strong>Hallo</strong>')
    expect(result).toBe('<p><strong>Hallo</strong> Max, willkommen!</p>')
  })

  it('Link-Tag bleibt erhalten, Variablenwert im Text wird escaped', () => {
    const p = usePersonalization()
    p.urlParams.value = { name: '<Evil>' }
    const vars = [makeUrlVar('name', 'name')]

    const sanitizedHtml = '<p>Hallo {{name}}, sieh <a href="https://example.com" rel="noopener noreferrer">hier</a> nach.</p>'
    const result = p.interpolate(sanitizedHtml, vars, {}, { htmlContext: true })

    expect(result).toContain('<a href="https://example.com"')
    expect(result).toContain('&lt;Evil&gt;')
    expect(result).not.toContain('<Evil>')
  })

  it('Platzhalter im Autoren-HTML bleibt unveraendert wenn Key nicht registriert', () => {
    const p = usePersonalization()
    p.urlParams.value = { name: 'Max' }
    const vars: PersonalizationVar[] = [] // Keine Variablen registriert

    const result = p.interpolate('<p>Hallo {{name}}!</p>', vars, {}, { htmlContext: true })
    expect(result).toBe('<p>Hallo {{name}}!</p>')
  })
})

// ---------------------------------------------------------------------------
// Tests: answer-Quelle mit answersByBlockId
// ---------------------------------------------------------------------------

describe('usePersonalization – answer-Quelle', () => {
  it('ersetzt Platzhalter mit Antwort aus answersByBlockId', () => {
    const p = usePersonalization()
    const blockId = 'uuid-block-001'
    const answers = { [blockId]: 'Muenchen' }
    const vars = [makeAnswerVar('stadt', blockId)]

    const result = p.interpolate('Ich wohne in {{stadt}}.', vars, answers)
    expect(result).toBe('Ich wohne in Muenchen.')
  })

  it('escaped Antwort-Wert im htmlContext', () => {
    const p = usePersonalization()
    const blockId = 'uuid-block-002'
    const answers = { [blockId]: '<script>alert(1)</script>' }
    const vars = [makeAnswerVar('antwort', blockId)]

    const result = p.interpolate('<p>{{antwort}}</p>', vars, answers, { htmlContext: true })
    expect(result).not.toContain('<script>')
    expect(result).toContain('&lt;script&gt;')
  })
})
