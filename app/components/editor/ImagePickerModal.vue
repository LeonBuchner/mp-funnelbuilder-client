<!--
  EditorImagePickerModal: Bild-Picker mit Upload-Zone und Workspace-Mediathek.

  Tabs:
  - "Hochladen": Drag-Drop-Zone + Datei-Input. Bei Erfolg landet das Bild
    oben in der Mediathek und wird direkt ausgewaehlt (emit select + close).
  - "Mediathek": Paginiertes Bild-Grid. Klick waehlt ein Bild aus.

  Barrierefreiheit:
  - role="dialog" aria-modal="true"
  - Fokus-Trap (Tab-Schleife innerhalb des Modals)
  - Escape schliesst das Modal
  - Fokus kehrt zum oeffnenden Element zurueck (via previousFocus)
  - Bilder mit Alt-Text (alt_text oder original_filename)

  Rolle:
  - isReadonly=true: kein Upload-Tab, keine Loeschen-Buttons (client-Rolle)
-->
<script setup lang="ts">
import type { UploadItem } from '~/composables/useUploads'

interface SelectPayload {
  url: string
  alt_text: string | null
}

const props = defineProps<{
  workspaceUuid: string
  isReadonly: boolean
}>()

const emit = defineEmits<{
  (e: 'select', payload: SelectPayload): void
  (e: 'close'): void
}>()

// ---------------------------------------------------------------------------
// Tab-Zustand
// ---------------------------------------------------------------------------

type ActiveTab = 'upload' | 'library'
const activeTab = ref<ActiveTab>(props.isReadonly ? 'library' : 'upload')

// ---------------------------------------------------------------------------
// Fokus-Trap
// ---------------------------------------------------------------------------

const dialogRef = ref<HTMLElement | null>(null)
let previousFocus: Element | null = null

function getFocusableElements(): HTMLElement[] {
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

  const elements = getFocusableElements()
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
    const elements = getFocusableElements()
    elements[0]?.focus()
  })
  loadLibrary()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  if (previousFocus instanceof HTMLElement) {
    previousFocus.focus()
  }
})

// ---------------------------------------------------------------------------
// Upload-Tab
// ---------------------------------------------------------------------------

const { upload: uploadFile, list: listUploads, remove: removeUpload } = useUploads()

const uploading = ref(false)
const uploadError = ref<string | null>(null)
const isDragOver = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

function triggerFileInput(): void {
  fileInputRef.value?.click()
}

function onDragOver(e: DragEvent): void {
  e.preventDefault()
  isDragOver.value = true
}

function onDragLeave(e: DragEvent): void {
  // Nur zuruecksetzen wenn wir die Zone wirklich verlassen (nicht ein Kind)
  const target = e.relatedTarget as Node | null
  if (!e.currentTarget || !(e.currentTarget as HTMLElement).contains(target)) {
    isDragOver.value = false
  }
}

function onDrop(e: DragEvent): void {
  e.preventDefault()
  isDragOver.value = false
  if (e.dataTransfer?.files.length) {
    void handleFiles(e.dataTransfer.files)
  }
}

function onFileInputChange(e: Event): void {
  const input = e.target as HTMLInputElement
  if (input.files?.length) {
    void handleFiles(input.files)
  }
  // Input-Wert leeren damit dasselbe Bild erneut gewaehlt werden kann
  input.value = ''
}

async function handleFiles(files: FileList): Promise<void> {
  const file = files[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    uploadError.value = 'Nur Bilddateien sind erlaubt (JPEG, PNG, WebP, GIF usw.).'
    return
  }

  uploadError.value = null
  uploading.value = true

  try {
    const item = await uploadFile(props.workspaceUuid, file)
    // Neues Bild oben in die Mediathek einfuegen
    items.value = [item, ...items.value]
    // Direkt auswaehlen und Modal schliessen
    selectItem(item)
  }
  catch (err: unknown) {
    uploadError.value = formatUploadError(err)
  }
  finally {
    uploading.value = false
  }
}

function formatUploadError(err: unknown): string {
  if (err && typeof err === 'object' && 'status' in err) {
    const status = (err as { status: number }).status
    if (status === 422) {
      const data = (err as {
        data?: { message?: string, errors?: Record<string, string[]> }
      }).data
      const firstError = data?.errors?.file?.[0] ?? data?.message
      return firstError ?? 'Das Bild ist zu groß oder hat einen ungültigen Dateityp.'
    }
    if (status === 429) {
      return 'Du hast gerade zu viele Dateien hochgeladen. Bitte warte einen Moment und versuche es erneut.'
    }
  }
  return 'Beim Hochladen ist ein Fehler aufgetreten. Bitte versuche es erneut.'
}

// ---------------------------------------------------------------------------
// Mediathek-Tab
// ---------------------------------------------------------------------------

const items = ref<UploadItem[]>([])
const libraryLoading = ref(false)
const libraryError = ref<string | null>(null)
const currentPage = ref(1)
const lastPage = ref(1)
const loadingMore = ref(false)

const confirmDeleteId = ref<string | null>(null)
const deleteError = ref<string | null>(null)

async function loadLibrary(page = 1): Promise<void> {
  if (page === 1) {
    libraryLoading.value = true
    libraryError.value = null
    items.value = []
  }
  else {
    loadingMore.value = true
  }

  try {
    const res = await listUploads(props.workspaceUuid, page)
    if (page === 1) {
      items.value = res.data
    }
    else {
      items.value = [...items.value, ...res.data]
    }
    currentPage.value = res.meta.current_page
    lastPage.value = res.meta.last_page
  }
  catch {
    libraryError.value = 'Die Mediathek konnte nicht geladen werden. Bitte versuche es erneut.'
  }
  finally {
    libraryLoading.value = false
    loadingMore.value = false
  }
}

async function loadMore(): Promise<void> {
  if (currentPage.value < lastPage.value && !loadingMore.value) {
    await loadLibrary(currentPage.value + 1)
  }
}

async function handleDelete(id: string): Promise<void> {
  deleteError.value = null
  try {
    await removeUpload(id)
    items.value = items.value.filter(i => i.id !== id)
    confirmDeleteId.value = null
  }
  catch (err: unknown) {
    confirmDeleteId.value = null
    if (err && typeof err === 'object' && 'status' in err) {
      const status = (err as { status: number }).status
      if (status === 403) {
        deleteError.value = 'Du hast keine Berechtigung, dieses Bild zu löschen.'
        return
      }
    }
    deleteError.value = 'Das Bild konnte nicht gelöscht werden. Bitte versuche es erneut.'
  }
}

function selectItem(item: UploadItem): void {
  emit('select', { url: item.url, alt_text: item.alt_text })
  emit('close')
}

function getAlt(item: UploadItem): string {
  return item.alt_text ?? item.original_filename
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen fuer den Tab-Button-Stil
// ---------------------------------------------------------------------------

function tabButtonCls(tab: ActiveTab): string {
  const base = 'px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ui-accent'
  return activeTab.value === tab
    ? `${base} border-b-2 border-ui-accent text-ui-accent`
    : `${base} border-b-2 border-transparent text-ui-muted hover:text-ui-text`
}
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
        aria-labelledby="ipm-title"
        class="flex w-full max-w-2xl flex-col rounded-t-xl sm:rounded-xl bg-white shadow-2xl"
        style="max-height: min(calc(100vh - 1.5rem), 680px)"
      >
        <!-- Header -->
        <div class="flex shrink-0 items-center justify-between border-b border-ui-border px-5 py-4">
          <h2
            id="ipm-title"
            class="text-base font-semibold text-ui-text"
          >
            Bild wählen
          </h2>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-lg text-ui-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
            aria-label="Schließen"
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
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <!-- Tabs -->
        <div
          class="flex shrink-0 border-b border-ui-border"
          role="tablist"
          aria-label="Bild-Picker Tabs"
        >
          <button
            v-if="!isReadonly"
            id="ipm-tab-upload"
            type="button"
            role="tab"
            :aria-selected="activeTab === 'upload'"
            :aria-controls="'ipm-tabpanel'"
            :class="tabButtonCls('upload')"
            @click="activeTab = 'upload'"
          >
            Hochladen
          </button>
          <button
            id="ipm-tab-library"
            type="button"
            role="tab"
            :aria-selected="activeTab === 'library'"
            :aria-controls="'ipm-tabpanel'"
            :class="tabButtonCls('library')"
            @click="activeTab = 'library'"
          >
            Mediathek
          </button>
        </div>

        <!-- Tab-Inhalte -->
        <div
          id="ipm-tabpanel"
          class="flex-1 overflow-y-auto p-5"
          role="tabpanel"
          :aria-labelledby="activeTab === 'upload' ? 'ipm-tab-upload' : 'ipm-tab-library'"
        >
          <!-- -------- Upload-Tab -------- -->
          <div v-if="activeTab === 'upload'">
            <!-- Drop-Zone -->
            <div
              :class="[
                'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer',
                isDragOver
                  ? 'border-ui-accent bg-ui-accent/5'
                  : 'border-ui-border bg-ui-bg hover:border-ui-accent/60 hover:bg-ui-accent/5',
              ]"
              role="button"
              tabindex="0"
              aria-label="Bild hierher ziehen oder klicken zum Auswählen"
              @click="triggerFileInput"
              @keydown.enter.prevent="triggerFileInput"
              @keydown.space.prevent="triggerFileInput"
              @dragover="onDragOver"
              @dragleave="onDragLeave"
              @drop="onDrop"
            >
              <!-- Upload-Icon -->
              <svg
                class="h-10 w-10 text-ui-muted opacity-60"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.5"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                />
              </svg>
              <p class="mt-3 text-sm font-medium text-ui-text">
                Bild hier ablegen
              </p>
              <p class="mt-1 text-xs text-ui-muted">
                oder klicken zum Auswählen
              </p>
              <p class="mt-2 text-xs text-ui-muted">
                JPEG, PNG, WebP, GIF
              </p>
            </div>

            <!-- Verstecktes Datei-Input -->
            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              class="sr-only"
              aria-hidden="true"
              tabindex="-1"
              @change="onFileInputChange"
            >

            <!-- Ladeindikator -->
            <div
              v-if="uploading"
              class="mt-4 flex items-center gap-2 text-sm text-ui-muted"
              aria-live="polite"
              aria-busy="true"
            >
              <svg
                class="h-4 w-4 animate-spin text-ui-accent"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span>Wird hochgeladen...</span>
            </div>

            <!-- Fehlermeldung Upload -->
            <div
              v-if="uploadError"
              class="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700"
              role="alert"
            >
              {{ uploadError }}
            </div>
          </div>

          <!-- -------- Mediathek-Tab -------- -->
          <div v-else>
            <!-- Fehlermeldung Loeschen -->
            <div
              v-if="deleteError"
              class="mb-3 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700"
              role="alert"
            >
              {{ deleteError }}
            </div>

            <!-- Lade-Skelett -->
            <div
              v-if="libraryLoading"
              class="grid grid-cols-3 gap-3 sm:grid-cols-4"
              aria-label="Bilder werden geladen"
            >
              <div
                v-for="n in 8"
                :key="n"
                class="aspect-square animate-pulse rounded-lg bg-ui-border"
              />
            </div>

            <!-- Fehler beim Laden -->
            <div
              v-else-if="libraryError"
              class="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700"
              role="alert"
            >
              {{ libraryError }}
            </div>

            <!-- Leer-Zustand -->
            <div
              v-else-if="items.length === 0"
              class="flex flex-col items-center justify-center py-12 text-center"
            >
              <svg
                class="h-10 w-10 text-ui-muted opacity-40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.5"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                />
              </svg>
              <p class="mt-3 text-sm text-ui-muted">
                Noch keine Bilder in der Mediathek.
              </p>
              <button
                v-if="!isReadonly"
                type="button"
                class="mt-2 text-sm text-ui-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
                @click="activeTab = 'upload'"
              >
                Erstes Bild hochladen
              </button>
            </div>

            <!-- Bild-Grid -->
            <div v-else>
              <div class="grid grid-cols-3 gap-3 sm:grid-cols-4">
                <div
                  v-for="item in items"
                  :key="item.id"
                  class="group relative aspect-square"
                >
                  <!-- Auswahl-Button (Hauptinteraktion) -->
                  <button
                    type="button"
                    class="absolute inset-0 h-full w-full overflow-hidden rounded-lg border border-ui-border transition-colors hover:border-ui-accent focus-visible:border-ui-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent focus-visible:ring-offset-1"
                    :aria-label="`${getAlt(item)} auswählen`"
                    @click="selectItem(item)"
                  >
                    <img
                      :src="item.url"
                      :alt="getAlt(item)"
                      class="h-full w-full object-cover"
                      loading="lazy"
                      width="200"
                      height="200"
                    >
                  </button>

                  <!-- Löschen-Button (nur wenn nicht readonly und kein Confirm aktiv) -->
                  <button
                    v-if="!isReadonly && confirmDeleteId !== item.id"
                    type="button"
                    class="absolute bottom-1.5 right-1.5 z-10 rounded-md bg-white/90 p-1 text-red-500 opacity-0 shadow transition-opacity hover:bg-white hover:text-red-600 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 group-hover:opacity-100"
                    :aria-label="`${getAlt(item)} löschen`"
                    @click.stop="confirmDeleteId = item.id"
                  >
                    <svg
                      class="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                      aria-hidden="true"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                      />
                    </svg>
                  </button>

                  <!-- Bestaetigungs-Overlay Loeschen -->
                  <div
                    v-if="confirmDeleteId === item.id"
                    class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-lg bg-white/95"
                  >
                    <p class="text-center text-xs font-medium text-ui-text">
                      Löschen?
                    </p>
                    <div class="flex gap-1.5">
                      <button
                        type="button"
                        class="rounded px-2.5 py-1 text-xs font-medium bg-red-600 text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500"
                        @click.stop="handleDelete(item.id)"
                      >
                        Ja
                      </button>
                      <button
                        type="button"
                        class="rounded border border-ui-border px-2.5 py-1 text-xs font-medium text-ui-text transition-colors hover:bg-ui-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
                        @click.stop="confirmDeleteId = null"
                      >
                        Nein
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Mehr laden -->
              <div
                v-if="currentPage < lastPage"
                class="mt-4 flex justify-center"
              >
                <button
                  type="button"
                  :disabled="loadingMore"
                  class="rounded-lg border border-ui-border px-4 py-2 text-sm text-ui-muted transition-colors hover:border-ui-accent hover:text-ui-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent disabled:cursor-not-allowed disabled:opacity-50"
                  @click="loadMore"
                >
                  <span v-if="loadingMore">Wird geladen...</span>
                  <span v-else>Weitere Bilder laden</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
