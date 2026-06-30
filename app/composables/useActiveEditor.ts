/**
 * useActiveEditor – Singleton-Ref fuer den aktiven TipTap-Editor.
 *
 * BlockTextTipTap.vue setzt diesen Ref, wenn ein Text-Block im Editor
 * ausgewaehlt und die TipTap-Instanz gemountet ist.
 * FormatToolbar.vue liest ihn, um B/I/U/Link-Befehle abzusetzen.
 *
 * Modul-level State: die Instanz ist pro Tab genau einmal vorhanden,
 * da immer nur ein Text-Block gleichzeitig ausgewaehlt sein kann.
 */
import { shallowRef } from 'vue'
import type { Editor } from '@tiptap/core'

const _activeEditor = shallowRef<Editor | null>(null)

export function useActiveEditor() {
  return {
    activeEditor: _activeEditor,
  }
}
