<!--
  EditorFunnelSettingsModal: Funnel-Einstellungen (Tracking, Darstellung u.a.)
  Oeffnet sich aus der TopBar via showSettingsDropdown.
  Schreibt settings.tracking.ga4MeasurementId und settings.tracking.metaPixelId
  ueber editorStore.updateSettings().
-->
<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useFocusTrap } from '~/composables/useFocusTrap'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const editorStore = useEditorStore()
const { trapFocus } = useFocusTrap()
const dialogRef = ref<HTMLElement | null>(null)

// ---------------------------------------------------------------------------
// Lokale Kopie der Tracking-Einstellungen
// ---------------------------------------------------------------------------
const ga4Id = ref<string>(editorStore.content?.settings.tracking?.ga4MeasurementId ?? '')
const metaPixelId = ref<string>(editorStore.content?.settings.tracking?.metaPixelId ?? '')

// Bei externer Aenderung des Store-Contents (z.B. Undo/Redo) aktualisieren
watch(
  () => editorStore.content?.settings.tracking,
  (t) => {
    ga4Id.value = t?.ga4MeasurementId ?? ''
    metaPixelId.value = t?.metaPixelId ?? ''
  },
)

// ---------------------------------------------------------------------------
// Validierung
// ---------------------------------------------------------------------------
const ga4Error = computed<string | null>(() => {
  const v = ga4Id.value.trim()
  if (!v) return null
  if (!/^G-[A-Z0-9]+$/.test(v)) return 'Ungültige GA4-ID. Format: G-XXXXXXXXXX'
  return null
})

const metaError = computed<string | null>(() => {
  const v = metaPixelId.value.trim()
  if (!v) return null
  if (!/^\d+$/.test(v)) return 'Ungültige Meta-Pixel-ID (nur Ziffern)'
  return null
})

const isValid = computed<boolean>(() => ga4Error.value === null && metaError.value === null)

// ---------------------------------------------------------------------------
// Speichern
// ---------------------------------------------------------------------------
function save(): void {
  if (!isValid.value) return
  editorStore.updateSettings({
    tracking: {
      ...(ga4Id.value.trim() ? { ga4MeasurementId: ga4Id.value.trim() } : {}),
      ...(metaPixelId.value.trim() ? { metaPixelId: metaPixelId.value.trim() } : {}),
    },
  })
  emit('close')
}

// ---------------------------------------------------------------------------
// Focus-Trap + Escape
// ---------------------------------------------------------------------------
function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    emit('close')
    return
  }
  if (event.key === 'Tab' && dialogRef.value) {
    trapFocus(event, dialogRef.value)
  }
}

// Fokus beim Oeffnen auf den ersten Input setzen
watch(dialogRef, async (el) => {
  if (el) {
    await nextTick()
    el.querySelector<HTMLElement>('input')?.focus()
  }
}, { immediate: true })
</script>

<template>
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    @keydown="handleKeydown"
  >
    <div
      class="absolute inset-0 bg-black/30"
      aria-hidden="true"
      @click="emit('close')"
    />

    <!-- Dialog -->
    <div
      ref="dialogRef"
      role="dialog"
      aria-modal="true"
      aria-labelledby="funnel-settings-title"
      class="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-xl"
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-ui-border px-6 py-4">
        <h2
          id="funnel-settings-title"
          class="text-sm font-semibold text-ui-text"
        >
          Funnel-Einstellungen
        </h2>
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-ui-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
          aria-label="Einstellungen schließen"
          @click="emit('close')"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="px-6 py-5">
        <!-- Tracking-Sektion -->
        <div>
          <h3 class="mb-1 text-xs font-semibold uppercase tracking-wide text-ui-muted">
            Tracking
          </h3>
          <p class="mb-4 text-xs text-ui-muted">
            Tracking-Scripts werden nur geladen, wenn der Besucher im Consent-Banner zugestimmt hat.
          </p>

          <!-- GA4 -->
          <div class="mb-4">
            <label
              for="settings-ga4-id"
              class="mb-1.5 block text-xs font-medium text-ui-text"
            >
              Google Analytics 4 (GA4)
            </label>
            <input
              id="settings-ga4-id"
              v-model="ga4Id"
              type="text"
              placeholder="G-XXXXXXXXXX"
              autocomplete="off"
              spellcheck="false"
              :aria-describedby="ga4Error ? 'ga4-id-error' : undefined"
              :aria-invalid="ga4Error ? 'true' : undefined"
              class="w-full rounded-lg border px-3 py-2 text-sm text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-accent"
              :class="ga4Error ? 'border-red-400' : 'border-ui-border'"
            >
            <p
              v-if="ga4Error"
              id="ga4-id-error"
              class="mt-1 text-xs text-red-600"
              role="alert"
            >
              {{ ga4Error }}
            </p>
            <p
              v-else
              class="mt-1 text-xs text-ui-muted"
            >
              Measurement ID aus dem GA4-Dashboard, z.B. G-ABCD1234
            </p>
          </div>

          <!-- Meta Pixel -->
          <div>
            <label
              for="settings-meta-pixel"
              class="mb-1.5 block text-xs font-medium text-ui-text"
            >
              Meta Pixel (Facebook Ads)
            </label>
            <input
              id="settings-meta-pixel"
              v-model="metaPixelId"
              type="text"
              placeholder="123456789012345"
              autocomplete="off"
              spellcheck="false"
              :aria-describedby="metaError ? 'meta-pixel-error' : undefined"
              :aria-invalid="metaError ? 'true' : undefined"
              class="w-full rounded-lg border px-3 py-2 text-sm text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-accent"
              :class="metaError ? 'border-red-400' : 'border-ui-border'"
            >
            <p
              v-if="metaError"
              id="meta-pixel-error"
              class="mt-1 text-xs text-red-600"
              role="alert"
            >
              {{ metaError }}
            </p>
            <p
              v-else
              class="mt-1 text-xs text-ui-muted"
            >
              Pixel-ID aus dem Meta Events Manager (nur Ziffern)
            </p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end gap-2 border-t border-ui-border px-6 py-4">
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm text-ui-muted transition-colors hover:bg-ui-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
          @click="emit('close')"
        >
          Abbrechen
        </button>
        <button
          type="button"
          :disabled="!isValid"
          class="rounded-lg bg-ui-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ui-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ui-accent disabled:cursor-not-allowed disabled:opacity-50"
          @click="save"
        >
          Speichern
        </button>
      </div>
    </div>
  </div>
</template>
