<!--
  EditorAddPanel: Perspective-Stil „Sektion hinzufügen"-Panel.
  Aufbau:
    1. Einfache Blöcke (aufklappbar) – direkte Block-Typen
    2. Interaktive Blöcke (aufklappbar) – Eingabe- und Auswahl-Typen
    3. Sektionen – vorgefertigte Block-Gruppen mit Thumbnail-Vorschau

  Klick auf einen Block-Eintrag: editorStore.addBlock + emit('close')
  Klick auf Thumbnail: editorStore.addBlocks + emit('close')
-->
<script setup lang="ts">
import type { BlockType } from '~/types/funnel'
import { useSectionTemplates, type SectionKey } from '~/composables/useSectionTemplates'
import BlockTypeIcon from '~/components/editor/BlockTypeIcon.vue'
import SectionIcon from '~/components/editor/SectionIcon.vue'
import SectionThumbnail from '~/components/editor/SectionThumbnail.vue'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const editorStore = useEditorStore()
const { sectionTemplates } = useSectionTemplates()

// ---------------------------------------------------------------------------
// Akkordeon-Zustand
// ---------------------------------------------------------------------------
const einfacheOpen = ref(false)
const interaktiveOpen = ref(false)
const expandedSection = ref<SectionKey | null>(null)

// ---------------------------------------------------------------------------
// Block-Listen
// ---------------------------------------------------------------------------
interface BlockEntry {
  type: BlockType
  label: string
}

const einfacheBlocks: BlockEntry[] = [
  { type: 'text', label: 'Text' },
  { type: 'image', label: 'Bild' },
  { type: 'button', label: 'Button' },
  { type: 'logo', label: 'Logo' },
  { type: 'progress_indicator', label: 'Fortschritt' },
  { type: 'video', label: 'Video' },
  { type: 'icon', label: 'Icon' },
  { type: 'divider', label: 'Trenner' },
  { type: 'spacer', label: 'Abstand' },
]

const interaktiveBlocks: BlockEntry[] = [
  { type: 'single_choice', label: 'Einfachauswahl' },
  { type: 'multi_choice', label: 'Mehrfachauswahl' },
  { type: 'input_text', label: 'Texteingabe' },
  { type: 'input_email', label: 'E-Mail' },
  { type: 'input_phone', label: 'Telefon' },
  { type: 'optin_checkbox', label: 'Opt-in' },
  { type: 'rating', label: 'Bewertung' },
  { type: 'input_date', label: 'Datum' },
  { type: 'input_time', label: 'Uhrzeit' },
  { type: 'input_number', label: 'Zahl' },
  { type: 'input_dropdown', label: 'Dropdown' },
  { type: 'input_textarea', label: 'Textfeld' },
]

// ---------------------------------------------------------------------------
// Aktionen
// ---------------------------------------------------------------------------
function pickBlock(type: BlockType): void {
  const stepId = editorStore.selectedStepId
  if (!stepId) return
  editorStore.addBlock(stepId, type)
  emit('close')
}

function pickSection(key: SectionKey): void {
  const stepId = editorStore.selectedStepId
  if (!stepId) return
  const template = sectionTemplates.find(t => t.key === key)
  if (!template) return
  editorStore.addBlocks(stepId, template.create())
  emit('close')
}

function toggleSection(key: SectionKey): void {
  expandedSection.value = expandedSection.value === key ? null : key
}
</script>

<template>
  <div class="select-none">
    <!-- ------------------------------------------------------------------ -->
    <!-- 1. Einfache Blöcke                                                  -->
    <!-- ------------------------------------------------------------------ -->
    <div class="border-b border-ui-border">
      <button
        type="button"
        class="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-ui-bg focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ui-accent/50"
        :aria-expanded="einfacheOpen"
        aria-controls="einfache-bloecke-liste"
        @click="einfacheOpen = !einfacheOpen"
      >
        <!-- Icon: blau, T -->
        <span
          class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-ui-accent text-white"
          aria-hidden="true"
        >
          <svg
            class="h-4 w-4"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          >
            <path d="M3 3h10M8 3v10" />
          </svg>
        </span>
        <span class="flex-1 text-sm font-medium text-ui-text">Einfache Blöcke</span>
        <svg
          class="h-4 w-4 flex-shrink-0 text-ui-muted transition-transform"
          :class="{ 'rotate-90': einfacheOpen }"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <ul
        v-if="einfacheOpen"
        id="einfache-bloecke-liste"
        role="list"
        class="pb-1"
      >
        <li
          v-for="entry in einfacheBlocks"
          :key="entry.type"
        >
          <button
            type="button"
            class="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-ui-bg focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ui-accent/50"
            :aria-label="`${entry.label} hinzufügen`"
            @click="pickBlock(entry.type)"
          >
            <!-- Block-Icon -->
            <span
              class="flex h-5 w-5 flex-shrink-0 items-center justify-center"
              aria-hidden="true"
            >
              <BlockTypeIcon :type="entry.type" />
            </span>
            <span class="text-sm text-ui-text">{{ entry.label }}</span>
          </button>
        </li>
      </ul>
    </div>

    <!-- ------------------------------------------------------------------ -->
    <!-- 2. Interaktive Blöcke                                               -->
    <!-- ------------------------------------------------------------------ -->
    <div class="border-b border-ui-border">
      <button
        type="button"
        class="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-ui-bg focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ui-accent/50"
        :aria-expanded="interaktiveOpen"
        aria-controls="interaktive-bloecke-liste"
        @click="interaktiveOpen = !interaktiveOpen"
      >
        <!-- Icon: blau, Punkte-Grid -->
        <span
          class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-ui-accent text-white"
          aria-hidden="true"
        >
          <svg
            class="h-4 w-4"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
          >
            <circle cx="4" cy="4" r="1.5" />
            <circle cx="8" cy="4" r="1.5" />
            <circle cx="12" cy="4" r="1.5" />
            <circle cx="4" cy="8" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="12" cy="8" r="1.5" />
            <circle cx="4" cy="12" r="1.5" />
            <circle cx="8" cy="12" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
          </svg>
        </span>
        <span class="flex-1 text-sm font-medium text-ui-text">Interaktive Blöcke</span>
        <svg
          class="h-4 w-4 flex-shrink-0 text-ui-muted transition-transform"
          :class="{ 'rotate-90': interaktiveOpen }"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <ul
        v-if="interaktiveOpen"
        id="interaktive-bloecke-liste"
        role="list"
        class="pb-1"
      >
        <li
          v-for="entry in interaktiveBlocks"
          :key="entry.type"
        >
          <button
            type="button"
            class="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-ui-bg focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ui-accent/50"
            :aria-label="`${entry.label} hinzufügen`"
            @click="pickBlock(entry.type)"
          >
            <span
              class="flex h-5 w-5 flex-shrink-0 items-center justify-center"
              aria-hidden="true"
            >
              <BlockTypeIcon :type="entry.type" />
            </span>
            <span class="text-sm text-ui-text">{{ entry.label }}</span>
          </button>
        </li>
      </ul>
    </div>

    <!-- ------------------------------------------------------------------ -->
    <!-- 3. Sektionen                                                         -->
    <!-- ------------------------------------------------------------------ -->
    <div class="px-3 pt-3 pb-1">
      <p class="text-xs font-semibold uppercase tracking-wide text-ui-muted">
        Sektionen
      </p>
    </div>

    <ul
      role="list"
      aria-label="Sektions-Vorlagen"
    >
      <li
        v-for="template in sectionTemplates"
        :key="template.key"
      >
        <!-- Akkordeon-Kopf -->
        <button
          type="button"
          class="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-ui-bg focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ui-accent/50"
          :class="{
            'bg-ui-accent-light text-ui-accent': expandedSection === template.key,
          }"
          :aria-expanded="expandedSection === template.key"
          :aria-controls="`section-thumb-${template.key}`"
          :aria-label="`${template.label}: ${template.description}`"
          @click="toggleSection(template.key)"
        >
          <!-- Sektion-Icon -->
          <span
            class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded"
            aria-hidden="true"
          >
            <SectionIcon :section-key="template.key" />
          </span>

          <span
            class="flex-1 text-sm font-medium"
            :class="expandedSection === template.key ? 'text-ui-accent' : 'text-ui-text'"
          >
            {{ template.label }}
          </span>

          <svg
            class="h-4 w-4 flex-shrink-0 transition-transform"
            :class="[
              expandedSection === template.key
                ? 'rotate-90 text-ui-accent'
                : 'text-ui-muted',
            ]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <!-- Thumbnail-Vorschau (aufgeklappt) -->
        <div
          v-if="expandedSection === template.key"
          :id="`section-thumb-${template.key}`"
          class="px-3 pb-3 pt-1"
        >
          <p class="mb-2 text-xs text-ui-muted">
            {{ template.description }}
          </p>

          <!-- SVG-Mock-Vorschau -->
          <div
            class="overflow-hidden rounded-lg border border-ui-border bg-white"
            aria-hidden="true"
          >
            <SectionThumbnail :section-key="template.key" />
          </div>

          <!-- Hinzufügen-Button -->
          <button
            type="button"
            class="mt-2 w-full rounded-lg bg-ui-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-ui-accent-hover focus:outline-none focus:ring-2 focus:ring-ui-accent/50 focus:ring-offset-1"
            :aria-label="`Sektion ${template.label} hinzufügen`"
            @click="pickSection(template.key)"
          >
            Hinzufügen
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>
