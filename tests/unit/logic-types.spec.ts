/**
 * Tests fuer die Type-Guards isLogicRule und isDisplayCondition (M3.1).
 *
 * Prueft jeweils: gueltiger Typ, fehlende Pflichtfelder, falsche Feldtypen,
 * primitive Werte und Null.
 */
import { describe, it, expect } from 'vitest'
import { isLogicRule, isDisplayCondition } from '../../app/types/funnel'
import type { LogicRule, DisplayCondition } from '../../app/types/funnel'

// ---------------------------------------------------------------------------
// isLogicRule
// ---------------------------------------------------------------------------

describe('isLogicRule', () => {
  it('gibt true fuer eine vollstaendige LogicRule mit operator AND zurueck', () => {
    const rule: LogicRule = {
      id: '11111111-1111-1111-1111-111111111111',
      operator: 'AND',
      conditions: [
        {
          blockId: '22222222-2222-2222-2222-222222222222',
          operator: 'equals',
          value: 'ja',
        },
      ],
      target: { type: 'step', stepId: '33333333-3333-3333-3333-333333333333' },
    }
    expect(isLogicRule(rule)).toBe(true)
  })

  it('gibt true fuer eine LogicRule mit operator OR und target next zurueck', () => {
    const rule: LogicRule = {
      id: '44444444-4444-4444-4444-444444444444',
      operator: 'OR',
      conditions: [
        {
          blockId: '55555555-5555-5555-5555-555555555555',
          operator: 'is_answered',
        },
      ],
      target: { type: 'next' },
    }
    expect(isLogicRule(rule)).toBe(true)
  })

  it('gibt true fuer eine LogicRule mit target url zurueck', () => {
    const rule: LogicRule = {
      id: '66666666-6666-6666-6666-666666666666',
      operator: 'AND',
      conditions: [
        {
          blockId: '77777777-7777-7777-7777-777777777777',
          operator: 'not_equals',
          value: 'nein',
        },
      ],
      target: { type: 'url', url: 'https://example.com' },
    }
    expect(isLogicRule(rule)).toBe(true)
  })

  it('gibt true fuer eine LogicRule mit mehreren conditions zurueck', () => {
    const rule: LogicRule = {
      id: '88888888-8888-8888-8888-888888888888',
      operator: 'AND',
      conditions: [
        { blockId: 'aaa', operator: 'greater_than', value: '5' },
        { blockId: 'bbb', operator: 'less_than', value: '10' },
        { blockId: 'ccc', operator: 'in_list', value: ['a', 'b'] },
      ],
      target: { type: 'submit' },
    }
    expect(isLogicRule(rule)).toBe(true)
  })

  it('gibt false fuer null zurueck', () => {
    expect(isLogicRule(null)).toBe(false)
  })

  it('gibt false fuer undefined zurueck', () => {
    expect(isLogicRule(undefined)).toBe(false)
  })

  it('gibt false fuer Zahlen zurueck', () => {
    expect(isLogicRule(42)).toBe(false)
  })

  it('gibt false fuer Strings zurueck', () => {
    expect(isLogicRule('AND')).toBe(false)
  })

  it('gibt false fuer ein leeres Objekt zurueck', () => {
    expect(isLogicRule({})).toBe(false)
  })

  it('gibt false zurueck wenn id fehlt', () => {
    expect(
      isLogicRule({
        operator: 'AND',
        conditions: [],
        target: { type: 'next' },
      }),
    ).toBe(false)
  })

  it('gibt false zurueck wenn operator fehlt', () => {
    expect(
      isLogicRule({
        id: 'x',
        conditions: [],
        target: { type: 'next' },
      }),
    ).toBe(false)
  })

  it('gibt false zurueck wenn operator weder AND noch OR ist', () => {
    expect(
      isLogicRule({
        id: 'x',
        operator: 'MAYBE',
        conditions: [],
        target: { type: 'next' },
      }),
    ).toBe(false)
  })

  it('gibt false zurueck wenn conditions kein Array ist', () => {
    expect(
      isLogicRule({
        id: 'x',
        operator: 'AND',
        conditions: 'keine-liste',
        target: { type: 'next' },
      }),
    ).toBe(false)
  })

  it('gibt false zurueck wenn conditions null ist', () => {
    expect(
      isLogicRule({
        id: 'x',
        operator: 'AND',
        conditions: null,
        target: { type: 'next' },
      }),
    ).toBe(false)
  })

  it('gibt false zurueck wenn target fehlt', () => {
    expect(
      isLogicRule({
        id: 'x',
        operator: 'AND',
        conditions: [],
      }),
    ).toBe(false)
  })

  it('gibt false zurueck wenn target null ist', () => {
    expect(
      isLogicRule({
        id: 'x',
        operator: 'AND',
        conditions: [],
        target: null,
      }),
    ).toBe(false)
  })

  it('gibt false zurueck wenn target ein primitiver Wert ist', () => {
    expect(
      isLogicRule({
        id: 'x',
        operator: 'AND',
        conditions: [],
        target: 'next',
      }),
    ).toBe(false)
  })

  it('gibt false zurueck wenn id keine Zeichenkette ist', () => {
    expect(
      isLogicRule({
        id: 123,
        operator: 'AND',
        conditions: [],
        target: { type: 'next' },
      }),
    ).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isDisplayCondition
// ---------------------------------------------------------------------------

describe('isDisplayCondition', () => {
  it('gibt true fuer eine vollstaendige DisplayCondition mit value zurueck', () => {
    const cond: DisplayCondition = {
      blockId: '11111111-1111-1111-1111-111111111111',
      operator: 'equals',
      value: 'ja',
    }
    expect(isDisplayCondition(cond)).toBe(true)
  })

  it('gibt true fuer DisplayCondition ohne optionalen value zurueck', () => {
    const cond: DisplayCondition = {
      blockId: '22222222-2222-2222-2222-222222222222',
      operator: 'is_answered',
    }
    expect(isDisplayCondition(cond)).toBe(true)
  })

  it('gibt true fuer alle 6 DisplayCondition-Operatoren zurueck', () => {
    const operators: DisplayCondition['operator'][] = [
      'equals',
      'not_equals',
      'contains',
      'is_answered',
      'is_empty',
      'in_list',
    ]
    for (const operator of operators) {
      expect(isDisplayCondition({ blockId: 'x', operator })).toBe(true)
    }
  })

  it('gibt true fuer DisplayCondition mit in_list-value (Array) zurueck', () => {
    const cond: DisplayCondition = {
      blockId: '33333333-3333-3333-3333-333333333333',
      operator: 'in_list',
      value: ['a', 'b', 'c'],
    }
    expect(isDisplayCondition(cond)).toBe(true)
  })

  it('gibt false fuer null zurueck', () => {
    expect(isDisplayCondition(null)).toBe(false)
  })

  it('gibt false fuer undefined zurueck', () => {
    expect(isDisplayCondition(undefined)).toBe(false)
  })

  it('gibt false fuer Zahlen zurueck', () => {
    expect(isDisplayCondition(42)).toBe(false)
  })

  it('gibt false fuer ein leeres Objekt zurueck', () => {
    expect(isDisplayCondition({})).toBe(false)
  })

  it('gibt false zurueck wenn blockId fehlt', () => {
    expect(isDisplayCondition({ operator: 'equals', value: 'x' })).toBe(false)
  })

  it('gibt false zurueck wenn operator fehlt', () => {
    expect(
      isDisplayCondition({ blockId: '11111111-1111-1111-1111-111111111111' }),
    ).toBe(false)
  })

  it('gibt false zurueck wenn blockId keine Zeichenkette ist', () => {
    expect(isDisplayCondition({ blockId: 123, operator: 'equals' })).toBe(false)
  })

  it('gibt false zurueck wenn operator keine Zeichenkette ist', () => {
    expect(
      isDisplayCondition({
        blockId: '11111111-1111-1111-1111-111111111111',
        operator: 42,
      }),
    ).toBe(false)
  })

  it('gibt false fuer primitive Werte zurueck', () => {
    expect(isDisplayCondition('equals')).toBe(false)
    expect(isDisplayCondition(true)).toBe(false)
  })
})
