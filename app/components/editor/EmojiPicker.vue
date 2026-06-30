<!--
  EditorEmojiPicker: Einfacher Emoji-Picker nach 09-emoji-textformat.jpg.
  Zeigt Kategorien (Icons), Suche, "Häufig verwendet" und Emoji-Raster.
  Alle Emoji-Buttons nutzen @mousedown.prevent, damit das contenteditable
  seinen Fokus und die Text-Selektion behaelt.
-->
<script setup lang="ts">
const emit = defineEmits<{
  (e: 'pick', emoji: string): void
  (e: 'close'): void
}>()

type EmojiCategory = {
  id: string
  label: string
  icon: string
  emojis: string[]
}

const categories: EmojiCategory[] = [
  {
    id: 'frequent',
    label: 'Häufig verwendet',
    icon: '🕐',
    emojis: ['👍', '🚀', '❤️', '😊', '🎉', '✅', '🔥', '💡', '⭐', '✨', '💯', '🎯', '💪', '🙏', '👏'],
  },
  {
    id: 'smileys',
    label: 'Smileys',
    icon: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊',
      '😇', '😍', '🥰', '😘', '😗', '😙', '😋', '😛', '😝', '😜',
      '🤪', '🤩', '😎', '🤓', '🧐', '🤔', '🤨', '😐', '😑', '😶',
      '🙄', '😏', '😒', '🤐', '😴', '😪', '😷', '🤒', '🤧', '😰',
      '😨', '😱', '😡', '🤯', '😤', '😢', '😭', '😞', '😓', '🥺',
    ],
  },
  {
    id: 'gestures',
    label: 'Gesten',
    icon: '👋',
    emojis: [
      '👍', '👎', '👋', '🤚', '🖐', '✋', '🤙', '💪', '🙏', '🤝',
      '👏', '🤜', '🤛', '👊', '✊', '🤞', '👌', '🤌', '✌️', '🤘',
      '👈', '👉', '👆', '👇', '☝️', '🫵', '🫶', '🤗', '🫂', '💅',
    ],
  },
  {
    id: 'animals',
    label: 'Tiere',
    icon: '🐶',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
      '🦁', '🐮', '🐷', '🐸', '🐙', '🦋', '🐝', '🐛', '🐌', '🐞',
      '🦅', '🦆', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐠',
    ],
  },
  {
    id: 'food',
    label: 'Essen',
    icon: '🍕',
    emojis: [
      '🍎', '🍊', '🍋', '🍇', '🍓', '🍒', '🥝', '🍅', '🥦', '🥕',
      '🌽', '🍕', '🍔', '🌮', '🍜', '🍣', '🍰', '🎂', '☕', '🍵',
      '🍺', '🥂', '🍷', '🧃', '🥤', '🧋', '🍩', '🍪', '🧁', '🍫',
    ],
  },
  {
    id: 'objects',
    label: 'Objekte',
    icon: '💻',
    emojis: [
      '💻', '📱', '📷', '🎵', '🎸', '🎯', '🏆', '🎁', '📖', '📝',
      '💡', '🔑', '🔒', '🔓', '🔔', '📢', '📣', '🌐', '🧲', '🔧',
      '🔨', '⚙️', '🛠️', '📊', '📈', '📉', '💼', '📦', '🧳', '🎒',
    ],
  },
  {
    id: 'symbols',
    label: 'Symbole',
    icon: '❤️',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💯',
      '✅', '❌', '⭐', '🌟', '✨', '🎉', '🎊', '🏁', '🚀', '💫',
      '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🔶', '🔷',
    ],
  },
]

const searchQuery = ref('')
const activeCategory = ref<string>('frequent')

const filteredEmojis = computed<string[]>(() => {
  if (searchQuery.value.trim()) {
    // Einfache Suche: alle Emojis durchsuchen (keine Metadaten-Suche)
    return categories.flatMap(c => c.emojis).slice(0, 48)
  }
  const cat = categories.find(c => c.id === activeCategory.value)
  return cat?.emojis ?? []
})

const activeLabel = computed<string>(
  () => categories.find(c => c.id === activeCategory.value)?.label ?? '',
)

function pick(emoji: string): void {
  emit('pick', emoji)
}

/** Klick außerhalb: Picker schließen */
const pickerEl = ref<HTMLElement | null>(null)

function onDocClick(e: MouseEvent): void {
  if (pickerEl.value && !pickerEl.value.contains(e.target as Node)) {
    emit('close')
  }
}

onMounted(() => document.addEventListener('mousedown', onDocClick))
onUnmounted(() => document.removeEventListener('mousedown', onDocClick))
</script>

<template>
  <div
    ref="pickerEl"
    class="w-[240px] rounded-lg border border-ui-border bg-white shadow-xl"
    role="dialog"
    aria-label="Emoji auswählen"
  >
    <!-- Kategorien-Leiste -->
    <div
      class="flex items-center gap-0.5 border-b border-ui-border px-2 py-1.5"
      role="tablist"
      aria-label="Emoji-Kategorien"
    >
      <button
        v-for="cat in categories"
        :key="cat.id"
        type="button"
        role="tab"
        :aria-selected="activeCategory === cat.id"
        :aria-label="cat.label"
        :title="cat.label"
        :class="[
          'flex h-7 w-7 items-center justify-center rounded text-base transition-colors focus:outline-none focus:ring-1 focus:ring-ui-accent/50',
          activeCategory === cat.id
            ? 'bg-ui-bg'
            : 'text-ui-muted hover:bg-ui-bg/60',
        ]"
        @mousedown.prevent="activeCategory = cat.id; searchQuery = ''"
      >
        {{ cat.icon }}
      </button>
    </div>

    <!-- Suche -->
    <div class="border-b border-ui-border px-2 py-1.5">
      <input
        v-model="searchQuery"
        type="search"
        placeholder="Suche..."
        class="w-full rounded border border-ui-border px-2 py-1 text-xs text-ui-text focus:border-ui-accent focus:outline-none focus:ring-1 focus:ring-ui-accent/30"
        aria-label="Emojis durchsuchen"
        @mousedown.stop
      >
    </div>

    <!-- Emoji-Raster -->
    <div
      class="h-[200px] overflow-y-auto px-2 py-2"
      role="tabpanel"
    >
      <p class="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ui-muted">
        {{ searchQuery ? 'Ergebnisse' : activeLabel }}
      </p>
      <div
        class="grid grid-cols-8 gap-0.5"
        role="listbox"
        :aria-label="searchQuery ? 'Suchergebnisse' : activeLabel"
      >
        <button
          v-for="emoji in filteredEmojis"
          :key="emoji"
          type="button"
          role="option"
          :aria-label="emoji"
          class="flex h-7 w-7 items-center justify-center rounded text-lg hover:bg-ui-bg focus:outline-none focus:ring-1 focus:ring-ui-accent/50"
          @mousedown.prevent="pick(emoji)"
        >
          {{ emoji }}
        </button>
        <p
          v-if="filteredEmojis.length === 0"
          class="col-span-8 py-4 text-center text-xs text-ui-muted"
        >
          Keine Emojis gefunden.
        </p>
      </div>
    </div>
  </div>
</template>
