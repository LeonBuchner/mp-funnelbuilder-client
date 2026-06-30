/**
 * Tests fuer sanitizeHtml (app/utils/sanitizeHtml.ts).
 *
 * Prueft:
 *  - XSS-Vektoren werden entfernt (script, onerror, onclick usw.)
 *  - Erlaubte Tags bleiben erhalten (p, strong, em, u, a, ul/ol/li, h2/h3)
 *  - Verbotene Tags werden gestripped (img ausserhalb Allowlist, iframe, object)
 *  - rel="noopener noreferrer" wird automatisch auf <a>-Tags gesetzt
 */
import { describe, it, expect } from 'vitest'
import { sanitizeHtml } from '../../app/utils/sanitizeHtml'

describe('sanitizeHtml – XSS-Bereinigung', () => {
  it('entfernt <script>-Tags komplett', () => {
    const result = sanitizeHtml('<script>alert(1)</script>')
    expect(result).toBe('')
    expect(result).not.toContain('script')
    expect(result).not.toContain('alert')
  })

  it('entfernt <script> auch wenn anderer Inhalt vorhanden', () => {
    const result = sanitizeHtml('<p>Text</p><script>alert(1)</script>')
    expect(result).toContain('<p>Text</p>')
    expect(result).not.toContain('script')
  })

  it('entfernt onerror-Attribut von <img>', () => {
    const result = sanitizeHtml('<img onerror="alert(1)" src="x">')
    // img ist nicht in der Allowlist, daher wird das Tag komplett entfernt
    expect(result).not.toContain('onerror')
    expect(result).not.toContain('alert')
  })

  it('entfernt onclick von <a>', () => {
    const result = sanitizeHtml('<a href="https://x.de" onclick="alert(1)">Link</a>')
    expect(result).not.toContain('onclick')
    expect(result).toContain('href')
    expect(result).toContain('Link')
  })

  it('entfernt <iframe>', () => {
    const result = sanitizeHtml('<iframe src="https://evil.com"></iframe>')
    expect(result).not.toContain('iframe')
  })

  it('entfernt <object>', () => {
    const result = sanitizeHtml('<object data="evil.swf"></object>')
    expect(result).not.toContain('object')
  })

  it('entfernt style-Attribute (kein globales Styling per Inhalt)', () => {
    const result = sanitizeHtml('<p style="color:red">Text</p>')
    expect(result).not.toContain('style')
    expect(result).toContain('<p>')
    expect(result).toContain('Text')
  })
})

describe('sanitizeHtml – erlaubte Tags und Attribute', () => {
  it('behaelt <p><strong> erhalten', () => {
    const result = sanitizeHtml('<p><strong>Hallo Welt</strong></p>')
    expect(result).toBe('<p><strong>Hallo Welt</strong></p>')
  })

  it('behaelt <em> und <u> erhalten', () => {
    const result = sanitizeHtml('<p><em>kursiv</em> und <u>unterstrichen</u></p>')
    expect(result).toContain('<em>kursiv</em>')
    expect(result).toContain('<u>unterstrichen</u>')
  })

  it('behaelt <a href> erhalten und setzt rel=noopener', () => {
    const result = sanitizeHtml('<a href="https://example.com">Link</a>')
    expect(result).toContain('href="https://example.com"')
    expect(result).toContain('rel="noopener noreferrer"')
    expect(result).toContain('>Link</a>')
  })

  it('setzt rel=noopener auch wenn rel bereits gesetzt war', () => {
    const result = sanitizeHtml('<a href="https://x.de" rel="nofollow">X</a>')
    expect(result).toContain('rel="noopener noreferrer"')
  })

  it('behaelt <ul>/<ol>/<li> erhalten', () => {
    const result = sanitizeHtml('<ul><li>Eins</li><li>Zwei</li></ul>')
    expect(result).toContain('<ul>')
    expect(result).toContain('<li>Eins</li>')
  })

  it('behaelt <h2> und <h3> erhalten', () => {
    const result = sanitizeHtml('<h2>Ueberschrift</h2><h3>Unterueberschrift</h3>')
    expect(result).toContain('<h2>Ueberschrift</h2>')
    expect(result).toContain('<h3>Unterueberschrift</h3>')
  })

  it('behaelt <br> erhalten', () => {
    const result = sanitizeHtml('<p>Zeile 1<br>Zeile 2</p>')
    expect(result).toContain('<br>')
  })
})

describe('sanitizeHtml – verbotene Tags', () => {
  it('entfernt <h1> (nicht in Allowlist)', () => {
    const result = sanitizeHtml('<h1>Grosse Ueberschrift</h1>')
    // Tag wird gestripped, Text bleibt
    expect(result).not.toContain('<h1>')
    expect(result).toContain('Grosse Ueberschrift')
  })

  it('entfernt <div> (nicht in Allowlist)', () => {
    const result = sanitizeHtml('<div class="wrapper">Inhalt</div>')
    expect(result).not.toContain('<div')
    expect(result).toContain('Inhalt')
  })

  it('leerer String bleibt leer', () => {
    expect(sanitizeHtml('')).toBe('')
  })

  it('reiner Text ohne Tags bleibt unveraendert', () => {
    expect(sanitizeHtml('Hallo Welt')).toBe('Hallo Welt')
  })
})
