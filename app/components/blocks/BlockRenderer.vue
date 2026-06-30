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
} from '~/types/funnel'
import BlockText from './BlockText.vue'
import BlockImage from './BlockImage.vue'
import BlockButton from './BlockButton.vue'
import BlockSingleChoice from './BlockSingleChoice.vue'
import BlockInput from './BlockInput.vue'
import BlockOptinCheckbox from './BlockOptinCheckbox.vue'
import BlockProgress from './BlockProgress.vue'
import BlockLogo from './BlockLogo.vue'

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

/** modelValue für String-basierte Blöcke (single_choice, input_*). */
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
      <!-- Unbekannte Typen: dezenter Platzhalter, damit der Editor nicht abstuerzt -->
  <div
    v-else
    class="rounded border border-dashed border-gray-200 px-4 py-2 text-xs text-gray-400"
    aria-hidden="true"
  >
    Unbekannter Block-Typ
  </div>
</template>
