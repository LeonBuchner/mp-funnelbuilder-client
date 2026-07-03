<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'

const authStore = useAuthStore()
const workspaceStore = useWorkspaceStore()
const router = useRouter()
const route = useRoute()

// ---------------------------------------------------------------------------
// Workspace-Switcher-Dropdown
// ---------------------------------------------------------------------------
const wsDropdownOpen = ref(false)
const wsDropdownEl = ref<HTMLElement | null>(null)
const wsTriggerRef = ref<HTMLButtonElement | null>(null)

onClickOutside(wsDropdownEl, () => {
  wsDropdownOpen.value = false
})

function toggleWsDropdown(): void {
  wsDropdownOpen.value = !wsDropdownOpen.value
}

function closeWsDropdown(): void {
  wsDropdownOpen.value = false
}

function handleWorkspaceSelect(id: string): void {
  workspaceStore.setActive(id)
  wsDropdownOpen.value = false
  // Einen Workspace zu waehlen fuehrt auf dessen (gescopte) Funnel-Liste, auch von der
  // "Alle Workspaces"-Seite aus. Sonst bliebe man auf der uebergreifenden Ansicht und
  // saehe trotz Wechsel weiter alle Funnels.
  router.push('/admin/funnels')
}

function handleDropdownKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    wsDropdownOpen.value = false
    wsTriggerRef.value?.focus()
  }
}

// ---------------------------------------------------------------------------
// Rollen-Guard: Nur mp_admin sieht Verwaltungsoptionen
// ---------------------------------------------------------------------------
const isMpAdmin = computed(() => workspaceStore.activeRole === 'mp_admin')

// ---------------------------------------------------------------------------
// Modals
// ---------------------------------------------------------------------------
const showMembersModal = ref(false)
const showSettingsModal = ref(false)
const showNewWorkspaceModal = ref(false)
const showInviteModal = ref(false)

function openMembersModal(): void {
  closeWsDropdown()
  showMembersModal.value = true
}

function openSettingsModal(): void {
  closeWsDropdown()
  showSettingsModal.value = true
}

function openNewWorkspaceModal(): void {
  closeWsDropdown()
  showNewWorkspaceModal.value = true
}

function closeMembersModal(): void {
  showMembersModal.value = false
  wsTriggerRef.value?.focus()
}

function closeSettingsModal(): void {
  showSettingsModal.value = false
  wsTriggerRef.value?.focus()
}

function closeNewWorkspaceModal(): void {
  showNewWorkspaceModal.value = false
  wsTriggerRef.value?.focus()
}

function navigateAllWorkspaces(): void {
  closeWsDropdown()
  router.push('/admin/funnels/all')
}

// ---------------------------------------------------------------------------
// Avatar-Dropdown
// ---------------------------------------------------------------------------
const avatarDropdownOpen = ref(false)
const avatarDropdownEl = ref<HTMLElement | null>(null)

onClickOutside(avatarDropdownEl, () => {
  avatarDropdownOpen.value = false
})

const userInitials = computed<string>(() => {
  const name = authStore.user?.name ?? ''
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0]?.toUpperCase() ?? '')
    .join('')
    || 'U'
})

async function handleLogout(): Promise<void> {
  avatarDropdownOpen.value = false
  await authStore.logout()
  await router.push('/auth/login')
}

// ---------------------------------------------------------------------------
// Einladen (Berechtigungscheck: mp_admin + mp_team)
// ---------------------------------------------------------------------------
const canInvite = computed<boolean>(
  () =>
    workspaceStore.activeRole === 'mp_admin' || workspaceStore.activeRole === 'mp_team',
)

// ---------------------------------------------------------------------------
// Aktiver Tab
// ---------------------------------------------------------------------------
const isFunnelsActive = computed(() => route.path.startsWith('/admin/funnels'))
const isPerformanceActive = computed(() => route.path.startsWith('/admin/performance'))

// Ob die workspace-uebergreifende "Alle Workspaces"-Ansicht aktiv ist. In dem Fall
// zeigt der Umschalter "Alle Workspaces" statt eines einzelnen Workspace.
const isAllWorkspacesView = computed(() => route.path === '/admin/funnels/all')

// ---------------------------------------------------------------------------
// Workspace-Initial
// ---------------------------------------------------------------------------
const workspaceInitial = computed<string>(() =>
  workspaceStore.activeWorkspace?.name[0]?.toUpperCase() ?? 'W',
)
</script>

<template>
  <div class="flex min-h-screen flex-col bg-ui-bg">
    <!-- Zum Hauptinhalt springen (a11y) -->
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-ui-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
    >
      Zum Inhalt springen
    </a>

    <!-- Top-Bar -->
    <header
      class="sticky top-0 z-30 flex h-14 items-center border-b border-ui-border bg-ui-surface"
      aria-label="Kopfzeile"
    >
      <!-- Links: Workspace-Switcher -->
      <div
        ref="wsDropdownEl"
        class="relative flex-shrink-0 pl-4"
        @keydown="handleDropdownKeydown"
      >
        <button
          ref="wsTriggerRef"
          type="button"
          class="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-ui-text transition-colors hover:bg-ui-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
          :aria-expanded="wsDropdownOpen"
          aria-haspopup="menu"
          aria-label="Workspace-Menü öffnen"
          @click="toggleWsDropdown"
        >
          <!-- Grid-Symbol fuer "Alle Workspaces", sonst Workspace-Initial-Kreis -->
          <span
            v-if="isAllWorkspacesView"
            class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-ui-accent/10 text-ui-accent"
            aria-hidden="true"
          >
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </span>
          <span
            v-else
            class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-ui-accent text-xs font-bold text-white"
            aria-hidden="true"
          >
            {{ workspaceInitial }}
          </span>
          <span class="max-w-[200px] truncate">
            {{ isAllWorkspacesView ? 'Alle Workspaces' : (workspaceStore.activeWorkspace?.name ?? 'Workspace') }}
          </span>
          <svg
            class="h-3.5 w-3.5 flex-shrink-0 text-ui-muted transition-transform duration-150"
            :class="{ 'rotate-180': wsDropdownOpen }"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <!-- Workspace-Dropdown -->
        <div
          v-if="wsDropdownOpen"
          class="absolute left-0 top-full mt-1 min-w-[260px] rounded-xl border border-ui-border bg-ui-surface py-1.5 shadow-lg"
          role="menu"
          aria-label="Workspace-Optionen"
        >
          <!-- Admin-Aktionen (nur mp_admin) -->
          <template v-if="isMpAdmin">
            <button
              type="button"
              role="menuitem"
              class="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-ui-text transition-colors hover:bg-ui-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ui-accent"
              @click="openMembersModal"
            >
              <!-- Personen-Icon -->
              <svg class="h-4 w-4 flex-shrink-0 text-ui-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Mitglieder verwalten
            </button>

            <button
              type="button"
              role="menuitem"
              class="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-ui-text transition-colors hover:bg-ui-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ui-accent"
              @click="openSettingsModal"
            >
              <!-- Zahnrad-Icon -->
              <svg class="h-4 w-4 flex-shrink-0 text-ui-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Workspace-Einstellungen
            </button>

            <!-- Trenner -->
            <div class="my-1.5 border-t border-ui-border" role="separator" />
          </template>

          <!-- Workspace wechseln -->
          <p class="px-3.5 pb-1 pt-0.5 text-xs font-medium text-ui-muted" aria-hidden="true">
            Workspace wechseln
          </p>

          <!-- Alle Workspaces (nur mp_admin) -->
          <button
            v-if="isMpAdmin"
            type="button"
            role="menuitem"
            :aria-current="isAllWorkspacesView ? 'page' : undefined"
            class="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors hover:bg-ui-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ui-accent"
            :class="isAllWorkspacesView ? 'font-semibold text-ui-accent' : 'text-ui-text'"
            @click="navigateAllWorkspaces"
          >
            <!-- Grid-Icon -->
            <svg
              class="h-4 w-4 flex-shrink-0"
              :class="isAllWorkspacesView ? 'text-ui-accent' : 'text-ui-muted'"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span class="min-w-0 flex-1">Alle Workspaces</span>
            <svg
              v-if="isAllWorkspacesView"
              class="ml-auto h-3.5 w-3.5 flex-shrink-0 text-ui-accent"
              fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"
            >
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </button>

          <!-- Workspace-Liste -->
          <button
            v-for="ws in workspaceStore.list"
            :key="ws.id"
            type="button"
            role="menuitemradio"
            :aria-checked="!isAllWorkspacesView && ws.id === workspaceStore.activeWorkspace?.id"
            class="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors hover:bg-ui-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ui-accent"
            :class="
              !isAllWorkspacesView && ws.id === workspaceStore.activeWorkspace?.id
                ? 'font-semibold text-ui-accent'
                : 'text-ui-text'
            "
            @click="handleWorkspaceSelect(ws.id)"
          >
            <span
              class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-ui-accent/10 text-xs font-semibold text-ui-accent"
              aria-hidden="true"
            >
              {{ ws.name[0]?.toUpperCase() ?? 'W' }}
            </span>
            <span class="min-w-0 flex-1 truncate">{{ ws.name }}</span>
            <svg
              v-if="!isAllWorkspacesView && ws.id === workspaceStore.activeWorkspace?.id"
              class="ml-auto h-3.5 w-3.5 flex-shrink-0 text-ui-accent"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </button>

          <p
            v-if="workspaceStore.list.length === 0"
            class="px-3.5 py-2 text-sm text-ui-muted"
          >
            Kein Workspace verfügbar.
          </p>

          <!-- Trenner + Neuer Workspace (nur mp_admin) -->
          <template v-if="isMpAdmin">
            <div class="my-1.5 border-t border-ui-border" role="separator" />
            <button
              type="button"
              role="menuitem"
              class="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-ui-text transition-colors hover:bg-ui-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ui-accent"
              @click="openNewWorkspaceModal"
            >
              <!-- Plus-Icon -->
              <svg class="h-4 w-4 flex-shrink-0 text-ui-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Neuer Workspace
            </button>
          </template>
        </div>
      </div>

      <!-- Mitte: Tab-Navigation -->
      <nav
        class="mx-auto flex items-center gap-0.5"
        aria-label="Hauptbereiche"
      >
        <!-- Funnels -->
        <NuxtLink
          to="/admin/funnels"
          class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
          :class="
            isFunnelsActive
              ? 'bg-ui-accent/10 text-ui-accent'
              : 'text-ui-muted hover:bg-ui-bg hover:text-ui-text'
          "
        >
          <svg class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Funnels
        </NuxtLink>

        <!-- Performance -->
        <NuxtLink
          to="/admin/performance"
          class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
          :class="
            isPerformanceActive
              ? 'bg-ui-accent/10 text-ui-accent'
              : 'text-ui-muted hover:bg-ui-bg hover:text-ui-text'
          "
        >
          <svg class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Performance
        </NuxtLink>

        <!-- Inbox (deaktiviert) -->
        <button
          type="button"
          disabled
          title="kommt bald"
          aria-disabled="true"
          class="flex cursor-not-allowed items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-ui-muted opacity-50 focus-visible:outline-none"
        >
          <svg class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          Inbox
        </button>

        <!-- Empfehlungen (deaktiviert) -->
        <button
          type="button"
          disabled
          title="kommt bald"
          aria-disabled="true"
          class="flex cursor-not-allowed items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-ui-muted opacity-50 focus-visible:outline-none"
        >
          <svg class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Empfehlungen
        </button>
      </nav>

      <!-- Rechts: Einladen + Avatar -->
      <div class="flex flex-shrink-0 items-center gap-2 pr-4">
        <!-- Einladen (Admin + Team) -->
        <button
          v-if="canInvite"
          type="button"
          class="flex items-center gap-1.5 rounded-lg border border-ui-border px-3 py-1.5 text-sm font-medium text-ui-text transition-colors hover:bg-ui-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
          @click="showInviteModal = true"
        >
          <svg class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Einladen
        </button>

        <!-- Avatar + Dropdown -->
        <div
          ref="avatarDropdownEl"
          class="relative"
        >
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-full bg-ui-accent text-xs font-bold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent focus-visible:ring-offset-2"
            :aria-expanded="avatarDropdownOpen"
            aria-haspopup="true"
            :aria-label="`Benutzer-Menu für ${authStore.user?.name ?? 'Benutzer'}`"
            @click="avatarDropdownOpen = !avatarDropdownOpen"
          >
            {{ userInitials }}
          </button>

          <!-- Avatar-Dropdown -->
          <div
            v-if="avatarDropdownOpen"
            class="absolute right-0 top-full mt-2 w-60 rounded-xl border border-ui-border bg-ui-surface py-1.5 shadow-lg"
            role="menu"
            aria-label="Benutzer-Optionen"
          >
            <div class="border-b border-ui-border px-4 py-3">
              <p class="text-sm font-medium text-ui-text">
                {{ authStore.user?.name ?? '' }}
              </p>
              <p class="mt-0.5 truncate text-xs text-ui-muted">
                {{ authStore.user?.email ?? '' }}
              </p>
            </div>
            <button
              type="button"
              role="menuitem"
              class="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-ui-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ui-accent"
              @click="handleLogout"
            >
              <svg class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Abmelden
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Hauptinhalt -->
    <main
      id="main-content"
      class="flex-1"
      tabindex="-1"
    >
      <slot />
    </main>

    <!-- Toast-Nachrichten -->
    <ToastContainer />

    <!-- Modals (via Teleport in die jeweiligen Komponenten, daher hier nur v-if) -->
    <AdminInviteModal
      v-if="showInviteModal"
      @close="showInviteModal = false"
    />
    <AdminMembersModal
      v-if="showMembersModal"
      @close="closeMembersModal"
    />
    <AdminWorkspaceSettingsModal
      v-if="showSettingsModal"
      @close="closeSettingsModal"
    />
    <AdminNewWorkspaceModal
      v-if="showNewWorkspaceModal"
      @close="closeNewWorkspaceModal"
    />
  </div>
</template>

<!-- Volles CSS-Bundle für Admin-Bereich -->
<style src="~/assets/css/main.css" />
