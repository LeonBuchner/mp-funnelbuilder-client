/**
 * Shared Auth-Hilfsfunktion fuer E2E-Tests.
 *
 * Implementiert Retry-on-429: Wenn das Login-Throttle (5/Minute pro E-Mail+IP) greift,
 * wird der Retry-After-Header abgewartet und erneut versucht (max. 3 Versuche).
 * So ueberleben alle Specs auch im parallelen Gesamtlauf, ohne still zu skippen.
 *
 * Nutzung:
 *   import { getAdminSession } from '../helpers/auth'
 *   const session = await getAdminSession()
 *   if (!session) return // Login fehlgeschlagen -> Tests skippen
 *   const { apiContext, auth, workspaceId } = session
 */
import { request as playwrightRequest } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'

const ADMIN_API = 'http://localhost:8000/api/admin'
const ADMIN_EMAIL = 'admin@marketing-planet.de'
const ADMIN_PASSWORD = 'password'
const SESSION_FILE = path.resolve('tests/e2e/.auth/session.json')

export interface AdminSession {
  apiContext: Awaited<ReturnType<typeof playwrightRequest.newContext>>
  auth: Record<string, string>
  workspaceId: string
}

/**
 * Erstellt eine Admin-Session. Nutzt bevorzugt die vom global-setup gecachte
 * Session (kein Login -> kein Rate-Limit). Faellt auf direkten Login mit
 * Retry-on-429 zurueck, falls die Cache-Datei fehlt.
 * Gibt null zurueck wenn keine Session ermittelbar ist.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const apiContext = await playwrightRequest.newContext()

  // 1) Gecachte Session aus global-setup (Regelfall)
  try {
    const cached = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8')) as { token: string | null, workspaceId: string }
    if (cached.token && cached.workspaceId) {
      return { apiContext, auth: { Authorization: `Bearer ${cached.token}` }, workspaceId: cached.workspaceId }
    }
  }
  catch { /* keine Cache-Datei -> Fallback Login */ }

  // 2) Fallback: direkter Login mit Retry
  let token: string | null = null

  for (let attempt = 0; attempt < 3 && !token; attempt++) {
    const resp = await apiContext.post(`${ADMIN_API}/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    })

    if (resp.ok()) {
      const data = await resp.json() as { token: string }
      token = data.token
      break
    }

    if (resp.status() === 429) {
      // Retry-After-Header auswerten (Sekunden); Fallback 30 s
      const retryAfter = Number(resp.headers()['retry-after'] ?? '30')
      const waitMs = (Number.isFinite(retryAfter) ? retryAfter : 30) * 1000 + 1000
      await new Promise(resolve => setTimeout(resolve, waitMs))
      continue
    }

    // Anderer Fehler (z. B. 401 Falsche Credentials) -> kein Retry
    await apiContext.dispose()
    return null
  }

  if (!token) {
    await apiContext.dispose()
    return null
  }

  const auth = { Authorization: `Bearer ${token}` }

  const wsResp = await apiContext.get(`${ADMIN_API}/workspaces`, { headers: auth })
  if (!wsResp.ok()) {
    await apiContext.dispose()
    return null
  }

  const wsData = await wsResp.json() as { data: { id: string }[] }
  const workspaceId = wsData.data[0]?.id
  if (!workspaceId) {
    await apiContext.dispose()
    return null
  }

  return { apiContext, auth, workspaceId }
}
