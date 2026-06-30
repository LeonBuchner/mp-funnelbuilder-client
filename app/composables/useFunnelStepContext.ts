/**
 * Kontext für den aktuellen Funnel-Step.
 *
 * Wird per provide() in Canvas.vue (Editor) und im öffentlichen Renderer
 * bereitgestellt, damit Block-Komponenten (z.B. BlockProgress) automatisch
 * die korrekte Schritt-Nummer ermitteln können, ohne dass Eltern-Komponenten
 * currentStep/totalSteps manuell an jeden Block übergeben müssen.
 *
 * Verwendung:
 *   Provider (Canvas.vue / Renderer):
 *     provide(funnelStepContextKey, computed<FunnelStepContext>(() => ...))
 *
 *   Konsument (BlockProgress.vue u.a.):
 *     const stepCtx = useFunnelStepContext()  // null wenn kein Provider
 *
 * Zaehlung: Nur Steps vom Typ 'question' oder 'form' gelten als Frage-Steps.
 * Content-, Result- und Redirect-Steps haben questionNumber: null.
 */
import { inject } from 'vue'
import type { InjectionKey, ComputedRef } from 'vue'

export interface FunnelStepContext {
  /**
   * 1-basierte Position des aktuellen Steps unter allen Frage-/Form-Steps.
   * null, wenn der aktuelle Step kein Frage-Step ist (content, result, redirect).
   */
  questionNumber: number | null
  /** Gesamtzahl der Frage-/Form-Steps im Funnel. */
  totalQuestions: number
}

/**
 * InjectionKey für den Funnel-Step-Kontext.
 * Canvas.vue (Editor) und der öffentliche Renderer nutzen denselben Key.
 */
export const funnelStepContextKey: InjectionKey<ComputedRef<FunnelStepContext>> =
  Symbol('funnelStepContext')

/**
 * Gibt den reaktiven Step-Kontext zurück, falls er per provide() bereitgestellt wurde.
 * Gibt null zurück wenn kein Provider vorhanden ist (z.B. Standalone-Test, Storybook).
 */
export function useFunnelStepContext(): ComputedRef<FunnelStepContext> | null {
  return inject(funnelStepContextKey, null)
}
