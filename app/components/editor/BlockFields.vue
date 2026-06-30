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
  ButtonBlock,
  SingleChoiceBlock,
  InputTextBlock,
  InputEmailBlock,
  InputPhoneBlock,
  OptinCheckboxBlock,
  SingleChoiceOption,
  ButtonAction,
  ButtonStyle,
} from '~/types/funnel'

const props = defineProps<{
  selectedBlock: Block | null
  isReadonly: boolean
}>()

const emit = defineEmits<{
  (e: 'update-block', patch: Partial<Block>): void
}>()

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
            class="w-full rounded-lg border border-ui-border bg-white px-3 py-2 font-mono text-xs text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
            @input="updateText('content', ($event.target as HTMLTextAreaElement).value)"
          />
        </div>
      </div>
    </template>

    <!-- IMAGE -->
    <template v-else-if="selectedBlock.type === 'image'">
      <div class="space-y-3">
        <div>
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
            class="w-full rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
            @input="updateImage('url', ($event.target as HTMLInputElement).value)"
          >
        </div>
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
            class="w-full rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
            @input="updateImage('alt', ($event.target as HTMLInputElement).value)"
          >
        </div>
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
              class="w-full rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
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
              class="w-full rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
              @input="updateImage('height', Number(($event.target as HTMLInputElement).value) || 0)"
            >
          </div>
        </div>
      </div>
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
            class="w-full rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
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
            class="w-full rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
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
              class="w-full rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
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
            class="w-full rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
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
            class="w-full rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
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
              class="min-w-0 flex-1 rounded border border-ui-border bg-white px-2 py-1 text-xs text-ui-text focus:border-ui-accent focus:outline-none focus:ring-1 focus:ring-ui-accent/30"
              @input="updateChoiceOption(option.id, 'label', ($event.target as HTMLInputElement).value)"
            >
            <button
              v-if="!isReadonly"
              type="button"
              class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-red-400 hover:bg-red-50 focus:outline-none focus:ring-1 focus:ring-red-400/50"
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
            class="mt-1 text-xs text-ui-accent hover:underline focus:outline-none focus:ring-1 focus:ring-ui-accent/50"
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
            class="w-full rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
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
            class="w-full rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
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
            class="w-full rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
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
            class="w-full rounded-lg border border-ui-border bg-white px-3 py-2 text-sm uppercase text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
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
            class="w-full rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
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
            class="w-full rounded-lg border border-ui-border bg-white px-3 py-2 font-mono text-xs text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
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
  </div>
</template>
