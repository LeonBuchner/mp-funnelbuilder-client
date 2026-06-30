import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { useApi } from '~/composables/useApi'
import type { User, Membership, LoginResponse, MeResponse } from '~/types/api'

export const useAuthStore = defineStore('auth', () => {
  // Token wird in localStorage persistiert (null = nicht angemeldet)
  const token = useLocalStorage<string | null>('mp_token', null)
  const user = ref<User | null>(null)
  const memberships = ref<Membership[]>([])

  const isAuthenticated = computed(() => !!token.value)
  const isMpAdmin = computed(() => memberships.value.some(m => m.role === 'mp_admin'))

  /**
   * Meldet den User an und speichert Token, User und Memberships.
   * Wirft FetchError (mit data.errors) bei 422.
   */
  async function login(email: string, password: string): Promise<LoginResponse> {
    const api = useApi()
    const response = await api<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    token.value = response.token
    user.value = response.user
    memberships.value = response.memberships
    return response
  }

  /**
   * Lädt den aktuellen User vom Backend.
   * Bei 401 wird logout() aufgerufen (Token abgelaufen oder ungültig).
   */
  async function fetchMe(): Promise<void> {
    const api = useApi()
    try {
      const response = await api<MeResponse>('/auth/me')
      user.value = response.user
      memberships.value = response.memberships
    } catch (error: unknown) {
      const err = error as { status?: number; statusCode?: number }
      const status = err?.status ?? err?.statusCode
      if (status === 401) {
        await logout()
      }
      throw error
    }
  }

  /**
   * Meldet den User ab. Ruft /auth/logout best-effort auf und löscht
   * danach immer den lokalen State sowie den Token.
   */
  async function logout(): Promise<void> {
    if (token.value) {
      try {
        const api = useApi()
        await api('/auth/logout', { method: 'POST' })
      } catch {
        // Best-effort: Fehler beim Server-Logout ignorieren
      }
    }
    token.value = null
    user.value = null
    memberships.value = []
  }

  return {
    token,
    user,
    memberships,
    isAuthenticated,
    isMpAdmin,
    login,
    fetchMe,
    logout,
  }
})
