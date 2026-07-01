/**
 * usePersonalizationContext – Injection-Key und Consumer-Composable
 * fuer den Personalisierungs-Kontext.
 *
 * Provider ([slug].vue):
 *   import { personalizationKey } from '~/composables/usePersonalizationContext'
 *   provide(personalizationKey, { interpolateText, interpolateHtml })
 *
 * Consumer (BlockText.vue, BlockButton.vue, BlockImage.vue):
 *   const pCtx = usePersonalizationContext()  // auto-importiert
 *   // pCtx ist null wenn kein Provider vorhanden (Editor-Modus, Tests)
 *
 * Nur der oeffentliche Renderer ([slug].vue) stellt den Kontext bereit.
 * Im Editor-Modus (Canvas.vue) wird kein Kontext bereitgestellt,
 * sodass die Bloecke im Editor rohe {{Platzhalter}} anzeigen.
 */
import { inject } from 'vue'
import type { InjectionKey } from 'vue'

/** Schnittstelle fuer den injizierten Personalisierungs-Kontext. */
export interface PersonalizationCtx {
  /**
   * Interpoliert Platzhalter in einem Klartext-String.
   * Kein HTML-Escaping (Vue-Template-Engine uebernimmt das bei {{ }} und :attr).
   */
  interpolateText: (text: string) => string
  /**
   * Interpoliert Platzhalter in einem HTML-String (fuer v-html).
   * Ersatzwerte werden HTML-escaped, damit kein Markup oder Script injiziert werden kann.
   */
  interpolateHtml: (text: string) => string
}

/**
 * Injection-Key fuer den Personalisierungs-Kontext.
 * Gibt undefined zurueck wenn kein Provider vorhanden ist (Editor, Tests).
 */
export const personalizationKey: InjectionKey<PersonalizationCtx> = Symbol('personalization')

/**
 * Gibt den Personalisierungs-Kontext zurueck, falls er per provide() bereitgestellt wurde.
 * Gibt null zurueck wenn kein Provider vorhanden ist (Editor-Modus, Standalone-Test).
 */
export function usePersonalizationContext(): PersonalizationCtx | null {
  return inject(personalizationKey, null)
}
