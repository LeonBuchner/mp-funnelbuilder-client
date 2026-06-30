<script setup lang="ts">
/**
 * BlockRenderer: Wählt die richtige Block-Komponente anhand von block.type.
 * Statische Imports (nicht defineAsyncComponent), damit SSR und Client identisch
 * rendern (kein Hydration-Mismatch im öffentlichen Renderer).
 * TypeScript-Verengung erfolgt über v-if auf dem Discriminant `block.type`.
 *
 * Props:
 *   block       - Block (Discriminated Union)
 *   mode        - 'editor' (nur Darstellung) oder 'live' (interaktiv, v-model)
 *   modelValue  - aktueller Wert im live-Modus (string für Inputs/Choice, boolean für Checkbox)
 *
 * Emits:
 *   update:modelValue - Wertänderung im live-Modus
 *   action            - Button-Aktion im live-Modus (next/submit/...)
 */
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
  ProgressIndicatorBlock,
  LogoBlock,
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
} from '~/types/funnel'

// M1-Imports
import BlockText from './BlockText.vue'
import BlockImage from './BlockImage.vue'
import BlockButton from './BlockButton.vue'
import BlockSingleChoice from './BlockSingleChoice.vue'
import BlockInput from './BlockInput.vue'
import BlockOptinCheckbox from './BlockOptinCheckbox.vue'
import BlockProgress from './BlockProgress.vue'
import BlockLogo from './BlockLogo.vue'

// M2-Imports (statisch, kein defineAsyncComponent)
import BlockMultiChoice from './BlockMultiChoice.vue'
import BlockRating from './BlockRating.vue'
import BlockDivider from './BlockDivider.vue'
import BlockSpacer from './BlockSpacer.vue'
import BlockVideo from './BlockVideo.vue'
import BlockIcon from './BlockIcon.vue'
import BlockInputDate from './BlockInputDate.vue'
import BlockInputTime from './BlockInputTime.vue'
import BlockInputNumber from './BlockInputNumber.vue'
import BlockInputDropdown from './BlockInputDropdown.vue'
import BlockInputTextarea from './BlockInputTextarea.vue'

const props = defineProps<{
  block: Block
  mode: 'editor' | 'live'
  modelValue?: string | boolean
  /** Nur im editor-Modus: aktiviert Inline-Bearbeitung fuer TextBlock */
  isSelected?: boolean
  /** Fehlermeldung fuer diesen Block (gesetzt vom Renderer nach Validierung).
   *  Wird an interaktive Bloecke weitergereicht, damit sie aria-invalid und
   *  aria-describedby korrekt setzen koennen. */
  error?: string
}>()

defineEmits<{
  'update:modelValue': [value: string | boolean]
  'action': [action: string]
  /** Weiterleitung aus BlockText: neuer HTML-Inhalt nach Inline-Bearbeitung */
  'update-content': [html: string]
}>()

// ---------------------------------------------------------------------------
// FIX: Im Editor-Modus kein modelValue an interaktive Blöcke weitergeben.
// Jeder Block nutzt dann seinen eigenen Default – keine Typ-Warnung mehr
// (z.B. Boolean false an eine String-Prop oder umgekehrt).
// Im live-Modus wird der Wert mit dem korrekten Typ durchgereicht.
// ---------------------------------------------------------------------------

/** modelValue für String-basierte Blöcke (single_choice, input_*, multi_choice, rating). */
const stringModelValue = computed<string | undefined>(() =>
  props.mode === 'live' ? (props.modelValue as string | undefined) : undefined,
)

/** modelValue für Boolean-basierte Blöcke (optin_checkbox). */
const boolModelValue = computed<boolean | undefined>(() =>
  props.mode === 'live' ? (props.modelValue as boolean | undefined) : undefined,
)
</script>

<template>
  <!-- Jede v-if-Bedingung verengt `block` auf den konkreten Typ (TS narrowing). -->
  <BlockText
    v-if="block.type === 'text'"
    :block="(block as TextBlock)"
    :mode="mode"
    :is-selected="isSelected"
    @update-content="$emit('update-content', $event)"
  />
  <BlockImage
    v-else-if="block.type === 'image'"
    :block="(block as ImageBlock)"
    :mode="mode"
  />
  <BlockButton
    v-else-if="block.type === 'button'"
    :block="(block as ButtonBlock)"
    :mode="mode"
    @action="$emit('action', $event)"
  />
  <BlockSingleChoice
    v-else-if="block.type === 'single_choice'"
    :block="(block as SingleChoiceBlock)"
    :mode="mode"
    :model-value="stringModelValue"
    :error="props.error"
    @update:model-value="$emit('update:modelValue', $event)"
  />
  <BlockInput
    v-else-if="block.type === 'input_text' || block.type === 'input_email' || block.type === 'input_phone'"
    :block="(block as InputTextBlock | InputEmailBlock | InputPhoneBlock)"
    :mode="mode"
    :model-value="stringModelValue"
    :error="props.error"
    @update:model-value="$emit('update:modelValue', $event)"
  />
  <BlockOptinCheckbox
    v-else-if="block.type === 'optin_checkbox'"
    :block="(block as OptinCheckboxBlock)"
    :mode="mode"
    :model-value="boolModelValue"
    :error="props.error"
    @update:model-value="$emit('update:modelValue', $event)"
  />
  <BlockProgress
    v-else-if="block.type === 'progress_indicator'"
    :block="(block as ProgressIndicatorBlock)"
    :mode="mode"
  />
  <BlockLogo
    v-else-if="block.type === 'logo'"
    :block="(block as LogoBlock)"
    :mode="mode"
  />
  <!-- M2-Blöcke -->
  <BlockMultiChoice
    v-else-if="block.type === 'multi_choice'"
    :block="(block as MultiChoiceBlock)"
    :mode="mode"
    :model-value="stringModelValue"
    :error="props.error"
    @update:model-value="$emit('update:modelValue', $event)"
  />
  <BlockRating
    v-else-if="block.type === 'rating'"
    :block="(block as RatingBlock)"
    :mode="mode"
    :model-value="stringModelValue"
    :error="props.error"
    @update:model-value="$emit('update:modelValue', $event)"
  />
  <BlockDivider
    v-else-if="block.type === 'divider'"
    :block="(block as DividerBlock)"
    :mode="mode"
  />
  <BlockSpacer
    v-else-if="block.type === 'spacer'"
    :block="(block as SpacerBlock)"
    :mode="mode"
  />
  <BlockVideo
    v-else-if="block.type === 'video'"
    :block="(block as VideoBlock)"
    :mode="mode"
  />
  <BlockIcon
    v-else-if="block.type === 'icon'"
    :block="(block as IconBlock)"
    :mode="mode"
  />
  <BlockInputDate
    v-else-if="block.type === 'input_date'"
    :block="(block as InputDateBlock)"
    :mode="mode"
    :model-value="stringModelValue"
    :error="props.error"
    @update:model-value="$emit('update:modelValue', $event)"
  />
  <BlockInputTime
    v-else-if="block.type === 'input_time'"
    :block="(block as InputTimeBlock)"
    :mode="mode"
    :model-value="stringModelValue"
    :error="props.error"
    @update:model-value="$emit('update:modelValue', $event)"
  />
  <BlockInputNumber
    v-else-if="block.type === 'input_number'"
    :block="(block as InputNumberBlock)"
    :mode="mode"
    :model-value="stringModelValue"
    :error="props.error"
    @update:model-value="$emit('update:modelValue', $event)"
  />
  <BlockInputDropdown
    v-else-if="block.type === 'input_dropdown'"
    :block="(block as InputDropdownBlock)"
    :mode="mode"
    :model-value="stringModelValue"
    :error="props.error"
    @update:model-value="$emit('update:modelValue', $event)"
  />
  <BlockInputTextarea
    v-else-if="block.type === 'input_textarea'"
    :block="(block as InputTextareaBlock)"
    :mode="mode"
    :model-value="stringModelValue"
    :error="props.error"
    @update:model-value="$emit('update:modelValue', $event)"
  />
  <!--
    Dieser Zweig sollte bei korrekter TypeScript-Nutzung nie erreicht werden.
    Er dient als Sicherheitsnetz fuer nicht typisierte Block-Objekte zur Laufzeit.
  -->
  <div
    v-else
    class="rounded border border-dashed border-gray-200 px-4 py-2 text-xs text-gray-400"
    aria-hidden="true"
  >
    Unbekannter Block-Typ
  </div>
</template>
