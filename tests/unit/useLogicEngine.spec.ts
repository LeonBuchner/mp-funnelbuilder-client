/**
 * Unit-Tests fuer useLogicEngine.
 *
 * Abgedeckte Pfade:
 *   - evaluateCondition: alle 8 Operatoren (je >= 1 Positiv + 1 Negativ),
 *     in_list fuer single_choice und multi_choice, Edge Cases (fehlende Antwort)
 *   - evaluateLogicRules: AND/OR-Verknuepfung, Regelreihenfolge, alle Ziel-Typen,
 *     leere Regel-Liste
 *   - evaluateDisplayConditions: kein Array -> sichtbar, Condition erfuellt/nicht
 *     erfuellt, mehrere Conditions als implizites AND
 */
import { describe, it, expect } from 'vitest'
import {
  evaluateCondition,
  evaluateLogicRules,
  evaluateDisplayConditions,
} from '../../app/composables/useLogicEngine'
import type { LogicCondition, LogicRule, DisplayCondition, Step } from '../../app/types/funnel'

// ---------------------------------------------------------------------------
// Test-Daten-Factories
// ---------------------------------------------------------------------------

function makeStep(rules: LogicRule[] = []): Step {
  return {
    id: 'step-1',
    type: 'question',
    internalTitle: 'Test',
    layout: 'single',
    blocks: [],
    logicRules: rules,
  }
}

function makeRule(
  operator: 'AND' | 'OR',
  conditions: LogicCondition[],
  target: LogicRule['target'],
): LogicRule {
  return {
    id: `rule-${Math.random()}`,
    operator,
    conditions,
    target,
  }
}

function cond(
  blockId: string,
  operator: LogicCondition['operator'],
  value?: unknown,
): LogicCondition {
  return value !== undefined
    ? { blockId, operator, value }
    : { blockId, operator }
}

// ---------------------------------------------------------------------------
// evaluateCondition
// ---------------------------------------------------------------------------

describe('evaluateCondition', () => {
  // --- equals ---
  it('equals - positiv: Antwort stimmt ueberein', () => {
    const condition = cond('b1', 'equals', 'berlin')
    expect(evaluateCondition(condition, { b1: 'berlin' })).toBe(true)
  })

  it('equals - negativ: Antwort stimmt nicht ueberein', () => {
    const condition = cond('b1', 'equals', 'berlin')
    expect(evaluateCondition(condition, { b1: 'hamburg' })).toBe(false)
  })

  it('equals - fehlende Antwort ergibt false', () => {
    const condition = cond('b1', 'equals', 'berlin')
    expect(evaluateCondition(condition, {})).toBe(false)
  })

  // --- not_equals ---
  it('not_equals - positiv: Antwort ist verschieden', () => {
    const condition = cond('b1', 'not_equals', 'berlin')
    expect(evaluateCondition(condition, { b1: 'hamburg' })).toBe(true)
  })

  it('not_equals - negativ: Antwort ist gleich', () => {
    const condition = cond('b1', 'not_equals', 'berlin')
    expect(evaluateCondition(condition, { b1: 'berlin' })).toBe(false)
  })

  it('not_equals - fehlende Antwort ergibt true (leer != "berlin")', () => {
    const condition = cond('b1', 'not_equals', 'berlin')
    expect(evaluateCondition(condition, {})).toBe(true)
  })

  // --- contains ---
  it('contains - positiv: Antwort enthaelt Teilstring', () => {
    const condition = cond('b1', 'contains', 'ber')
    expect(evaluateCondition(condition, { b1: 'berlin' })).toBe(true)
  })

  it('contains - negativ: Antwort enthaelt Teilstring nicht', () => {
    const condition = cond('b1', 'contains', 'mue')
    expect(evaluateCondition(condition, { b1: 'berlin' })).toBe(false)
  })

  it('contains - fehlende Antwort ergibt false', () => {
    const condition = cond('b1', 'contains', 'ber')
    expect(evaluateCondition(condition, {})).toBe(false)
  })

  // --- greater_than ---
  it('greater_than - positiv: numerisch groesser', () => {
    const condition = cond('b1', 'greater_than', '5')
    expect(evaluateCondition(condition, { b1: '10' })).toBe(true)
  })

  it('greater_than - negativ: numerisch kleiner', () => {
    const condition = cond('b1', 'greater_than', '5')
    expect(evaluateCondition(condition, { b1: '3' })).toBe(false)
  })

  it('greater_than - negativ: gleicher Wert', () => {
    const condition = cond('b1', 'greater_than', '5')
    expect(evaluateCondition(condition, { b1: '5' })).toBe(false)
  })

  it('greater_than - nicht-numerischer Antwort-Wert gibt false zurueck', () => {
    const condition = cond('b1', 'greater_than', '5')
    expect(evaluateCondition(condition, { b1: 'abc' })).toBe(false)
  })

  it('greater_than - fehlende Antwort gibt false zurueck', () => {
    const condition = cond('b1', 'greater_than', '5')
    expect(evaluateCondition(condition, {})).toBe(false)
  })

  it('greater_than - nicht-numerischer condition.value gibt false zurueck', () => {
    const condition = cond('b1', 'greater_than', 'viel')
    expect(evaluateCondition(condition, { b1: '10' })).toBe(false)
  })

  // --- less_than ---
  it('less_than - positiv: numerisch kleiner', () => {
    const condition = cond('b1', 'less_than', '10')
    expect(evaluateCondition(condition, { b1: '3' })).toBe(true)
  })

  it('less_than - negativ: numerisch groesser', () => {
    const condition = cond('b1', 'less_than', '5')
    expect(evaluateCondition(condition, { b1: '10' })).toBe(false)
  })

  it('less_than - nicht-numerischer Antwort-Wert gibt false zurueck', () => {
    const condition = cond('b1', 'less_than', '5')
    expect(evaluateCondition(condition, { b1: 'text' })).toBe(false)
  })

  it('less_than - fehlende Antwort gibt false zurueck', () => {
    const condition = cond('b1', 'less_than', '5')
    expect(evaluateCondition(condition, {})).toBe(false)
  })

  // --- is_answered ---
  it('is_answered - positiv: nicht-leere String-Antwort', () => {
    const condition = cond('b1', 'is_answered')
    expect(evaluateCondition(condition, { b1: 'irgendwas' })).toBe(true)
  })

  it('is_answered - positiv: boolesch true (Checkbox angehakt)', () => {
    const condition = cond('b1', 'is_answered')
    expect(evaluateCondition(condition, { b1: true })).toBe(true)
  })

  it('is_answered - negativ: keine Antwort (Block-ID nicht in Map)', () => {
    const condition = cond('b1', 'is_answered')
    expect(evaluateCondition(condition, {})).toBe(false)
  })

  it('is_answered - negativ: leere String-Antwort', () => {
    const condition = cond('b1', 'is_answered')
    expect(evaluateCondition(condition, { b1: '   ' })).toBe(false)
  })

  it('is_answered - negativ: boolesch false (Checkbox nicht angehakt)', () => {
    const condition = cond('b1', 'is_answered')
    expect(evaluateCondition(condition, { b1: false })).toBe(false)
  })

  // --- is_empty ---
  it('is_empty - positiv: keine Antwort vorhanden', () => {
    const condition = cond('b1', 'is_empty')
    expect(evaluateCondition(condition, {})).toBe(true)
  })

  it('is_empty - positiv: leere String-Antwort', () => {
    const condition = cond('b1', 'is_empty')
    expect(evaluateCondition(condition, { b1: '' })).toBe(true)
  })

  it('is_empty - positiv: nur Leerzeichen', () => {
    const condition = cond('b1', 'is_empty')
    expect(evaluateCondition(condition, { b1: '   ' })).toBe(true)
  })

  it('is_empty - positiv: boolesch false (Checkbox nicht angehakt)', () => {
    const condition = cond('b1', 'is_empty')
    expect(evaluateCondition(condition, { b1: false })).toBe(true)
  })

  it('is_empty - negativ: nicht-leere Antwort vorhanden', () => {
    const condition = cond('b1', 'is_empty')
    expect(evaluateCondition(condition, { b1: 'antwort' })).toBe(false)
  })

  // --- in_list ---
  it('in_list - positiv: single_choice-Antwort ist in Array-Liste', () => {
    const condition = cond('b1', 'in_list', ['berlin', 'hamburg'])
    expect(evaluateCondition(condition, { b1: 'berlin' })).toBe(true)
  })

  it('in_list - negativ: single_choice-Antwort ist nicht in Liste', () => {
    const condition = cond('b1', 'in_list', ['berlin', 'hamburg'])
    expect(evaluateCondition(condition, { b1: 'muenchen' })).toBe(false)
  })

  it('in_list - positiv: multi_choice-Antwort (kommasepariert), mind. eine Option in Liste', () => {
    // Multi-Choice-Antwort: "option_a,option_b" -> "option_b" ist in der Liste
    const condition = cond('b1', 'in_list', ['option_b', 'option_c'])
    expect(evaluateCondition(condition, { b1: 'option_a,option_b' })).toBe(true)
  })

  it('in_list - negativ: multi_choice-Antwort, keine Option in Liste', () => {
    const condition = cond('b1', 'in_list', ['option_c', 'option_d'])
    expect(evaluateCondition(condition, { b1: 'option_a,option_b' })).toBe(false)
  })

  it('in_list - positiv: condition.value als kommaseparierter String', () => {
    // Alternativ: Liste als kommaseparierter String
    const condition = cond('b1', 'in_list', 'berlin,hamburg')
    expect(evaluateCondition(condition, { b1: 'hamburg' })).toBe(true)
  })

  it('in_list - fehlende Antwort ergibt false', () => {
    const condition = cond('b1', 'in_list', ['berlin', 'hamburg'])
    expect(evaluateCondition(condition, {})).toBe(false)
  })

  it('in_list - null als condition.value ergibt false', () => {
    const condition = cond('b1', 'in_list', null)
    expect(evaluateCondition(condition, { b1: 'berlin' })).toBe(false)
  })

  it('in_list - leere Liste als condition.value ergibt false', () => {
    const condition = cond('b1', 'in_list', [])
    expect(evaluateCondition(condition, { b1: 'berlin' })).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// evaluateLogicRules
// ---------------------------------------------------------------------------

describe('evaluateLogicRules', () => {
  // --- AND ---
  it('AND: alle Bedingungen erfuellt -> gibt target zurueck', () => {
    const step = makeStep([
      makeRule(
        'AND',
        [cond('b1', 'equals', 'ja'), cond('b2', 'is_answered')],
        { type: 'next' },
      ),
    ])
    const target = evaluateLogicRules(step, { b1: 'ja', b2: 'irgendwas' })
    expect(target).toEqual({ type: 'next' })
  })

  it('AND: eine Bedingung nicht erfuellt -> null', () => {
    const step = makeStep([
      makeRule(
        'AND',
        [cond('b1', 'equals', 'ja'), cond('b2', 'is_answered')],
        { type: 'next' },
      ),
    ])
    // b2 fehlt
    const target = evaluateLogicRules(step, { b1: 'ja' })
    expect(target).toBeNull()
  })

  it('AND: keine Bedingung erfuellt -> null', () => {
    const step = makeStep([
      makeRule('AND', [cond('b1', 'equals', 'ja')], { type: 'next' }),
    ])
    expect(evaluateLogicRules(step, { b1: 'nein' })).toBeNull()
  })

  // --- OR ---
  it('OR: mindestens eine Bedingung erfuellt -> gibt target zurueck', () => {
    const step = makeStep([
      makeRule(
        'OR',
        [cond('b1', 'equals', 'ja'), cond('b2', 'equals', 'ja')],
        { type: 'next' },
      ),
    ])
    // Nur b2 erfuellt
    const target = evaluateLogicRules(step, { b1: 'nein', b2: 'ja' })
    expect(target).toEqual({ type: 'next' })
  })

  it('OR: keine Bedingung erfuellt -> null', () => {
    const step = makeStep([
      makeRule(
        'OR',
        [cond('b1', 'equals', 'ja'), cond('b2', 'equals', 'ja')],
        { type: 'next' },
      ),
    ])
    expect(evaluateLogicRules(step, { b1: 'nein', b2: 'nein' })).toBeNull()
  })

  // --- Regelreihenfolge ---
  it('erste Regel nicht erfuellt, zweite Regel erfuellt -> Ziel der zweiten Regel', () => {
    const step = makeStep([
      makeRule('AND', [cond('b1', 'equals', 'ja')], { type: 'next' }),
      makeRule('AND', [cond('b1', 'equals', 'nein')], {
        type: 'step',
        stepId: 'step-x',
      }),
    ])
    const target = evaluateLogicRules(step, { b1: 'nein' })
    expect(target).toEqual({ type: 'step', stepId: 'step-x' })
  })

  it('erste Regel erfuellt -> Ziel der ersten Regel (Short-Circuit)', () => {
    const step = makeStep([
      makeRule('AND', [cond('b1', 'equals', 'ja')], { type: 'next' }),
      makeRule('AND', [cond('b1', 'is_answered')], {
        type: 'step',
        stepId: 'step-y',
      }),
    ])
    // Beide Regeln wuerden matchen, aber die erste wird zurueckgegeben
    const target = evaluateLogicRules(step, { b1: 'ja' })
    expect(target).toEqual({ type: 'next' })
  })

  it('leere Regel-Liste -> null', () => {
    const step = makeStep([])
    expect(evaluateLogicRules(step, { b1: 'ja' })).toBeNull()
  })

  it('Regel ohne Bedingungen wird uebersprungen -> null', () => {
    const rule = makeRule('AND', [], { type: 'next' })
    const step = makeStep([rule])
    expect(evaluateLogicRules(step, {})).toBeNull()
  })

  // --- Ziel-Typen ---
  it('target type step -> gibt target mit stepId zurueck', () => {
    const step = makeStep([
      makeRule('AND', [cond('b1', 'is_answered')], {
        type: 'step',
        stepId: 'step-abc',
      }),
    ])
    const target = evaluateLogicRules(step, { b1: 'ja' })
    expect(target).toEqual({ type: 'step', stepId: 'step-abc' })
  })

  it('target type url -> gibt target mit url zurueck', () => {
    const step = makeStep([
      makeRule('AND', [cond('b1', 'is_answered')], {
        type: 'url',
        url: 'https://example.com',
      }),
    ])
    const target = evaluateLogicRules(step, { b1: 'ja' })
    expect(target).toEqual({ type: 'url', url: 'https://example.com' })
  })

  it('target type next -> gibt target type next zurueck', () => {
    const step = makeStep([
      makeRule('AND', [cond('b1', 'is_answered')], { type: 'next' }),
    ])
    const target = evaluateLogicRules(step, { b1: 'ja' })
    expect(target).toEqual({ type: 'next' })
  })

  it('target type submit -> gibt target type submit zurueck', () => {
    const step = makeStep([
      makeRule('AND', [cond('b1', 'is_answered')], { type: 'submit' }),
    ])
    const target = evaluateLogicRules(step, { b1: 'ja' })
    expect(target).toEqual({ type: 'submit' })
  })

  // --- Numerische Operatoren in Regeln ---
  it('greater_than in Regel: Zahl groesser als Schwelle -> Ziel zurueckgeben', () => {
    const step = makeStep([
      makeRule('AND', [cond('b1', 'greater_than', '5')], { type: 'next' }),
    ])
    expect(evaluateLogicRules(step, { b1: '7' })).toEqual({ type: 'next' })
  })

  it('greater_than in Regel: Zahl kleiner -> null', () => {
    const step = makeStep([
      makeRule('AND', [cond('b1', 'greater_than', '5')], { type: 'next' }),
    ])
    expect(evaluateLogicRules(step, { b1: '3' })).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// evaluateDisplayConditions
// ---------------------------------------------------------------------------

describe('evaluateDisplayConditions', () => {
  function dc(
    blockId: string,
    operator: DisplayCondition['operator'],
    value?: unknown,
  ): DisplayCondition {
    return value !== undefined ? { blockId, operator, value } : { blockId, operator }
  }

  it('undefined conditions -> true (Block immer sichtbar)', () => {
    expect(evaluateDisplayConditions(undefined, {})).toBe(true)
  })

  it('leeres Array -> true (Block immer sichtbar)', () => {
    expect(evaluateDisplayConditions([], {})).toBe(true)
  })

  it('einzelne Bedingung erfuellt -> true', () => {
    const conditions = [dc('b1', 'equals', 'ja')]
    expect(evaluateDisplayConditions(conditions, { b1: 'ja' })).toBe(true)
  })

  it('einzelne Bedingung nicht erfuellt -> false', () => {
    const conditions = [dc('b1', 'equals', 'ja')]
    expect(evaluateDisplayConditions(conditions, { b1: 'nein' })).toBe(false)
  })

  it('mehrere Conditions (implizites AND): alle erfuellt -> true', () => {
    const conditions = [
      dc('b1', 'equals', 'ja'),
      dc('b2', 'is_answered'),
    ]
    expect(evaluateDisplayConditions(conditions, { b1: 'ja', b2: 'irgendwas' })).toBe(true)
  })

  it('mehrere Conditions (implizites AND): eine nicht erfuellt -> false', () => {
    const conditions = [
      dc('b1', 'equals', 'ja'),
      dc('b2', 'is_answered'),
    ]
    // b2 fehlt -> nicht beantwortet -> false
    expect(evaluateDisplayConditions(conditions, { b1: 'ja' })).toBe(false)
  })

  it('is_answered: Block sichtbar wenn Antwort vorhanden', () => {
    const conditions = [dc('b1', 'is_answered')]
    expect(evaluateDisplayConditions(conditions, { b1: 'Antwort' })).toBe(true)
  })

  it('is_answered: Block ausgeblendet wenn keine Antwort (leere answers)', () => {
    const conditions = [dc('b1', 'is_answered')]
    expect(evaluateDisplayConditions(conditions, {})).toBe(false)
  })

  it('in_list: Block sichtbar wenn Antwort in Liste', () => {
    const conditions = [dc('b1', 'in_list', ['ja', 'vielleicht'])]
    expect(evaluateDisplayConditions(conditions, { b1: 'ja' })).toBe(true)
  })

  it('not_equals: Block sichtbar wenn Antwort verschieden', () => {
    const conditions = [dc('b1', 'not_equals', 'nein')]
    expect(evaluateDisplayConditions(conditions, { b1: 'ja' })).toBe(true)
  })

  it('not_equals: Block ausgeblendet wenn Antwort gleich', () => {
    const conditions = [dc('b1', 'not_equals', 'nein')]
    expect(evaluateDisplayConditions(conditions, { b1: 'nein' })).toBe(false)
  })

  it('SSR-Safety: leeres answers-Objekt -> deterministisch false bei is_answered', () => {
    // Auf SSR sind answers leer -> is_answered = false -> Block ausgeblendet
    // Gleiches Ergebnis auf dem Client mit leerem Startzustand -> kein Hydration-Mismatch
    const conditions = [dc('b1', 'is_answered')]
    expect(evaluateDisplayConditions(conditions, {})).toBe(false)
  })
})
