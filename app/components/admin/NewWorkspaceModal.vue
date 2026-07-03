<script setup lang="ts">
const emit = defineEmits<{
  close: []
}>()

const authStore = useAuthStore()
const workspaceStore = useWorkspaceStore()
const toast = useToast()
const { trapFocus } = useFocusTrap()

// ---------------------------------------------------------------------------
// Formular-State
// ---------------------------------------------------------------------------
const nameInput = ref('')
const slugInput = ref('')
const isSubmitting = ref(false)
const nameError = ref<string | null>(null)
const slugError = ref<string | null>(null)
const generalError = ref<string | null>(null)

// ---------------------------------------------------------------------------
// Fokus-Trap + Escape
// ---------------------------------------------------------------------------
const modalEl = ref<HTMLElement | null>(null)
const nameInputRef = ref<HTMLInputElement | null>(null)

onMounted(() => {
  nextTick(() => nameInputRef.value?.focus())
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    emit('close')
    return
  }
  if (modalEl.value) trapFocus(event, modalEl.value)
}

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------
interface WorkspaceCreateResponse {
  data: {
    id: string
    name: string
    slug: string
  }
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

  isSubmitting.value = true
  nameError.value = null
  slugError.value = null
  generalError.value = null

  try {
    const api = useApi()
    const body: { name: string; slug?: string } = { name }
    const slug = slugInput.value.trim()
    if (slug) body.slug = slug

    const response = await api<WorkspaceCreateResponse>('/workspaces', {
      method: 'POST',
      body,
    })

    await authStore.fetchMe()
    workspaceStore.setActive(response.data.id)
    toast.success(`Workspace „${response.data.name}" wurde angelegt.`)
    emit('close')
  }
  catch (error: unknown) {
    const err = error as { status?: number; statusCode?: number; data?: ValidationErrors }
    const status = err?.status ?? err?.statusCode

    if (status === 422) {
      const errors = err.data?.errors ?? {}
      nameError.value = errors['name']?.[0] ?? null
      slugError.value = errors['slug']?.[0] ?? null
      if (!nameError.value && !slugError.value) {
        generalError.value = err.data?.message ?? 'Ungültige Eingabe. Bitte prüfen.'
      }
    }
    else if (status === 429) {
      generalError.value = 'Du hast in kurzer Zeit zu viele Workspaces angelegt. Bitte warte etwas.'
    }
    else {
      generalError.value = 'Workspace konnte nicht angelegt werden. Bitte erneut versuchen.'
    }
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      @click.self="$emit('close')"
    >
      <div
        ref="modalEl"
        class="w-full max-w-sm rounded-2xl bg-ui-surface shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-workspace-modal-title"
      >
        <!-- Kopfzeile -->
        <div class="flex items-center justify-between border-b border-ui-border px-6 py-4">
          <h2
            id="new-workspace-modal-title"
            class="text-base font-semibold text-ui-text"
          >
            Neuer Workspace
          </h2>
          <button
            type="button"
            class="flex h-7 w-7 items-center justify-center rounded-lg text-ui-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
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
              for="new-ws-name"
              class="mb-1.5 block text-sm font-medium text-ui-text"
            >
              Name <span class="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="new-ws-name"
              ref="nameInputRef"
              v-model="nameInput"
              type="text"
              placeholder="z. B. Marketing Planet GmbH"
              required
              autocomplete="off"
              :aria-invalid="nameError ? 'true' : undefined"
              :aria-describedby="nameError ? 'new-ws-name-error' : undefined"
              class="w-full rounded-lg border bg-white px-3 py-2 text-sm text-ui-text placeholder:text-ui-muted focus:outline-none focus:ring-2 focus:ring-ui-accent"
              :class="nameError ? 'border-red-400 focus:border-red-400' : 'border-ui-border focus:border-ui-accent'"
            >
            <p
              v-if="nameError"
              id="new-ws-name-error"
              class="mt-1.5 text-xs text-red-600"
              role="alert"
            >
              {{ nameError }}
            </p>
          </div>

          <!-- Slug (optional) -->
          <div class="mb-5">
            <label
              for="new-ws-slug"
              class="mb-1.5 block text-sm font-medium text-ui-text"
            >
              Slug
              <span class="ml-1 font-normal text-ui-muted">(optional)</span>
            </label>
            <input
              id="new-ws-slug"
              v-model="slugInput"
              type="text"
              placeholder="z. B. meine-firma"
              autocomplete="off"
              :aria-invalid="slugError ? 'true' : undefined"
              :aria-describedby="slugError ? 'new-ws-slug-error' : 'new-ws-slug-hint'"
              class="w-full rounded-lg border bg-white px-3 py-2 text-sm text-ui-text placeholder:text-ui-muted focus:outline-none focus:ring-2 focus:ring-ui-accent"
              :class="slugError ? 'border-red-400 focus:border-red-400' : 'border-ui-border focus:border-ui-accent'"
            >
            <p id="new-ws-slug-hint" class="mt-1 text-xs text-ui-muted">
              Nur Kleinbuchstaben, Ziffern und Bindestriche erlaubt.
            </p>
            <p
              v-if="slugError"
              id="new-ws-slug-error"
              class="mt-1 text-xs text-red-600"
              role="alert"
            >
              {{ slugError }}
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
              class="rounded-lg px-4 py-2 text-sm font-medium text-ui-muted transition-colors hover:bg-ui-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
              @click="$emit('close')"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="rounded-lg bg-ui-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ui-accent-hover disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ui-accent"
            >
              {{ isSubmitting ? 'Wird angelegt...' : 'Anlegen' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
