<script setup lang="ts">
import type { TextBlock } from '~/types/funnel'
import { sanitizeHtml } from '~/utils/sanitizeHtml'

/**
 * BlockTextTipTap wird dynamisch geladen, weil:
 * 1. Es liegt in <ClientOnly v-else> – SSR rendert es nie.
 * 2. isEditable ist im live-Modus immer false – die Komponente wird nie gemountet.
 * 3. TipTap (~500 KB Chunk) darf nicht im Renderer-Preload-Graph landen.
 * Ein statischer Import wuerde den TipTap-Chunk als modulepreload einfuegen
 * und 106 KB ungenutztes JS auf jede /f/-Seite laden.
 * defineAsyncComponent innerhalb von <ClientOnly> ist hydration-safe.
 */
const BlockTextTipTap = defineAsyncComponent(
  () => import('./BlockTextTipTap.vue'),
)

const props = defineProps<{
  block: TextBlock
  mode: 'editor' | 'live'
  /** Wenn true (editor-Modus + Block selektiert): TipTap aktivieren */
  isSelected?: boolean
}>()

const emit = defineEmits<{
  (e: 'update-content', html: string): void
}>()

/** TipTap nur wenn Editor-Modus UND Block selektiert */
const isEditable = computed<boolean>(
  () => props.mode === 'editor' && props.isSelected === true,
)

/**
 * Tailwind-Klassen je nach block.styles.textSize.
 * small -> xs, normal -> base (default), large -> xl, xl -> 2xl, hero -> 1.75rem
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

/** Gemeinsame Klassen fuer statischen Render und TipTap-Editor */
const sharedClass = computed<string>(() =>
  [
    'w-full',
    sizeClass.value,
    alignClass.value,
    '[&_a]:underline [&_a]:text-[var(--funnel-accent)]',
    '[&_p]:mb-2 [&_p:last-child]:mb-0',
    '[&_strong]:font-bold [&_em]:italic [&_u]:underline',
  ].join(' '),
)

const inlineStyle = computed(() => ({
  color: props.block.styles?.color || 'var(--funnel-text)',
  backgroundColor: props.block.styles?.backgroundColor || undefined,
  fontFamily: 'var(--funnel-font)',
}))

/**
 * Im live-Modus ist block.content bereits durch den Renderer-Lade-Transform
 * bereinigt (sanitizeFunnelContent in [slug].vue). Kein erneuter sanitizeHtml-
 * Aufruf im Render, sonst divergieren SSR (jsdom-DOMPurify) und Client
 * (Browser-DOMPurify) in der Serialisierung -> Hydration-Mismatch.
 *
 * Im editor-Modus (ssr:false, client-only) wird clientseitig sanitisiert.
 * Der Editor erzeugt sauberes TipTap-HTML, die Bereinigung ist eine
 * zusaetzliche Absicherung.
 */
const safeContent = computed<string>(() =>
  props.mode === 'live' ? props.block.content : sanitizeHtml(props.block.content),
)
</script>

<template>
  <!--
    Statische Ansicht (live-Modus oder Block nicht selektiert):
    safeContent: Im live-Modus bereits beim Laden sanitisiert (kein erneuter
    Aufruf im Render, verhindert Hydration-Mismatch). Im editor-Modus
    clientseitig sanitisiert (ssr:false, kein Mismatch-Risiko).
  -->
  <!-- eslint-disable vue/no-v-html -->
  <div
    v-if="!isEditable"
    :class="sharedClass"
    :style="inlineStyle"
    v-html="safeContent"
  />
  <!-- eslint-enable vue/no-v-html -->

  <!--
    TipTap-Editor (editor-Modus + selektiert).
    ClientOnly: TipTap benoetigt den Browser; der SSR-Renderer rendert
    diesen Zweig nie (mode='live').
  -->
  <ClientOnly v-else>
    <BlockTextTipTap
      :initial-content="block.content"
      :shared-class="sharedClass"
      :inline-style="inlineStyle"
      @update-content="emit('update-content', $event)"
    />
  </ClientOnly>
</template>
