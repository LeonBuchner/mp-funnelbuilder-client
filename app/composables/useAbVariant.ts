/**
 * useAbVariant – A/B-Varianten-Zuweisung fuer den oeffentlichen Funnel-Renderer.
 *
 * Ablauf (CLIENT-ONLY, nach onMounted):
 *   1. Liest vorhandene Varianten-ID aus Session-Cookie mp_ab_{hash}.
 *   2. POST /api/public/f/{hash}/ab-assign mit session_id und existing_variant_id.
 *   3. 204 No Content -> kein laufender A/B-Test -> Standard-Content bleibt.
 *   4. 200 -> Cookie setzen (Sticky-Mechanismus), abVariantId und abContent setzen.
 *      abContent laeuft durch dieselbe sanitizeFunnelContent-Pipeline wie der
 *      Standard-Content, damit HTML-Felder sicher gerendert werden.
 *
 * SSR/Hydration-Sicherheit:
 *   - onMounted (Client-only): waehrend SSR und Hydration sind abVariantId null
 *     und abContent null -> keine Divergenz zwischen SSR und erstem Client-Render.
 *   - Der Content-Swap geschieht reaktiv NACH der Hydration: ein erlaubtes
 *     Client-Update, kein Hydration-Mismatch.
 *
 * Cookie (Leon-Entscheid):
 *   - Name: mp_ab_{hash}
 *   - Session-Cookie (kein expires/maxAge -> endet beim Browser-Schliessen).
 *   - SameSite=Lax, path=/ (kein httpOnly: clientseitiger Zugriff noetig).
 *   - Kein Consent erforderlich (kein PII, nur numerische Varianten-ID).
 *
 * Testbarkeit:
 *   - readAbCookie / writeAbCookie sind als reine Funktionen exportiert.
 *   - Das Composable ist testbar ueber mountSuspended oder direkte Funktionsaufrufe.
 */
import { ref, onMounted } from 'vue'
import type { Ref } from 'vue'
import { usePublicApi } from '~/composables/usePublicApi'
import { sanitizeContent } from '~/utils/sanitizeFunnelContent'
import type { FunnelContent } from '~/types/funnel'
import type { AbAssignBody, AbAssignResponse } from '~/types/public-funnel'

// ---------------------------------------------------------------------------
// Cookie-Hilfsfunktionen (exportiert fuer Unit-Tests)
// ---------------------------------------------------------------------------

/** Regex-Sonderzeichen fuer Cookie-Namen escapen (z. B. Punkte im Hash). */
const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g

/**
 * Liest den A/B-Session-Cookie fuer einen bestimmten Funnel-Hash.
 * Gibt null zurueck wenn kein Cookie gesetzt ist oder der Wert ungueltig ist.
 *
 * Nur clientseitig verfuegbar (document existiert nicht im SSR-Kontext).
 */
export function readAbCookie(hash: string): number | null {
  if (typeof document === 'undefined') return null
  const name = `mp_ab_${hash}`
  const escaped = name.replace(REGEX_SPECIAL, '\\$&')
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`))
  if (!match) return null
  const parsed = parseInt(match[1] ?? '', 10)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Setzt den A/B-Session-Cookie fuer einen bestimmten Funnel-Hash.
 * Session-Cookie: kein expires/maxAge -> endet beim Schliessen des Browsers.
 * SameSite=Lax verhindert Cross-Site-Angriffe.
 *
 * Nur clientseitig verfuegbar (document existiert nicht im SSR-Kontext).
 */
export function writeAbCookie(hash: string, variantId: number): void {
  if (typeof document === 'undefined') return
  const name = `mp_ab_${hash}`
  // Kein expires/maxAge: Session-Cookie gemaess Leon-Entscheid
  document.cookie = `${name}=${variantId}; path=/; SameSite=Lax`
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

/**
 * Weist dem Renderer eine A/B-Variante zu (clientseitig, nach onMounted).
 *
 * @param hash         - public_id / UUID des Funnels (entspricht {hash} im API-Pfad)
 * @param sessionIdRef - session_id aus useRendererState (Ref, nach onMounted gesetzt)
 */
export function useAbVariant(hash: string, sessionIdRef: Ref<string>) {
  const api = usePublicApi()

  /**
   * Zugewiesene Varianten-ID (null = kein A/B-Test oder noch nicht aufgeloest).
   * Bleibt null waehrend SSR und Hydration -> kein Hydration-Mismatch.
   */
  const abVariantId = ref<number | null>(null)

  /**
   * Content der zugewiesenen Variante (null = Standard-Content verwenden).
   * Wird durch dieselbe sanitize-Pipeline wie der Standard-Content geleitet.
   */
  const abContent = ref<FunnelContent | null>(null)

  /** Zeigt an, ob die A/B-Zuweisung gerade laeuft. */
  const isResolving = ref<boolean>(false)

  onMounted(async () => {
    /**
     * Reihenfolge der onMounted-Hooks ist garantiert:
     * useRendererState.onMounted (setzt sessionId) laeuft BEVOR useAbVariant.onMounted,
     * da useRendererState vor useAbVariant in [slug].vue registriert wird.
     * Daher ist sessionIdRef.value beim Aufruf bereits gesetzt.
     */
    isResolving.value = true
    try {
      const existing = readAbCookie(hash)

      const body: AbAssignBody = {
        session_id: sessionIdRef.value,
        ...(existing !== null ? { existing_variant_id: existing } : {}),
      }

      /**
       * $fetch gibt bei 204 No Content undefined/null zurueck (kein Fehler).
       * Bei 200 enthaelt die Antwort ab_variant_id und funnel_version.
       * Bei Fehler (4xx/5xx) faengt der catch-Block ab.
       */
      const response = await api<AbAssignResponse | null>(`/f/${hash}/ab-assign`, {
        method: 'POST',
        body,
      })

      if (!response) {
        // 204 No Content: kein laufender A/B-Test -> Standard-Content bleibt
        return
      }

      // 200: Variante zugewiesen
      abVariantId.value = response.ab_variant_id

      // Cookie setzen fuer Sticky-Mechanismus (bereits vorhandener Cookie wird ueberschrieben,
      // falls das Backend eine andere Variante als die gespeicherte zugewiesen hat)
      writeAbCookie(hash, response.ab_variant_id)

      // Varianten-Content durch dieselbe Sanitize-Pipeline wie Standard-Content schicken,
      // damit HTML-Felder (text, optin_checkbox, choice-Labels) bereinigt werden
      abContent.value = sanitizeContent(response.funnel_version.content)
    }
    catch {
      // A/B-Fehler stoeren den Funnel-Renderer nicht: Standard-Content bleibt aktiv
    }
    finally {
      isResolving.value = false
    }
  })

  return {
    /** Zugewiesene Varianten-ID (null = kein A/B-Test). */
    abVariantId,
    /** Bereinigter Content der Variante (null = Standard-Content verwenden). */
    abContent,
    /** True waehrend des API-Aufrufs. Nuetzlich fuer optionalen Ladezustand. */
    isResolving,
  }
}
