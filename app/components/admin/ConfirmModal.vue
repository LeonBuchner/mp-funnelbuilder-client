<!--
  ConfirmModal – barrierefreies Bestaetigungs-Modal.

  Ersetzt window.confirm() fuer destruktive oder finale Aktionen.
  WCAG 2.1 AA: role=dialog, aria-modal, aria-labelledby, Focus-Trap, Escape.

  Verwendung:
    <AdminConfirmModal
      v-if="showConfirm"
      title="Test beenden?"
      message="Der Test wird unwiderruflich abgeschlossen."
      confirm-label="Beenden"
      :is-loading="isLoading"
      @confirm="doAction"
      @cancel="showConfirm = false"
    />
-->
<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    /** Titel der Bestaetigungs-Dialogbox (aria-labelledby). */
    title: string
    /** Erklaerungstext unterhalb des Titels. */
    message?: string
    /** Label des Bestaetigungs-Buttons (z. B. "Beenden", "Loeschen"). */
    confirmLabel?: string
    /** Zeigt Lade-Zustand auf dem Bestaetigungs-Button. */
    isLoading?: boolean
    /** Variante: 'danger' = roter Button, 'primary' = blauer Button. */
    variant?: 'danger' | 'primary'
  }>(),
  {
    message: '',
    confirmLabel: 'Bestätigen',
    isLoading: false,
    variant: 'danger',
  },
)

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const { trapFocus } = useFocusTrap()
const modalEl = ref<HTMLElement | null>(null)
const confirmBtnEl = ref<HTMLButtonElement | null>(null)

const modalId = `confirm-modal-${Math.random().toString(36).slice(2, 9)}`
const titleId = `${modalId}-title`

onMounted(() => {
  nextTick(() => confirmBtnEl.value?.focus())
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    emit('cancel')
    return
  }
  if (modalEl.value) trapFocus(event, modalEl.value)
}

const confirmClasses = computed(() => {
  if (props.variant === 'danger') {
    return 'rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-red-500/50'
  }
  return 'rounded-lg bg-ui-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ui-accent-hover disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ui-accent/50'
})
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      @click.self="$emit('cancel')"
    >
      <div
        ref="modalEl"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        class="w-full max-w-sm rounded-2xl bg-ui-surface shadow-xl"
      >
        <!-- Kopfzeile -->
        <div class="flex items-center justify-between border-b border-ui-border px-6 py-4">
          <h2
            :id="titleId"
            class="text-base font-semibold text-ui-text"
          >
            {{ title }}
          </h2>
          <button
            type="button"
            class="flex h-7 w-7 items-center justify-center rounded-lg text-ui-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
            aria-label="Abbrechen"
            @click="$emit('cancel')"
          >
            <svg
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <!-- Inhalt -->
        <div class="px-6 py-5">
          <p
            v-if="message"
            class="text-sm text-ui-muted"
          >
            {{ message }}
          </p>
        </div>

        <!-- Aktionen -->
        <div class="flex justify-end gap-2 border-t border-ui-border px-6 py-4">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm font-medium text-ui-muted transition-colors hover:bg-ui-bg focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
            :disabled="isLoading"
            @click="$emit('cancel')"
          >
            Abbrechen
          </button>
          <button
            ref="confirmBtnEl"
            type="button"
            :class="confirmClasses"
            :disabled="isLoading"
            @click="$emit('confirm')"
          >
            {{ isLoading ? 'Bitte warten...' : confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
