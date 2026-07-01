/**
 * Playwright global-setup: loggt EINMAL vor allen Specs als Admin ein und legt
 * Token + workspaceId in tests/e2e/.auth/session.json ab. Alle Specs lesen diese
 * Datei ueber getAdminSession() statt selbst einzuloggen. So bleibt die Suite
 * unter dem Login-Rate-Limit (5/min) und kein beforeAll wartet auf einen 429.
 *
 * Laeuft ausserhalb der Test-Timeouts, darf also bei Throttle grosszuegig warten.
 */
import { request } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'

const ADMIN_API = 'http://localhost:8000/api/admin'
const ADMIN_EMAIL = 'admin@marketing-planet.de'
const ADMIN_PASSWORD = 'password'

export const SESSION_FILE = path.resolve('tests/e2e/.auth/session.json')

export default async function globalSetup(): Promise<void> {
  const ctx = await request.newContext()

  let token: string | null = null
  for (let attempt = 0; attempt < 5 && !token; attempt++) {
    const resp = await ctx.post(`${ADMIN_API}/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    })
    if (resp.ok()) {
      token = (await resp.json() as { token: string }).token
      break
    }
    if (resp.status() === 429) {
      const retryAfter = Number(resp.headers()['retry-after'] ?? '15')
      await new Promise(resolve => setTimeout(resolve, (Number.isFinite(retryAfter) ? retryAfter : 15) * 1000 + 1000))
      continue
    }
    break // anderer Fehler (z.B. Backend nicht erreichbar) -> leere Session schreiben, Specs skippen sauber
  }

  let workspaceId = ''
  if (token) {
    const wsResp = await ctx.get(`${ADMIN_API}/workspaces`, { headers: { Authorization: `Bearer ${token}` } })
    if (wsResp.ok()) {
      workspaceId = (await wsResp.json() as { data: { id: string }[] }).data[0]?.id ?? ''
    }
  }
  await ctx.dispose()

  fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true })
  fs.writeFileSync(SESSION_FILE, JSON.stringify({ token, workspaceId }))
}
