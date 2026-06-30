import { defineStore } from 'pinia'
import { computed, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { useAuthStore } from '~/stores/auth'
import type { Workspace, WorkspaceRole } from '~/types/api'

export const useWorkspaceStore = defineStore('workspace', () => {
  const authStore = useAuthStore()

  // Aktiver Workspace wird im localStorage gemerkt
  const activeWorkspaceId = useLocalStorage<string | null>('mp_workspace_id', null)

  /**
   * Wenn sich die Memberships ändern (nach Login oder fetchMe),
   * wird automatisch der erste Workspace gesetzt falls kein gültiger aktiv ist.
   */
  watch(
    () => authStore.memberships,
    (memberships) => {
      if (memberships.length === 0) {
        activeWorkspaceId.value = null
        return
      }
      const currentIsValid = memberships.some(
        m => m.workspace.id === activeWorkspaceId.value,
      )
      if (!currentIsValid) {
        const first = memberships[0]
        if (first) {
          activeWorkspaceId.value = first.workspace.id
        }
      }
    },
    { immediate: true, deep: false },
  )

  /** Alle Workspaces des Users (aus Memberships) */
  const list = computed<Workspace[]>(() =>
    authStore.memberships.map(m => m.workspace),
  )

  /** Der aktuell aktive Workspace oder null */
  const activeWorkspace = computed<Workspace | null>(() => {
    if (!activeWorkspaceId.value) return null
    const membership = authStore.memberships.find(
      m => m.workspace.id === activeWorkspaceId.value,
    )
    return membership?.workspace ?? null
  })

  /** Rolle des Users im aktiven Workspace */
  const activeRole = computed<WorkspaceRole | null>(() => {
    if (!activeWorkspaceId.value) return null
    const membership = authStore.memberships.find(
      m => m.workspace.id === activeWorkspaceId.value,
    )
    return membership?.role ?? null
  })

  function setActive(id: string): void {
    activeWorkspaceId.value = id
  }

  return {
    activeWorkspaceId,
    list,
    activeWorkspace,
    activeRole,
    setActive,
  }
})
