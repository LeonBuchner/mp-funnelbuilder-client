<script setup lang="ts">
const emit = defineEmits<{
  close: []
}>()

const authStore = useAuthStore()
const workspaceStore = useWorkspaceStore()
const toast = useToast()
const { trapFocus } = useFocusTrap()
const uploads = useUploads()

// ---------------------------------------------------------------------------
// Formular mit bestehenden Werten vorbefüllen
// ---------------------------------------------------------------------------
const ws = workspaceStore.activeWorkspace

const nameInput = ref(ws?.name ?? '')
const localeSelect = ref(ws?.settings?.default_locale ?? 'de')
const timezoneSelect = ref(ws?.settings?.timezone ?? 'Europe/Berlin')

// Logo
const logoPreviewUrl = ref<string | null>(ws?.logo_url ?? null)
const pendingLogoFile = ref<File | null>(null)
const isUploadingLogo = ref(false)

// ---------------------------------------------------------------------------
// Feld-Fehler
// ---------------------------------------------------------------------------
const nameError = ref<string | null>(null)
const generalError = ref<string | null>(null)
const isSaving = ref(false)

// ---------------------------------------------------------------------------
// Kuratierte Zeitzonen (15 europäische IANA + UTC)
// ---------------------------------------------------------------------------
const TIMEZONES: { value: string; label: string }[] = [
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/Berlin', label: 'Berlin (MEZ/MESZ)' },
  { value: 'Europe/Vienna', label: 'Wien (MEZ/MESZ)' },
  { value: 'Europe/Zurich', label: 'Zürich (MEZ/MESZ)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (MEZ/MESZ)' },
  { value: 'Europe/Rome', label: 'Rom (MEZ/MESZ)' },
  { value: 'Europe/Madrid', label: 'Madrid (MEZ/MESZ)' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (MEZ/MESZ)' },
  { value: 'Europe/Brussels', label: 'Brüssel (MEZ/MESZ)' },
  { value: 'Europe/Copenhagen', label: 'Kopenhagen (MEZ/MESZ)' },
  { value: 'Europe/Stockholm', label: 'Stockholm (MEZ/MESZ)' },
  { value: 'Europe/Oslo', label: 'Oslo (MEZ/MESZ)' },
  { value: 'Europe/Helsinki', label: 'Helsinki (OEZ/OESZ)' },
  { value: 'Europe/Warsaw', label: 'Warschau (MEZ/MESZ)' },
  { value: 'Europe/Prague', label: 'Prag (MEZ/MESZ)' },
  { value: 'Europe/Budapest', label: 'Budapest (MEZ/MESZ)' },
  { value: 'Europe/Bucharest', label: 'Bukarest (OEZ/OESZ)' },
  { value: 'Europe/Athens', label: 'Athen (OEZ/OESZ)' },
  { value: 'Europe/Lisbon', label: 'Lissabon (WEZ/WESZ)' },
]

// ---------------------------------------------------------------------------
// Logo-Datei vormerken
// ---------------------------------------------------------------------------
function handleLogoFileChange(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  pendingLogoFile.value = file
  // Lokale Vorschau
  logoPreviewUrl.value = URL.createObjectURL(file)
}

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------
interface WorkspacePatchBody {
  name?: string
  settings?: { default_locale?: string; timezone?: string }
  logo_upload_id?: string
}

interface ValidationErrors {
  message?: string
  errors?: Record<string, string[]>
}

async function handleSubmit(): Promise<void> {
  const name = nameInput.value.trim()
  if (!name) {
    nameError.value = 'Bitte einen Namen eingeben.'
    return
  }

  const wsId = workspaceStore.activeWorkspace?.id
  if (!wsId) return

  isSaving.value = true
  nameError.value = null
  generalError.value = null

  try {
    const body: WorkspacePatchBody = {
      name,
      settings: {
        default_locale: localeSelect.value,
        timezone: timezoneSelect.value,
      },
    }

    // Logo hochladen falls neu gewählt
    if (pendingLogoFile.value) {
      isUploadingLogo.value = true
      try {
        const uploaded = await uploads.upload(wsId, pendingLogoFile.value)
        body.logo_upload_id = uploaded.id
      }
      catch {
        generalError.value = 'Logo-Upload fehlgeschlagen. Bitte ein anderes Bild wählen.'
        isSaving.value = false
        isUploadingLogo.value = false
        return
      }
      finally {
        isUploadingLogo.value = false
      }
    }

    const api = useApi()
    await api(`/workspaces/${wsId}`, {
      method: 'PATCH',
      body,
    })

    await authStore.fetchMe()
    toast.success('Workspace-Einstellungen wurden gespeichert.')
    emit('close')
  }
  catch (error: unknown) {
    const err = error as { status?: number; statusCode?: number; data?: ValidationErrors }
    const status = err?.status ?? err?.statusCode

    if (status === 422) {
      const errors = err.data?.errors ?? {}
      nameError.value = errors['name']?.[0] ?? null
      if (!nameError.value) {
        generalError.value = err.data?.message ?? 'Ungültige Eingabe. Bitte prüfen.'
      }
    }
    else {
      generalError.value = 'Einstellungen konnten nicht gespeichert werden.'
    }
  }
  finally {
    isSaving.value = false
  }
}

// ---------------------------------------------------------------------------
// Fokus-Trap + Escape
// ---------------------------------------------------------------------------
const modalEl = ref<HTMLElement | null>(null)
const nameInputRef = ref<HTMLInputElement | null>(null)

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    emit('close')
    return
  }
  if (modalEl.value) trapFocus(event, modalEl.value)
}

onMounted(() => {
  nextTick(() => nameInputRef.value?.focus())
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  // Object-URLs freigeben
  if (pendingLogoFile.value && logoPreviewUrl.value?.startsWith('blob:')) {
    URL.revokeObjectURL(logoPreviewUrl.value)
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      @click.self="$emit('close')"
    >
      <div
        ref="modalEl"
        class="w-full max-w-md rounded-2xl bg-ui-surface shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ws-settings-modal-title"
      >
        <!-- Kopfzeile -->
        <div class="flex items-center justify-between border-b border-ui-border px-6 py-4">
          <h2
            id="ws-settings-modal-title"
            class="text-base font-semibold text-ui-text"
          >
            Workspace-Einstellungen
          </h2>
          <button
            type="button"
            class="flex h-7 w-7 items-center justify-center rounded-lg text-ui-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
            aria-label="Modal schließen"
            @click="$emit('close')"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Formular -->
        <form class="p-6" @submit.prevent="handleSubmit">
          <!-- Name -->
          <div class="mb-4">
            <label
              for="ws-name"
              class="mb-1.5 block text-sm font-medium text-ui-text"
            >
              Name <span class="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="ws-name"
              ref="nameInputRef"
              v-model="nameInput"
              type="text"
              required
              autocomplete="organization"
              :aria-invalid="nameError ? 'true' : undefined"
              :aria-describedby="nameError ? 'ws-name-error' : undefined"
              class="w-full rounded-lg border bg-white px-3 py-2 text-sm text-ui-text placeholder:text-ui-muted focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
              :class="nameError ? 'border-red-400 focus:border-red-400' : 'border-ui-border focus:border-ui-accent'"
            >
            <p
              v-if="nameError"
              id="ws-name-error"
              class="mt-1.5 text-xs text-red-600"
              role="alert"
            >
              {{ nameError }}
            </p>
          </div>

          <!-- Sprache -->
          <div class="mb-4">
            <label
              for="ws-locale"
              class="mb-1.5 block text-sm font-medium text-ui-text"
            >
              Standard-Sprache
            </label>
            <select
              id="ws-locale"
              v-model="localeSelect"
              class="w-full rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
            >
              <option value="de">Deutsch</option>
              <option value="en">English</option>
            </select>
          </div>

          <!-- Zeitzone -->
          <div class="mb-4">
            <label
              for="ws-timezone"
              class="mb-1.5 block text-sm font-medium text-ui-text"
            >
              Zeitzone
            </label>
            <select
              id="ws-timezone"
              v-model="timezoneSelect"
              class="w-full rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
            >
              <option
                v-for="tz in TIMEZONES"
                :key="tz.value"
                :value="tz.value"
              >
                {{ tz.label }}
              </option>
            </select>
          </div>

          <!-- Logo-Upload -->
          <div class="mb-5">
            <label
              for="ws-logo"
              class="mb-1.5 block text-sm font-medium text-ui-text"
            >
              Workspace-Logo
              <span class="ml-1 font-normal text-ui-muted">(optional)</span>
            </label>

            <!-- Vorschau -->
            <div
              v-if="logoPreviewUrl"
              class="mb-2 flex items-center gap-3"
            >
              <img
                :src="logoPreviewUrl"
                :alt="`Logo des Workspace ${nameInput}`"
                width="48"
                height="48"
                class="h-12 w-12 rounded-lg border border-ui-border object-contain"
              >
              <p class="text-xs text-ui-muted">
                {{ pendingLogoFile ? pendingLogoFile.name : 'Aktuelles Logo' }}
              </p>
            </div>

            <input
              id="ws-logo"
              type="file"
              accept="image/*"
              class="w-full rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-text file:mr-3 file:rounded-md file:border-0 file:bg-ui-accent/10 file:px-3 file:py-1 file:text-xs file:font-medium file:text-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
              @change="handleLogoFileChange"
            >
            <p class="mt-1 text-xs text-ui-muted">
              JPG, PNG, SVG, WebP. Wird als Workspace-Logo in der App angezeigt.
            </p>
          </div>

          <!-- Allgemeiner Fehler -->
          <p
            v-if="generalError"
            class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
            role="alert"
          >
            {{ generalError }}
          </p>

          <!-- Buttons -->
          <div class="flex justify-end gap-2">
            <button
              type="button"
              class="rounded-lg px-4 py-2 text-sm font-medium text-ui-muted transition-colors hover:bg-ui-bg focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
              @click="$emit('close')"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              :disabled="isSaving"
              class="flex items-center gap-1.5 rounded-lg bg-ui-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ui-accent-hover disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
            >
              <svg
                v-if="isSaving"
                class="h-3.5 w-3.5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {{ isSaving ? (isUploadingLogo ? 'Logo wird hochgeladen...' : 'Wird gespeichert...') : 'Speichern' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
