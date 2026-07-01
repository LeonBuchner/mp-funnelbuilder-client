<script setup lang="ts">
import type { WorkspaceMember, WorkspaceRole } from '~/types/api'
import { isLastAdmin } from '~/utils/isLastAdmin'

const emit = defineEmits<{
  close: []
}>()

const workspaceStore = useWorkspaceStore()
const toast = useToast()
const { trapFocus } = useFocusTrap()

// ---------------------------------------------------------------------------
// Mitglieder laden
// ---------------------------------------------------------------------------
const members = ref<WorkspaceMember[]>([])
const isLoading = ref(false)
const loadError = ref<string | null>(null)

async function loadMembers(): Promise<void> {
  const wsId = workspaceStore.activeWorkspace?.id
  if (!wsId) return
  isLoading.value = true
  loadError.value = null
  try {
    const api = useApi()
    const response = await api<{ data: WorkspaceMember[] }>(`/workspaces/${wsId}/members`)
    members.value = response.data
  }
  catch {
    loadError.value = 'Mitglieder konnten nicht geladen werden.'
  }
  finally {
    isLoading.value = false
  }
}

// ---------------------------------------------------------------------------
// Rolle ändern
// ---------------------------------------------------------------------------
const roleChangingId = ref<string | null>(null)
const roleErrors = ref<Record<string, string>>({})

async function handleRoleChange(member: WorkspaceMember, newRole: WorkspaceRole): Promise<void> {
  const wsId = workspaceStore.activeWorkspace?.id
  if (!wsId) return

  const prev = member.role
  roleChangingId.value = member.id
  const { [member.id]: _removed, ...rest } = roleErrors.value
  roleErrors.value = rest

  try {
    const api = useApi()
    await api(`/workspaces/${wsId}/members/${member.id}`, {
      method: 'PATCH',
      body: { role: newRole },
    })
    await loadMembers()
  }
  catch (error: unknown) {
    const err = error as { status?: number; statusCode?: number; data?: { message?: string } }
    const status = err?.status ?? err?.statusCode

    if (status === 422) {
      roleErrors.value = { ...roleErrors.value, [member.id]: err.data?.message ?? 'Rolle konnte nicht geändert werden.' }
    }
    else if (status === 403) {
      roleErrors.value = { ...roleErrors.value, [member.id]: 'Keine Berechtigung zum Ändern dieser Rolle.' }
    }
    else {
      roleErrors.value = { ...roleErrors.value, [member.id]: 'Fehler beim Ändern der Rolle.' }
    }
    // Rolle im UI zurücksetzen
    members.value = members.value.map(m => m.id === member.id ? { ...m, role: prev } : m)
  }
  finally {
    roleChangingId.value = null
  }
}

// ---------------------------------------------------------------------------
// Mitglied entfernen
// ---------------------------------------------------------------------------
const confirmingRemoveId = ref<string | null>(null)
const isRemoving = ref(false)
const removeError = ref<string | null>(null)

function requestRemove(memberId: string): void {
  confirmingRemoveId.value = memberId
  removeError.value = null
}

function cancelRemove(): void {
  confirmingRemoveId.value = null
  removeError.value = null
}

async function handleRemove(): Promise<void> {
  const memberId = confirmingRemoveId.value
  const wsId = workspaceStore.activeWorkspace?.id
  if (!memberId || !wsId) return

  isRemoving.value = true
  removeError.value = null
  try {
    const api = useApi()
    await api(`/workspaces/${wsId}/members/${memberId}`, { method: 'DELETE' })
    confirmingRemoveId.value = null
    await loadMembers()
    toast.success('Mitglied wurde entfernt.')
  }
  catch (error: unknown) {
    const err = error as { status?: number; statusCode?: number; data?: { message?: string } }
    const status = err?.status ?? err?.statusCode

    if (status === 422) {
      removeError.value = err.data?.message ?? 'Mitglied kann nicht entfernt werden.'
    }
    else if (status === 403) {
      removeError.value = 'Keine Berechtigung zum Entfernen dieses Mitglieds.'
    }
    else {
      removeError.value = 'Entfernen fehlgeschlagen. Bitte erneut versuchen.'
    }
  }
  finally {
    isRemoving.value = false
  }
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------
function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0]?.toUpperCase() ?? '')
    .join('')
}

// ---------------------------------------------------------------------------
// Fokus-Trap + Escape
// ---------------------------------------------------------------------------
const modalEl = ref<HTMLElement | null>(null)

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    if (confirmingRemoveId.value) {
      cancelRemove()
      return
    }
    emit('close')
    return
  }
  if (modalEl.value) trapFocus(event, modalEl.value)
}

onMounted(() => {
  loadMembers()
  nextTick(() => {
    const first = modalEl.value?.querySelector<HTMLElement>(
      'button, input, select, [tabindex]:not([tabindex="-1"])',
    )
    first?.focus()
  })
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
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
        class="w-full max-w-lg rounded-2xl bg-ui-surface shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="members-modal-title"
      >
        <!-- Kopfzeile -->
        <div class="flex items-center justify-between border-b border-ui-border px-6 py-4">
          <h2
            id="members-modal-title"
            class="text-base font-semibold text-ui-text"
          >
            Mitglieder verwalten
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

        <!-- Inhalt -->
        <div class="max-h-[60vh] overflow-y-auto px-6 py-4">
          <!-- Ladeindikator -->
          <div
            v-if="isLoading"
            class="flex items-center gap-2 py-8 text-sm text-ui-muted"
            aria-busy="true"
            aria-label="Mitglieder werden geladen"
          >
            <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Mitglieder werden geladen...
          </div>

          <!-- Ladefehler -->
          <div
            v-else-if="loadError"
            class="py-8 text-center text-sm text-red-600"
            role="alert"
          >
            {{ loadError }}
            <button
              type="button"
              class="mt-2 block w-full text-ui-accent hover:underline focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
              @click="loadMembers"
            >
              Erneut versuchen
            </button>
          </div>

          <!-- Mitglieder-Liste -->
          <ul
            v-else
            class="space-y-1"
            role="list"
          >
            <li
              v-for="member in members"
              :key="member.id"
              class="rounded-xl border border-transparent p-3 transition-colors hover:bg-ui-bg"
            >
              <!-- Hauptzeile -->
              <div class="flex items-center gap-3">
                <!-- Initialen-Avatar -->
                <div
                  class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#dbeafe] text-xs font-semibold text-[#1d4ed8]"
                  aria-hidden="true"
                >
                  {{ initials(member.name) }}
                </div>

                <!-- Name + E-Mail -->
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-ui-text">
                    {{ member.name }}
                    <span
                      v-if="member.is_current_user"
                      class="ml-1 text-xs text-ui-muted"
                    >(Du)</span>
                  </p>
                  <p class="truncate text-xs text-ui-muted">
                    {{ member.email }}
                  </p>
                </div>

                <!-- Rollen-Select -->
                <div class="relative">
                  <label
                    :for="`role-${member.id}`"
                    class="sr-only"
                  >
                    Rolle von {{ member.name }}
                  </label>
                  <select
                    :id="`role-${member.id}`"
                    :value="member.role"
                    :disabled="roleChangingId === member.id || isLastAdmin(members, member.id)"
                    :title="isLastAdmin(members, member.id) ? 'Dieser Nutzer ist der letzte Admin und kann nicht herabgestuft werden.' : undefined"
                    :aria-label="`Rolle von ${member.name}`"
                    :aria-invalid="roleErrors[member.id] ? 'true' : undefined"
                    :aria-describedby="roleErrors[member.id] ? `role-error-${member.id}` : undefined"
                    class="rounded-lg border border-ui-border bg-white py-1.5 pl-2.5 pr-7 text-xs text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent/30 disabled:cursor-not-allowed disabled:opacity-50"
                    @change="(e) => handleRoleChange(member, (e.target as HTMLSelectElement).value as WorkspaceRole)"
                  >
                    <option value="mp_admin">Admin</option>
                    <option value="mp_team">Team</option>
                    <option value="client">Kunde</option>
                  </select>

                  <!-- Lade-Spinner über Select -->
                  <div
                    v-if="roleChangingId === member.id"
                    class="absolute inset-0 flex items-center justify-center rounded-lg bg-white/70"
                    aria-hidden="true"
                  >
                    <svg class="h-3.5 w-3.5 animate-spin text-ui-accent" viewBox="0 0 24 24" fill="none">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                </div>

                <!-- Entfernen-Button -->
                <button
                  type="button"
                  :disabled="isRemoving || isLastAdmin(members, member.id)"
                  :title="isLastAdmin(members, member.id)
                    ? 'Dieser Nutzer ist der letzte Admin und kann nicht entfernt werden.'
                    : `${member.name} entfernen`"
                  :aria-label="isLastAdmin(members, member.id)
                    ? `${member.name} kann nicht entfernt werden – letzter Admin`
                    : `${member.name} entfernen`"
                  class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-ui-muted transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-400/50 disabled:cursor-not-allowed disabled:opacity-40"
                  @click="requestRemove(member.id)"
                >
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <!-- Rollen-Fehler -->
              <p
                v-if="roleErrors[member.id]"
                :id="`role-error-${member.id}`"
                class="mt-1.5 pl-12 text-xs text-red-600"
                role="alert"
              >
                {{ roleErrors[member.id] }}
              </p>

              <!-- Inline-Bestätigung für Entfernen -->
              <div
                v-if="confirmingRemoveId === member.id"
                role="alert"
                class="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2"
              >
                <p class="mb-2 text-xs text-red-700">
                  Soll {{ member.name }} wirklich aus dem Workspace entfernt werden?
                </p>
                <p
                  v-if="removeError"
                  class="mb-2 text-xs font-medium text-red-700"
                  role="alert"
                >
                  {{ removeError }}
                </p>
                <div class="flex gap-2">
                  <button
                    type="button"
                    class="rounded-md px-3 py-1 text-xs font-medium text-ui-muted transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
                    @click="cancelRemove"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    :disabled="isRemoving"
                    class="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                    @click="handleRemove"
                  >
                    {{ isRemoving ? 'Wird entfernt...' : 'Entfernen' }}
                  </button>
                </div>
              </div>
            </li>

            <li
              v-if="!isLoading && members.length === 0"
              class="py-8 text-center text-sm text-ui-muted"
            >
              Keine Mitglieder gefunden.
            </li>
          </ul>
        </div>

        <!-- Fußzeile -->
        <div class="border-t border-ui-border px-6 py-3 text-right">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm font-medium text-ui-muted transition-colors hover:bg-ui-bg focus:outline-none focus:ring-2 focus:ring-ui-accent/50"
            @click="$emit('close')"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
