/**
 * useLogicEngine: Reine Auswertungsfunktionen fuer die Logik-Engine des Renderers.
 *
 * Alle Funktionen sind pure (keine Seiteneffekte, kein Vue-State) und
 * direkt testbar. Antworten werden als Record<blockId, string|boolean>
 * uebergeben – die Indizierung nach Block-ID (statt fieldKey) erlaubt
 * schema-konforme Bedingungsauswertung ohne Zugriff auf den Step-Kontext.
 *
 * Operatoren folgen exakt dem JSON-Schema funnel-content-1.1.0.json.
 *
 * in_list-Semantik:
 *   condition.value ist eine Liste erlaubter Werte (Array oder kommaseparierter
 *   String). Die Antwort gilt als "in der Liste", wenn mindestens eine der
 *   gewaehlten Optionen enthalten ist. Multi-Choice-Antworten liegen als
 *   kommaseparierter String vor (z. B. "option_a,option_b"), single_choice
 *   als einfacher String (z. B. "option_a").
 */
import type {
  LogicCondition,
  LogicTarget,
  DisplayCondition,
  Step,
} from '~/types/funnel'

// ---------------------------------------------------------------------------
// Interne Hilfsfunktion
// ---------------------------------------------------------------------------

/**
 * Gemeinsame Operator-Auswertung fuer LogicCondition und DisplayCondition.
 * Kein Export – oeffentliche API sind die drei Funktionen unten.
 */
function evaluateOperator(
  operator: string,
  rawAnswer: string | boolean | undefined,
  condValue: unknown,
): boolean {
  // Operatoren ohne Vergleichswert
  if (operator === 'is_answered') {
    if (rawAnswer === undefined || rawAnswer === null) return false
    if (typeof rawAnswer === 'boolean') return rawAnswer === true
    return rawAnswer.trim() !== ''
  }

  if (operator === 'is_empty') {
    if (rawAnswer === undefined || rawAnswer === null) return true
    if (typeof rawAnswer === 'boolean') return rawAnswer === false
    return rawAnswer.trim() === ''
  }

  // Antwort als String normalisieren fuer alle verbleibenden Operatoren
  const answerStr: string
    = rawAnswer === undefined || rawAnswer === null
      ? ''
      : String(rawAnswer)

  switch (operator) {
    case 'equals':
      return answerStr === String(condValue ?? '')

    case 'not_equals':
      return answerStr !== String(condValue ?? '')

    case 'contains':
      return answerStr.includes(String(condValue ?? ''))

    case 'greater_than': {
      // Kein oder leerer Wert: kein numerischer Vergleich moeglich
      if (answerStr.trim() === '') return false
      const num = Number(answerStr)
      const condNum = Number(condValue)
      if (Number.isNaN(num) || Number.isNaN(condNum)) return false
      return num > condNum
    }

    case 'less_than': {
      // Kein oder leerer Wert: kein numerischer Vergleich moeglich
      if (answerStr.trim() === '') return false
      const num = Number(answerStr)
      const condNum = Number(condValue)
      if (Number.isNaN(num) || Number.isNaN(condNum)) return false
      return num < condNum
    }

    case 'in_list': {
      // Liste normalisieren: Array oder kommaseparierter String
      let list: string[]
      if (Array.isArray(condValue)) {
        list = condValue.map(v => String(v))
      }
      else if (typeof condValue === 'string') {
        list = condValue.split(',').map(v => v.trim()).filter(Boolean)
      }
      else {
        return false
      }

      if (list.length === 0) return false

      // Multi-Choice: Antwort kann kommasepariert sein – eine Uebereinstimmung reicht
      const selectedValues = answerStr
        .split(',')
        .map(v => v.trim())
        .filter(Boolean)

      if (selectedValues.length === 0) return false
      return selectedValues.some(v => list.includes(v))
    }

    default:
      return false
  }
}

// ---------------------------------------------------------------------------
// Oeffentliche API
// ---------------------------------------------------------------------------

/**
 * Wertet eine einzelne Logik-Bedingung aus.
 *
 * @param condition - Die Bedingung (blockId, operator, value?)
 * @param answers   - Antworten nach Block-ID indiziert
 */
export function evaluateCondition(
  condition: LogicCondition,
  answers: Record<string, string | boolean>,
): boolean {
  return evaluateOperator(condition.operator, answers[condition.blockId], condition.value)
}

/**
 * Wertet alle Logik-Regeln eines Steps aus.
 * Gibt das Ziel der ersten zutreffenden Regel zurueck, sonst null.
 *
 * Reihenfolge: Regeln werden sequenziell geprueft; die erste passende
 * Regel bestimmt das Sprungziel (Short-Circuit).
 *
 * @param step    - Step mit seinen logicRules
 * @param answers - Antworten nach Block-ID indiziert
 */
export function evaluateLogicRules(
  step: Step,
  answers: Record<string, string | boolean>,
): LogicTarget | null {
  for (const rule of step.logicRules) {
    const { operator, conditions, target } = rule

    // Regel ohne Bedingungen ueberspringen (Schema: minItems 1, aber defensiv)
    if (conditions.length === 0) continue

    const ruleMatches: boolean
      = operator === 'AND'
        ? conditions.every(c => evaluateCondition(c, answers))
        : conditions.some(c => evaluateCondition(c, answers))

    if (ruleMatches) {
      return target
    }
  }

  return null
}

/**
 * Wertet die Display-Conditions eines Blocks aus.
 *
 * Semantik:
 *   - undefined / leeres Array -> Block ist sichtbar (true)
 *   - Mehrere Conditions: implizites AND, alle muessen zutreffen
 *
 * Deterministisch mit leerem answers-Objekt (SSR-sicher): Bedingungen
 * wie is_answered geben bei leeren Antworten stets false zurueck, der
 * Block wird folgerichtig auf SSR und Client identisch ausgeblendet.
 *
 * @param conditions - Display-Conditions des Blocks (oder undefined)
 * @param answers    - Antworten nach Block-ID indiziert
 */
export function evaluateDisplayConditions(
  conditions: DisplayCondition[] | undefined,
  answers: Record<string, string | boolean>,
): boolean {
  if (!conditions || conditions.length === 0) return true
  return conditions.every(c =>
    evaluateOperator(c.operator, answers[c.blockId], c.value),
  )
}
