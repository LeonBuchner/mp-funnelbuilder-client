<!--
  AbTestCreateModal – Modal zum Anlegen eines neuen A/B-Tests.

  Laedt die stabilen (veroeffentlichten) Versionen des Funnels.
  Die aktuelle Live-Version wird als Kontrolle (Variante A) angezeigt.
  Als Variante B sind nur andere veroeffentlichte Versionen waehlbar.

  Wenn keine zweite stabile Version vorhanden ist, wird ein freundlicher
  Hinweis angezeigt statt einem kaputten Formular.

  WCAG 2.1 AA: role=dialog, aria-modal, aria-labelledby, Focus-Trap, Escape.
-->
<script setup lang="ts">
import type { FunnelVersionListItem } from '~/types/ab-test'
import { formatSplitDisplay } from '~/composables/useAbTests'

// ---------------------------------------------------------------------------
// Props + Emits
// ---------------------------------------------------------------------------

const props = defineProps<{
  funnelId: string
}>()

const emit = defineEmits<{
  close: []
  created: []
}>()

// ---------------------------------------------------------------------------
// Composables
// ---------------------------------------------------------------------------

const abTestsApi = useAbTests()
const toast = useToast()
const { trapFocus } = useFocusTrap()

const modalEl = ref<HTMLElement | null>(null)
const nameInputRef = ref<HTMLInputElement | null>(null)

// ---------------------------------------------------------------------------
// Versionen laden
// ---------------------------------------------------------------------------

const isLoadingVersions = ref(true)
const versionsError = ref<string | null>(null)
const allVersions = ref<FunnelVersionListItem[]>([])

/** Aktuelle Live-Version (Kontrolle A), wird als Info angezeigt. */
const controlVersion = computed(() =>
  allVersions.value.find((v) => v.is_current_published) ?? null,
)

/** Waehlbare Versionen fuer Variante B (alle veroeffentlichten ausser der Live-Version). */
const selectableVersions = computed(() =>
  allVersions.value.filter((v) => !v.is_current_published),
)

/** Gibt es eine zweite stabile Version fuer Variante B? */
const canCreate = computed(() => selectableVersions.value.length > 0)

async function loadVersions(): Promise<void> {
  isLoadingVersions.value = true
  versionsError.value = null
  try {
    const res = await abTestsApi.listVersions(props.funnelId)
    allVersions.value = res.data
  } catch {
    versionsError.value = 'Versionen konnten nicht geladen werden.'
  } finally {
    isLoadingVersions.value = false
    if (canCreate.value) {
      nextTick(() => nameInputRef.value?.focus())
    }
  }
}

// ---------------------------------------------------------------------------
// Formular-State
// ---------------------------------------------------------------------------

const nameInput = ref('')
const selectedVersionBId = ref<number | null>(null)
const splitA = ref(50)

const splitDisplay = computed(() => formatSplitDisplay(splitA.value))

// ---------------------------------------------------------------------------
// Fehler-State (feldweise)
// ---------------------------------------------------------------------------

const nameError = ref<string | null>(null)
const versionBError = ref<string | null>(null)
const splitError = ref<string | null>(null)
const generalError = ref<string | null>(null)
const isSubmitting = ref(false)

// ---------------------------------------------------------------------------
// Focus-Trap + Escape
// ---------------------------------------------------------------------------

onMounted(async () => {
  document.addEventListener('keydown', handleKeydown)
  await loadVersions()
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

interface ValidationErrors {
  message?: string
  errors?: Record<string, string[]>
}

async function handleSubmit(): Promise<void> {
  nameError.value = null
  versionBError.value = null
  splitError.value = null
  generalError.value = null

  const name = nameInput.value.trim()
  if (!name) {
    nameError.value = 'Bitte einen Namen eingeben.'
    nameInputRef.value?.focus()
    return
  }

  if (selectedVersionBId.value === null) {
    versionBError.value = 'Bitte eine Version für Variante B wählen.'
    return
  }

  isSubmitting.value = true

  try {
    await abTestsApi.create(props.funnelId, {
      name,
      variant_b_version_id: selectedVersionBId.value,
      traffic_split_pct_a: splitA.value,
    })

    toast.success(`A/B-Test "${name}" wurde angelegt.`)
    emit('created')
    emit('close')
  } catch (error: unknown) {
    const err = error as { status?: number; statusCode?: number; data?: ValidationErrors }
    const status = err?.status ?? err?.statusCode

    if (status === 422) {
      const errors = err.data?.errors ?? {}
      nameError.value = errors['name']?.[0] ?? null
      versionBError.value = errors['variant_b_version_id']?.[0] ?? null
      splitError.value = errors['traffic_split_pct_a']?.[0] ?? null
      if (!nameError.value && !versionBError.value && !splitError.value) {
        generalError.value = err.data?.message ?? 'Ungültige Eingabe. Bitte prüfen.'
      }
    } else {
      generalError.value = 'A/B-Test konnte nicht angelegt werden. Bitte erneut versuchen.'
    }
  } finally {
    isSubmitting.value = false
  }
}

/** Versionseintrag formatieren: "Version 2 · Mein Label" */
function versionLabel(v: FunnelVersionListItem): string {
  const base = `Version ${v.version_number}`
  return v.label ? `${base} · ${v.label}` : base
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="ab-create-modal-title"
        class="w-full max-w-md rounded-2xl bg-ui-surface shadow-xl"
      >
        <!-- Kopfzeile -->
        <div class="flex items-center justify-between border-b border-ui-border px-6 py-4">
          <h2
            id="ab-create-modal-title"
            class="text-base font-semibold text-ui-text"
          >
            Neuer A/B-Test
          </h2>
          <button
            type="button"
            class="flex h-7 w-7 items-center justify-center rounded-lg text-ui-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
            aria-label="Modal schließen"
            @click="$emit('close')"
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

        <!-- Ladezustand Versionen -->
        <div
          v-if="isLoadingVersions"
          class="flex items-center justify-center py-12"
          aria-busy="true"
          aria-label="Versionen werden geladen"
        >
          <svg
            class="h-5 w-5 animate-spin text-ui-accent"
            viewBox="0 0 24 24"
            fill="none"
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
        </div>

        <!-- Fehler beim Laden der Versionen -->
        <div
          v-else-if="versionsError"
          class="px-6 py-8 text-center text-sm text-red-600"
          role="alert"
        >
          {{ versionsError }}
        </div>

        <!-- Keine zweite stabile Version -->
        <div
          v-else-if="!canCreate"
          class="px-6 py-8 text-center"
        >
          <svg
            class="mx-auto mb-3 h-8 w-8 text-ui-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.5"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p class="mb-1 text-sm font-medium text-ui-text">
            Keine zweite Version verfügbar
          </p>
          <p class="text-xs text-ui-muted">
            Veröffentliche zuerst eine zweite Version, um sie als Variante B zu testen.
          </p>
          <button
            type="button"
            class="mt-5 rounded-lg px-4 py-2 text-sm font-medium text-ui-muted transition-colors hover:bg-ui-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
            @click="$emit('close')"
          >
            Schließen
          </button>
        </div>

        <!-- Formular -->
        <form
          v-else
          class="p-6"
          @submit.prevent="handleSubmit"
        >
          <!-- Name -->
          <div class="mb-4">
            <label
              for="ab-name"
              class="mb-1.5 block text-sm font-medium text-ui-text"
            >
              Name <span class="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="ab-name"
              ref="nameInputRef"
              v-model="nameInput"
              type="text"
              placeholder="z. B. Headline-Variante Juni"
              required
              autocomplete="off"
              :aria-invalid="nameError ? 'true' : undefined"
              :aria-describedby="nameError ? 'ab-name-error' : undefined"
              class="w-full rounded-lg border bg-white px-3 py-2 text-sm text-ui-text placeholder:text-ui-muted focus:outline-none focus:ring-2 focus:ring-ui-accent"
              :class="nameError ? 'border-red-400 focus:border-red-400' : 'border-ui-border focus:border-ui-accent'"
            >
            <p
              v-if="nameError"
              id="ab-name-error"
              class="mt-1.5 text-xs text-red-600"
              role="alert"
            >
              {{ nameError }}
            </p>
          </div>

          <!-- Kontrolle (Info, nicht editierbar) -->
          <div class="mb-4">
            <p class="mb-1.5 text-sm font-medium text-ui-text">
              Variante A (Kontrolle)
            </p>
            <div class="rounded-lg border border-ui-border bg-ui-bg px-3 py-2 text-sm text-ui-muted">
              <span v-if="controlVersion">
                Version {{ controlVersion.version_number }}
                <template v-if="controlVersion.label"> · {{ controlVersion.label }}</template>
                <span class="ml-1.5 inline-flex items-center rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">Live</span>
              </span>
              <span v-else class="italic">Keine Live-Version vorhanden</span>
            </div>
          </div>

          <!-- Variante B -->
          <div class="mb-4">
            <label
              for="ab-version-b"
              class="mb-1.5 block text-sm font-medium text-ui-text"
            >
              Variante B <span class="text-red-500" aria-hidden="true">*</span>
            </label>
            <div class="relative">
              <select
                id="ab-version-b"
                v-model="selectedVersionBId"
                required
                :aria-invalid="versionBError ? 'true' : undefined"
                :aria-describedby="versionBError ? 'ab-version-b-error' : 'ab-version-b-hint'"
                class="w-full appearance-none rounded-lg border bg-white px-3 py-2 pr-8 text-sm text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-accent"
                :class="versionBError ? 'border-red-400 focus:border-red-400' : 'border-ui-border focus:border-ui-accent'"
              >
                <option
                  :value="null"
                  disabled
                >
                  Bitte wählen
                </option>
                <option
                  v-for="v in selectableVersions"
                  :key="v.id"
                  :value="v.id"
                >
                  {{ versionLabel(v) }}
                </option>
              </select>
              <svg
                class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <p
              id="ab-version-b-hint"
              class="mt-1 text-xs text-ui-muted"
            >
              Nur veröffentlichte Versionen sind wählbar.
            </p>
            <p
              v-if="versionBError"
              id="ab-version-b-error"
              class="mt-1 text-xs text-red-600"
              role="alert"
            >
              {{ versionBError }}
            </p>
          </div>

          <!-- Traffic-Split -->
          <div class="mb-5">
            <label
              for="ab-split"
              class="mb-1.5 flex items-center justify-between text-sm font-medium text-ui-text"
            >
              <span>Traffic-Split</span>
              <span
                class="font-normal tabular-nums text-ui-muted"
                aria-live="polite"
                aria-atomic="true"
              >
                {{ splitDisplay }}
              </span>
            </label>
            <input
              id="ab-split"
              v-model.number="splitA"
              type="range"
              min="1"
              max="99"
              step="1"
              :aria-invalid="splitError ? 'true' : undefined"
              :aria-describedby="splitError ? 'ab-split-error' : 'ab-split-hint'"
              :aria-valuetext="splitDisplay"
              class="w-full accent-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent"
            >
            <div class="mt-1 flex justify-between text-xs text-ui-muted" aria-hidden="true">
              <span>1 %</span>
              <span>50 %</span>
              <span>99 %</span>
            </div>
            <p
              id="ab-split-hint"
              class="mt-1 text-xs text-ui-muted"
            >
              Anteil des Traffics, der Variante A erhält (1 bis 99 %).
            </p>
            <p
              v-if="splitError"
              id="ab-split-error"
              class="mt-1 text-xs text-red-600"
              role="alert"
            >
              {{ splitError }}
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
              {{ isSubmitting ? 'Wird angelegt...' : 'Test anlegen' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
