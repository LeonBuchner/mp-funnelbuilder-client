<!--
  EditorBrandingEditorModal: Erstellt oder bearbeitet ein Workspace-Branding.

  Props:
  - workspaceUuid: string
  - branding?: Branding | null  (null = neues Branding anlegen, Objekt = bearbeiten)

  Emits:
  - saved(branding: Branding)  nach erfolgreichem Speichern
  - close                       beim Abbrechen oder nach Speichern

  Barrierefreiheit:
  - role="dialog" aria-modal="true" mit aria-labelledby
  - Fokus-Trap (Tab bleibt innerhalb des Modals)
  - Escape schliesst das Modal
  - Alle Farbeingaben haben sichtbares Label
  - Kontrast-Warnung bei schlechtem Text/Hintergrund-Kontrast
-->
<script setup lang="ts">
import type { Branding, BrandingColors } from '~/types/funnel'
import { useBrandings, BRANDING_FONT_WHITELIST } from '~/composables/useBrandings'
import { contrastRatio } from '~/utils/contrast'

// ---------------------------------------------------------------------------
// Props / Emits
// ---------------------------------------------------------------------------

const props = defineProps<{
  workspaceUuid: string
  branding?: Branding | null
}>()

const emit = defineEmits<{
  (e: 'saved', branding: Branding): void
  (e: 'close'): void
}>()

const isEditMode = computed<boolean>(() => !!props.branding)

// ---------------------------------------------------------------------------
// Formzustand
// ---------------------------------------------------------------------------

const name = ref<string>(props.branding?.name ?? '')

const colors = reactive<BrandingColors>({
  primary: props.branding?.colors.primary ?? '#1c4687',
  secondary: props.branding?.colors.secondary ?? '#3579fa',
  background: props.branding?.colors.background ?? '#ffffff',
  surface: props.branding?.colors.surface ?? '#f3f4f6',
  text: props.branding?.colors.text ?? '#1f2937',
  accent: props.branding?.colors.accent ?? '#3579fa',
})

const fontHeading = ref<string>(props.branding?.font_heading ?? '')
const fontBody = ref<string>(props.branding?.font_body ?? '')
const logoPath = ref<string | null>(props.branding?.logo_path ?? null)
const faviconPath = ref<string | null>(props.branding?.favicon_path ?? null)

// ---------------------------------------------------------------------------
// Kontrast-Warnungen
// ---------------------------------------------------------------------------

/** Text auf Hintergrund unter 4.5:1 */
const textBgContrastLow = computed<boolean>(
  () => contrastRatio(colors.text, colors.background) < 4.5,
)

/** Weisser Text auf Primaerfarbe unter 4.5:1 */
const whiteOnPrimaryContrastLow = computed<boolean>(
  () => contrastRatio('#ffffff', colors.primary) < 4.5,
)

const showContrastWarning = computed<boolean>(
  () => textBgContrastLow.value || whiteOnPrimaryContrastLow.value,
)

// ---------------------------------------------------------------------------
// Bild-Picker
// ---------------------------------------------------------------------------

type PickerTarget = 'logo' | 'favicon' | null
const imagePickerTarget = ref<PickerTarget>(null)

function openImagePicker(target: PickerTarget): void {
  imagePickerTarget.value = target
}

function onImageSelected(payload: { url: string; alt_text: string | null }): void {
  if (imagePickerTarget.value === 'logo') {
    logoPath.value = payload.url
  }
  else if (imagePickerTarget.value === 'favicon') {
    faviconPath.value = payload.url
  }
  imagePickerTarget.value = null
}

function clearImage(target: 'logo' | 'favicon'): void {
  if (target === 'logo') logoPath.value = null
  else faviconPath.value = null
}

// ---------------------------------------------------------------------------
// Speichern
// ---------------------------------------------------------------------------

const { create, update } = useBrandings()
const saving = ref(false)
const saveError = ref<string | null>(null)

async function handleSave(): Promise<void> {
  if (!name.value.trim()) {
    saveError.value = 'Bitte gib einen Namen fuer das Branding ein.'
    return
  }

  saving.value = true
  saveError.value = null

  const payload = {
    name: name.value.trim(),
    colors: { ...colors },
    font_heading: fontHeading.value || null,
    font_body: fontBody.value || null,
    logo_path: logoPath.value,
    favicon_path: faviconPath.value,
  }

  try {
    let result: Branding

    if (isEditMode.value && props.branding) {
      const res = await update(props.branding.id, payload)
      result = res.data
    }
    else {
      const res = await create(props.workspaceUuid, payload)
      result = res.data
    }

    emit('saved', result)
    emit('close')
  }
  catch (err: unknown) {
    saveError.value = formatError(err)
  }
  finally {
    saving.value = false
  }
}

function formatError(err: unknown): string {
  if (err && typeof err === 'object' && 'status' in err) {
    const status = (err as { status: number }).status
    if (status === 422) {
      const data = (err as { data?: { message?: string } }).data
      return data?.message ?? 'Ungueltige Eingabe. Bitte pruefen und erneut versuchen.'
    }
    if (status === 403) {
      return 'Du hast keine Berechtigung, Brandings zu bearbeiten.'
    }
  }
  return 'Beim Speichern ist ein Fehler aufgetreten. Bitte erneut versuchen.'
}

// ---------------------------------------------------------------------------
// Fokus-Trap
// ---------------------------------------------------------------------------

const dialogRef = ref<HTMLElement | null>(null)
let previousFocus: Element | null = null

function getFocusable(): HTMLElement[] {
  if (!dialogRef.value) return []
  return Array.from(
    dialogRef.value.querySelectorAll<HTMLElement>(
      [
        'button:not([disabled])',
        '[href]',
        'input:not([disabled]):not([tabindex="-1"])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', '),
    ),
  )
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    emit('close')
    return
  }
  if (e.key !== 'Tab') return

  const elements = getFocusable()
  if (elements.length === 0) return

  const first = elements[0]!
  const last = elements[elements.length - 1]!

  if (e.shiftKey) {
    if (document.activeElement === first) {
      e.preventDefault()
      last.focus()
    }
  }
  else {
    if (document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
}

onMounted(() => {
  previousFocus = document.activeElement
  document.addEventListener('keydown', handleKeydown)
  nextTick(() => {
    const elements = getFocusable()
    elements[0]?.focus()
  })
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  if (previousFocus instanceof HTMLElement) {
    previousFocus.focus()
  }
})
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <div
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-6"
      @click.self="emit('close')"
    >
      <!-- Dialog -->
      <div
        ref="dialogRef"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bem-title"
        class="flex w-full max-w-lg flex-col rounded-t-xl sm:rounded-xl bg-white shadow-2xl"
        style="max-height: min(calc(100vh - 1.5rem), 720px)"
      >
        <!-- Header -->
        <div class="flex shrink-0 items-center justify-between border-b border-ui-border px-5 py-4">
          <h2
            id="bem-title"
            class="text-base font-semibold text-ui-text"
          >
            {{ isEditMode ? 'Branding bearbeiten' : 'Neues Branding' }}
          </h2>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-lg text-ui-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-accent"
            aria-label="Schliessen"
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

        <!-- Formular -->
        <div class="flex-1 overflow-y-auto p-5 space-y-5">
          <!-- Name -->
          <div>
            <label
              for="bem-name"
              class="mb-1.5 block text-sm font-medium text-ui-text"
            >
              Name <span class="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="bem-name"
              v-model="name"
              type="text"
              class="w-full rounded-lg border border-ui-border px-3 py-2 text-sm text-ui-text placeholder:text-ui-muted focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent"
              placeholder="z.B. Hauptbranding"
              maxlength="80"
              required
            >
          </div>

          <!-- Kontrast-Warnung -->
          <div
            v-if="showContrastWarning"
            class="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2.5 text-sm text-orange-700"
            role="alert"
            aria-live="polite"
          >
            <svg
              class="mt-0.5 h-4 w-4 shrink-0 text-orange-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <span>Kontrast unter 4,5:1, schlecht lesbar (WCAG AA)</span>
          </div>

          <!-- Farben -->
          <fieldset>
            <legend class="mb-2 text-sm font-medium text-ui-text">
              Farben
            </legend>
            <div class="grid grid-cols-2 gap-3">
              <!-- Primaerfarbe -->
              <div>
                <label
                  for="bem-color-primary"
                  class="mb-1 block text-xs text-ui-muted"
                >
                  Primaerfarbe
                </label>
                <div class="flex items-center gap-2">
                  <input
                    id="bem-color-primary"
                    v-model="colors.primary"
                    type="color"
                    class="h-9 w-9 cursor-pointer rounded border border-ui-border p-0.5 focus:outline-none focus:ring-2 focus:ring-ui-accent"
                  >
                  <input
                    v-model="colors.primary"
                    type="text"
                    aria-label="Primaerfarbe Hex-Wert"
                    class="w-full rounded border border-ui-border px-2 py-1.5 text-xs text-ui-text font-mono focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent"
                    maxlength="7"
                    pattern="#[0-9a-fA-F]{6}"
                  >
                </div>
              </div>

              <!-- Sekundaerfarbe -->
              <div>
                <label
                  for="bem-color-secondary"
                  class="mb-1 block text-xs text-ui-muted"
                >
                  Sekundaerfarbe
                </label>
                <div class="flex items-center gap-2">
                  <input
                    id="bem-color-secondary"
                    v-model="colors.secondary"
                    type="color"
                    class="h-9 w-9 cursor-pointer rounded border border-ui-border p-0.5 focus:outline-none focus:ring-2 focus:ring-ui-accent"
                  >
                  <input
                    v-model="colors.secondary"
                    type="text"
                    aria-label="Sekundaerfarbe Hex-Wert"
                    class="w-full rounded border border-ui-border px-2 py-1.5 text-xs text-ui-text font-mono focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent"
                    maxlength="7"
                    pattern="#[0-9a-fA-F]{6}"
                  >
                </div>
              </div>

              <!-- Hintergrund -->
              <div>
                <label
                  for="bem-color-background"
                  class="mb-1 block text-xs text-ui-muted"
                >
                  Hintergrund
                </label>
                <div class="flex items-center gap-2">
                  <input
                    id="bem-color-background"
                    v-model="colors.background"
                    type="color"
                    class="h-9 w-9 cursor-pointer rounded border border-ui-border p-0.5 focus:outline-none focus:ring-2 focus:ring-ui-accent"
                  >
                  <input
                    v-model="colors.background"
                    type="text"
                    aria-label="Hintergrundfarbe Hex-Wert"
                    class="w-full rounded border border-ui-border px-2 py-1.5 text-xs text-ui-text font-mono focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent"
                    maxlength="7"
                    pattern="#[0-9a-fA-F]{6}"
                  >
                </div>
              </div>

              <!-- Surface -->
              <div>
                <label
                  for="bem-color-surface"
                  class="mb-1 block text-xs text-ui-muted"
                >
                  Flaeche (Surface)
                </label>
                <div class="flex items-center gap-2">
                  <input
                    id="bem-color-surface"
                    v-model="colors.surface"
                    type="color"
                    class="h-9 w-9 cursor-pointer rounded border border-ui-border p-0.5 focus:outline-none focus:ring-2 focus:ring-ui-accent"
                  >
                  <input
                    v-model="colors.surface"
                    type="text"
                    aria-label="Surface-Farbe Hex-Wert"
                    class="w-full rounded border border-ui-border px-2 py-1.5 text-xs text-ui-text font-mono focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent"
                    maxlength="7"
                    pattern="#[0-9a-fA-F]{6}"
                  >
                </div>
              </div>

              <!-- Text -->
              <div>
                <label
                  for="bem-color-text"
                  class="mb-1 block text-xs text-ui-muted"
                >
                  Textfarbe
                </label>
                <div class="flex items-center gap-2">
                  <input
                    id="bem-color-text"
                    v-model="colors.text"
                    type="color"
                    class="h-9 w-9 cursor-pointer rounded border border-ui-border p-0.5 focus:outline-none focus:ring-2 focus:ring-ui-accent"
                  >
                  <input
                    v-model="colors.text"
                    type="text"
                    aria-label="Textfarbe Hex-Wert"
                    class="w-full rounded border border-ui-border px-2 py-1.5 text-xs text-ui-text font-mono focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent"
                    maxlength="7"
                    pattern="#[0-9a-fA-F]{6}"
                  >
                </div>
              </div>

              <!-- Akzent -->
              <div>
                <label
                  for="bem-color-accent"
                  class="mb-1 block text-xs text-ui-muted"
                >
                  Akzentfarbe
                </label>
                <div class="flex items-center gap-2">
                  <input
                    id="bem-color-accent"
                    v-model="colors.accent"
                    type="color"
                    class="h-9 w-9 cursor-pointer rounded border border-ui-border p-0.5 focus:outline-none focus:ring-2 focus:ring-ui-accent"
                  >
                  <input
                    v-model="colors.accent"
                    type="text"
                    aria-label="Akzentfarbe Hex-Wert"
                    class="w-full rounded border border-ui-border px-2 py-1.5 text-xs text-ui-text font-mono focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent"
                    maxlength="7"
                    pattern="#[0-9a-fA-F]{6}"
                  >
                </div>
              </div>
            </div>
          </fieldset>

          <!-- Schriften -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label
                for="bem-font-heading"
                class="mb-1.5 block text-sm font-medium text-ui-text"
              >
                Ueberschrift-Schrift
              </label>
              <select
                id="bem-font-heading"
                v-model="fontHeading"
                class="w-full rounded-lg border border-ui-border px-3 py-2 text-sm text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent"
              >
                <option value="">
                  Standard (Inter)
                </option>
                <option
                  v-for="font in BRANDING_FONT_WHITELIST"
                  :key="font"
                  :value="font"
                >
                  {{ font }}
                </option>
              </select>
            </div>
            <div>
              <label
                for="bem-font-body"
                class="mb-1.5 block text-sm font-medium text-ui-text"
              >
                Fliesstext-Schrift
              </label>
              <select
                id="bem-font-body"
                v-model="fontBody"
                class="w-full rounded-lg border border-ui-border px-3 py-2 text-sm text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent"
              >
                <option value="">
                  Standard (Inter)
                </option>
                <option
                  v-for="font in BRANDING_FONT_WHITELIST"
                  :key="font"
                  :value="font"
                >
                  {{ font }}
                </option>
              </select>
            </div>
          </div>

          <!-- Logo und Favicon -->
          <div class="grid grid-cols-2 gap-3">
            <!-- Logo -->
            <div>
              <p
                id="bem-logo-label"
                class="mb-1.5 text-sm font-medium text-ui-text"
              >
                Logo
              </p>
              <div
                class="relative flex h-20 items-center justify-center rounded-lg border border-dashed border-ui-border bg-ui-bg"
                aria-labelledby="bem-logo-label"
              >
                <img
                  v-if="logoPath"
                  :src="logoPath"
                  alt="Logo-Vorschau"
                  class="h-full w-full rounded-lg object-contain p-2"
                  loading="lazy"
                >
                <span
                  v-else
                  class="text-xs text-ui-muted"
                >
                  Kein Logo
                </span>
                <div class="absolute inset-0 flex items-end justify-end gap-1 p-1.5">
                  <button
                    type="button"
                    class="rounded bg-white/90 px-2 py-1 text-xs font-medium text-ui-text shadow-sm hover:bg-white focus:outline-none focus:ring-2 focus:ring-ui-accent"
                    aria-label="Logo auswaehlen"
                    @click="openImagePicker('logo')"
                  >
                    {{ logoPath ? 'Aendern' : 'Auswaehlen' }}
                  </button>
                  <button
                    v-if="logoPath"
                    type="button"
                    class="rounded bg-white/90 p-1 text-red-500 shadow-sm hover:bg-white hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                    aria-label="Logo entfernen"
                    @click="clearImage('logo')"
                  >
                    <svg
                      class="h-3.5 w-3.5"
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
              </div>
            </div>

            <!-- Favicon -->
            <div>
              <p
                id="bem-favicon-label"
                class="mb-1.5 text-sm font-medium text-ui-text"
              >
                Favicon
              </p>
              <div
                class="relative flex h-20 items-center justify-center rounded-lg border border-dashed border-ui-border bg-ui-bg"
                aria-labelledby="bem-favicon-label"
              >
                <img
                  v-if="faviconPath"
                  :src="faviconPath"
                  alt="Favicon-Vorschau"
                  class="h-12 w-12 rounded object-contain"
                  loading="lazy"
                >
                <span
                  v-else
                  class="text-xs text-ui-muted"
                >
                  Kein Favicon
                </span>
                <div class="absolute inset-0 flex items-end justify-end gap-1 p-1.5">
                  <button
                    type="button"
                    class="rounded bg-white/90 px-2 py-1 text-xs font-medium text-ui-text shadow-sm hover:bg-white focus:outline-none focus:ring-2 focus:ring-ui-accent"
                    aria-label="Favicon auswaehlen"
                    @click="openImagePicker('favicon')"
                  >
                    {{ faviconPath ? 'Aendern' : 'Auswaehlen' }}
                  </button>
                  <button
                    v-if="faviconPath"
                    type="button"
                    class="rounded bg-white/90 p-1 text-red-500 shadow-sm hover:bg-white hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                    aria-label="Favicon entfernen"
                    @click="clearImage('favicon')"
                  >
                    <svg
                      class="h-3.5 w-3.5"
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
              </div>
            </div>
          </div>

          <!-- Fehler -->
          <div
            v-if="saveError"
            class="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700"
            role="alert"
          >
            {{ saveError }}
          </div>
        </div>

        <!-- Footer -->
        <div class="flex shrink-0 items-center justify-end gap-2 border-t border-ui-border px-5 py-4">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm font-medium text-ui-muted transition-colors hover:text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-accent"
            @click="emit('close')"
          >
            Abbrechen
          </button>
          <button
            type="button"
            :disabled="saving"
            class="flex items-center gap-2 rounded-lg bg-ui-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ui-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ui-accent disabled:cursor-not-allowed disabled:opacity-60"
            @click="handleSave"
          >
            <span
              v-if="saving"
              class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
              aria-hidden="true"
            />
            {{ saving ? 'Wird gespeichert...' : (isEditMode ? 'Aenderungen speichern' : 'Branding erstellen') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Bild-Picker (oeffnet sich ueber diesem Modal) -->
    <EditorImagePickerModal
      v-if="imagePickerTarget !== null"
      :workspace-uuid="workspaceUuid"
      :is-readonly="false"
      @select="onImageSelected"
      @close="imagePickerTarget = null"
    />
  </Teleport>
</template>
