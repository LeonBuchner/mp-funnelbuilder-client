<!--
  EditorPersonalizationPanel: Verwaltung von Personalisierungs-Variablen.

  Zeigt die Variablen aus meta.personalizationVars und erlaubt:
    - Hinzufuegen einer neuen Variable (Key, Quelle, paramName/sourceBlockId, Fallback)
    - Bearbeiten bestehender Variablen
    - Loeschen von Variablen

  Schreibt via editorStore.updateMeta({ personalizationVars: [...] }).
  Kleine Vorschau zeigt wie {{key}} mit dem Fallback-Wert aussieht.

  Eingebunden in EditorLeftPanel unterhalb der Sprungregeln (Uebersicht-Tab).
-->
<script setup lang="ts">
import type { PersonalizationVar, PersonalizationVarSource } from '~/types/funnel'

defineProps<{
  isReadonly: boolean
}>()

const editorStore = useEditorStore()

const vars = computed<PersonalizationVar[]>(
  () => editorStore.content?.meta.personalizationVars ?? [],
)

// ---------------------------------------------------------------------------
// Formular-State
// ---------------------------------------------------------------------------

const isFormOpen = ref<boolean>(false)
const editingIndex = ref<number | null>(null)

function emptyForm(): PersonalizationVar {
  return { key: '', source: 'url_param', paramName: '', fallback: '' }
}

const form = ref<PersonalizationVar>(emptyForm())
const formError = ref<string>('')

function openAdd(): void {
  form.value = emptyForm()
  formError.value = ''
  editingIndex.value = null
  isFormOpen.value = true
}

function openEdit(idx: number): void {
  const v = vars.value[idx]
  if (!v) return
  form.value = { ...v }
  formError.value = ''
  editingIndex.value = idx
  isFormOpen.value = true
}

function closeForm(): void {
  isFormOpen.value = false
  editingIndex.value = null
  formError.value = ''
}

function saveForm(): void {
  const key = form.value.key.trim()

  if (!key) {
    formError.value = 'Ein Schlüssel ist erforderlich.'
    return
  }
  if (!/^[a-z_][a-z0-9_]*$/i.test(key)) {
    formError.value = 'Nur Buchstaben, Zahlen und Unterstriche erlaubt (kein Leerzeichen).'
    return
  }
  const duplicate = vars.value.some((v, i) => v.key === key && i !== editingIndex.value)
  if (duplicate) {
    formError.value = `Der Schlüssel "${key}" ist bereits vergeben.`
    return
  }

  if (
    (form.value.source === 'url_param' || form.value.source === 'utm_param')
    && !form.value.paramName?.trim()
  ) {
    formError.value = 'Der Parameter-Name ist erforderlich.'
    return
  }
  if (form.value.source === 'answer' && !form.value.sourceBlockId?.trim()) {
    formError.value = 'Die Block-ID ist erforderlich.'
    return
  }

  const newVar: PersonalizationVar = {
    key,
    source: form.value.source,
    ...(form.value.source !== 'answer'
      ? { paramName: form.value.paramName?.trim() ?? '' }
      : { sourceBlockId: form.value.sourceBlockId?.trim() ?? '' }),
    ...(form.value.fallback?.trim()
      ? { fallback: form.value.fallback.trim() }
      : {}),
  }

  const updated = [...vars.value]
  if (editingIndex.value !== null) {
    updated[editingIndex.value] = newVar
  }
  else {
    updated.push(newVar)
  }

  editorStore.updateMeta({ personalizationVars: updated })
  closeForm()
}

function removeVar(idx: number): void {
  const v = vars.value[idx]
  if (!v) return
  if (!window.confirm(`Variable "{{${v.key}}}" wirklich löschen?`)) return
  editorStore.updateMeta({
    personalizationVars: vars.value.filter((_, i) => i !== idx),
  })
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

const sourceLabels: Record<PersonalizationVarSource, string> = {
  url_param: 'URL-Param',
  utm_param: 'UTM-Param',
  answer: 'Antwort',
}

/** Vorschau: zeigt Fallback oder den Platzhalter selbst. */
const formPreview = computed<string>(() => {
  const key = form.value.key.trim() || 'schlüssel'
  return form.value.fallback?.trim() || '{{' + key + '}}'
})

/** Platzhalter-Text fuer die Vorschau im Formular. */
const formKeyPlaceholder = computed<string>(() => '{{' + (form.value.key.trim() || 'schlüssel') + '}}')

/** Gibt den Platzhalter-Text fuer eine Variable zurueck. */
function varPlaceholder(key: string): string {
  return '{{' + key + '}}'
}
</script>

<template>
  <section aria-label="Personalisierung">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 pt-4 pb-2">
      <h2 class="text-xs font-semibold text-ui-text">
        Personalisierung
      </h2>
    </div>

    <!-- Variablen-Liste -->
    <ul
      v-if="vars.length > 0"
      class="px-3 space-y-1"
      aria-label="Personalisierungs-Variablen"
    >
      <li
        v-for="(v, idx) in vars"
        :key="v.key"
        class="group flex items-center gap-2 rounded-lg bg-ui-bg px-3 py-2 text-sm"
      >
        <div class="min-w-0 flex-1">
          <span class="font-mono text-xs font-semibold text-ui-accent-hover">{{ varPlaceholder(v.key) }}</span>
          <span class="ml-1.5 text-xs text-ui-muted">{{ sourceLabels[v.source] }}</span>
          <template v-if="v.fallback">
            <br>
            <span class="text-xs text-ui-muted">Fallback: {{ v.fallback }}</span>
          </template>
        </div>

        <!-- Aktionen (sichtbar bei Hover) -->
        <div
          v-if="!isReadonly"
          class="flex flex-shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <button
            type="button"
            class="flex h-5 w-5 items-center justify-center rounded text-ui-muted hover:bg-ui-border focus:outline-none focus:ring-2 focus:ring-ui-accent"
            :aria-label="`Variable ${v.key} bearbeiten`"
            title="Bearbeiten"
            @click="openEdit(idx)"
          >
            <!-- Pencil-Icon -->
            <svg
              class="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2.5"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </button>
          <button
            type="button"
            class="flex h-5 w-5 items-center justify-center rounded text-red-400 hover:bg-red-50 focus:outline-none focus:ring-1 focus:ring-red-500"
            :aria-label="`Variable ${v.key} löschen`"
            title="Loeschen"
            @click="removeVar(idx)"
          >
            <svg
              class="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2.5"
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
      </li>
    </ul>

    <p
      v-else-if="!isFormOpen"
      class="px-4 pb-2 text-xs text-ui-muted"
    >
      Noch keine Variablen definiert.
    </p>

    <!-- Formular: Variable hinzufuegen / bearbeiten -->
    <form
      v-if="isFormOpen && !isReadonly"
      class="mx-3 mt-2 mb-2 rounded-lg border border-ui-border bg-white p-3 space-y-2"
      novalidate
      aria-label="Variable bearbeiten"
      @submit.prevent="saveForm"
    >
      <!-- Schluessel -->
      <div>
        <label
          for="pvar-key"
          class="mb-0.5 block text-xs font-medium text-ui-text"
        >
          Schlüssel
        </label>
        <input
          id="pvar-key"
          v-model.trim="form.key"
          type="text"
          placeholder="z. B. vorname"
          class="w-full rounded border border-ui-border px-2 py-1 text-xs focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent"
          autocomplete="off"
        >
        <p class="mt-0.5 text-xs text-ui-muted">
          Platzhalter im Text:
          <code class="font-mono">{{ formKeyPlaceholder }}</code>
        </p>
      </div>

      <!-- Quelle -->
      <div>
        <label
          for="pvar-source"
          class="mb-0.5 block text-xs font-medium text-ui-text"
        >
          Quelle
        </label>
        <select
          id="pvar-source"
          v-model="form.source"
          class="w-full rounded border border-ui-border px-2 py-1 text-xs focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent"
        >
          <option value="url_param">URL-Parameter</option>
          <option value="utm_param">UTM-Parameter</option>
          <option value="answer">Antwort (Block-ID)</option>
        </select>
      </div>

      <!-- Parameter-Name (url_param / utm_param) -->
      <div v-if="form.source === 'url_param' || form.source === 'utm_param'">
        <label
          for="pvar-param"
          class="mb-0.5 block text-xs font-medium text-ui-text"
        >
          Parameter-Name
        </label>
        <input
          id="pvar-param"
          v-model.trim="form.paramName"
          type="text"
          :placeholder="form.source === 'utm_param' ? 'z. B. utm_source' : 'z. B. vorname'"
          class="w-full rounded border border-ui-border px-2 py-1 text-xs focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent"
          autocomplete="off"
        >
      </div>

      <!-- Block-ID (answer) -->
      <div v-if="form.source === 'answer'">
        <label
          for="pvar-blockid"
          class="mb-0.5 block text-xs font-medium text-ui-text"
        >
          Block-ID (UUID)
        </label>
        <input
          id="pvar-blockid"
          v-model.trim="form.sourceBlockId"
          type="text"
          placeholder="a1b2c3d4-0000-4000-8000-000000000001"
          class="w-full rounded border border-ui-border px-2 py-1 text-xs focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent"
          autocomplete="off"
        >
      </div>

      <!-- Fallback -->
      <div>
        <label
          for="pvar-fallback"
          class="mb-0.5 block text-xs font-medium text-ui-text"
        >
          Fallback <span class="font-normal text-ui-muted">(optional)</span>
        </label>
        <input
          id="pvar-fallback"
          v-model="form.fallback"
          type="text"
          placeholder="z. B. Freund"
          class="w-full rounded border border-ui-border px-2 py-1 text-xs focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent"
          autocomplete="off"
        >
      </div>

      <!-- Fehler -->
      <p
        v-if="formError"
        class="text-xs text-red-600"
        role="alert"
        aria-live="polite"
      >
        {{ formError }}
      </p>

      <!-- Vorschau -->
      <p class="text-xs text-ui-muted">
        Vorschau mit Fallback:
        <span class="font-semibold text-ui-text">{{ formPreview }}</span>
      </p>

      <!-- Aktions-Buttons -->
      <div class="flex gap-2 pt-1">
        <button
          type="submit"
          class="rounded bg-ui-accent px-3 py-1 text-xs font-medium text-white hover:bg-ui-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ui-accent"
        >
          {{ editingIndex !== null ? 'Speichern' : 'Hinzufügen' }}
        </button>
        <button
          type="button"
          class="rounded border border-ui-border px-3 py-1 text-xs text-ui-muted hover:text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-accent"
          @click="closeForm"
        >
          Abbrechen
        </button>
      </div>
    </form>

    <!-- Variable hinzufuegen (Trigger-Button) -->
    <button
      v-if="!isReadonly && !isFormOpen"
      type="button"
      class="mt-1 flex w-full items-center gap-2 px-4 py-2 text-sm text-ui-muted transition-colors hover:text-ui-accent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ui-accent"
      @click="openAdd"
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
          d="M12 4v16m8-8H4"
        />
      </svg>
      Variable hinzufuegen
    </button>
  </section>
</template>
