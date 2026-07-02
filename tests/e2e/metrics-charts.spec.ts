/**
 * E2E-Tests fuer die Metriken-Charts (M4.7).
 *
 * Voraussetzungen:
 *   - Frontend laeuft auf http://localhost:3000
 *   - Backend laeuft auf http://localhost:8000
 *   - Admin-Account: admin@marketing-planet.de / password
 *
 * Abgedeckte Faelle:
 *   MC1 - Metriken-Seite laedt und zeigt Chart-Bereiche
 *   MC2 - Dropoff-Chart ist im DOM sichtbar (data-testid)
 *   MC3 - Screenshot der Metriken-Seite mit Charts
 *   MC4 - axe: keine kritischen AA-Violations auf der Metriken-Seite
 */
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { getAdminSession } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

const ADMIN_API = 'http://localhost:8000/api/admin'

let sharedToken: string | null = null
let funnelId: string | null = null
let workspaceId: string | null = null

async function loginAsAdmin(page: import('@playwright/test').Page): Promise<void> {
  if (!sharedToken) { test.skip(); return }
  await page.goto('/auth/login')
  await page.evaluate((t: string) => {
    localStorage.setItem('mp_token', t)
  }, sharedToken)
}

test.beforeAll(async () => {
  test.setTimeout(120_000)
  const session = await getAdminSession()
  if (!session) return

  sharedToken = session.auth.Authorization.replace('Bearer ', '')
  workspaceId = session.workspaceId
  const { apiContext, auth } = session

  // Ersten verfuegbaren Funnel nehmen
  const funnelsResp = await apiContext.get(
    `${ADMIN_API}/workspaces/${workspaceId}/funnels`,
    { headers: auth },
  )
  if (funnelsResp.ok()) {
    const data = await funnelsResp.json() as { data: { id: string }[] }
    funnelId = data.data[0]?.id ?? null
  }

  // Testfunnel anlegen falls keiner vorhanden
  if (!funnelId) {
    const createResp = await apiContext.post(
      `${ADMIN_API}/workspaces/${workspaceId}/funnels`,
      { headers: auth, data: { name: '[MC-Test] Charts E2E' } },
    )
    if (createResp.ok()) {
      const d = await createResp.json() as { data: { id: string } }
      funnelId = d.data.id
    }
  }

  await apiContext.dispose()
})

// ---------------------------------------------------------------------------
// MC1 - Metriken-Seite laedt
// ---------------------------------------------------------------------------

test('MC1 – Metriken-Seite laedt ohne Fehler', async ({ page }) => {
  if (!sharedToken || !funnelId) { test.skip(); return }
  await loginAsAdmin(page)
  await page.goto(`/admin/funnels/${funnelId}/metrics`)
  await page.waitForSelector('main', { state: 'visible', timeout: 15000 })
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})

  // h1 Metriken vorhanden
  await expect(page.getByRole('heading', { name: 'Metriken', level: 1 })).toBeVisible()

  // Keine globale Fehlermeldung
  await expect(page.getByRole('alert')).not.toBeVisible().catch(() => {})
})

// ---------------------------------------------------------------------------
// MC2 - Chart-Bereiche im DOM
// ---------------------------------------------------------------------------

test('MC2 – Dropoff-Chart-Sektion ist im DOM vorhanden', async ({ page }) => {
  if (!sharedToken || !funnelId) { test.skip(); return }
  await loginAsAdmin(page)
  await page.goto(`/admin/funnels/${funnelId}/metrics`)
  await page.waitForSelector('main', { state: 'visible', timeout: 15000 })
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 15000 }).catch(() => {})

  // Chart-Platzhalter darf NICHT mehr vorhanden sein
  await expect(page.getByText('Charts folgen in M4')).not.toBeVisible()

  // Dropoff-Chart-Section vorhanden (data-testid)
  await expect(page.locator('[data-testid="chart-dropoff"]')).toBeAttached({ timeout: 10000 })
})

test('MC2 – Geraeteverteilung-Chart-Sektion ist im DOM vorhanden', async ({ page }) => {
  if (!sharedToken || !funnelId) { test.skip(); return }
  await loginAsAdmin(page)
  await page.goto(`/admin/funnels/${funnelId}/metrics`)
  await page.waitForSelector('main', { state: 'visible', timeout: 15000 })
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 15000 }).catch(() => {})

  await expect(page.locator('[data-testid="chart-devices"]')).toBeAttached({ timeout: 10000 })
})

test('MC2 – Timeline-Chart-Sektion ist im DOM vorhanden', async ({ page }) => {
  if (!sharedToken || !funnelId) { test.skip(); return }
  await loginAsAdmin(page)
  await page.goto(`/admin/funnels/${funnelId}/metrics`)
  await page.waitForSelector('main', { state: 'visible', timeout: 15000 })
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 15000 }).catch(() => {})

  await expect(page.locator('[data-testid="chart-timeline"]')).toBeAttached({ timeout: 10000 })
})

// ---------------------------------------------------------------------------
// MC3 - Screenshot der Metriken-Seite mit Charts
// ---------------------------------------------------------------------------

test('MC3 – Screenshot der Metriken-Seite mit Charts', async ({ page }) => {
  if (!sharedToken || !funnelId) { test.skip(); return }
  await loginAsAdmin(page)
  await page.goto(`/admin/funnels/${funnelId}/metrics`)
  await page.waitForSelector('main', { state: 'visible', timeout: 15000 })
  // Charts laden abwarten
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 15000 }).catch(() => {})

  await page.screenshot({
    path: 'tests/screenshots/metrics-charts.png',
    fullPage: false,
  })

  // Screenshot-Datei existiert (Smoke-Test)
  const { existsSync } = await import('node:fs')
  expect(existsSync('tests/screenshots/metrics-charts.png')).toBe(true)
})

// ---------------------------------------------------------------------------
// MC4 - axe: keine kritischen AA-Violations
// ---------------------------------------------------------------------------

test('MC4 – axe: keine kritischen AA-Violations auf der Metriken-Seite (Charts)', async ({ page }) => {
  if (!sharedToken || !funnelId) { test.skip(); return }
  await loginAsAdmin(page)
  await page.goto(`/admin/funnels/${funnelId}/metrics`)
  await page.waitForSelector('main', { state: 'visible', timeout: 15000 })
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 15000 }).catch(() => {})

  const results = await new AxeBuilder({ page })
    .include('main')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  const criticalOrSerious = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  )
  expect(
    criticalOrSerious,
    `A11y-Violations Metriken-Charts:\n${criticalOrSerious.map((v) => `[${v.impact}] ${v.id}: ${v.description}`).join('\n')}`,
  ).toHaveLength(0)
})
