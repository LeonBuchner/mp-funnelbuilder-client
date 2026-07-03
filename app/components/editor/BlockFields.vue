<!--
  EditorBlockFields: Block-Typ-spezifische Formularfelder.
  Wird vom linken Panel im Kontext-Modus genutzt (Block selektiert).
  Eigenständige Komponente, damit LeftPanel.vue schlank bleibt.
-->
<script setup lang="ts">
import type {
  Block,
  TextBlock,
  ImageBlock,
  LogoBlock,
  ButtonBlock,
  SingleChoiceBlock,
  InputTextBlock,
  InputEmailBlock,
  InputPhoneBlock,
  OptinCheckboxBlock,
  SingleChoiceOption,
  ButtonAction,
  ButtonStyle,
  MultiChoiceBlock,
  InputDateBlock,
  InputTimeBlock,
  InputNumberBlock,
  InputDropdownBlock,
  InputTextareaBlock,
  RatingBlock,
  DividerBlock,
  SpacerBlock,
  VideoBlock,
  IconBlock,
  ChoiceOption,
  MultiChoiceImageLayout,
} from '~/types/funnel'
import { useWorkspaceStore } from '~/stores/workspace'
import BlockIcon from '~/components/blocks/BlockIcon.vue'

const props = defineProps<{
  selectedBlock: Block | null
  isReadonly: boolean
}>()

const emit = defineEmits<{
  (e: 'update-block', patch: Partial<Block>): void
}>()

// ---------------------------------------------------------------------------
// CSS-Klasse fuer alle Formular-Inputs (einheitlicher Stil)
// ---------------------------------------------------------------------------
const inputCls =
  'w-full rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent'

const selectCls =
  'w-full rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent'

// ---------------------------------------------------------------------------
// M1-Typen: bestehende Hilfsfunktionen
// ---------------------------------------------------------------------------

function updateText(field: keyof Omit<TextBlock, 'id' | 'type'>, value: string): void {
  emit('update-block', { [field]: value } as Partial<Block>)
}

function updateImage(field: keyof Omit<ImageBlock, 'id' | 'type'>, value: string | number): void {
  emit('update-block', { [field]: value } as Partial<Block>)
}

function updateButton(patch: Partial<Omit<ButtonBlock, 'id' | 'type'>>): void {
  emit('update-block', patch as Partial<Block>)
}

function updateChoice(patch: Partial<Omit<SingleChoiceBlock, 'id' | 'type'>>): void {
  emit('update-block', patch as Partial<Block>)
}

function updateInputField(field: 'label' | 'placeholder' | 'required', value: string | boolean): void {
  emit('update-block', { [field]: value } as Partial<Block>)
}

function updateOptin(
  field: keyof Omit<OptinCheckboxBlock, 'id' | 'type'>,
  value: string | boolean,
): void {
  emit('update-block', { [field]: value } as Partial<Block>)
}

function addChoiceOption(): void {
  if (!props.selectedBlock || props.selectedBlock.type !== 'single_choice') return
  const block = props.selectedBlock as SingleChoiceBlock
  const newOption: SingleChoiceOption = {
    id: crypto.randomUUID(),
    label: `Option ${block.options.length + 1}`,
    value: `option_${block.options.length + 1}`,
  }
  updateChoice({ options: [...block.options, newOption] })
}

function removeChoiceOption(optionId: string): void {
  if (!props.selectedBlock || props.selectedBlock.type !== 'single_choice') return
  const block = props.selectedBlock as SingleChoiceBlock
  updateChoice({ options: block.options.filter(o => o.id !== optionId) })
}

function updateChoiceOption(optionId: string, field: 'label' | 'value', value: string): void {
  if (!props.selectedBlock || props.selectedBlock.type !== 'single_choice') return
  const block = props.selectedBlock as SingleChoiceBlock
  updateChoice({
    options: block.options.map(o => (o.id === optionId ? { ...o, [field]: value } : o)),
  })
}

function phoneCodesFromString(value: string): string[] {
  return value
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean)
}

// ---------------------------------------------------------------------------
// M2-Typen: Hilfsfunktionen
// ---------------------------------------------------------------------------

// --- multi_choice ---

function updateMultiChoice(patch: Partial<Omit<MultiChoiceBlock, 'id' | 'type'>>): void {
  emit('update-block', patch as Partial<Block>)
}

function addMultiOption(): void {
  if (!props.selectedBlock || props.selectedBlock.type !== 'multi_choice') return
  const block = props.selectedBlock as MultiChoiceBlock
  const newOption: ChoiceOption = {
    id: crypto.randomUUID(),
    label: `Option ${block.options.length + 1}`,
    value: `option_${block.options.length + 1}`,
  }
  updateMultiChoice({ options: [...block.options, newOption] })
}

function removeMultiOption(optionId: string): void {
  if (!props.selectedBlock || props.selectedBlock.type !== 'multi_choice') return
  const block = props.selectedBlock as MultiChoiceBlock
  updateMultiChoice({ options: block.options.filter(o => o.id !== optionId) })
}

function updateMultiOption(optionId: string, field: 'label' | 'value', value: string): void {
  if (!props.selectedBlock || props.selectedBlock.type !== 'multi_choice') return
  const block = props.selectedBlock as MultiChoiceBlock
  updateMultiChoice({
    options: block.options.map(o => (o.id === optionId ? { ...o, [field]: value } : o)),
  })
}

// --- rating ---

function updateRating(patch: Partial<Omit<RatingBlock, 'id' | 'type'>>): void {
  emit('update-block', patch as Partial<Block>)
}

// --- video ---

function updateVideo(patch: Partial<Omit<VideoBlock, 'id' | 'type'>>): void {
  emit('update-block', patch as Partial<Block>)
}

// --- icon ---

function updateIconBlock(patch: Partial<Omit<IconBlock, 'id' | 'type'>>): void {
  emit('update-block', patch as Partial<Block>)
}

// --- input_date / input_time ---

function updateInputDate(patch: Partial<Omit<InputDateBlock, 'id' | 'type'>>): void {
  emit('update-block', patch as Partial<Block>)
}

function updateInputTime(patch: Partial<Omit<InputTimeBlock, 'id' | 'type'>>): void {
  emit('update-block', patch as Partial<Block>)
}

// --- input_number ---

function updateInputNumber(patch: Partial<Omit<InputNumberBlock, 'id' | 'type'>>): void {
  emit('update-block', patch as Partial<Block>)
}

// --- input_dropdown ---

function updateInputDropdown(patch: Partial<Omit<InputDropdownBlock, 'id' | 'type'>>): void {
  emit('update-block', patch as Partial<Block>)
}

function addDropdownOption(): void {
  if (!props.selectedBlock || props.selectedBlock.type !== 'input_dropdown') return
  const block = props.selectedBlock as InputDropdownBlock
  const newOption = {
    id: crypto.randomUUID(),
    label: `Option ${block.options.length + 1}`,
    value: `option_${block.options.length + 1}`,
  }
  updateInputDropdown({ options: [...block.options, newOption] })
}

function removeDropdownOption(optionId: string): void {
  if (!props.selectedBlock || props.selectedBlock.type !== 'input_dropdown') return
  const block = props.selectedBlock as InputDropdownBlock
  updateInputDropdown({ options: block.options.filter(o => o.id !== optionId) })
}

function updateDropdownOption(optionId: string, field: 'label' | 'value', value: string): void {
  if (!props.selectedBlock || props.selectedBlock.type !== 'input_dropdown') return
  const block = props.selectedBlock as InputDropdownBlock
  updateInputDropdown({
    options: block.options.map(o => (o.id === optionId ? { ...o, [field]: value } : o)),
  })
}

// --- input_textarea ---

function updateInputTextarea(patch: Partial<Omit<InputTextareaBlock, 'id' | 'type'>>): void {
  emit('update-block', patch as Partial<Block>)
}

// --- divider ---

function updateDividerStyle(key: string, value: string): void {
  if (!props.selectedBlock || props.selectedBlock.type !== 'divider') return
  const block = props.selectedBlock as DividerBlock
  emit('update-block', { styles: { ...(block.styles ?? {}), [key]: value } } as Partial<Block>)
}

// --- spacer ---

function updateSpacer(patch: Partial<Omit<SpacerBlock, 'id' | 'type'>>): void {
  emit('update-block', patch as Partial<Block>)
}

// ---------------------------------------------------------------------------
// Icon-Auswahl: verfügbare Icon-Namen (aus BlockIcon.vue iconMap)
// ---------------------------------------------------------------------------
const ICON_NAMES = [
  'activity', 'alert-circle', 'alert-triangle', 'anchor', 'aperture',
  'arrow-down', 'arrow-left', 'arrow-right', 'arrow-up', 'award',
  'bar-chart', 'battery', 'bell', 'bluetooth', 'bookmark', 'box',
  'briefcase', 'calendar', 'camera', 'car', 'check', 'check-circle',
  'chevron-down', 'chevron-left', 'chevron-right', 'chevron-up',
  'circle', 'clipboard', 'clock', 'cloud', 'coffee', 'compass',
  'copy', 'cpu', 'credit-card', 'crosshair', 'database', 'diamond',
  'dollar-sign', 'download', 'edit', 'eye', 'eye-off', 'file',
  'filter', 'flag', 'folder', 'frown', 'gift', 'globe', 'grid',
  'headphones', 'heart', 'hexagon', 'home', 'image', 'info',
  'laptop', 'layers', 'layout', 'link', 'list', 'lock',
  'mail', 'map', 'map-pin', 'meh', 'message-circle', 'message-square',
  'mic', 'minus', 'monitor', 'moon', 'music', 'navigation',
  'package', 'pause', 'pen', 'pen-tool', 'phone', 'plane',
  'play', 'plus', 'power', 'printer', 'repeat', 'rocket',
  'search', 'send', 'server', 'settings', 'share', 'shield',
  'shuffle', 'skip-back', 'skip-forward', 'sliders', 'smartphone',
  'smile', 'square', 'star', 'stop', 'sun', 'table', 'tablet',
  'tag', 'target', 'thermometer', 'train', 'trash', 'trending-down',
  'trending-up', 'triangle', 'trophy', 'truck', 'upload', 'user',
  'video', 'volume', 'wifi', 'wind', 'wrench', 'x', 'x-circle', 'zap',
] as const

/** Erstellt einen minimalen IconBlock fuer die Vorschau */
function previewIconBlock(iconName: string): IconBlock {
  return { id: 'preview', type: 'icon', iconName, size: 24 }
}

// ---------------------------------------------------------------------------
// Bild-Picker / Logo-Picker (Workspace-Mediathek B10)
// ---------------------------------------------------------------------------

const workspaceStore = useWorkspaceStore()

/** UUID des aktiven Workspace fuer den Mediathek-API-Aufruf. */
const workspaceUuid = computed<string>(() => workspaceStore.activeWorkspace?.id ?? '')

/** Steuert das ImagePickerModal fuer image-Bloecke. */
const showImagePicker = ref(false)

/** Zeigt das manuelle URL-Eingabefeld fuer image-Bloecke. */
const showExternalImageUrl = ref(false)

/** Steuert das ImagePickerModal fuer logo-Bloecke. */
const showLogoPicker = ref(false)

/** Picker-Zustand zuruecksetzen wenn ein anderer Block gewaehlt wird. */
watch(
  () => props.selectedBlock?.id,
  () => {
    showImagePicker.value = false
    showLogoPicker.value = false
    showExternalImageUrl.value = false
  },
)

function updateLogo(patch: Partial<Omit<LogoBlock, 'id' | 'type'>>): void {
  emit('update-block', patch as Partial<Block>)
}

/** Wird vom ImagePickerModal aufgerufen wenn ein Bild fuer image-Block gewaehlt wird. */
function onImagePickerSelect(payload: { url: string, alt_text: string | null }): void {
  const block = props.selectedBlock
  if (!block || block.type !== 'image') return
  const currentAlt = (block as ImageBlock).alt
  emit('update-block', {
    url: payload.url,
    // Alt-Text nur befuellen wenn er bisher leer ist
    ...(currentAlt ? {} : { alt: payload.alt_text ?? '' }),
  } as Partial<Block>)
  showImagePicker.value = false
}

/** Wird vom ImagePickerModal aufgerufen wenn ein Bild fuer logo-Block gewaehlt wird. */
function onLogoPickerSelect(payload: { url: string, alt_text: string | null }): void {
  const block = props.selectedBlock
  if (!block || block.type !== 'logo') return
  const currentAlt = (block as LogoBlock).alt
  emit('update-block', {
    url: payload.url,
    ...(currentAlt ? {} : { alt: payload.alt_text ?? '' }),
  } as Partial<Block>)
  showLogoPicker.value = false
}
</script>

<template>
  <div>
    <p
      v-if="!selectedBlock"
      class="text-sm text-ui-muted"
    >
      Klicke auf einen Block im Frame, um ihn zu bearbeiten.
    </p>

    <!-- TEXT -->
    <template v-else-if="selectedBlock.type === 'text'">
      <div class="space-y-3">
        <div>
          <label
            for="bf-text-content"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Inhalt (HTML)
          </label>
          <textarea
            id="bf-text-content"
            :value="(selectedBlock as TextBlock).content"
            :readonly="isReadonly"
            rows="6"
            class="w-full rounded-lg border border-ui-border bg-white px-3 py-2 font-mono text-xs text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent"
            @input="updateText('content', ($event.target as HTMLTextAreaElement).value)"
          />
        </div>
      </div>
    </template>

    <!-- IMAGE -->
    <template v-else-if="selectedBlock.type === 'image'">
      <div class="space-y-3">
        <!-- Vorschau des aktuellen Bildes -->
        <div
          v-if="(selectedBlock as ImageBlock).url"
          class="overflow-hidden rounded-lg border border-ui-border"
        >
          <img
            :src="(selectedBlock as ImageBlock).url"
            :alt="(selectedBlock as ImageBlock).alt || 'Vorschau'"
            class="h-24 w-full bg-ui-bg object-contain py-1"
            loading="lazy"
          >
        </div>

        <!-- Picker-Button -->
        <button
          v-if="!isReadonly"
          type="button"
          class="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-ui-border bg-white px-3 py-2 text-sm text-ui-accent transition-colors hover:border-ui-accent hover:bg-ui-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
          @click="showImagePicker = true"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
            />
          </svg>
          {{ (selectedBlock as ImageBlock).url ? 'Bild ändern' : 'Bild wählen' }}
        </button>

        <!-- Toggle: Externe URL -->
        <label
          v-if="!isReadonly"
          class="flex items-center gap-2 text-sm text-ui-text"
        >
          <input
            v-model="showExternalImageUrl"
            type="checkbox"
            class="h-4 w-4 accent-ui-accent"
          >
          Externe URL verwenden
        </label>

        <!-- Manuelles URL-Feld (nur bei aktivem Toggle oder readonly) -->
        <div v-if="showExternalImageUrl || isReadonly">
          <label
            for="bf-image-url"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Bild-URL
          </label>
          <input
            id="bf-image-url"
            type="url"
            :value="(selectedBlock as ImageBlock).url"
            :readonly="isReadonly"
            placeholder="https://..."
            :class="inputCls"
            @input="updateImage('url', ($event.target as HTMLInputElement).value)"
          >
        </div>

        <!-- Alt-Text -->
        <div>
          <label
            for="bf-image-alt"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Alt-Text (Barrierefreiheit)
          </label>
          <input
            id="bf-image-alt"
            type="text"
            :value="(selectedBlock as ImageBlock).alt"
            :readonly="isReadonly"
            placeholder="Kurze Bildbeschreibung"
            :class="inputCls"
            @input="updateImage('alt', ($event.target as HTMLInputElement).value)"
          >
          <!-- Warnung wenn kein Alt-Text gesetzt ist (B5) -->
          <p
            v-if="!(selectedBlock as ImageBlock).alt"
            class="mt-1.5 rounded-md bg-orange-50 px-2.5 py-1.5 text-xs text-orange-700"
            role="alert"
          >
            Ohne Alt-Text ist das Bild fuer Screenreader und SEO unsichtbar.
          </p>
        </div>

        <!-- Breite / Höhe -->
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label
              for="bf-image-width"
              class="mb-1 block text-xs font-medium text-ui-muted"
            >
              Breite (px)
            </label>
            <input
              id="bf-image-width"
              type="number"
              :value="(selectedBlock as ImageBlock).width ?? ''"
              :readonly="isReadonly"
              min="1"
              :class="inputCls"
              @input="updateImage('width', Number(($event.target as HTMLInputElement).value) || 0)"
            >
          </div>
          <div>
            <label
              for="bf-image-height"
              class="mb-1 block text-xs font-medium text-ui-muted"
            >
              Höhe (px)
            </label>
            <input
              id="bf-image-height"
              type="number"
              :value="(selectedBlock as ImageBlock).height ?? ''"
              :readonly="isReadonly"
              min="1"
              :class="inputCls"
              @input="updateImage('height', Number(($event.target as HTMLInputElement).value) || 0)"
            >
          </div>
        </div>
      </div>

      <!-- Bild-Picker Modal -->
      <EditorImagePickerModal
        v-if="showImagePicker && workspaceUuid"
        :workspace-uuid="workspaceUuid"
        :is-readonly="isReadonly"
        @select="onImagePickerSelect"
        @close="showImagePicker = false"
      />
    </template>

    <!-- BUTTON -->
    <template v-else-if="selectedBlock.type === 'button'">
      <div class="space-y-3">
        <div>
          <label
            for="bf-btn-label"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Beschriftung
          </label>
          <input
            id="bf-btn-label"
            type="text"
            :value="(selectedBlock as ButtonBlock).label"
            :readonly="isReadonly"
            :class="inputCls"
            @input="updateButton({ label: ($event.target as HTMLInputElement).value })"
          >
        </div>
        <div>
          <label
            for="bf-btn-action"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Aktion
          </label>
          <select
            id="bf-btn-action"
            :value="(selectedBlock as ButtonBlock).action"
            :disabled="isReadonly"
            :class="selectCls"
            @change="updateButton({ action: ($event.target as HTMLSelectElement).value as ButtonAction })"
          >
            <option value="next">Nächster Schritt</option>
            <option value="submit">Absenden</option>
            <option value="external_url">Externer Link</option>
            <option value="restart">Neu starten</option>
          </select>
        </div>
        <div
          v-if="(selectedBlock as ButtonBlock).action === 'external_url'"
          class="space-y-2"
        >
          <div>
            <label
              for="bf-btn-url"
              class="mb-1 block text-xs font-medium text-ui-muted"
            >
              Ziel-URL
            </label>
            <input
              id="bf-btn-url"
              type="url"
              :value="(selectedBlock as ButtonBlock).externalUrl ?? ''"
              :readonly="isReadonly"
              placeholder="https://..."
              :class="inputCls"
              @input="updateButton({ externalUrl: ($event.target as HTMLInputElement).value })"
            >
          </div>
          <label class="flex items-center gap-2 text-sm text-ui-text">
            <input
              type="checkbox"
              :checked="(selectedBlock as ButtonBlock).openInNewTab ?? false"
              :disabled="isReadonly"
              class="h-4 w-4 accent-ui-accent"
              @change="updateButton({ openInNewTab: ($event.target as HTMLInputElement).checked })"
            >
            In neuem Tab öffnen
          </label>
        </div>
        <div>
          <label
            for="bf-btn-style"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Stil
          </label>
          <select
            id="bf-btn-style"
            :value="(selectedBlock as ButtonBlock).style"
            :disabled="isReadonly"
            :class="selectCls"
            @change="updateButton({ style: ($event.target as HTMLSelectElement).value as ButtonStyle })"
          >
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
            <option value="outline">Outline</option>
            <option value="ghost">Ghost</option>
          </select>
        </div>
      </div>
    </template>

    <!-- SINGLE_CHOICE -->
    <template v-else-if="selectedBlock.type === 'single_choice'">
      <div class="space-y-3">
        <div>
          <label
            for="bf-choice-question"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Frage
          </label>
          <input
            id="bf-choice-question"
            type="text"
            :value="(selectedBlock as SingleChoiceBlock).question"
            :readonly="isReadonly"
            :class="inputCls"
            @input="updateChoice({ question: ($event.target as HTMLInputElement).value })"
          >
        </div>
        <div class="space-y-1">
          <p class="text-xs font-medium text-ui-muted">
            Antwort-Optionen
          </p>
          <div
            v-for="option in (selectedBlock as SingleChoiceBlock).options"
            :key="option.id"
            class="flex items-center gap-2"
          >
            <input
              type="text"
              :value="option.label"
              :readonly="isReadonly"
              :aria-label="`Option ${option.label} - Bezeichnung`"
              placeholder="Bezeichnung"
              class="min-w-0 flex-1 rounded border border-ui-border bg-white px-2 py-1 text-xs text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent"
              @input="updateChoiceOption(option.id, 'label', ($event.target as HTMLInputElement).value)"
            >
            <button
              v-if="!isReadonly"
              type="button"
              class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-red-400 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
              :aria-label="`Option ${option.label} löschen`"
              @click="removeChoiceOption(option.id)"
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
          <button
            v-if="!isReadonly"
            type="button"
            class="mt-1 text-xs text-ui-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
            @click="addChoiceOption"
          >
            + Option hinzufügen
          </button>
        </div>
        <div class="flex flex-wrap gap-3">
          <label class="flex items-center gap-2 text-sm text-ui-text">
            <input
              type="checkbox"
              :checked="(selectedBlock as SingleChoiceBlock).autoAdvance"
              :disabled="isReadonly"
              class="h-4 w-4 accent-ui-accent"
              @change="updateChoice({ autoAdvance: ($event.target as HTMLInputElement).checked })"
            >
            Automatisch weiter
          </label>
          <label class="flex items-center gap-2 text-sm text-ui-text">
            <input
              type="checkbox"
              :checked="(selectedBlock as SingleChoiceBlock).required ?? false"
              :disabled="isReadonly"
              class="h-4 w-4 accent-ui-accent"
              @change="updateChoice({ required: ($event.target as HTMLInputElement).checked })"
            >
            Pflichtfeld
          </label>
        </div>
      </div>
    </template>

    <!-- INPUT_TEXT / INPUT_EMAIL -->
    <template
      v-else-if="selectedBlock.type === 'input_text' || selectedBlock.type === 'input_email'"
    >
      <div class="space-y-3">
        <div>
          <label
            for="bf-input-label"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Bezeichnung
          </label>
          <input
            id="bf-input-label"
            type="text"
            :value="(selectedBlock as InputTextBlock | InputEmailBlock).label"
            :readonly="isReadonly"
            :class="inputCls"
            @input="updateInputField('label', ($event.target as HTMLInputElement).value)"
          >
        </div>
        <div>
          <label
            for="bf-input-placeholder"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Platzhalter
          </label>
          <input
            id="bf-input-placeholder"
            type="text"
            :value="(selectedBlock as InputTextBlock | InputEmailBlock).placeholder ?? ''"
            :readonly="isReadonly"
            :class="inputCls"
            @input="updateInputField('placeholder', ($event.target as HTMLInputElement).value)"
          >
        </div>
        <label class="flex items-center gap-2 text-sm text-ui-text">
          <input
            type="checkbox"
            :checked="(selectedBlock as InputTextBlock | InputEmailBlock).required ?? false"
            :disabled="isReadonly"
            class="h-4 w-4 accent-ui-accent"
            @change="updateInputField('required', ($event.target as HTMLInputElement).checked)"
          >
          Pflichtfeld
        </label>
      </div>
    </template>

    <!-- INPUT_PHONE -->
    <template v-else-if="selectedBlock.type === 'input_phone'">
      <div class="space-y-3">
        <div>
          <label
            for="bf-phone-label"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Bezeichnung
          </label>
          <input
            id="bf-phone-label"
            type="text"
            :value="(selectedBlock as InputPhoneBlock).label"
            :readonly="isReadonly"
            :class="inputCls"
            @input="emit('update-block', { label: ($event.target as HTMLInputElement).value } as Partial<Block>)"
          >
        </div>
        <div>
          <label
            for="bf-phone-country"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Standard-Ländercode
          </label>
          <input
            id="bf-phone-country"
            type="text"
            :value="(selectedBlock as InputPhoneBlock).defaultCountryCode"
            :readonly="isReadonly"
            maxlength="2"
            placeholder="DE"
            class="w-full rounded-lg border border-ui-border bg-white px-3 py-2 text-sm uppercase text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent"
            @input="emit('update-block', { defaultCountryCode: ($event.target as HTMLInputElement).value.toUpperCase() } as Partial<Block>)"
          >
        </div>
        <div>
          <label
            for="bf-phone-codes"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Erlaubte Ländercodes (kommagetrennt)
          </label>
          <input
            id="bf-phone-codes"
            type="text"
            :value="(selectedBlock as InputPhoneBlock).allowedCountryCodes.join(', ')"
            :readonly="isReadonly"
            placeholder="DE, AT, CH"
            :class="inputCls"
            @change="emit('update-block', { allowedCountryCodes: phoneCodesFromString(($event.target as HTMLInputElement).value) } as Partial<Block>)"
          >
        </div>
        <label class="flex items-center gap-2 text-sm text-ui-text">
          <input
            type="checkbox"
            :checked="(selectedBlock as InputPhoneBlock).required ?? false"
            :disabled="isReadonly"
            class="h-4 w-4 accent-ui-accent"
            @change="emit('update-block', { required: ($event.target as HTMLInputElement).checked } as Partial<Block>)"
          >
          Pflichtfeld
        </label>
      </div>
    </template>

    <!-- OPTIN_CHECKBOX -->
    <template v-else-if="selectedBlock.type === 'optin_checkbox'">
      <div class="space-y-3">
        <div>
          <label
            for="bf-optin-label"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Checkbox-Text (HTML erlaubt)
          </label>
          <textarea
            id="bf-optin-label"
            :value="(selectedBlock as OptinCheckboxBlock).checkboxLabel"
            :readonly="isReadonly"
            rows="3"
            class="w-full rounded-lg border border-ui-border bg-white px-3 py-2 font-mono text-xs text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent"
            @input="updateOptin('checkboxLabel', ($event.target as HTMLTextAreaElement).value)"
          />
        </div>
        <label class="flex items-center gap-2 text-sm text-ui-text">
          <input
            type="checkbox"
            :checked="(selectedBlock as OptinCheckboxBlock).required"
            :disabled="isReadonly"
            class="h-4 w-4 accent-ui-accent"
            @change="updateOptin('required', ($event.target as HTMLInputElement).checked)"
          >
          Pflichtfeld
        </label>
      </div>
    </template>

    <!-- MULTI_CHOICE -->
    <template v-else-if="selectedBlock.type === 'multi_choice'">
      <div class="space-y-3">
        <div>
          <label
            for="bf-multi-question"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Frage
          </label>
          <input
            id="bf-multi-question"
            type="text"
            :value="(selectedBlock as MultiChoiceBlock).question"
            :readonly="isReadonly"
            :class="inputCls"
            @input="updateMultiChoice({ question: ($event.target as HTMLInputElement).value })"
          >
        </div>

        <div class="space-y-1">
          <p class="text-xs font-medium text-ui-muted">
            Antwort-Optionen
          </p>
          <div
            v-for="option in (selectedBlock as MultiChoiceBlock).options"
            :key="option.id"
            class="flex items-center gap-2"
          >
            <input
              type="text"
              :value="option.label"
              :readonly="isReadonly"
              :aria-label="`Option ${option.label} - Bezeichnung`"
              placeholder="Bezeichnung"
              class="min-w-0 flex-1 rounded border border-ui-border bg-white px-2 py-1 text-xs text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent"
              @input="updateMultiOption(option.id, 'label', ($event.target as HTMLInputElement).value)"
            >
            <button
              v-if="!isReadonly"
              type="button"
              class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-red-400 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
              :aria-label="`Option ${option.label} löschen`"
              @click="removeMultiOption(option.id)"
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
          <button
            v-if="!isReadonly"
            type="button"
            class="mt-1 text-xs text-ui-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
            @click="addMultiOption"
          >
            + Option hinzufügen
          </button>
        </div>

        <div>
          <label
            for="bf-multi-layout"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Darstellung
          </label>
          <select
            id="bf-multi-layout"
            :value="(selectedBlock as MultiChoiceBlock).imageLayout"
            :disabled="isReadonly"
            :class="selectCls"
            @change="updateMultiChoice({ imageLayout: ($event.target as HTMLSelectElement).value as MultiChoiceImageLayout })"
          >
            <option value="none">Text (keine Bilder)</option>
            <option value="icon">Icon-Raster</option>
            <option value="image">Bild-Cards</option>
          </select>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label
              for="bf-multi-min"
              class="mb-1 block text-xs font-medium text-ui-muted"
            >
              Min. Auswahl
            </label>
            <input
              id="bf-multi-min"
              type="number"
              :value="(selectedBlock as MultiChoiceBlock).minSelections ?? ''"
              :readonly="isReadonly"
              min="1"
              placeholder="–"
              :class="inputCls"
              @input="updateMultiChoice({ minSelections: Number(($event.target as HTMLInputElement).value) || undefined })"
            >
          </div>
          <div>
            <label
              for="bf-multi-max"
              class="mb-1 block text-xs font-medium text-ui-muted"
            >
              Max. Auswahl
            </label>
            <input
              id="bf-multi-max"
              type="number"
              :value="(selectedBlock as MultiChoiceBlock).maxSelections ?? ''"
              :readonly="isReadonly"
              min="1"
              placeholder="–"
              :class="inputCls"
              @input="updateMultiChoice({ maxSelections: Number(($event.target as HTMLInputElement).value) || undefined })"
            >
          </div>
        </div>

        <label class="flex items-center gap-2 text-sm text-ui-text">
          <input
            type="checkbox"
            :checked="(selectedBlock as MultiChoiceBlock).required ?? false"
            :disabled="isReadonly"
            class="h-4 w-4 accent-ui-accent"
            @change="updateMultiChoice({ required: ($event.target as HTMLInputElement).checked })"
          >
          Pflichtfeld
        </label>
      </div>
    </template>

    <!-- RATING -->
    <template v-else-if="selectedBlock.type === 'rating'">
      <div class="space-y-3">
        <div>
          <label
            for="bf-rating-question"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Frage
          </label>
          <input
            id="bf-rating-question"
            type="text"
            :value="(selectedBlock as RatingBlock).question"
            :readonly="isReadonly"
            :class="inputCls"
            @input="updateRating({ question: ($event.target as HTMLInputElement).value })"
          >
        </div>

        <div>
          <label
            for="bf-rating-max"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Maximale Bewertung (2 bis 10)
          </label>
          <input
            id="bf-rating-max"
            type="number"
            :value="(selectedBlock as RatingBlock).maxRating"
            :readonly="isReadonly"
            min="2"
            max="10"
            :class="inputCls"
            @input="updateRating({ maxRating: Math.min(10, Math.max(2, Number(($event.target as HTMLInputElement).value))) })"
          >
        </div>

        <div>
          <label
            for="bf-rating-style"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Stil
          </label>
          <select
            id="bf-rating-style"
            :value="(selectedBlock as RatingBlock).style"
            :disabled="isReadonly"
            :class="selectCls"
            @change="updateRating({ style: ($event.target as HTMLSelectElement).value as RatingBlock['style'] })"
          >
            <option value="stars">Sterne</option>
            <option value="numbers">Zahlen</option>
            <option value="emoji">Emoji</option>
          </select>
        </div>

        <label class="flex items-center gap-2 text-sm text-ui-text">
          <input
            type="checkbox"
            :checked="(selectedBlock as RatingBlock).required ?? false"
            :disabled="isReadonly"
            class="h-4 w-4 accent-ui-accent"
            @change="updateRating({ required: ($event.target as HTMLInputElement).checked })"
          >
          Pflichtfeld
        </label>
      </div>
    </template>

    <!-- VIDEO -->
    <template v-else-if="selectedBlock.type === 'video'">
      <div class="space-y-3">
        <div>
          <label
            for="bf-video-url"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Video-URL
          </label>
          <input
            id="bf-video-url"
            type="url"
            :value="(selectedBlock as VideoBlock).url"
            :readonly="isReadonly"
            placeholder="https://youtube.com/watch?v=..."
            :class="inputCls"
            @input="updateVideo({ url: ($event.target as HTMLInputElement).value })"
          >
          <p class="mt-1 text-xs text-ui-muted">
            YouTube und Vimeo werden unterstützt. Die Vorschau aktualisiert sich im Frame.
          </p>
        </div>

        <div class="space-y-2">
          <label class="flex items-center gap-2 text-sm text-ui-text">
            <input
              type="checkbox"
              :checked="(selectedBlock as VideoBlock).autoplay ?? false"
              :disabled="isReadonly"
              class="h-4 w-4 accent-ui-accent"
              @change="updateVideo({ autoplay: ($event.target as HTMLInputElement).checked })"
            >
            Autoplay (nur wenn erlaubt)
          </label>
          <label class="flex items-center gap-2 text-sm text-ui-text">
            <input
              type="checkbox"
              :checked="(selectedBlock as VideoBlock).showControls ?? true"
              :disabled="isReadonly"
              class="h-4 w-4 accent-ui-accent"
              @change="updateVideo({ showControls: ($event.target as HTMLInputElement).checked })"
            >
            Steuerung anzeigen
          </label>
        </div>
      </div>
    </template>

    <!-- ICON -->
    <template v-else-if="selectedBlock.type === 'icon'">
      <div class="space-y-3">
        <div>
          <label
            for="bf-icon-name"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Icon
          </label>
          <div class="flex items-center gap-2">
            <select
              id="bf-icon-name"
              :value="(selectedBlock as IconBlock).iconName"
              :disabled="isReadonly"
              class="min-w-0 flex-1 rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent"
              @change="updateIconBlock({ iconName: ($event.target as HTMLSelectElement).value })"
            >
              <option
                v-for="name in ICON_NAMES"
                :key="name"
                :value="name"
              >
                {{ name }}
              </option>
            </select>
            <!-- Vorschau des aktuell gewählten Icons -->
            <div
              class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-ui-border bg-ui-bg"
              aria-hidden="true"
            >
              <BlockIcon
                :block="previewIconBlock((selectedBlock as IconBlock).iconName)"
                mode="editor"
              />
            </div>
          </div>
        </div>

        <div>
          <label
            for="bf-icon-size"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Größe ({{ (selectedBlock as IconBlock).size ?? 32 }} px)
          </label>
          <input
            id="bf-icon-size"
            type="range"
            :value="(selectedBlock as IconBlock).size ?? 32"
            :disabled="isReadonly"
            min="12"
            max="96"
            step="4"
            class="w-full accent-ui-accent"
            @input="updateIconBlock({ size: Number(($event.target as HTMLInputElement).value) })"
          >
          <div class="mt-0.5 flex justify-between text-xs text-ui-muted">
            <span>12</span>
            <span>96</span>
          </div>
        </div>
      </div>
    </template>

    <!-- INPUT_DATE -->
    <template v-else-if="selectedBlock.type === 'input_date'">
      <div class="space-y-3">
        <div>
          <label
            for="bf-date-label"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Bezeichnung
          </label>
          <input
            id="bf-date-label"
            type="text"
            :value="(selectedBlock as InputDateBlock).label"
            :readonly="isReadonly"
            :class="inputCls"
            @input="updateInputDate({ label: ($event.target as HTMLInputElement).value })"
          >
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label
              for="bf-date-min"
              class="mb-1 block text-xs font-medium text-ui-muted"
            >
              Frühestes Datum
            </label>
            <input
              id="bf-date-min"
              type="date"
              :value="(selectedBlock as InputDateBlock).min ?? ''"
              :readonly="isReadonly"
              :class="inputCls"
              @input="updateInputDate({ min: ($event.target as HTMLInputElement).value || undefined })"
            >
          </div>
          <div>
            <label
              for="bf-date-max"
              class="mb-1 block text-xs font-medium text-ui-muted"
            >
              Spätestes Datum
            </label>
            <input
              id="bf-date-max"
              type="date"
              :value="(selectedBlock as InputDateBlock).max ?? ''"
              :readonly="isReadonly"
              :class="inputCls"
              @input="updateInputDate({ max: ($event.target as HTMLInputElement).value || undefined })"
            >
          </div>
        </div>
        <label class="flex items-center gap-2 text-sm text-ui-text">
          <input
            type="checkbox"
            :checked="(selectedBlock as InputDateBlock).required ?? false"
            :disabled="isReadonly"
            class="h-4 w-4 accent-ui-accent"
            @change="updateInputDate({ required: ($event.target as HTMLInputElement).checked })"
          >
          Pflichtfeld
        </label>
      </div>
    </template>

    <!-- INPUT_TIME -->
    <template v-else-if="selectedBlock.type === 'input_time'">
      <div class="space-y-3">
        <div>
          <label
            for="bf-time-label"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Bezeichnung
          </label>
          <input
            id="bf-time-label"
            type="text"
            :value="(selectedBlock as InputTimeBlock).label"
            :readonly="isReadonly"
            :class="inputCls"
            @input="updateInputTime({ label: ($event.target as HTMLInputElement).value })"
          >
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label
              for="bf-time-min"
              class="mb-1 block text-xs font-medium text-ui-muted"
            >
              Früheste Uhrzeit
            </label>
            <input
              id="bf-time-min"
              type="time"
              :value="(selectedBlock as InputTimeBlock).min ?? ''"
              :readonly="isReadonly"
              :class="inputCls"
              @input="updateInputTime({ min: ($event.target as HTMLInputElement).value || undefined })"
            >
          </div>
          <div>
            <label
              for="bf-time-max"
              class="mb-1 block text-xs font-medium text-ui-muted"
            >
              Späteste Uhrzeit
            </label>
            <input
              id="bf-time-max"
              type="time"
              :value="(selectedBlock as InputTimeBlock).max ?? ''"
              :readonly="isReadonly"
              :class="inputCls"
              @input="updateInputTime({ max: ($event.target as HTMLInputElement).value || undefined })"
            >
          </div>
        </div>
        <label class="flex items-center gap-2 text-sm text-ui-text">
          <input
            type="checkbox"
            :checked="(selectedBlock as InputTimeBlock).required ?? false"
            :disabled="isReadonly"
            class="h-4 w-4 accent-ui-accent"
            @change="updateInputTime({ required: ($event.target as HTMLInputElement).checked })"
          >
          Pflichtfeld
        </label>
      </div>
    </template>

    <!-- INPUT_NUMBER -->
    <template v-else-if="selectedBlock.type === 'input_number'">
      <div class="space-y-3">
        <div>
          <label
            for="bf-number-label"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Bezeichnung
          </label>
          <input
            id="bf-number-label"
            type="text"
            :value="(selectedBlock as InputNumberBlock).label"
            :readonly="isReadonly"
            :class="inputCls"
            @input="updateInputNumber({ label: ($event.target as HTMLInputElement).value })"
          >
        </div>
        <div>
          <label
            for="bf-number-placeholder"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Platzhalter
          </label>
          <input
            id="bf-number-placeholder"
            type="text"
            :value="(selectedBlock as InputNumberBlock).placeholder ?? ''"
            :readonly="isReadonly"
            :class="inputCls"
            @input="updateInputNumber({ placeholder: ($event.target as HTMLInputElement).value })"
          >
        </div>
        <div class="grid grid-cols-3 gap-2">
          <div>
            <label
              for="bf-number-min"
              class="mb-1 block text-xs font-medium text-ui-muted"
            >
              Min
            </label>
            <input
              id="bf-number-min"
              type="number"
              :value="(selectedBlock as InputNumberBlock).min ?? ''"
              :readonly="isReadonly"
              placeholder="–"
              :class="inputCls"
              @input="updateInputNumber({ min: ($event.target as HTMLInputElement).value !== '' ? Number(($event.target as HTMLInputElement).value) : undefined })"
            >
          </div>
          <div>
            <label
              for="bf-number-max"
              class="mb-1 block text-xs font-medium text-ui-muted"
            >
              Max
            </label>
            <input
              id="bf-number-max"
              type="number"
              :value="(selectedBlock as InputNumberBlock).max ?? ''"
              :readonly="isReadonly"
              placeholder="–"
              :class="inputCls"
              @input="updateInputNumber({ max: ($event.target as HTMLInputElement).value !== '' ? Number(($event.target as HTMLInputElement).value) : undefined })"
            >
          </div>
          <div>
            <label
              for="bf-number-step"
              class="mb-1 block text-xs font-medium text-ui-muted"
            >
              Schritt
            </label>
            <input
              id="bf-number-step"
              type="number"
              :value="(selectedBlock as InputNumberBlock).step ?? ''"
              :readonly="isReadonly"
              min="0.01"
              placeholder="1"
              :class="inputCls"
              @input="updateInputNumber({ step: ($event.target as HTMLInputElement).value !== '' ? Number(($event.target as HTMLInputElement).value) : undefined })"
            >
          </div>
        </div>
        <label class="flex items-center gap-2 text-sm text-ui-text">
          <input
            type="checkbox"
            :checked="(selectedBlock as InputNumberBlock).required ?? false"
            :disabled="isReadonly"
            class="h-4 w-4 accent-ui-accent"
            @change="updateInputNumber({ required: ($event.target as HTMLInputElement).checked })"
          >
          Pflichtfeld
        </label>
      </div>
    </template>

    <!-- INPUT_DROPDOWN -->
    <template v-else-if="selectedBlock.type === 'input_dropdown'">
      <div class="space-y-3">
        <div>
          <label
            for="bf-dropdown-label"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Bezeichnung
          </label>
          <input
            id="bf-dropdown-label"
            type="text"
            :value="(selectedBlock as InputDropdownBlock).label"
            :readonly="isReadonly"
            :class="inputCls"
            @input="updateInputDropdown({ label: ($event.target as HTMLInputElement).value })"
          >
        </div>
        <div>
          <label
            for="bf-dropdown-placeholder"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Platzhalter
          </label>
          <input
            id="bf-dropdown-placeholder"
            type="text"
            :value="(selectedBlock as InputDropdownBlock).placeholder ?? ''"
            :readonly="isReadonly"
            :class="inputCls"
            @input="updateInputDropdown({ placeholder: ($event.target as HTMLInputElement).value })"
          >
        </div>

        <div class="space-y-1">
          <p class="text-xs font-medium text-ui-muted">
            Optionen
          </p>
          <div
            v-for="option in (selectedBlock as InputDropdownBlock).options"
            :key="option.id"
            class="flex items-center gap-2"
          >
            <input
              type="text"
              :value="option.label"
              :readonly="isReadonly"
              :aria-label="`Option ${option.label} - Bezeichnung`"
              placeholder="Bezeichnung"
              class="min-w-0 flex-1 rounded border border-ui-border bg-white px-2 py-1 text-xs text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent"
              @input="updateDropdownOption(option.id, 'label', ($event.target as HTMLInputElement).value)"
            >
            <button
              v-if="!isReadonly"
              type="button"
              class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-red-400 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
              :aria-label="`Option ${option.label} löschen`"
              @click="removeDropdownOption(option.id)"
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
          <button
            v-if="!isReadonly"
            type="button"
            class="mt-1 text-xs text-ui-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
            @click="addDropdownOption"
          >
            + Option hinzufügen
          </button>
        </div>

        <label class="flex items-center gap-2 text-sm text-ui-text">
          <input
            type="checkbox"
            :checked="(selectedBlock as InputDropdownBlock).required ?? false"
            :disabled="isReadonly"
            class="h-4 w-4 accent-ui-accent"
            @change="updateInputDropdown({ required: ($event.target as HTMLInputElement).checked })"
          >
          Pflichtfeld
        </label>
      </div>
    </template>

    <!-- INPUT_TEXTAREA -->
    <template v-else-if="selectedBlock.type === 'input_textarea'">
      <div class="space-y-3">
        <div>
          <label
            for="bf-textarea-label"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Bezeichnung
          </label>
          <input
            id="bf-textarea-label"
            type="text"
            :value="(selectedBlock as InputTextareaBlock).label"
            :readonly="isReadonly"
            :class="inputCls"
            @input="updateInputTextarea({ label: ($event.target as HTMLInputElement).value })"
          >
        </div>
        <div>
          <label
            for="bf-textarea-placeholder"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Platzhalter
          </label>
          <input
            id="bf-textarea-placeholder"
            type="text"
            :value="(selectedBlock as InputTextareaBlock).placeholder ?? ''"
            :readonly="isReadonly"
            :class="inputCls"
            @input="updateInputTextarea({ placeholder: ($event.target as HTMLInputElement).value })"
          >
        </div>
        <div>
          <label
            for="bf-textarea-rows"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Zeilen ({{ (selectedBlock as InputTextareaBlock).rows ?? 4 }})
          </label>
          <input
            id="bf-textarea-rows"
            type="range"
            :value="(selectedBlock as InputTextareaBlock).rows ?? 4"
            :disabled="isReadonly"
            min="2"
            max="10"
            step="1"
            class="w-full accent-ui-accent"
            @input="updateInputTextarea({ rows: Number(($event.target as HTMLInputElement).value) })"
          >
          <div class="mt-0.5 flex justify-between text-xs text-ui-muted">
            <span>2</span>
            <span>10</span>
          </div>
        </div>
        <label class="flex items-center gap-2 text-sm text-ui-text">
          <input
            type="checkbox"
            :checked="(selectedBlock as InputTextareaBlock).required ?? false"
            :disabled="isReadonly"
            class="h-4 w-4 accent-ui-accent"
            @change="updateInputTextarea({ required: ($event.target as HTMLInputElement).checked })"
          >
          Pflichtfeld
        </label>
      </div>
    </template>

    <!-- DIVIDER -->
    <template v-else-if="selectedBlock.type === 'divider'">
      <div class="space-y-3">
        <div>
          <label
            for="bf-divider-color"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Farbe
          </label>
          <div class="flex items-center gap-2">
            <input
              id="bf-divider-color"
              type="color"
              :value="(selectedBlock as DividerBlock).styles?.color ?? '#9ca3af'"
              :disabled="isReadonly"
              class="h-9 w-14 cursor-pointer rounded border border-ui-border p-0.5 focus:outline-none focus:ring-2 focus:ring-ui-accent"
              @input="updateDividerStyle('color', ($event.target as HTMLInputElement).value)"
            >
            <span class="text-sm text-ui-muted">
              {{ (selectedBlock as DividerBlock).styles?.color ?? '#9ca3af' }}
            </span>
          </div>
        </div>
        <div>
          <label
            for="bf-divider-opacity"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Deckkraft ({{ Math.round(Number((selectedBlock as DividerBlock).styles?.opacity ?? 0.4) * 100) }} %)
          </label>
          <input
            id="bf-divider-opacity"
            type="range"
            :value="Number((selectedBlock as DividerBlock).styles?.opacity ?? 0.4)"
            :disabled="isReadonly"
            min="0.1"
            max="1"
            step="0.05"
            class="w-full accent-ui-accent"
            @input="updateDividerStyle('opacity', ($event.target as HTMLInputElement).value)"
          >
          <div class="mt-0.5 flex justify-between text-xs text-ui-muted">
            <span>10 %</span>
            <span>100 %</span>
          </div>
        </div>
      </div>
    </template>

    <!-- SPACER -->
    <template v-else-if="selectedBlock.type === 'spacer'">
      <div class="space-y-3">
        <div>
          <label
            for="bf-spacer-height"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Höhe ({{ (selectedBlock as SpacerBlock).height ?? 24 }} px)
          </label>
          <input
            id="bf-spacer-height"
            type="range"
            :value="(selectedBlock as SpacerBlock).height ?? 24"
            :disabled="isReadonly"
            min="4"
            max="200"
            step="4"
            class="w-full accent-ui-accent"
            @input="updateSpacer({ height: Number(($event.target as HTMLInputElement).value) })"
          >
          <div class="mt-0.5 flex justify-between text-xs text-ui-muted">
            <span>4 px</span>
            <span>200 px</span>
          </div>
          <input
            type="number"
            :value="(selectedBlock as SpacerBlock).height ?? 24"
            :readonly="isReadonly"
            min="4"
            max="200"
            aria-label="Höhe in Pixeln"
            class="mt-2 w-24 rounded-lg border border-ui-border bg-white px-3 py-1.5 text-sm text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent"
            @input="updateSpacer({ height: Number(($event.target as HTMLInputElement).value) || 24 })"
          >
        </div>
      </div>
    </template>

    <!-- LOGO -->
    <template v-else-if="selectedBlock.type === 'logo'">
      <div class="space-y-3">
        <!-- Vorschau des aktuellen Logos -->
        <div
          v-if="(selectedBlock as LogoBlock).url"
          class="overflow-hidden rounded-lg border border-ui-border"
        >
          <img
            :src="(selectedBlock as LogoBlock).url"
            :alt="(selectedBlock as LogoBlock).alt || 'Logo-Vorschau'"
            class="h-12 w-full bg-ui-bg object-contain py-1"
            loading="lazy"
          >
        </div>

        <!-- Picker-Button -->
        <button
          v-if="!isReadonly"
          type="button"
          class="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-ui-border bg-white px-3 py-2 text-sm text-ui-accent transition-colors hover:border-ui-accent hover:bg-ui-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
          @click="showLogoPicker = true"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
            />
          </svg>
          {{ (selectedBlock as LogoBlock).url ? 'Logo ändern' : 'Logo wählen' }}
        </button>

        <!-- Alt-Text -->
        <div>
          <label
            for="bf-logo-alt"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            Alt-Text (Barrierefreiheit)
          </label>
          <input
            id="bf-logo-alt"
            type="text"
            :value="(selectedBlock as LogoBlock).alt ?? ''"
            :readonly="isReadonly"
            placeholder="Firmenlogo"
            :class="inputCls"
            @input="updateLogo({ alt: ($event.target as HTMLInputElement).value })"
          >
        </div>

        <!-- Breite / Höhe -->
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label
              for="bf-logo-width"
              class="mb-1 block text-xs font-medium text-ui-muted"
            >
              Breite (px)
            </label>
            <input
              id="bf-logo-width"
              type="number"
              :value="(selectedBlock as LogoBlock).width ?? ''"
              :readonly="isReadonly"
              min="1"
              :class="inputCls"
              @input="updateLogo({ width: Number(($event.target as HTMLInputElement).value) || undefined })"
            >
          </div>
          <div>
            <label
              for="bf-logo-height"
              class="mb-1 block text-xs font-medium text-ui-muted"
            >
              Höhe (px)
            </label>
            <input
              id="bf-logo-height"
              type="number"
              :value="(selectedBlock as LogoBlock).height ?? ''"
              :readonly="isReadonly"
              min="1"
              :class="inputCls"
              @input="updateLogo({ height: Number(($event.target as HTMLInputElement).value) || undefined })"
            >
          </div>
        </div>
      </div>

      <!-- Logo-Picker Modal -->
      <EditorImagePickerModal
        v-if="showLogoPicker && workspaceUuid"
        :workspace-uuid="workspaceUuid"
        :is-readonly="isReadonly"
        @select="onLogoPickerSelect"
        @close="showLogoPicker = false"
      />
    </template>
  </div>
</template>
