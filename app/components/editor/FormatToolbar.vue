<!--
  EditorFormatToolbar: Format-Toolbar fuer Text-Bloecke im Kontext-Panel.
  Layout nach 08-element-ausgewaehlt-formatierung.jpg:
    Zeile 1: S / M / L / XL / ...  (textSize)
    Zeile 2: B / I / U              (execCommand)
    Zeile 3: Emoji | Link           (picker / createLink)
    Zeile 4: Textfarbe | Hintergrund (styles.color / styles.backgroundColor)

  B/I/U nutzen document.execCommand (deprecated, aber browserweit funktionsfähig).
  @mousedown.prevent auf allen Toolbar-Buttons verhindert Focus-Verlust des contenteditable,
  damit die aktuelle Text-Selektion erhalten bleibt.
-->
<script setup lang="ts">
import type { TextBlock } from '~/types/funnel'

const props = defineProps<{
  isReadonly: boolean
}>()

const editorStore = useEditorStore()

const block = computed<TextBlock | null>(() => {
  const b = editorStore.selectedBlock
  if (!b || b.type !== 'text') return null
  return b as TextBlock
})

const stepId = computed<string>(() => editorStore.selectedStep?.id ?? '')

/** Zeige den Emoji-Picker */
const showEmojiPicker = ref(false)
/** Zeige das Link-Eingabefeld */
const showLinkInput = ref(false)
const linkUrl = ref('https://')

// -------------------------------------------------------------------------
// TextSize
// -------------------------------------------------------------------------

type TextSizeKey = 'small' | 'normal' | 'large' | 'xl' | 'hero'

const SIZE_BUTTONS: { label: string; value: TextSizeKey }[] = [
  { label: 'S', value: 'small' },
  { label: 'M', value: 'normal' },
  { label: 'L', value: 'large' },
  { label: 'XL', value: 'xl' },
  { label: '...', value: 'hero' },
]

const activeSize = computed<TextSizeKey>(() => {
  const s = block.value?.styles?.textSize as TextSizeKey | undefined
  if (!s || s === 'normal') return 'normal'
  return s
})

function setTextSize(size: TextSizeKey): void {
  if (!block.value || !stepId.value || props.isReadonly) return
  const currentStyles = block.value.styles ?? {}
  editorStore.updateBlock(stepId.value, block.value.id, {
    styles: { ...currentStyles, textSize: size === 'normal' ? '' : size },
  })
}

// -------------------------------------------------------------------------
// B / I / U via execCommand
// -------------------------------------------------------------------------

function execFormat(command: 'bold' | 'italic' | 'underline'): void {
  if (props.isReadonly) return
  document.execCommand(command, false)
  // Fokus explizit in das contenteditable zurücksetzen (Firefox)
  ;(document.activeElement as HTMLElement | null)?.focus()
}

// -------------------------------------------------------------------------
// Farben
// -------------------------------------------------------------------------

const currentColor = computed<string>(() => block.value?.styles?.color ?? '')
const currentBgColor = computed<string>(() => block.value?.styles?.backgroundColor ?? '')

function setColor(color: string): void {
  if (!block.value || !stepId.value || props.isReadonly) return
  editorStore.updateBlock(stepId.value, block.value.id, {
    styles: { ...(block.value.styles ?? {}), color },
  })
}

function setBgColor(color: string): void {
  if (!block.value || !stepId.value || props.isReadonly) return
  editorStore.updateBlock(stepId.value, block.value.id, {
    styles: { ...(block.value.styles ?? {}), backgroundColor: color },
  })
}

function resetColor(): void {
  if (!block.value || !stepId.value || props.isReadonly) return
  const styles = { ...(block.value.styles ?? {}) }
  delete styles['color']
  editorStore.updateBlock(stepId.value, block.value.id, { styles })
}

function resetBgColor(): void {
  if (!block.value || !stepId.value || props.isReadonly) return
  const styles = { ...(block.value.styles ?? {}) }
  delete styles['backgroundColor']
  editorStore.updateBlock(stepId.value, block.value.id, { styles })
}

// -------------------------------------------------------------------------
// Emoji-Picker
// -------------------------------------------------------------------------

function onEmojiPick(emoji: string): void {
  document.execCommand('insertText', false, emoji)
  showEmojiPicker.value = false
  ;(document.activeElement as HTMLElement | null)?.focus()
}

// -------------------------------------------------------------------------
// Link
// -------------------------------------------------------------------------

/** Selektion speichern bevor Eingabefeld den Fokus übernimmt */
let savedRange: Range | null = null

function openLinkInput(): void {
  const sel = window.getSelection()
  if (sel && sel.rangeCount > 0) {
    savedRange = sel.getRangeAt(0).cloneRange()
  }
  showLinkInput.value = true
  linkUrl.value = 'https://'
}

function applyLink(): void {
  if (!linkUrl.value || props.isReadonly) {
    showLinkInput.value = false
    return
  }
  // Selektion wiederherstellen und Link anwenden
  if (savedRange) {
    const sel = window.getSelection()
    if (sel) {
      sel.removeAllRanges()
      sel.addRange(savedRange)
    }
  }
  document.execCommand('createLink', false, linkUrl.value)
  showLinkInput.value = false
  savedRange = null
}

function cancelLink(): void {
  showLinkInput.value = false
  savedRange = null
}
</script>

<template>
  <div
    v-if="block"
    class="space-y-1.5 pb-3"
  >
    <!-- Zeile 1: Größen-Buttons S / M / L / XL / ... -->
    <div
      class="flex"
      role="group"
      aria-label="Textgröße"
    >
      <button
        v-for="btn in SIZE_BUTTONS"
        :key="btn.value"
        type="button"
        :aria-label="`Größe ${btn.label}`"
        :aria-pressed="activeSize === btn.value"
        :disabled="isReadonly"
        :class="[
          'flex-1 rounded px-1.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-ui-accent/50',
          activeSize === btn.value
            ? 'bg-ui-bg text-ui-text shadow-sm ring-1 ring-ui-border'
            : 'text-ui-muted hover:bg-ui-bg/60 hover:text-ui-text',
          isReadonly ? 'cursor-not-allowed opacity-40' : '',
        ]"
        @mousedown.prevent
        @click="setTextSize(btn.value)"
      >
        {{ btn.label }}
      </button>
    </div>

    <!-- Trennlinie -->
    <div class="h-px bg-ui-border" />

    <!-- Zeile 2: B / I / U -->
    <div
      class="flex"
      role="group"
      aria-label="Textformatierung"
    >
      <button
        type="button"
        aria-label="Fett"
        :disabled="isReadonly"
        class="flex-1 rounded py-1.5 text-xs font-bold text-ui-text transition-colors hover:bg-ui-bg focus:outline-none focus:ring-1 focus:ring-ui-accent/50 disabled:cursor-not-allowed disabled:opacity-40"
        @mousedown.prevent="execFormat('bold')"
      >
        B
      </button>
      <button
        type="button"
        aria-label="Kursiv"
        :disabled="isReadonly"
        class="flex-1 rounded py-1.5 text-xs italic text-ui-text transition-colors hover:bg-ui-bg focus:outline-none focus:ring-1 focus:ring-ui-accent/50 disabled:cursor-not-allowed disabled:opacity-40"
        @mousedown.prevent="execFormat('italic')"
      >
        I
      </button>
      <button
        type="button"
        aria-label="Unterstrichen"
        :disabled="isReadonly"
        class="flex-1 rounded py-1.5 text-xs underline text-ui-text transition-colors hover:bg-ui-bg focus:outline-none focus:ring-1 focus:ring-ui-accent/50 disabled:cursor-not-allowed disabled:opacity-40"
        @mousedown.prevent="execFormat('underline')"
      >
        U
      </button>
    </div>

    <!-- Trennlinie -->
    <div class="h-px bg-ui-border" />

    <!-- Zeile 3: Emoji | Link -->
    <div
      class="relative flex"
      role="group"
      aria-label="Einfügen"
    >
      <!-- Emoji-Button -->
      <div class="relative flex-1">
        <button
          type="button"
          aria-label="Emoji einfügen"
          :aria-expanded="showEmojiPicker"
          :disabled="isReadonly"
          class="flex w-full items-center justify-center rounded py-1.5 text-ui-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus:ring-1 focus:ring-ui-accent/50 disabled:cursor-not-allowed disabled:opacity-40"
          @mousedown.prevent="showEmojiPicker = !showEmojiPicker; showLinkInput = false"
        >
          <svg
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
            />
            <path
              stroke-linecap="round"
              d="M8 13s1.5 2 4 2 4-2 4-2"
            />
            <line
              x1="9"
              y1="9"
              x2="9.01"
              y2="9"
              stroke-linecap="round"
              stroke-width="2"
            />
            <line
              x1="15"
              y1="9"
              x2="15.01"
              y2="9"
              stroke-linecap="round"
              stroke-width="2"
            />
          </svg>
        </button>

        <!-- Emoji-Picker Dropdown -->
        <EditorEmojiPicker
          v-if="showEmojiPicker"
          class="absolute left-0 top-full z-50 mt-1"
          @pick="onEmojiPick"
          @close="showEmojiPicker = false"
        />
      </div>

      <!-- Divider -->
      <div class="w-px bg-ui-border" />

      <!-- Link-Button -->
      <div class="relative flex-1">
        <button
          type="button"
          aria-label="Link einfügen"
          :aria-expanded="showLinkInput"
          :disabled="isReadonly"
          class="flex w-full items-center justify-center rounded py-1.5 text-ui-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus:ring-1 focus:ring-ui-accent/50 disabled:cursor-not-allowed disabled:opacity-40"
          @mousedown.prevent="openLinkInput(); showEmojiPicker = false"
        >
          <svg
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M14.828 14.828a4 4 0 015.656 0l4-4a4 4 0 01-5.656-5.656l-1.102 1.101"
            />
          </svg>
        </button>

        <!-- Link-Eingabe Dropdown -->
        <div
          v-if="showLinkInput"
          class="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-ui-border bg-white p-2 shadow-lg"
          role="dialog"
          aria-label="Link einfügen"
        >
          <label
            for="fmt-link-url"
            class="mb-1 block text-xs font-medium text-ui-muted"
          >
            URL
          </label>
          <input
            id="fmt-link-url"
            v-model="linkUrl"
            type="url"
            placeholder="https://"
            class="mb-2 w-full rounded border border-ui-border px-2 py-1.5 text-sm text-ui-text focus:border-ui-accent focus:outline-none focus:ring-1 focus:ring-ui-accent/30"
            @keyup.enter="applyLink"
            @keyup.escape="cancelLink"
          >
          <div class="flex justify-end gap-1.5">
            <button
              type="button"
              class="rounded px-2 py-1 text-xs text-ui-muted hover:text-ui-text focus:outline-none"
              @click="cancelLink"
            >
              Abbrechen
            </button>
            <button
              type="button"
              class="rounded bg-ui-accent px-2 py-1 text-xs font-medium text-white hover:bg-ui-accent-hover focus:outline-none"
              @click="applyLink"
            >
              Einfügen
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Trennlinie -->
    <div class="h-px bg-ui-border" />

    <!-- Zeile 4: Farb-Swatches (Textfarbe | Hintergrundfarbe) -->
    <div
      class="flex items-center gap-2 px-0.5"
      role="group"
      aria-label="Farben"
    >
      <!-- Textfarbe -->
      <div class="relative flex-1">
        <label
          for="fmt-text-color"
          class="sr-only"
        >Textfarbe</label>
        <div
          class="flex cursor-pointer items-center gap-1.5 rounded border border-ui-border px-2 py-1 hover:border-ui-accent"
          title="Textfarbe"
        >
          <span
            class="h-4 w-4 rounded-sm border border-ui-border"
            :style="{ backgroundColor: currentColor || '#1f2937' }"
            aria-hidden="true"
          />
          <span class="text-xs text-ui-muted">Text</span>
          <input
            id="fmt-text-color"
            type="color"
            :value="currentColor || '#1f2937'"
            :disabled="isReadonly"
            class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Textfarbe wählen"
            @input="setColor(($event.target as HTMLInputElement).value)"
          >
        </div>
        <button
          v-if="currentColor"
          type="button"
          class="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-ui-border text-ui-muted hover:bg-red-100 hover:text-red-500"
          aria-label="Textfarbe zurücksetzen"
          title="Zurücksetzen"
          @mousedown.prevent="resetColor"
        >
          <svg
            class="h-2.5 w-2.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Hintergrundfarbe -->
      <div class="relative flex-1">
        <label
          for="fmt-bg-color"
          class="sr-only"
        >Hintergrundfarbe</label>
        <div
          class="flex cursor-pointer items-center gap-1.5 rounded border border-ui-border px-2 py-1 hover:border-ui-accent"
          title="Hintergrundfarbe"
        >
          <span
            class="h-4 w-4 rounded-sm border border-ui-border"
            :style="{ backgroundColor: currentBgColor || '#ffffff' }"
            aria-hidden="true"
          />
          <span class="text-xs text-ui-muted">BG</span>
          <input
            id="fmt-bg-color"
            type="color"
            :value="currentBgColor || '#ffffff'"
            :disabled="isReadonly"
            class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Hintergrundfarbe wählen"
            @input="setBgColor(($event.target as HTMLInputElement).value)"
          >
        </div>
        <button
          v-if="currentBgColor"
          type="button"
          class="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-ui-border text-ui-muted hover:bg-red-100 hover:text-red-500"
          aria-label="Hintergrundfarbe zurücksetzen"
          title="Zurücksetzen"
          @mousedown.prevent="resetBgColor"
        >
          <svg
            class="h-2.5 w-2.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
