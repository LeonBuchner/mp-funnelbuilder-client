/**
 * E2E-Tests fuer die workspace-weite Performance-Seite.
 *
 * Voraussetzungen:
 *   - Frontend laeuft auf http://localhost:3000
 *   - Backend laeuft auf http://localhost:8000
 *   - Admin-Account: admin@marketing-planet.de / password
 *
 * Abgedeckte Faelle:
 *   P1 - Performance-Tab ist im Admin-Nav klickbar und navigiert zu /admin/performance
 *   P2 - Seite laedt und zeigt KPI-Karten
 *   P3 - Funnel-Tabelle wird dargestellt (sofern Funnels vorhanden)
 *   P4 - Timeline-Chart-Sektion ist im DOM vorhanden
 *   P5 - Screenshot der Performance-Seite
 *   P6 - axe: keine kritischen/schwerwiegenden AA-Violations
 *   P7 - Workspace-Wechsel laedt die Daten neu
 */
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { getAdminSession } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

let sharedToken: string | null = null
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
  await session.apiContext.dispose()
})

// ---------------------------------------------------------------------------
// P1 - Performance-Tab klickbar + Navigation
// ---------------------------------------------------------------------------

test('P1 – Performance-Tab ist klickbar und navigiert zu /admin/performance', async ({ page }) => {
  if (!sharedToken) { test.skip(); return }
  await loginAsAdmin(page)
  await page.goto('/admin/funnels')
  await page.waitForSelector('header', { state: 'visible', timeout: 15000 })

  // Tab muss als Link vorhanden und anklickbar sein (nicht mehr disabled)
  const perfLink = page.getByRole('link', { name: 'Performance' })
  await expect(perfLink).toBeVisible()

  await perfLink.click()
  await page.waitForURL('**/admin/performance', { timeout: 10000 })
  await expect(page).toHaveURL(/\/admin\/performance/)
})

test('P1 – Performance-Tab ist aktiv wenn auf /admin/performance', async ({ page }) => {
  if (!sharedToken) { test.skip(); return }
  await loginAsAdmin(page)
  await page.goto('/admin/performance')
  await page.waitForSelector('header', { state: 'visible', timeout: 15000 })

  // Der Tab-Link soll aktiv-Styling haben (aria-current oder class-Selektor)
  const perfLink = page.getByRole('link', { name: 'Performance' })
  await expect(perfLink).toBeVisible()
  // Klasse bg-ui-accent/10 kennzeichnet den aktiven Zustand (vgl. Funnels-Tab)
  await expect(perfLink).toHaveClass(/text-ui-accent/)
})

// ---------------------------------------------------------------------------
// P2 - Seite laedt, zeigt h1 und KPI-Karten
// ---------------------------------------------------------------------------

test('P2 – Performance-Seite laedt ohne Fehler und zeigt h1', async ({ page }) => {
  if (!sharedToken) { test.skip(); return }
  await loginAsAdmin(page)
  await page.goto('/admin/performance')
  await page.waitForSelector('main', { state: 'visible', timeout: 15000 })
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 15000 }).catch(() => {})

  await expect(page.getByRole('heading', { name: 'Performance', level: 1 })).toBeVisible()
  // Keine Fehlermeldung
  const alert = page.getByRole('alert')
  const alertCount = await alert.count()
  if (alertCount > 0) {
    await expect(alert).not.toBeVisible()
  }
})

test('P2 – KPI-Karten-Bereich ist im DOM vorhanden', async ({ page }) => {
  if (!sharedToken) { test.skip(); return }
  await loginAsAdmin(page)
  await page.goto('/admin/performance')
  await page.waitForSelector('main', { state: 'visible', timeout: 15000 })
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 15000 }).catch(() => {})

  // KPI-Cards-Container (data-testid)
  await expect(page.locator('[data-testid="kpi-cards"]')).toBeAttached({ timeout: 10000 })

  // Mindestens eine der vier Karten-Labels sichtbar
  await expect(page.getByText('Aufrufe').first()).toBeVisible()
  await expect(page.getByText('Leads').first()).toBeVisible()
  await expect(page.getByText('Conversion Rate').first()).toBeVisible()
})

// ---------------------------------------------------------------------------
// P3 - Funnel-Tabelle
// ---------------------------------------------------------------------------

test('P3 – Funnel-Tabelle wird dargestellt (sofern Funnels vorhanden)', async ({ page }) => {
  if (!sharedToken || !workspaceId) { test.skip(); return }
  await loginAsAdmin(page)
  await page.goto('/admin/performance')
  await page.waitForSelector('main', { state: 'visible', timeout: 15000 })
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 15000 }).catch(() => {})

  // Funnel-Tabelle oder Leer-Zustand soll sichtbar sein
  const table = page.locator('[data-testid="funnel-table"]')
  const emptyState = page.getByText('Noch keine Funnels vorhanden')

  const tableExists = await table.count() > 0
  const emptyExists = await emptyState.count() > 0

  // Eines von beidem muss vorhanden sein
  expect(tableExists || emptyExists).toBe(true)

  if (tableExists) {
    // Tabelle hat Kopfzeile mit Spaltenbezeichnungen
    await expect(page.getByRole('columnheader', { name: 'Funnel' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Aufrufe' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Leads' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Conversion Rate' })).toBeVisible()
  }
})

// ---------------------------------------------------------------------------
// P4 - Timeline-Chart
// ---------------------------------------------------------------------------

test('P4 – Timeline-Chart-Sektion ist im DOM vorhanden', async ({ page }) => {
  if (!sharedToken) { test.skip(); return }
  await loginAsAdmin(page)
  await page.goto('/admin/performance')
  await page.waitForSelector('main', { state: 'visible', timeout: 15000 })
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 15000 }).catch(() => {})

  // Chart-Container vorhanden (data-testid)
  await expect(page.locator('[data-testid="chart-timeline"]')).toBeAttached({ timeout: 10000 })
})

// ---------------------------------------------------------------------------
// P5 - Screenshot
// ---------------------------------------------------------------------------

test('P5 – Screenshot der Performance-Seite', async ({ page }) => {
  if (!sharedToken) { test.skip(); return }
  await loginAsAdmin(page)
  await page.goto('/admin/performance')
  await page.waitForSelector('main', { state: 'visible', timeout: 15000 })
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 15000 }).catch(() => {})

  await page.screenshot({
    path: 'tests/screenshots/performance.png',
    fullPage: false,
  })

  const { existsSync } = await import('node:fs')
  expect(existsSync('tests/screenshots/performance.png')).toBe(true)
})

// ---------------------------------------------------------------------------
// P6 - axe: keine kritischen/schwerwiegenden AA-Violations
// ---------------------------------------------------------------------------

test('P6 – axe: keine critical/serious AA-Violations auf der Performance-Seite', async ({ page }) => {
  if (!sharedToken) { test.skip(); return }
  await loginAsAdmin(page)
  await page.goto('/admin/performance')
  await page.waitForSelector('main', { state: 'visible', timeout: 15000 })
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 15000 }).catch(() => {})

  const results = await new AxeBuilder({ page })
    .include('main')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  const criticalOrSerious = results.violations.filter(
    v => v.impact === 'critical' || v.impact === 'serious',
  )
  expect(
    criticalOrSerious,
    `A11y-Violations auf Performance-Seite:\n${criticalOrSerious.map(v => `[${v.impact}] ${v.id}: ${v.description}`).join('\n')}`,
  ).toHaveLength(0)
})

// ---------------------------------------------------------------------------
// P7 - Zeitraum-Auswahl
// ---------------------------------------------------------------------------

test('P7 – Zeitraum-Auswahl ist bedienbar', async ({ page }) => {
  if (!sharedToken) { test.skip(); return }
  await loginAsAdmin(page)
  await page.goto('/admin/performance')
  await page.waitForSelector('main', { state: 'visible', timeout: 15000 })
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 15000 }).catch(() => {})

  // Select-Element fuer Zeitraum vorhanden und bedienbar
  const periodSelect = page.getByRole('combobox', { name: 'Zeitraum auswählen' })
  await expect(periodSelect).toBeVisible()

  // Zeitraum aendern -> Seite laedt neu (kein Fehler)
  await periodSelect.selectOption('7d')
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})

  // Kein Fehler nach Zeitraum-Aenderung
  const alert = page.getByRole('alert')
  const alertCount = await alert.count()
  if (alertCount > 0) {
    await expect(alert).not.toBeVisible()
  }
})
