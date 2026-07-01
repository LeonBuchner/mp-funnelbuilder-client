/**
 * usePersonalization – Personalisierungs-Engine fuer den Funnel-Renderer.
 *
 * Liest URL-Parameter clientseitig (onMounted) und stellt resolveVar / interpolate
 * bereit. Entworfen fuer SSR-Sicherheit: urlParams.value ist bis zum Mount null,
 * sodass SSR und initialer Client-Render identisch rendern (Fallback-Werte) und
 * kein Hydration-Mismatch entsteht.
 *
 * Unbekannte {{key}}-Platzhalter werden unveraendert in der Ausgabe belassen,
 * damit Autoren sie leicht im Browser sehen und debuggen koennen.
 *
 * Escaping-Reihenfolge fuer BlockText (v-html):
 *   1. block.content wird beim Laden per sanitizeFunnelContent bereinigt.
 *   2. interpolate() laeuft danach auf dem bereits bereinigten HTML.
 *   3. Der Ersatzwert wird HTML-escaped, bevor er eingesetzt wird.
 *   -> Weder Autoren-Inhalt noch Variablenwert kann Script einschleusen.
 */
import { ref, onMounted } from 'vue'
import type { PersonalizationVar } from '~/types/funnel'

// ---------------------------------------------------------------------------
// Hilfsfunktionen (modul-lokal, nicht exportiert)
// ---------------------------------------------------------------------------

/**
 * HTML-Escaping fuer Variablenwerte in v-html-Kontexten.
 * Wandelt die fuenf kritischen HTML-Sonderzeichen in ihre Entity-Aequivalente um.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Parst einen Query-String in ein Record<string, string>.
 * Erster Wert gewinnt bei Mehrfachparametern (URLSearchParams-Standard).
 * Wirft nie; gibt leeres Objekt zurueck bei Fehlern.
 */
function parseUrlParams(search: string): Record<string, string> {
  const params: Record<string, string> = {}
  try {
    new URLSearchParams(search).forEach((value, key) => {
      if (!(key in params)) {
        params[key] = value
      }
    })
  }
  catch {
    // Ungueltiger Query-String -> leeres Objekt
  }
  return params
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function usePersonalization() {
  /**
   * URL-Parameter (null bis onMounted, SSR-sicher).
   *
   * - Server-Render: null -> resolveVar gibt Fallback zurueck
   * - Erster Client-Render (Hydration): ebenfalls null -> selbe Ausgabe wie SSR
   * - Nach onMounted: echte URL-Params -> Vue reaktiv -> Bloecke aktualisieren sich
   *
   * Dieses Muster entspricht dem sessionId-Ansatz in useRendererState und
   * verhindert Hydration-Mismatches.
   */
  const urlParams = ref<Record<string, string> | null>(null)

  onMounted(() => {
    urlParams.value = parseUrlParams(window.location.search)
  })

  /**
   * Loest eine einzelne Personalisierungs-Variable auf.
   *
   * @param varDef          - Definition der Variable (Quelle, paramName, sourceBlockId, fallback)
   * @param answersByBlockId - Aktuelle Antworten nach Block-ID (aus useRendererState)
   * @returns Aufgeloester String-Wert oder Fallback oder ''
   */
  function resolveVar(
    varDef: PersonalizationVar,
    answersByBlockId: Record<string, string | boolean>,
  ): string {
    // Vor onMounted ist urlParams null -> effektiv keine URL-Params verfuegbar
    const params = urlParams.value ?? {}

    switch (varDef.source) {
      case 'url_param':
      case 'utm_param': {
        const paramName = varDef.paramName ?? ''
        const val = params[paramName]
        return val !== undefined ? val : (varDef.fallback ?? '')
      }
      case 'answer': {
        const blockId = varDef.sourceBlockId
        if (!blockId) return varDef.fallback ?? ''
        const val = answersByBlockId[blockId]
        if (val === undefined || val === null) return varDef.fallback ?? ''
        return String(val)
      }
    }
  }

  /**
   * Ersetzt alle {{key}}-Platzhalter in einem Text durch aufgeloeste Werte.
   *
   * Sicherheitsregeln:
   *   - Nur registrierte Keys (in vars definiert) werden ersetzt.
   *   - Unbekannte {{key}} bleiben unveraendert (fuer Autoren sichtbar, kein stilles Loeschen).
   *   - htmlContext=true: Ersatzwert wird HTML-escaped (fuer v-html, verhindert XSS).
   *   - htmlContext=false (Standard): Rohwert (fuer Text-Kontexte, Vue-Template-Engine
   *     encodiert bei {{ }}-Interpolation automatisch).
   *
   * @param text            - Eingabe-Text oder bereinigtes HTML
   * @param vars            - Registrierte Personalisierungs-Variablen
   * @param answersByBlockId - Aktuelle Antworten nach Block-ID
   * @param opts            - { htmlContext: true } fuer v-html-Kontexte
   */
  function interpolate(
    text: string,
    vars: PersonalizationVar[],
    answersByBlockId: Record<string, string | boolean>,
    opts?: { htmlContext?: boolean },
  ): string {
    if (!text || !vars.length) return text

    return text.replace(/\{\{([^}]+)\}\}/g, (match, rawKey: string) => {
      const key = rawKey.trim()
      const varDef = vars.find(v => v.key === key)
      if (!varDef) return match // Unbekannter Key -> unveraendert lassen
      const value = resolveVar(varDef, answersByBlockId)
      return opts?.htmlContext === true ? escapeHtml(value) : value
    })
  }

  return {
    /** URL-Parameter-Map (null vor onMounted). Fuer Tests direkt setzbar. */
    urlParams,
    resolveVar,
    interpolate,
  }
}

export type PersonalizationInstance = ReturnType<typeof usePersonalization>
