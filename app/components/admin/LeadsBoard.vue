<!--
  Kanban-Board fuer Bewerbungen (M4.5).

  Zeigt Board-Leads in 5 festen Phasen-Spalten (Neu, Gesichtet, Interview,
  Zusage, Absage). Drag-and-Drop via vue-draggable-plus zwischen Spalten;
  optimistisches Verschieben mit Rollback bei API-Fehler.

  Zugaenglicher Fallback:
  Jede Karte traegt ein sichtbares "Phase ändern"-Select-Element
  (fuer mp_admin/mp_team), das ebenfalls updateStage aufruft und per
  Tastatur bedienbar ist. Clients (isReadonly=true) sehen das Board ohne
  Drag-Handles und ohne das Select.

  Semantik:
  - Jede Spalte ist eine <ul role="list"> mit aria-label.
  - Karten sind <li> mit tabindex="0" und Enter-/Space-Handler.
  - VueDraggable wird mit :disabled="isReadonly" vollstaendig deaktiviert.
-->
<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { DraggableEvent } from 'vue-draggable-plus'
import type { BoardLead, LeadStage } from '~/composables/useLeads'
import {
  LEAD_STAGES,
  getLeadStageLabel,
  getLeadStageClass,
  getLeadStatusLabel,
  getLeadStatusClass,
  groupByStage,
  formatRelativeDate,
} from '~/composables/useLeads'

// ---------------------------------------------------------------------------
// Props + Emits
// ---------------------------------------------------------------------------

const props = defineProps<{
  /** Alle Board-Leads des Funnels (max. 500). */
  boardLeads: BoardLead[]
  /** UUID des Funnels fuer API-Aufrufe. */
  funnelId: string
  /** true = client-Rolle: kein Drag, kein Stage-Select. */
  isReadonly: boolean
}>()

const emit = defineEmits<{
  /** Karte angeklickt -> Detail-Drawer oeffnen. */
  (e: 'open-lead', leadId: string, event: MouseEvent | KeyboardEvent): void
  /** Phase wurde per Drag oder Select erfolgreich geaendert. */
  (e: 'stage-updated', leadId: string, stage: LeadStage): void
}>()

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

const leadsApi = useLeads()
const toast = useToast()

// ---------------------------------------------------------------------------
// Lokaler Board-Zustand
// ---------------------------------------------------------------------------

/**
 * Lokale Kopie der Spalten-Arrays fuer VueDraggable.
 * vue-draggable-plus mutiert diese Arrays beim Drop direkt.
 * Wir synchronisieren sie aus props.boardLeads via Watch.
 */
const localColumns = ref<Record<LeadStage, BoardLead[]>>({
  neu: [],
  gesichtet: [],
  interview: [],
  zusage: [],
  absage: [],
})

watch(
  () => props.boardLeads,
  (leads) => {
    const grouped = groupByStage(leads)
    for (const { value } of LEAD_STAGES) {
      localColumns.value[value] = [...grouped[value]]
    }
  },
  { immediate: true, deep: true },
)

// ---------------------------------------------------------------------------
// Drag-and-Drop (Cross-Column)
// ---------------------------------------------------------------------------

/**
 * Wird aufgerufen wenn ein Lead per Drag in eine andere Spalte verschoben
 * wurde (@add-Event: nur bei Wechsel zwischen Spalten).
 *
 * Optimistische Strategie:
 * 1. stage-Feld des Leads sofort auf destStage setzen.
 * 2. PATCH an API.
 * 3. Fehler: stage-Feld zuruecksetzen, Lead wieder in alte Spalte einfuegen.
 */
async function onAdd(evt: DraggableEvent<BoardLead>, destStage: LeadStage): Promise<void> {
  if (evt.newIndex === undefined) return

  const movedLead = localColumns.value[destStage][evt.newIndex]
  if (!movedLead) return

  // Nach @add hat vue-draggable-plus das Array bereits mutiert; stage zeigt
  // noch den alten Wert (wir haben ihn noch nicht geaendert).
  const oldStage = movedLead.stage
  const savedOldIndex = evt.oldIndex ?? 0

  // Guard: keine Cross-Column-Bewegung erkannt (Sicherheitscheck)
  if (oldStage === destStage) return

  // Optimistisch
  movedLead.stage = destStage

  try {
    await leadsApi.updateStage(props.funnelId, movedLead.id, destStage)
    emit('stage-updated', movedLead.id, destStage)
  } catch {
    toast.error('Phase konnte nicht geaendert werden.')

    // Rollback: stage wiederherstellen + Lead zurueck in alte Spalte
    movedLead.stage = oldStage
    const newColIdx = localColumns.value[destStage].findIndex((l) => l.id === movedLead.id)
    if (newColIdx !== -1) {
      const spliced = localColumns.value[destStage].splice(newColIdx, 1)
      const reverted = spliced[0]
      if (reverted !== undefined) {
        localColumns.value[oldStage].splice(savedOldIndex, 0, reverted)
      }
    }
  }
}

// ---------------------------------------------------------------------------
// a11y-Fallback: Phase per Select aendern
// ---------------------------------------------------------------------------

/**
 * Wird aufgerufen wenn der Nutzer das Stage-Select aendert.
 * Optimistisches Verschieben analog zu onAdd.
 */
async function changeStageViaSelect(lead: BoardLead, newStage: LeadStage): Promise<void> {
  const oldStage = lead.stage
  if (oldStage === newStage) return

  const oldColIdx = localColumns.value[oldStage].findIndex((l) => l.id === lead.id)

  // Optimistisch: Lead in neue Spalte verschieben
  if (oldColIdx !== -1) {
    const splicedMove = localColumns.value[oldStage].splice(oldColIdx, 1)
    const moved = splicedMove[0]
    if (moved !== undefined) {
      moved.stage = newStage
      localColumns.value[newStage].push(moved)
    }
  }

  try {
    await leadsApi.updateStage(props.funnelId, lead.id, newStage)
    emit('stage-updated', lead.id, newStage)
  } catch {
    toast.error('Phase konnte nicht geaendert werden.')

    // Rollback
    const revertIdx = localColumns.value[newStage].findIndex((l) => l.id === lead.id)
    if (revertIdx !== -1) {
      const splicedRevert = localColumns.value[newStage].splice(revertIdx, 1)
      const reverted = splicedRevert[0]
      if (reverted !== undefined) {
        reverted.stage = oldStage
        localColumns.value[oldStage].splice(oldColIdx, 0, reverted)
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Event-Handler fuer Karten
// ---------------------------------------------------------------------------

function handleCardClick(leadId: string, event: MouseEvent): void {
  emit('open-lead', leadId, event)
}

function handleCardKeydown(leadId: string, event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    emit('open-lead', leadId, event)
  }
}

function handleSelectChange(lead: BoardLead, event: Event): void {
  const value = (event.target as HTMLSelectElement).value as LeadStage
  void changeStageViaSelect(lead, value)
}
</script>

<template>
  <!--
    Horizontales Scrollen auf kleinen Screens.
    Auf grossen Screens fuellen die 5 Spalten die volle Breite.
  -->
  <div
    class="flex gap-3 overflow-x-auto pb-2"
    role="region"
    aria-label="Kanban-Board: Bewerbungen nach Phase"
  >
    <div
      v-for="stageDef in LEAD_STAGES"
      :key="stageDef.value"
      class="flex w-64 flex-shrink-0 flex-col xl:w-auto xl:flex-1"
    >
      <!-- Spalten-Header -->
      <div class="mb-2 flex items-center justify-between px-1">
        <span
          :id="`board-col-${stageDef.value}-label`"
          class="text-sm font-semibold text-ui-text"
        >
          {{ stageDef.label }}
        </span>
        <span
          class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-200 px-1.5 text-xs font-medium text-ui-muted"
          aria-hidden="true"
        >
          {{ localColumns[stageDef.value].length }}
        </span>
      </div>

      <!-- Karten-Liste mit optionalem DnD -->
      <VueDraggable
        v-model="localColumns[stageDef.value]"
        tag="ul"
        group="kanban-board"
        :animation="150"
        :disabled="isReadonly"
        ghost-class="board-card-ghost"
        class="flex min-h-20 flex-1 flex-col gap-2 rounded-xl bg-ui-bg p-2"
        :aria-labelledby="`board-col-${stageDef.value}-label`"
        role="list"
        @add="(evt: DraggableEvent<BoardLead>) => onAdd(evt, stageDef.value)"
      >
        <!-- Leerer Zustand der Spalte -->
        <li
          v-if="localColumns[stageDef.value].length === 0"
          class="flex items-center justify-center rounded-lg border border-dashed border-ui-border py-6 text-xs text-ui-muted"
          aria-label="Keine Einträge in dieser Phase"
        >
          Keine Einträge
        </li>

        <!-- Karte -->
        <li
          v-for="lead in localColumns[stageDef.value]"
          :key="lead.id"
          class="group rounded-lg border border-ui-border bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,.04)] transition-shadow hover:shadow-md"
          :class="{ 'cursor-grab active:cursor-grabbing': !isReadonly }"
          tabindex="0"
          :aria-label="`Kontakt: ${lead.first_answer?.value ?? 'Ohne Name'}, eingegangen ${formatRelativeDate(lead.created_at)}`"
          role="listitem"
          @click="handleCardClick(lead.id, $event)"
          @keydown="handleCardKeydown(lead.id, $event)"
        >
          <!-- Name / erste Antwort -->
          <p
            class="truncate text-sm font-medium text-ui-text"
            :title="lead.first_answer?.value ?? undefined"
          >
            {{ lead.first_answer?.value ?? 'Ohne Name' }}
          </p>

          <!-- Datum + Status-Badge -->
          <div class="mt-2 flex items-center justify-between gap-2">
            <time
              :datetime="lead.created_at"
              class="text-xs text-ui-muted"
            >
              {{ formatRelativeDate(lead.created_at) }}
            </time>
            <span
              :class="[
                'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                getLeadStatusClass(lead.status),
              ]"
              :aria-label="`Status: ${getLeadStatusLabel(lead.status)}`"
            >
              {{ getLeadStatusLabel(lead.status) }}
            </span>
          </div>

          <!--
            a11y-Fallback: Phase per Select aendern.
            Nur fuer mp_admin / mp_team (canWrite); clients sehen es nicht.
            @click.stop verhindert, dass der Drawer durch das Select-Oeffnen
            ausgeloest wird.
          -->
          <div
            v-if="!isReadonly"
            class="mt-2.5"
            @click.stop
          >
            <label
              :for="`stage-select-${lead.id}`"
              class="mb-1 block text-[10px] font-medium text-ui-muted"
            >
              Phase ändern
            </label>
            <div class="relative">
              <select
                :id="`stage-select-${lead.id}`"
                :value="lead.stage"
                class="w-full appearance-none rounded-md border border-ui-border bg-white py-1 pl-2 pr-6 text-xs font-medium text-ui-text shadow-sm transition-colors hover:border-ui-accent/40 focus:outline-none focus:ring-2 focus:ring-ui-accent"
                :aria-label="`Phase für diesen Kontakt ändern (aktuell: ${getLeadStageLabel(lead.stage)})`"
                data-testid="stage-select"
                @change="handleSelectChange(lead, $event)"
              >
                <option
                  v-for="s in LEAD_STAGES"
                  :key="s.value"
                  :value="s.value"
                >
                  {{ s.label }}
                </option>
              </select>
              <svg
                class="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-ui-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <!--
            Phasen-Badge (read-only fuer clients).
            Nur anzeigen wenn kein Select vorhanden.
          -->
          <div
            v-else
            class="mt-2"
          >
            <span
              :class="[
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                getLeadStageClass(lead.stage),
              ]"
            >
              {{ getLeadStageLabel(lead.stage) }}
            </span>
          </div>
        </li>
      </VueDraggable>
    </div>
  </div>
</template>

<style scoped>
/*
 * Geisterelement waehrend des Drags: leicht transparent mit Akzentrahmen.
 * ghost-class="board-card-ghost" (vue-draggable-plus uebertraegt die Klasse
 * auf das Original-Element, das als Platzhalter im DOM verbleibt).
 */
:deep(.board-card-ghost) {
  opacity: 0.4;
  border: 2px dashed var(--color-ui-accent);
  background: var(--color-ui-accent-light);
}
</style>
