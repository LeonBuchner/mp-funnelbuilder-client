<script setup lang="ts">
import type { TextBlock } from '~/types/funnel'

const props = defineProps<{
  block: TextBlock
  mode: 'editor' | 'live'
  /** Wenn true (editor-Modus + Block selektiert): contenteditable aktivieren */
  isSelected?: boolean
}>()

const emit = defineEmits<{
  (e: 'update-content', html: string): void
}>()

/** Ref auf das contenteditable-Element (nur aktiv wenn isEditable = true) */
const editableEl = ref<HTMLDivElement | null>(null)

/** Inline-Bearbeitung nur wenn Editor-Modus UND Block selektiert */
const isEditable = computed<boolean>(
  () => props.mode === 'editor' && props.isSelected === true,
)

/**
 * Tailwind-Klassen je nach block.styles.textSize.
 * S -> small, M -> normal (default), L -> large, XL -> xl, ... -> hero
 */
const sizeClass = computed<string>(() => {
  switch (props.block.styles?.textSize) {
    case 'hero':
      return 'text-[1.75rem] font-bold leading-tight'
    case 'xl':
      return 'text-2xl font-semibold leading-snug'
    case 'large':
      return 'text-xl font-semibold leading-snug'
    case 'lead':
      return 'text-sm font-normal'
    case 'small':
      return 'text-xs font-normal'
    default:
      return 'text-base font-normal'
  }
})

const alignClass = computed<string>(() => {
  switch (props.block.styles?.textAlign) {
    case 'center':
      return 'text-center'
    case 'right':
      return 'text-right'
    default:
      return 'text-left'
  }
})

/** Gemeinsame Klassen für beide Rendering-Zweige */
const sharedClass = computed<string>(() =>
  [
    'w-full',
    sizeClass.value,
    alignClass.value,
    '[&_a]:underline [&_a]:text-[var(--funnel-accent)]',
    '[&_p]:mb-2 last:[&_p]:mb-0',
    '[&_strong]:font-bold [&_em]:italic [&_u]:underline',
  ].join(' '),
)

const inlineStyle = computed(() => ({
  color: props.block.styles?.color || 'var(--funnel-text)',
  backgroundColor: props.block.styles?.backgroundColor || undefined,
  fontFamily: 'var(--funnel-font)',
}))

// Wenn isEditable auf true wechselt: innerHTML aus block.content setzen
watch(isEditable, (editable) => {
  if (editable) {
    nextTick(() => {
      if (editableEl.value) {
        editableEl.value.innerHTML = props.block.content
      }
    })
  }
})

// Externes Update (z. B. aus den Block-Feldern) ins contenteditable spiegeln,
// aber nur wenn das Element gerade NICHT fokussiert ist (kein Tipp-Interrupt)
watch(
  () => props.block.content,
  (newContent) => {
    if (editableEl.value && document.activeElement !== editableEl.value) {
      if (editableEl.value.innerHTML !== newContent) {
        editableEl.value.innerHTML = newContent
      }
    }
  },
)

onMounted(() => {
  if (isEditable.value && editableEl.value) {
    editableEl.value.innerHTML = props.block.content
  }
})

function onInput(event: Event): void {
  const el = event.currentTarget as HTMLElement
  emit('update-content', el.innerHTML)
}
</script>

<template>
  <!--
    Statische Ansicht (kein Block selektiert, oder live-Modus):
    v-html ist hier bewusst eingesetzt. Im Editor kommt der Inhalt
    ausschließlich vom Admin-User (kein Fremd-Input).
  -->
  <!-- eslint-disable vue/no-v-html -->
  <div
    v-if="!isEditable"
    :class="sharedClass"
    :style="inlineStyle"
    v-html="block.content"
  />
  <!-- eslint-enable vue/no-v-html -->

  <!--
    Inline-Bearbeitung (editor-Modus + selektiert):
    contenteditable="true" erlaubt direktes Tippen im Frame.
    @mousedown.stop verhindert, dass Klicks ins Canvas den Block deselektieren.
    @input sendet den aktuellen HTML-Inhalt nach oben.
  -->
  <div
    v-else
    ref="editableEl"
    contenteditable="true"
    spellcheck="true"
    :class="sharedClass + ' outline-none cursor-text min-h-[1.5em]'"
    :style="inlineStyle"
    role="textbox"
    aria-multiline="true"
    aria-label="Text inline bearbeiten"
    @input="onInput"
  />
</template>
