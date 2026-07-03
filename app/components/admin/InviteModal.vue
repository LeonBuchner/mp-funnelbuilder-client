<script setup lang="ts">
import type { WorkspaceRole } from '~/types/api'

const emit = defineEmits<{
  close: []
}>()

const authStore = useAuthStore()
const workspaceStore = useWorkspaceStore()
const toast = useToast()

// ---------------------------------------------------------------------------
// Formular
// ---------------------------------------------------------------------------
const emailInput = ref('')
const selectedRole = ref<WorkspaceRole>('mp_team')
const isSubmitting = ref(false)
const formError = ref<string | null>(null)

// ---------------------------------------------------------------------------
// Mitglieder-Liste
// ---------------------------------------------------------------------------
interface WorkspaceMemberItem {
  id: string
  name: string
  email: string
  role: WorkspaceRole
}

const members = ref<WorkspaceMemberItem[]>([])
const membersLoading = ref(false)

onMounted(() => {
  loadMembers()
  // Fokus auf erstes fokussierbares Element setzen
  nextTick(() => {
    const first = modalEl.value?.querySelector<HTMLElement>(
      'button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    first?.focus()
  })
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

async function loadMembers(): Promise<void> {
  const wsId = workspaceStore.activeWorkspace?.id
  if (!wsId) return
  membersLoading.value = true
  try {
    const api = useApi()
    const response = await api<{ data: WorkspaceMemberItem[] }>(`/workspaces/${wsId}/members`)
    members.value = response.data
  } catch {
    // Fallback: nur aktuellen User zeigen
    if (authStore.user && workspaceStore.activeRole) {
      members.value = [
        {
          id: authStore.user.id,
          name: authStore.user.name,
          email: authStore.user.email,
          role: workspaceStore.activeRole,
        },
      ]
    }
  } finally {
    membersLoading.value = false
  }
}

// ---------------------------------------------------------------------------
// Einladen
// ---------------------------------------------------------------------------
async function handleInvite(): Promise<void> {
  const email = emailInput.value.trim()
  if (!email) {
    formError.value = 'Bitte eine E-Mail-Adresse eingeben.'
    return
  }
  const wsId = workspaceStore.activeWorkspace?.id
  if (!wsId) return

  isSubmitting.value = true
  formError.value = null
  try {
    const api = useApi()
    await api(`/workspaces/${wsId}/invitations`, {
      method: 'POST',
      body: { email, role: selectedRole.value },
    })
    emailInput.value = ''
    toast.success(`Einladung an ${email} wurde gesendet.`)
    // Mitglieder neu laden
    await loadMembers()
  } catch (error: unknown) {
    const err = error as { data?: { message?: string } }
    formError.value = err?.data?.message ?? 'Einladung fehlgeschlagen. Bitte erneut versuchen.'
  } finally {
    isSubmitting.value = false
  }
}

// ---------------------------------------------------------------------------
// Rollen-Beschriftungen
// ---------------------------------------------------------------------------
function roleLabel(role: WorkspaceRole): string {
  switch (role) {
    case 'mp_admin':
      return 'Admin'
    case 'mp_team':
      return 'Team'
    case 'client':
      return 'Kunde'
    default:
      return role
  }
}

function roleBadgeClass(role: WorkspaceRole): string {
  switch (role) {
    case 'mp_admin':
      return 'bg-ui-accent/10 text-ui-accent'
    case 'mp_team':
      return 'bg-purple-100 text-purple-700'
    case 'client':
      return 'bg-ui-bg text-ui-muted'
    default:
      return 'bg-ui-bg text-ui-muted'
  }
}

// ---------------------------------------------------------------------------
// Initiale eines Namens
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
    emit('close')
    return
  }
  if (event.key !== 'Tab') return

  const focusable = modalEl.value?.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )
  if (!focusable || focusable.length === 0) return

  const first = focusable[0]
  const last = focusable[focusable.length - 1]

  if (event.shiftKey) {
    if (document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    }
  } else {
    if (document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }
}
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      @click.self="$emit('close')"
    >
      <!-- Modal -->
      <div
        ref="modalEl"
        class="w-full max-w-md rounded-2xl bg-ui-surface shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-modal-title"
      >
        <!-- Kopfzeile -->
        <div class="flex items-center justify-between border-b border-ui-border px-6 py-4">
          <div>
            <h2
              id="invite-modal-title"
              class="text-base font-semibold text-ui-text"
            >
              Mitglieder einladen
            </h2>
            <p class="mt-0.5 text-xs text-ui-muted">
              Gib eine E-Mail-Adresse ein und wähle die passende Rolle.
            </p>
          </div>
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

        <!-- Einlade-Formular -->
        <div class="px-6 py-4">
          <form
            class="flex items-start gap-2"
            @submit.prevent="handleInvite"
          >
            <div class="flex-1">
              <label
                for="invite-email"
                class="sr-only"
              >
                E-Mail-Adresse der einzuladenden Person
              </label>
              <input
                id="invite-email"
                v-model="emailInput"
                type="email"
                name="email"
                autocomplete="off"
                placeholder="E-Mail-Adresse eingeben"
                required
                class="w-full rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-text placeholder:text-ui-muted focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent"
                :class="{ 'border-red-400': formError }"
              >
            </div>

            <div>
              <label
                for="invite-role"
                class="sr-only"
              >
                Rolle
              </label>
              <select
                id="invite-role"
                v-model="selectedRole"
                class="rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent"
              >
                <option value="mp_admin">Admin (alles)</option>
                <option value="mp_team">Team (bearbeiten)</option>
                <option value="client">Kunde (nur ansehen)</option>
              </select>
            </div>

            <button
              type="submit"
              :disabled="isSubmitting"
              class="flex-shrink-0 rounded-lg bg-ui-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ui-accent-hover disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ui-accent"
            >
              {{ isSubmitting ? 'Wird gesendet...' : 'Einladen' }}
            </button>
          </form>

          <!-- Fehler -->
          <p
            v-if="formError"
            class="mt-2 text-xs text-red-600"
            role="alert"
          >
            {{ formError }}
          </p>
        </div>

        <!-- Personen mit Zugriff -->
        <div class="border-t border-ui-border px-6 py-4">
          <h3 class="mb-3 text-xs font-semibold uppercase tracking-wider text-ui-muted">
            Personen mit Zugriff
          </h3>

          <!-- Ladeindikator -->
          <div
            v-if="membersLoading"
            class="flex items-center gap-2 py-2 text-sm text-ui-muted"
            aria-busy="true"
          >
            <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Mitglieder werden geladen...
          </div>

          <!-- Mitglieder-Liste -->
          <ul
            v-else
            class="space-y-2"
            role="list"
          >
            <li
              v-for="member in members"
              :key="member.id"
              class="flex items-center gap-3"
            >
              <!-- Avatar -->
              <div
                class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-ui-accent/10 text-xs font-semibold text-ui-accent"
                aria-hidden="true"
              >
                {{ initials(member.name) }}
              </div>

              <!-- Name + E-Mail -->
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-ui-text">
                  {{ member.name }}
                  <span
                    v-if="member.id === authStore.user?.id"
                    class="ml-1 text-xs text-ui-muted"
                  >(Du)</span>
                </p>
                <p class="truncate text-xs text-ui-muted">
                  {{ member.email }}
                </p>
              </div>

              <!-- Rollen-Badge -->
              <span
                :class="['flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', roleBadgeClass(member.role)]"
              >
                {{ roleLabel(member.role) }}
              </span>
            </li>

            <li
              v-if="members.length === 0"
              class="text-sm text-ui-muted"
            >
              Keine Mitglieder gefunden.
            </li>
          </ul>
        </div>
      </div>
    </div>
  </Teleport>
</template>
