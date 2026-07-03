<!--
  EditorDisplayConditionsEditor: Block-Sichtbarkeits-Bedingungen.

  Zeigt die displayConditions des aktuell selektierten Blocks und ermoeglicht
  das Anlegen, Bearbeiten und Loeschen von Bedingungen.

  Schreibt via editorStore.updateBlock({ displayConditions }).
  Wird nur eingeblendet, wenn es im aktuellen Step mindestens einen Block
  mit fieldKey gibt (Antwort-Felder als Bedingungsquelle).
  Respektiert isReadonly (Publish-Lock).
-->
<script setup lang="ts">
import type { DisplayCondition, DisplayConditionOperator } from '~/types/funnel'

const props = defineProps<{
  isReadonly: boolean
}>()

const editorStore = useEditorStore()

const step = computed(() => editorStore.selectedStep)
const block = computed(() => editorStore.selectedBlock)

/** Bloecke des aktuellen Steps mit fieldKey (Bedingungsquellen). */
const blocksWithFieldKey = computed(() =>
  (step.value?.blocks ?? []).filter(b => 'fieldKey' in b && b.id !== block.value?.id),
)

const hasFieldBlocks = computed(() => blocksWithFieldKey.value.length > 0)

const conditions = computed<DisplayCondition[]>(
  () => block.value?.displayConditions ?? [],
)

/** Panel ein-/ausklappen */
const expanded = ref(false)

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function blockLabel(blockId: string): string {
  const b = step.value?.blocks.find(bl => bl.id === blockId)
  if (!b) return `Block ${blockId.slice(0, 8)}`
  if ('question' in b && typeof b.question === 'string') return b.question
  if ('label' in b && typeof b.label === 'string') return b.label
  if ('checkboxLabel' in b && typeof b.checkboxLabel === 'string') {
    const text = b.checkboxLabel.replace(/<[^>]+>/g, '')
    return text.length > 30 ? text.slice(0, 30) + '…' : text
  }
  if ('fieldKey' in b && typeof b.fieldKey === 'string') return b.fieldKey
  return b.type
}

const OPERATOR_LABELS: Record<DisplayConditionOperator, string> = {
  equals: 'ist gleich',
  not_equals: 'ist ungleich',
  contains: 'enthält',
  is_answered: 'wurde beantwortet',
  is_empty: 'ist leer',
  in_list: 'ist in Liste',
}

const VALUELESS_OPERATORS = new Set<DisplayConditionOperator>(['is_answered', 'is_empty'])

function cleanCondition(c: DisplayCondition): DisplayCondition {
  if (VALUELESS_OPERATORS.has(c.operator)) {
    return { blockId: c.blockId, operator: c.operator }
  }
  return c
}

// ---------------------------------------------------------------------------
// Mutationen
// ---------------------------------------------------------------------------

function saveConditions(newConditions: DisplayCondition[]): void {
  const stepId = step.value?.id
  const blockId = block.value?.id
  if (!stepId || !blockId || props.isReadonly) return
  editorStore.updateBlock(stepId, blockId, { displayConditions: newConditions })
}

function addCondition(): void {
  if (!hasFieldBlocks.value || props.isReadonly) return
  const firstBlock = blocksWithFieldKey.value[0]!
  const newCond: DisplayCondition = {
    blockId: firstBlock.id,
    operator: 'equals',
  }
  saveConditions([...conditions.value, newCond])
}

function removeCondition(idx: number): void {
  if (props.isReadonly) return
  saveConditions(conditions.value.filter((_, i) => i !== idx))
}

function updateConditionBlock(idx: number, blockId: string): void {
  const updated = conditions.value.map((c, i) =>
    i === idx ? cleanCondition({ ...c, blockId }) : c,
  )
  saveConditions(updated)
}

function updateConditionOperator(idx: number, operator: DisplayConditionOperator): void {
  const updated = conditions.value.map((c, i) =>
    i === idx ? cleanCondition({ ...c, operator }) : c,
  )
  saveConditions(updated)
}

function updateConditionValue(idx: number, value: string): void {
  const updated = conditions.value.map((c, i) =>
    i === idx ? { ...c, value } : c,
  )
  saveConditions(updated)
}

// ---------------------------------------------------------------------------
// CSS-Klassen
// ---------------------------------------------------------------------------
const selectCls = 'w-full rounded-md border border-ui-border bg-white px-2 py-1.5 text-xs text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent disabled:cursor-not-allowed disabled:opacity-50'
const inputCls = 'w-full rounded-md border border-ui-border bg-white px-2 py-1.5 text-xs text-ui-text placeholder:text-ui-muted focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent disabled:cursor-not-allowed disabled:opacity-50'
</script>

<template>
  <!-- Nur einblenden wenn es Bedingungsquellen gibt -->
  <section
    v-if="block && hasFieldBlocks"
    aria-labelledby="display-cond-heading"
    class="border-t border-ui-border"
  >
    <!-- Header mit Auf/Zu-Toggle -->
    <button
      type="button"
      class="flex w-full items-center justify-between px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ui-accent"
      :aria-expanded="expanded"
      aria-controls="display-cond-body"
      @click="expanded = !expanded"
    >
      <span class="flex items-center gap-1.5">
        <h3
          id="display-cond-heading"
          class="text-xs font-semibold text-ui-text"
        >
          Sichtbarkeit
        </h3>
        <!-- Badge: Anzahl aktiver Bedingungen -->
        <span
          v-if="conditions.length > 0"
          class="flex h-4 min-w-4 items-center justify-center rounded-full bg-ui-accent px-1 text-[10px] font-medium text-white"
          :aria-label="`${conditions.length} aktive Bedingung(en)`"
        >
          {{ conditions.length }}
        </span>
      </span>
      <svg
        :class="['h-3.5 w-3.5 shrink-0 text-ui-muted transition-transform', expanded ? 'rotate-180' : '']"
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

    <div
      v-show="expanded"
      id="display-cond-body"
      class="px-3 pb-3"
    >
      <!-- Leer-Zustand -->
      <p
        v-if="conditions.length === 0"
        class="mb-2 text-xs text-ui-muted"
      >
        Dieser Block ist immer sichtbar. Füge eine Bedingung hinzu, um ihn nur bei bestimmten Antworten anzuzeigen.
      </p>

      <!-- Bedingungen -->
      <ol
        v-else
        class="mb-2 space-y-2"
        aria-label="Sichtbarkeits-Bedingungen"
      >
        <li
          v-for="(cond, idx) in conditions"
          :key="idx"
          class="space-y-1 rounded-md border border-ui-border bg-ui-bg p-2"
        >
          <!-- Block-Auswahl -->
          <label
            :for="`dc-block-${block?.id}-${idx}`"
            class="sr-only"
          >
            Antwort-Feld für Bedingung {{ idx + 1 }}
          </label>
          <select
            :id="`dc-block-${block?.id}-${idx}`"
            :value="cond.blockId"
            :disabled="isReadonly"
            :class="selectCls"
            @change="updateConditionBlock(idx, ($event.target as HTMLSelectElement).value)"
          >
            <option
              v-for="b in blocksWithFieldKey"
              :key="b.id"
              :value="b.id"
            >
              {{ blockLabel(b.id) }}
            </option>
          </select>

          <!-- Operator + Loeschen -->
          <div class="flex items-center gap-1">
            <label
              :for="`dc-op-${block?.id}-${idx}`"
              class="sr-only"
            >
              Operator für Bedingung {{ idx + 1 }}
            </label>
            <select
              :id="`dc-op-${block?.id}-${idx}`"
              :value="cond.operator"
              :disabled="isReadonly"
              :class="[selectCls, 'flex-1']"
              @change="updateConditionOperator(idx, ($event.target as HTMLSelectElement).value as DisplayConditionOperator)"
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
              v-if="!isReadonly"
              type="button"
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-red-400 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
              :aria-label="`Bedingung ${idx + 1} löschen`"
              @click="removeCondition(idx)"
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

          <!-- Wert (nur wenn Operator einen Wert braucht) -->
          <div v-if="!VALUELESS_OPERATORS.has(cond.operator)">
            <label
              :for="`dc-val-${block?.id}-${idx}`"
              class="sr-only"
            >
              Vergleichswert für Bedingung {{ idx + 1 }}
            </label>
            <input
              :id="`dc-val-${block?.id}-${idx}`"
              type="text"
              :value="cond.value != null ? String(cond.value) : ''"
              :readonly="isReadonly"
              :class="inputCls"
              :placeholder="cond.operator === 'in_list' ? 'Werte kommagetrennt, z.B. a,b' : 'Vergleichswert'"
              @input="updateConditionValue(idx, ($event.target as HTMLInputElement).value)"
            >
          </div>
        </li>
      </ol>

      <!-- Bedingung hinzufuegen -->
      <button
        v-if="!isReadonly"
        type="button"
        class="flex items-center gap-1.5 text-xs text-ui-accent-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
        @click="addCondition"
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
        Bedingung hinzufügen
      </button>
    </div>
  </section>
</template>
