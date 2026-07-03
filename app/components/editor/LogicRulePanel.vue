<!--
  EditorLogicRulePanel: Sprung-Regeln auf Step-Ebene.

  Zeigt die logicRules des aktuell selektierten Steps und ermoeglicht
  das Anlegen, Bearbeiten und Loeschen von Regeln und Conditions.

  Schreibt via editorStore.updateStep(stepId, { logicRules }).
  Respektiert isReadonly (Publish-Lock).
-->
<script setup lang="ts">
import type {
  LogicRule,
  LogicCondition,
  LogicTarget,
  LogicConditionOperator,
} from '~/types/funnel'

const props = defineProps<{
  isReadonly: boolean
}>()

const editorStore = useEditorStore()

const step = computed(() => editorStore.selectedStep)
const allSteps = computed(() => editorStore.steps)

/** Bloecke des aktuellen Steps, die ein fieldKey haben (Antwort-Felder). */
const blocksWithFieldKey = computed(() =>
  (step.value?.blocks ?? []).filter(b => 'fieldKey' in b),
)

const hasFieldBlocks = computed(() => blocksWithFieldKey.value.length > 0)

const rules = computed<LogicRule[]>(() => step.value?.logicRules ?? [])

/** Panel ein-/ausklappen */
const expanded = ref(true)

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

/** Anzeigename fuer einen Block anhand seiner ID. */
function blockLabel(blockId: string): string {
  const block = step.value?.blocks.find(b => b.id === blockId)
  if (!block) return `Block ${blockId.slice(0, 8)}`
  if ('question' in block && typeof block.question === 'string') return block.question
  if ('label' in block && typeof block.label === 'string') return block.label
  if ('checkboxLabel' in block && typeof block.checkboxLabel === 'string') {
    const text = block.checkboxLabel.replace(/<[^>]+>/g, '')
    return text.length > 30 ? text.slice(0, 30) + '…' : text
  }
  if ('fieldKey' in block && typeof block.fieldKey === 'string') return block.fieldKey
  return block.type
}

/** Anzeigename fuer einen Step. */
function stepLabel(stepId: string): string {
  const s = allSteps.value.find(st => st.id === stepId)
  if (!s) return stepId.slice(0, 8)
  const idx = allSteps.value.indexOf(s)
  return `${idx + 1}. ${s.internalTitle}`
}

const OPERATOR_LABELS: Record<LogicConditionOperator, string> = {
  equals: 'ist gleich',
  not_equals: 'ist ungleich',
  contains: 'enthält',
  greater_than: 'ist größer als',
  less_than: 'ist kleiner als',
  is_answered: 'wurde beantwortet',
  is_empty: 'ist leer',
  in_list: 'ist in Liste',
}

/** Diese Operatoren benoetigen keinen Vergleichswert. */
const VALUELESS_OPERATORS = new Set<LogicConditionOperator>(['is_answered', 'is_empty'])

/** Erstellt eine saubere Condition ohne unerlaubte Felder. */
function cleanCondition(c: LogicCondition): LogicCondition {
  if (VALUELESS_OPERATORS.has(c.operator)) {
    return { blockId: c.blockId, operator: c.operator }
  }
  return c
}

/** Erstellt ein sauberes Target-Objekt (additionalProperties: false im Schema). */
function buildTarget(type: string, existingTarget: LogicTarget): LogicTarget {
  if (type === 'next') return { type: 'next' }
  if (type === 'submit') return { type: 'submit' }
  if (type === 'step') {
    const existingStepId = existingTarget.type === 'step' ? existingTarget.stepId : undefined
    const fallback = allSteps.value[0]?.id ?? ''
    return { type: 'step', stepId: existingStepId ?? fallback }
  }
  if (type === 'url') {
    const existingUrl = existingTarget.type === 'url' ? existingTarget.url : ''
    return { type: 'url', url: existingUrl }
  }
  return { type: 'next' }
}

// ---------------------------------------------------------------------------
// Mutationen
// ---------------------------------------------------------------------------

function saveRules(newRules: LogicRule[]): void {
  if (!step.value || props.isReadonly) return
  editorStore.updateStep(step.value.id, { logicRules: newRules })
}

function addRule(): void {
  if (!step.value || props.isReadonly || !hasFieldBlocks.value) return
  const firstBlock = blocksWithFieldKey.value[0]!
  const newRule: LogicRule = {
    id: crypto.randomUUID(),
    operator: 'AND',
    conditions: [{ blockId: firstBlock.id, operator: 'equals' }],
    target: { type: 'next' },
  }
  saveRules([...rules.value, newRule])
}

function removeRule(ruleId: string): void {
  if (!step.value || props.isReadonly) return
  saveRules(rules.value.filter(r => r.id !== ruleId))
}

function updateRuleOperator(ruleId: string, operator: 'AND' | 'OR'): void {
  saveRules(rules.value.map(r => r.id === ruleId ? { ...r, operator } : r))
}

function updateRuleTarget(ruleId: string, newTargetType: string): void {
  const rule = rules.value.find(r => r.id === ruleId)
  if (!rule) return
  const newTarget = buildTarget(newTargetType, rule.target)
  saveRules(rules.value.map(r => r.id === ruleId ? { ...r, target: newTarget } : r))
}

function updateTargetStepId(ruleId: string, stepId: string): void {
  saveRules(rules.value.map(r =>
    r.id === ruleId ? { ...r, target: { type: 'step' as const, stepId } } : r,
  ))
}

function updateTargetUrl(ruleId: string, url: string): void {
  saveRules(rules.value.map(r =>
    r.id === ruleId ? { ...r, target: { type: 'url' as const, url } } : r,
  ))
}

function addCondition(ruleId: string): void {
  if (!hasFieldBlocks.value || props.isReadonly) return
  const firstBlock = blocksWithFieldKey.value[0]!
  const newCondition: LogicCondition = { blockId: firstBlock.id, operator: 'equals' }
  saveRules(rules.value.map(r =>
    r.id === ruleId ? { ...r, conditions: [...r.conditions, newCondition] } : r,
  ))
}

function removeCondition(ruleId: string, condIdx: number): void {
  const rule = rules.value.find(r => r.id === ruleId)
  if (!rule || rule.conditions.length <= 1) return // minItems: 1 laut Schema
  saveRules(rules.value.map(r =>
    r.id === ruleId
      ? { ...r, conditions: r.conditions.filter((_, i) => i !== condIdx) }
      : r,
  ))
}

function updateConditionBlock(ruleId: string, condIdx: number, blockId: string): void {
  saveRules(rules.value.map(r => {
    if (r.id !== ruleId) return r
    const newConds = r.conditions.map((c, i) =>
      i === condIdx ? cleanCondition({ ...c, blockId }) : c,
    )
    return { ...r, conditions: newConds }
  }))
}

function updateConditionOperator(ruleId: string, condIdx: number, operator: LogicConditionOperator): void {
  saveRules(rules.value.map(r => {
    if (r.id !== ruleId) return r
    const newConds = r.conditions.map((c, i) =>
      i === condIdx ? cleanCondition({ ...c, operator }) : c,
    )
    return { ...r, conditions: newConds }
  }))
}

function updateConditionValue(ruleId: string, condIdx: number, value: string): void {
  saveRules(rules.value.map(r => {
    if (r.id !== ruleId) return r
    const newConds = r.conditions.map((c, i) =>
      i === condIdx ? { ...c, value } : c,
    )
    return { ...r, conditions: newConds }
  }))
}

// ---------------------------------------------------------------------------
// CSS-Klassen (einheitlich)
// ---------------------------------------------------------------------------
const selectCls = 'w-full rounded-md border border-ui-border bg-white px-2 py-1.5 text-xs text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent disabled:cursor-not-allowed disabled:opacity-50'
const inputCls = 'w-full rounded-md border border-ui-border bg-white px-2 py-1.5 text-xs text-ui-text placeholder:text-ui-muted focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent disabled:cursor-not-allowed disabled:opacity-50'
</script>

<template>
  <section
    v-if="step"
    aria-labelledby="logic-panel-heading"
    class="border-t border-ui-border"
  >
    <!-- Header mit Auf/Zu-Toggle -->
    <button
      type="button"
      class="flex w-full items-center justify-between px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ui-accent"
      :aria-expanded="expanded"
      aria-controls="logic-panel-body"
      @click="expanded = !expanded"
    >
      <h2
        id="logic-panel-heading"
        class="text-xs font-semibold text-ui-text"
      >
        Sprungregeln
      </h2>
      <svg
        :class="['h-3.5 w-3.5 flex-shrink-0 text-ui-muted transition-transform', expanded ? 'rotate-180' : '']"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2.5"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>

    <!-- Panel-Koerper -->
    <div
      v-show="expanded"
      id="logic-panel-body"
      class="px-4 pb-4"
    >
      <!-- Hinweis: kein Block mit Antwort-Feld -->
      <template v-if="!hasFieldBlocks">
        <p class="text-xs text-ui-muted">
          Füge zuerst ein Eingabe- oder Auswahl-Element auf dieser Seite hinzu, um Sprungregeln anzulegen.
        </p>
      </template>

      <!-- Leer-Zustand -->
      <template v-else-if="rules.length === 0">
        <p class="mb-3 text-xs text-ui-muted">
          Noch keine Regel. Füge eine hinzu, um abhängig von der Antwort zu springen.
        </p>
      </template>

      <!-- Regeln -->
      <template v-else>
        <ol
          class="mb-3 space-y-3"
          aria-label="Sprungregeln-Liste"
        >
          <li
            v-for="(rule, ruleIdx) in rules"
            :key="rule.id"
            class="rounded-lg border border-ui-border bg-ui-bg p-2.5"
          >
            <!-- Regel-Header: AND/OR + Loeschen -->
            <div class="mb-2 flex items-center gap-2">
              <label
                :for="`logic-op-${rule.id}`"
                class="shrink-0 text-xs text-ui-muted"
              >
                Wenn
              </label>
              <select
                :id="`logic-op-${rule.id}`"
                :value="rule.operator"
                :disabled="isReadonly"
                :class="[selectCls, 'w-auto shrink-0 !px-1.5']"
                :aria-label="`Verknüpfung Regel ${ruleIdx + 1}`"
                @change="updateRuleOperator(rule.id, ($event.target as HTMLSelectElement).value as 'AND' | 'OR')"
              >
                <option value="AND">alle</option>
                <option value="OR">eine</option>
              </select>
              <span class="min-w-0 flex-1 text-xs text-ui-muted">Bedingungen erfüllt:</span>
              <button
                v-if="!isReadonly"
                type="button"
                class="flex h-5 w-5 shrink-0 items-center justify-center rounded text-red-400 hover:bg-red-50 focus:outline-none focus:ring-1 focus:ring-red-500"
                :aria-label="`Regel ${ruleIdx + 1} löschen`"
                title="Regel loeschen"
                @click="removeRule(rule.id)"
              >
                <svg
                  class="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2.5"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <!-- Conditions -->
            <fieldset class="mb-2 space-y-2">
              <legend class="sr-only">
                Bedingungen für Regel {{ ruleIdx + 1 }}
              </legend>

              <div
                v-for="(cond, condIdx) in rule.conditions"
                :key="condIdx"
                class="space-y-1"
              >
                <!-- Block-Auswahl -->
                <label
                  :for="`logic-cond-block-${rule.id}-${condIdx}`"
                  class="sr-only"
                >
                  Antwort-Feld für Bedingung {{ condIdx + 1 }} in Regel {{ ruleIdx + 1 }}
                </label>
                <select
                  :id="`logic-cond-block-${rule.id}-${condIdx}`"
                  :value="cond.blockId"
                  :disabled="isReadonly"
                  :class="selectCls"
                  @change="updateConditionBlock(rule.id, condIdx, ($event.target as HTMLSelectElement).value)"
                >
                  <option
                    v-for="block in blocksWithFieldKey"
                    :key="block.id"
                    :value="block.id"
                  >
                    {{ blockLabel(block.id) }}
                  </option>
                </select>

                <!-- Operator + optionaler Loeschen-Button -->
                <div class="flex items-center gap-1">
                  <label
                    :for="`logic-cond-op-${rule.id}-${condIdx}`"
                    class="sr-only"
                  >
                    Operator für Bedingung {{ condIdx + 1 }} in Regel {{ ruleIdx + 1 }}
                  </label>
                  <select
                    :id="`logic-cond-op-${rule.id}-${condIdx}`"
                    :value="cond.operator"
                    :disabled="isReadonly"
                    :class="[selectCls, 'flex-1']"
                    @change="updateConditionOperator(rule.id, condIdx, ($event.target as HTMLSelectElement).value as LogicConditionOperator)"
                  >
                    <option
                      v-for="(label, op) in OPERATOR_LABELS"
                      :key="op"
                      :value="op"
                    >
                      {{ label }}
                    </option>
                  </select>

                  <button
                    v-if="!isReadonly && rule.conditions.length > 1"
                    type="button"
                    class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-red-400 hover:bg-red-50 focus:outline-none focus:ring-1 focus:ring-red-500"
                    :aria-label="`Bedingung ${condIdx + 1} aus Regel ${ruleIdx + 1} löschen`"
                    @click="removeCondition(rule.id, condIdx)"
                  >
                    <svg
                      class="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2.5"
                      aria-hidden="true"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <!-- Wert-Input (nur wenn Operator einen Wert erfordert) -->
                <div v-if="!VALUELESS_OPERATORS.has(cond.operator)">
                  <label
                    :for="`logic-cond-val-${rule.id}-${condIdx}`"
                    class="sr-only"
                  >
                    Vergleichswert für Bedingung {{ condIdx + 1 }} in Regel {{ ruleIdx + 1 }}
                  </label>
                  <input
                    :id="`logic-cond-val-${rule.id}-${condIdx}`"
                    type="text"
                    :value="cond.value != null ? String(cond.value) : ''"
                    :readonly="isReadonly"
                    :class="inputCls"
                    :placeholder="cond.operator === 'in_list' ? 'Werte kommagetrennt, z.B. a,b' : 'Vergleichswert'"
                    @input="updateConditionValue(rule.id, condIdx, ($event.target as HTMLInputElement).value)"
                  >
                </div>
              </div>
            </fieldset>

            <!-- Bedingung hinzufuegen -->
            <button
              v-if="!isReadonly"
              type="button"
              class="mb-3 block text-xs text-ui-accent-hover hover:underline focus:outline-none focus:ring-2 focus:ring-ui-accent"
              :aria-label="`Bedingung zu Regel ${ruleIdx + 1} hinzufügen`"
              @click="addCondition(rule.id)"
            >
              + Bedingung hinzufügen
            </button>

            <!-- Ziel-Sektion -->
            <div class="space-y-1">
              <p class="text-xs font-medium text-ui-muted">
                Dann springen zu:
              </p>

              <label
                :for="`logic-target-type-${rule.id}`"
                class="sr-only"
              >
                Sprungziel für Regel {{ ruleIdx + 1 }}
              </label>
              <select
                :id="`logic-target-type-${rule.id}`"
                :value="rule.target.type"
                :disabled="isReadonly"
                :class="selectCls"
                @change="updateRuleTarget(rule.id, ($event.target as HTMLSelectElement).value)"
              >
                <option value="next">Nächste Seite</option>
                <option value="submit">Formular absenden</option>
                <option value="step">Zu einem Schritt springen</option>
                <option value="url">Externe URL oeffnen</option>
              </select>

              <!-- Schritt-Dropdown (wenn type='step') -->
              <template v-if="rule.target.type === 'step'">
                <label
                  :for="`logic-target-step-${rule.id}`"
                  class="sr-only"
                >
                  Ziel-Schritt für Regel {{ ruleIdx + 1 }}
                </label>
                <select
                  :id="`logic-target-step-${rule.id}`"
                  :value="rule.target.type === 'step' ? rule.target.stepId : ''"
                  :disabled="isReadonly"
                  :class="selectCls"
                  @change="updateTargetStepId(rule.id, ($event.target as HTMLSelectElement).value)"
                >
                  <option
                    v-for="s in allSteps"
                    :key="s.id"
                    :value="s.id"
                  >
                    {{ stepLabel(s.id) }}
                  </option>
                </select>
              </template>

              <!-- URL-Input (wenn type='url') -->
              <template v-if="rule.target.type === 'url'">
                <label
                  :for="`logic-target-url-${rule.id}`"
                  class="sr-only"
                >
                  Ziel-URL für Regel {{ ruleIdx + 1 }}
                </label>
                <input
                  :id="`logic-target-url-${rule.id}`"
                  type="url"
                  :value="rule.target.type === 'url' ? rule.target.url : ''"
                  :readonly="isReadonly"
                  placeholder="https://..."
                  :class="inputCls"
                  @input="updateTargetUrl(rule.id, ($event.target as HTMLInputElement).value)"
                >
              </template>
            </div>
          </li>
        </ol>
      </template>

      <!-- Regel hinzufuegen -->
      <button
        v-if="!isReadonly && hasFieldBlocks"
        type="button"
        class="flex items-center gap-1.5 text-xs text-ui-accent-hover hover:underline focus:outline-none focus:ring-2 focus:ring-ui-accent"
        @click="addRule"
      >
        <svg
          class="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2.5"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 4v16m8-8H4"
          />
        </svg>
        Sprung-Regel hinzufügen
      </button>
    </div>
  </section>
</template>
