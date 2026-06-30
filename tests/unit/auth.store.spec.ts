/**
 * Unit-Tests fuer den Auth-Store.
 *
 * Gemockt werden:
 * - useApi (~/composables/useApi): verhindert echte HTTP-Aufrufe
 * - @vueuse/core -> useLocalStorage: gibt regulaere Vue-Refs zurueck,
 *   sodass kein localStorage-Zustand zwischen Tests leakt
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import type { LoginResponse } from '../../app/types/api'
import { useAuthStore } from '../../app/stores/auth'

// --- Mocks (werden von Vitest gehoisted, laufen VOR allen Imports) ---

// API-Funktion, die vom Auth-Store aufgerufen wird
const mockApiFn = vi.hoisted(() => vi.fn())

vi.mock('~/composables/useApi', () => ({
  useApi: vi.fn(() => mockApiFn),
}))

// useLocalStorage durch einfachen ref ersetzen: kein localStorage-
// Zustand persistiert zwischen Tests
vi.mock('@vueuse/core', async () => {
  const actual = await vi.importActual<typeof import('@vueuse/core')>('@vueuse/core')
  return {
    ...actual,
    useLocalStorage: vi.fn(<T>(_key: string, initialValue: T) => ref<T>(initialValue)),
  }
})

// --- Testdaten ---
const mockLoginResponse: LoginResponse = {
  token: 'test-token-xyz-123',
  user: {
    id: 'user-uuid-1',
    name: 'Test User',
    email: 'test@example.com',
    email_verified_at: null,
    created_at: '2024-01-01T00:00:00Z',
  },
  memberships: [
    {
      role: 'mp_team',
      accepted_at: '2024-01-01T00:00:00Z',
      workspace: {
        id: 'ws-uuid-1',
        name: 'Test Workspace',
        slug: 'test-workspace',
        logo_path: null,
        mp_branding_enabled: false,
        settings: { default_locale: 'de', timezone: 'Europe/Berlin' },
        created_at: '2024-01-01T00:00:00Z',
      },
    },
  ],
}

// ---

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('startet nicht authentifiziert', () => {
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(false)
    expect(store.token).toBeNull()
    expect(store.user).toBeNull()
    expect(store.memberships).toHaveLength(0)
  })

  it('login() speichert token, user und memberships', async () => {
    mockApiFn.mockResolvedValueOnce(mockLoginResponse)

    const store = useAuthStore()
    await store.login('test@example.com', 'password123')

    expect(store.token).toBe('test-token-xyz-123')
    expect(store.user?.name).toBe('Test User')
    expect(store.user?.email).toBe('test@example.com')
    expect(store.memberships).toHaveLength(1)
    expect(store.memberships[0]?.role).toBe('mp_team')
  })

  it('login() setzt isAuthenticated auf true', async () => {
    mockApiFn.mockResolvedValueOnce(mockLoginResponse)

    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(false)

    await store.login('test@example.com', 'password123')

    expect(store.isAuthenticated).toBe(true)
  })

  it('login() wirft Fehler bei Serverfehler und aendert keinen State', async () => {
    const apiError = Object.assign(new Error('Unprocessable Entity'), {
      data: {
        message: 'Diese Zugangsdaten sind ungueltig.',
        errors: { email: ['Diese Zugangsdaten stimmen nicht.'] },
      },
      status: 422,
    })
    mockApiFn.mockRejectedValueOnce(apiError)

    const store = useAuthStore()
    await expect(store.login('wrong@example.com', 'wrong')).rejects.toThrow()

    expect(store.token).toBeNull()
    expect(store.user).toBeNull()
  })

  it('logout() setzt token, user und memberships zurueck', async () => {
    // Erst einloggen
    mockApiFn.mockResolvedValueOnce(mockLoginResponse)
    const store = useAuthStore()
    await store.login('test@example.com', 'password123')
    expect(store.isAuthenticated).toBe(true)

    // Dann ausloggen
    mockApiFn.mockResolvedValueOnce({ message: 'Logged out.' })
    await store.logout()

    expect(store.token).toBeNull()
    expect(store.user).toBeNull()
    expect(store.memberships).toHaveLength(0)
    expect(store.isAuthenticated).toBe(false)
  })

  it('logout() funktioniert auch wenn Server-Aufruf fehlschlaegt (best-effort)', async () => {
    mockApiFn.mockResolvedValueOnce(mockLoginResponse)
    const store = useAuthStore()
    await store.login('test@example.com', 'password123')

    // Server-Logout schlaegt fehl
    mockApiFn.mockRejectedValueOnce(new Error('Network error'))
    await store.logout()

    // Lokaler State ist trotzdem bereinigt
    expect(store.token).toBeNull()
    expect(store.user).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })

  it('isMpAdmin ist true wenn eine Membership die Rolle mp_admin hat', async () => {
    const adminResponse: LoginResponse = {
      ...mockLoginResponse,
      memberships: [
        {
          ...mockLoginResponse.memberships[0],
          role: 'mp_admin',
        } as LoginResponse['memberships'][number],
      ],
    }
    mockApiFn.mockResolvedValueOnce(adminResponse)

    const store = useAuthStore()
    await store.login('admin@example.com', 'admin123')

    expect(store.isMpAdmin).toBe(true)
  })

  it('isMpAdmin ist false bei Rolle mp_team', async () => {
    mockApiFn.mockResolvedValueOnce(mockLoginResponse)

    const store = useAuthStore()
    await store.login('team@example.com', 'team123')

    expect(store.isMpAdmin).toBe(false)
  })

  it('isMpAdmin ist false wenn keine Memberships vorhanden', () => {
    const store = useAuthStore()
    expect(store.isMpAdmin).toBe(false)
  })
})
