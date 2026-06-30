<!--
  BlockTextTipTap – TipTap-Editor-Instanz fuer den selektierten Text-Block.
  Wird von BlockText.vue nur client-seitig (ClientOnly) eingebettet,
  wenn mode='editor' und der Block ausgewaehlt ist.

  Verantwortlichkeiten:
  - Erstellt und zerstoert den TipTap-Editor per useEditor-Lifecycle.
  - Registriert die Instanz in useActiveEditor(), damit FormatToolbar
    B/I/U/Link-Befehle absetzen kann.
  - Emittiert update-content mit dem bereinigten HTML nach jeder Aenderung.
  - Synchronisiert externe Inhaltsaktualisierungen (z. B. aus BlockFields)
    ohne den Tipp-Fluss zu unterbrechen.
-->
<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import LinkExtension from '@tiptap/extension-link'
import UnderlineExtension from '@tiptap/extension-underline'
import { sanitizeHtml } from '~/utils/sanitizeHtml'
import { useActiveEditor } from '~/composables/useActiveEditor'

const props = defineProps<{
  /** Aktueller HTML-Inhalt des Blocks (sanitisiert bevor uebergeben) */
  initialContent: string
  /** Tailwind-Klassen fuer Groesse, Ausrichtung etc. (aus BlockText berechnet) */
  sharedClass: string
  /** Inline-Styles fuer Farbe, Font etc. */
  inlineStyle: Record<string, string | undefined>
}>()

const emit = defineEmits<{
  (e: 'update-content', html: string): void
}>()

const { activeEditor } = useActiveEditor()

const editor = useEditor({
  content: sanitizeHtml(props.initialContent),
  extensions: [
    StarterKit,
    LinkExtension.configure({
      openOnClick: false,
      autolink: false,
      HTMLAttributes: {
        rel: 'noopener noreferrer',
      },
    }),
    UnderlineExtension,
  ],
  editorProps: {
    attributes: {
      class: 'outline-none cursor-text min-h-[1.5em]',
      spellcheck: 'true',
      role: 'textbox',
      'aria-multiline': 'true',
      'aria-label': 'Text inline bearbeiten',
    },
  },
  onUpdate({ editor: e }) {
    emit('update-content', e.getHTML())
  },
})

// Externe Inhaltsaenderungen in den Editor spiegeln (z. B. vom BlockFields-Textarea),
// aber nur wenn der Editor nicht fokussiert ist (verhindert Tipp-Unterbrechung).
watch(
  () => props.initialContent,
  (newContent) => {
    const e = editor.value
    if (!e) return
    const sanitized = sanitizeHtml(newContent)
    if (!e.isFocused && e.getHTML() !== sanitized) {
      // emitUpdate: false verhindert die Feedback-Schleife
      e.commands.setContent(sanitized, { emitUpdate: false })
    }
  },
)

// Aktiven Editor im geteilten Ref verfuegbar machen
watchEffect(() => {
  activeEditor.value = editor.value ?? null
})

onBeforeUnmount(() => {
  activeEditor.value = null
})
</script>

<template>
  <!--
    EditorContent rendert den ProseMirror-Editable-Bereich.
    sharedClass enthaelt Groessen- und Ausrichtungs-Utilities, die kaskadieren.
    focus-within zeigt einen sichtbaren Fokusring (WCAG 2.1 AA).
    @mousedown.stop verhindert, dass Klicks in den Editor den Block deselektieren.
  -->
  <EditorContent
    :editor="editor"
    :class="[
      sharedClass,
      'focus-within:outline-none focus-within:ring-2 focus-within:ring-ui-accent/50 focus-within:rounded-sm',
    ]"
    :style="inlineStyle"
    @mousedown.stop
  />
</template>
