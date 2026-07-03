<!--
  EditorFormatToolbar: Format-Toolbar für Text-Blöcke im Kontext-Panel.
  Layout nach 08-element-ausgewaehlt-formatierung.jpg:
    Zeile 1: S / M / L / XL / •••  (Schnell-Buttons + "Mehr"-Dropdown für alle Größen)
    Zeile 2: B / I / U              (TipTap chain commands)
    Zeile 3: Ausrichtung links / zentriert / rechts  (styles.textAlign)
    Zeile 4: Emoji | Link           (TipTap insertContent / setLink)
    Zeile 5: Textfarbe | Hintergrund (styles.color / styles.backgroundColor)

  B/I/U/Link nutzen useActiveEditor(), um den TipTap-Editor des
  aktuell selektierten Text-Blocks anzusprechen.
  @mousedown.prevent auf Toolbar-Buttons verhindert Fokusverlust des Editors,
  damit die Selektion erhalten bleibt.
-->
<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'
import type { TextBlock } from '~/types/funnel'
import { useActiveEditor } from '~/composables/useActiveEditor'
import {
  FONT_SIZE_PX_OPTIONS,
  FONT_SIZE_BADGE,
  FONT_SIZE_QUICK_BUTTONS,
  getActiveFontSizePx,
  getActiveTextAlign,
  type TextAlignKey,
} from '~/utils/textSizes'

const props = defineProps<{
  isReadonly: boolean
}>()

const editorStore = useEditorStore()
const { activeEditor } = useActiveEditor()

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
// TextSize – Schnell-Buttons + •••-Dropdown
// -------------------------------------------------------------------------

const showSizeDropdown = ref(false)
const sizeContainerRef = ref<HTMLElement | null>(null)
const moreButtonRef = ref<HTMLButtonElement | null>(null)

/** Schließt das Dropdown wenn außerhalb geklickt wird */
onClickOutside(sizeContainerRef, () => {
  showSizeDropdown.value = false
})

/** Aktive Schriftgröße in px (aus neuem "16px"-Format oder Legacy-Token-Mapping). */
const activePx = computed<number>(() => getActiveFontSizePx(block.value?.styles))

/** Speichert den px-Wert als "16px"-String in styles.textSize. */
function setFontSizePx(px: number): void {
  if (!block.value || !stepId.value || props.isReadonly) return
  editorStore.updateBlock(stepId.value, block.value.id, {
    styles: { ...(block.value.styles ?? {}), textSize: `${px}px` },
  })
}

function toggleSizeDropdown(): void {
  if (props.isReadonly) return
  showEmojiPicker.value = false
  showLinkInput.value = false
  showSizeDropdown.value = !showSizeDropdown.value
  // Programmatisch fokussieren, damit Tastatur-Events (Escape) am Container ankommen.
  // Nötig weil @mousedown.prevent auf dem Button den Browser-eigenen Fokus verhindert.
  if (showSizeDropdown.value) {
    nextTick(() => moreButtonRef.value?.focus())
  }
}

function closeSizeDropdown(): void {
  showSizeDropdown.value = false
  // Fokus zurück zum ••• Button geben
  nextTick(() => moreButtonRef.value?.focus())
}

function selectSizeFromDropdown(px: number): void {
  setFontSizePx(px)
  closeSizeDropdown()
}

function onDropdownFocusout(event: FocusEvent): void {
  // Dropdown schließen wenn Fokus den Container verlässt
  if (!sizeContainerRef.value?.contains(event.relatedTarget as Node)) {
    showSizeDropdown.value = false
  }
}

/**
 * Escape-Behandlung für den Container: fängt Escape ab wenn das Dropdown offen ist,
 * unabhängig davon ob Fokus auf dem Trigger-Button oder einem Menü-Item liegt.
 */
function handleContainerEscape(event: KeyboardEvent): void {
  if (showSizeDropdown.value) {
    event.stopPropagation()
    closeSizeDropdown()
  }
}

// -------------------------------------------------------------------------
// TextAlign (Block-Ebene, kein TipTap nötig)
// -------------------------------------------------------------------------

const activeAlign = computed<TextAlignKey>(() => getActiveTextAlign(block.value?.styles))

function setTextAlign(align: TextAlignKey): void {
  if (!block.value || !stepId.value || props.isReadonly) return
  editorStore.updateBlock(stepId.value, block.value.id, {
    styles: { ...(block.value.styles ?? {}), textAlign: align === 'left' ? '' : align },
  })
}

// -------------------------------------------------------------------------
// B / I / U via TipTap
// -------------------------------------------------------------------------

function toggleBold(): void {
  if (props.isReadonly) return
  activeEditor.value?.chain().focus().toggleBold().run()
}

function toggleItalic(): void {
  if (props.isReadonly) return
  activeEditor.value?.chain().focus().toggleItalic().run()
}

function toggleUnderline(): void {
  if (props.isReadonly) return
  activeEditor.value?.chain().focus().toggleUnderline().run()
}

// -------------------------------------------------------------------------
// Farben (Block-Ebene, kein TipTap nötig)
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
// Emoji-Picker: Emoji per TipTap am Cursor einfügen
// -------------------------------------------------------------------------

function onEmojiPick(emoji: string): void {
  activeEditor.value?.chain().focus().insertContent(emoji).run()
  showEmojiPicker.value = false
}

// -------------------------------------------------------------------------
// Link via TipTap setLink / unsetLink
// -------------------------------------------------------------------------

function openLinkInput(): void {
  const existing = activeEditor.value?.getAttributes('link')?.href as string | undefined
  linkUrl.value = existing ?? 'https://'
  showLinkInput.value = true
}

function applyLink(): void {
  if (props.isReadonly) {
    showLinkInput.value = false
    return
  }
  const e = activeEditor.value
  if (e) {
    if (linkUrl.value && linkUrl.value !== 'https://') {
      e.chain().focus().setLink({ href: linkUrl.value, target: '_blank' }).run()
    } else {
      e.chain().focus().unsetLink().run()
    }
  }
  showLinkInput.value = false
}

function cancelLink(): void {
  showLinkInput.value = false
}
</script>

<template>
  <div
    v-if="block"
    class="space-y-1.5 pb-3"
  >
    <!-- Zeile 1: Schnell-Buttons S / M / L / XL + ••• Dropdown -->
    <div
      ref="sizeContainerRef"
      class="relative"
      @focusout="onDropdownFocusout"
      @keydown.escape="handleContainerEscape"
    >
      <div
        class="flex"
        role="group"
        aria-label="Textgröße"
      >
        <!-- Schnell-Buttons S / M / L / XL -->
        <button
          v-for="btn in FONT_SIZE_QUICK_BUTTONS"
          :key="btn.px"
          type="button"
          :aria-label="`Größe ${btn.label} (${btn.px}px)`"
          :aria-pressed="activePx === btn.px"
          :disabled="isReadonly"
          :class="[
            'flex-1 rounded px-1.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ui-accent',
            activePx === btn.px
              ? 'bg-ui-bg text-ui-text shadow-sm ring-1 ring-ui-border'
              : 'text-ui-muted hover:bg-ui-bg/60 hover:text-ui-text',
            isReadonly ? 'cursor-not-allowed opacity-40' : '',
          ]"
          @mousedown.prevent
          @click="setFontSizePx(btn.px)"
        >
          {{ btn.label }}
        </button>

        <!-- ••• Mehr-Button öffnet Dropdown mit allen Größen -->
        <button
          ref="moreButtonRef"
          type="button"
          aria-label="Weitere Textgrößen"
          aria-haspopup="menu"
          :aria-expanded="showSizeDropdown"
          :disabled="isReadonly"
          :class="[
            'flex-1 rounded px-1.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ui-accent',
            showSizeDropdown || !FONT_SIZE_QUICK_BUTTONS.some(b => b.px === activePx)
              ? 'bg-ui-bg text-ui-text shadow-sm ring-1 ring-ui-border'
              : 'text-ui-muted hover:bg-ui-bg/60 hover:text-ui-text',
            isReadonly ? 'cursor-not-allowed opacity-40' : '',
          ]"
          @mousedown.prevent
          @click="toggleSizeDropdown"
        >
          •••
        </button>
      </div>

      <!-- Größen-Dropdown mit allen 9 px-Werten -->
      <div
        v-if="showSizeDropdown"
        role="menu"
        aria-label="Textgröße wählen"
        class="absolute right-0 top-full z-50 mt-1 min-w-[9.5rem] rounded-lg border border-ui-border bg-white py-1 shadow-lg"
        @keydown.escape.stop="closeSizeDropdown"
      >
        <button
          v-for="px in FONT_SIZE_PX_OPTIONS"
          :key="px"
          type="button"
          role="menuitemradio"
          :aria-checked="activePx === px"
          :aria-label="`${px}px${FONT_SIZE_BADGE[px] ? ` (${FONT_SIZE_BADGE[px]})` : ''}`"
          :class="[
            'flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ui-accent',
            activePx === px
              ? 'bg-ui-bg/60 text-ui-text'
              : 'text-ui-text hover:bg-ui-bg/40',
          ]"
          @mousedown.prevent
          @click="selectSizeFromDropdown(px)"
        >
          <!-- Häkchen für aktive Größe -->
          <span
            class="flex h-3.5 w-3.5 shrink-0 items-center justify-center"
            aria-hidden="true"
          >
            <svg
              v-if="activePx === px"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="h-3 w-3 text-ui-accent"
            >
              <path d="M2 6l3 3 5-5" />
            </svg>
          </span>

          <!-- px-Label -->
          <span class="flex-1 text-sm">{{ px }}px</span>

          <!-- S / M / L / XL Badge rechts -->
          <span
            v-if="FONT_SIZE_BADGE[px]"
            class="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-ui-muted"
            aria-hidden="true"
          >{{ FONT_SIZE_BADGE[px] }}</span>
        </button>
      </div>
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
        class="flex-1 rounded py-1.5 text-xs font-bold text-ui-text transition-colors hover:bg-ui-bg focus:outline-none focus:ring-2 focus:ring-ui-accent disabled:cursor-not-allowed disabled:opacity-40"
        @mousedown.prevent="toggleBold"
      >
        B
      </button>
      <button
        type="button"
        aria-label="Kursiv"
        :disabled="isReadonly"
        class="flex-1 rounded py-1.5 text-xs italic text-ui-text transition-colors hover:bg-ui-bg focus:outline-none focus:ring-2 focus:ring-ui-accent disabled:cursor-not-allowed disabled:opacity-40"
        @mousedown.prevent="toggleItalic"
      >
        I
      </button>
      <button
        type="button"
        aria-label="Unterstrichen"
        :disabled="isReadonly"
        class="flex-1 rounded py-1.5 text-xs underline text-ui-text transition-colors hover:bg-ui-bg focus:outline-none focus:ring-2 focus:ring-ui-accent disabled:cursor-not-allowed disabled:opacity-40"
        @mousedown.prevent="toggleUnderline"
      >
        U
      </button>
    </div>

    <!-- Trennlinie -->
    <div class="h-px bg-ui-border" />

    <!-- Zeile 3: Textausrichtung links / zentriert / rechts -->
    <div
      class="flex"
      role="group"
      aria-label="Textausrichtung"
    >
      <!-- Links -->
      <button
        type="button"
        aria-label="Linksbündig"
        :aria-pressed="activeAlign === 'left'"
        :disabled="isReadonly"
        :class="[
          'flex flex-1 items-center justify-center rounded py-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-ui-accent',
          activeAlign === 'left'
            ? 'bg-ui-bg text-ui-text shadow-sm ring-1 ring-ui-border'
            : 'text-ui-muted hover:bg-ui-bg/60 hover:text-ui-text',
          isReadonly ? 'cursor-not-allowed opacity-40' : '',
        ]"
        @mousedown.prevent
        @click="setTextAlign('left')"
      >
        <svg
          class="h-4 w-4"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M1.5 3h13M1.5 6.5h8M1.5 10h13M1.5 13.5h8"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </button>

      <!-- Zentriert -->
      <button
        type="button"
        aria-label="Zentriert"
        :aria-pressed="activeAlign === 'center'"
        :disabled="isReadonly"
        :class="[
          'flex flex-1 items-center justify-center rounded py-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-ui-accent',
          activeAlign === 'center'
            ? 'bg-ui-bg text-ui-text shadow-sm ring-1 ring-ui-border'
            : 'text-ui-muted hover:bg-ui-bg/60 hover:text-ui-text',
          isReadonly ? 'cursor-not-allowed opacity-40' : '',
        ]"
        @mousedown.prevent
        @click="setTextAlign('center')"
      >
        <svg
          class="h-4 w-4"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M1.5 3h13M3.5 6.5h9M1.5 10h13M3.5 13.5h9"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </button>

      <!-- Rechtsbündig -->
      <button
        type="button"
        aria-label="Rechtsbündig"
        :aria-pressed="activeAlign === 'right'"
        :disabled="isReadonly"
        :class="[
          'flex flex-1 items-center justify-center rounded py-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-ui-accent',
          activeAlign === 'right'
            ? 'bg-ui-bg text-ui-text shadow-sm ring-1 ring-ui-border'
            : 'text-ui-muted hover:bg-ui-bg/60 hover:text-ui-text',
          isReadonly ? 'cursor-not-allowed opacity-40' : '',
        ]"
        @mousedown.prevent
        @click="setTextAlign('right')"
      >
        <svg
          class="h-4 w-4"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M1.5 3h13M6.5 6.5h8M1.5 10h13M6.5 13.5h8"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>

    <!-- Trennlinie -->
    <div class="h-px bg-ui-border" />

    <!-- Zeile 4: Emoji | Link -->
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
          class="flex w-full items-center justify-center rounded py-1.5 text-ui-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-accent disabled:cursor-not-allowed disabled:opacity-40"
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
          class="flex w-full items-center justify-center rounded py-1.5 text-ui-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-accent disabled:cursor-not-allowed disabled:opacity-40"
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
            class="mb-2 w-full rounded border border-ui-border px-2 py-1.5 text-sm text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent"
            @keyup.enter="applyLink"
            @keyup.escape="cancelLink"
          >
          <div class="flex justify-end gap-1.5">
            <button
              type="button"
              class="rounded px-2 py-1 text-xs text-ui-muted hover:text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-accent"
              @click="cancelLink"
            >
              Abbrechen
            </button>
            <button
              type="button"
              class="rounded bg-ui-accent px-2 py-1 text-xs font-medium text-white hover:bg-ui-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ui-accent"
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

    <!-- Zeile 5: Farb-Swatches (Textfarbe | Hintergrundfarbe) -->
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
