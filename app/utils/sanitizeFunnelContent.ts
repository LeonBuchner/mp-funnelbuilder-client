/**
 * sanitizeFunnelContent – bereinigt alle HTML-tragenden Felder im Funnel-Content
 * EINMALIG beim Laden (als transform-Funktion in useAsyncData).
 *
 * Warum: isomorphic-dompurify serialisiert HTML serverseitig (jsdom) und
 * clientseitig (Browser-DOMPurify) minimal unterschiedlich (Attributreihenfolge,
 * Self-Closing-Tags, Whitespace). Wird sanitizeHtml pro Render-Aufruf in v-html
 * aufgerufen, erzeugt das SSR/Client-Divergenz und damit Hydration-Mismatches.
 *
 * Loesung: Einmaliges Sanitisieren am Daten-Rand. Das Ergebnis wird ueber den
 * Nuxt-Payload serialisiert, sodass SSR und Client denselben bereits bereinigten
 * String erhalten. Die Block-Komponenten im live-Modus verwenden den Wert
 * danach direkt, ohne erneuten sanitizeHtml-Aufruf im Render.
 *
 * Betroffene Felder (alle v-html-Quellen im Renderer):
 *   - TextBlock.content
 *   - OptinCheckboxBlock.checkboxLabel
 *   - SingleChoiceBlock.options[].label  (v-html im icon-Layout)
 *   - MultiChoiceBlock.options[].label   (v-html im icon-Layout)
 */
import type { Block } from '~/types/funnel'
import type { PublicFunnel } from '~/types/public-funnel'
import { sanitizeHtml } from '~/utils/sanitizeHtml'

function sanitizeBlock(block: Block): Block {
  switch (block.type) {
    case 'text':
      return { ...block, content: sanitizeHtml(block.content) }
    case 'optin_checkbox':
      return { ...block, checkboxLabel: sanitizeHtml(block.checkboxLabel) }
    case 'single_choice':
      return {
        ...block,
        options: block.options.map(opt => ({ ...opt, label: sanitizeHtml(opt.label) })),
      }
    case 'multi_choice':
      return {
        ...block,
        options: block.options.map(opt => ({ ...opt, label: sanitizeHtml(opt.label) })),
      }
    default:
      return block
  }
}

/**
 * Bereinigt alle HTML-Felder des geladenen Funnels einmalig beim Laden.
 * Als transform-Option in useAsyncData verwenden.
 */
export function sanitizeFunnelContent(data: PublicFunnel): PublicFunnel {
  return {
    ...data,
    content: {
      ...data.content,
      steps: data.content.steps.map(step => ({
        ...step,
        blocks: step.blocks.map(sanitizeBlock),
      })),
    },
  }
}
