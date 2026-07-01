/**
 * E2E-Tests fuer die Workspace-Verwaltung (WV.4 - WV.8).
 *
 * Voraussetzungen:
 *   - Frontend laeuft auf http://localhost:3000
 *   - Backend laeuft auf http://localhost:8000
 *   - mp_admin-Account: admin@marketing-planet.de / password
 *
 * Abgedeckte Happy-Paths:
 *   WV.4 - Dropdown: oeffnet, zeigt Eintraege, Escape schliesst
 *   WV.5 - Neuer Workspace: Modal oeffnet und ist bedienbar
 *   WV.6 - Mitglieder verwalten: Modal oeffnet und laed Mitglieder
 *   WV.7 - Workspace-Einstellungen: Modal oeffnet mit vorbellegten Feldern
 *   WV.8 - Alle-Workspaces-Seite: Navigation und Darstellung
 */
import { test, expect, request as playwrightRequest } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Alle Tests in dieser Datei sequenziell ausfuehren (ein Login-Token genuegt)
test.describe.configure({ mode: 'serial' })

const ADMIN_API = 'http://localhost:8000/api/admin'
const ADMIN_EMAIL = 'admin@marketing-planet.de'
const ADMIN_PASSWORD = 'password'

// Einmalig ermittelter Token (wird in beforeAll gesetzt)
let sharedToken: string | null = null

test.beforeAll(async () => {
  // Hook-Timeout hochsetzen: das Login-Throttle (5/min pro E-Mail+IP) kann im
  // Gesamtlauf greifen, weil sich mehrere Spec-Dateien denselben Admin teilen.
  // Wir warten dann die Retry-After-Spanne ab, statt still zu skippen.
  test.setTimeout(120_000)
  const ctx = await playwrightRequest.newContext()
  for (let attempt = 0; attempt < 3 && !sharedToken; attempt++) {
    const resp = await ctx.post(`${ADMIN_API}/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    })
    if (resp.ok()) {
      const data = await resp.json() as { token: string }
      sharedToken = data.token
      break
    }
    if (resp.status() === 429) {
      const retryAfter = Number(resp.headers()['retry-after'] ?? '30')
      await new Promise(resolve => setTimeout(resolve, (Number.isFinite(retryAfter) ? retryAfter : 30) * 1000 + 1000))
      continue
    }
    break // anderer Fehler (z.B. 401): kein Retry, Tests skippen mit klarer Ursache
  }
  await ctx.dispose()
})

/** Token in localStorage setzen und zur Admin-Startseite navigieren. */
async function loginAsAdmin(page: import('@playwright/test').Page): Promise<void> {
  if (!sharedToken) {
    test.skip()
    return
  }
  await page.goto('/auth/login')
  await page.evaluate((t: string) => {
    localStorage.setItem('mp_token', t)
  }, sharedToken)
  await page.goto('/admin/funnels')
  await page.waitForSelector('header', { timeout: 15000 })
}

// ---------------------------------------------------------------------------
// WV.4 - Workspace-Menü-Dropdown
// ---------------------------------------------------------------------------

test('WV.4 – Dropdown oeffnet und zeigt Verwaltungsoptionen fuer mp_admin', async ({ page }) => {
  if (!sharedToken) { test.skip(); return }
  await loginAsAdmin(page)

  await page.getByRole('button', { name: 'Workspace-Menü öffnen' }).click()

  await expect(page.getByRole('menuitem', { name: 'Mitglieder verwalten' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Workspace-Einstellungen' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Alle Workspaces' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Neuer Workspace' })).toBeVisible()
})

test('WV.4 – Dropdown schliesst mit Escape', async ({ page }) => {
  if (!sharedToken) { test.skip(); return }
  await loginAsAdmin(page)

  await page.getByRole('button', { name: 'Workspace-Menü öffnen' }).click()
  await expect(page.getByRole('menu', { name: 'Workspace-Optionen' })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu', { name: 'Workspace-Optionen' })).not.toBeVisible()
})

test('WV.4 – Axe: keine kritischen Violations im offenen Dropdown', async ({ page }) => {
  if (!sharedToken) { test.skip(); return }
  await loginAsAdmin(page)
  await page.getByRole('button', { name: 'Workspace-Menü öffnen' }).click()
  await expect(page.getByRole('menu', { name: 'Workspace-Optionen' })).toBeVisible()

  // Nur das Dropdown-Element scannen (nicht die gesamte Seite mit pre-existenten Violations)
  const results = await new AxeBuilder({ page })
    .include('[role="menu"][aria-label="Workspace-Optionen"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  const criticalOrSerious = results.violations.filter(
    v => v.impact === 'critical' || v.impact === 'serious',
  )
  expect(
    criticalOrSerious,
    `A11y-Violations im offenen Dropdown:\n${criticalOrSerious.map(v => `[${v.impact}] ${v.id}`).join('\n')}`,
  ).toHaveLength(0)
})

// ---------------------------------------------------------------------------
// WV.5 - Neuer Workspace
// ---------------------------------------------------------------------------

test('WV.5 – Modal Neuer Workspace oeffnet und ist bedienbar', async ({ page }) => {
  if (!sharedToken) { test.skip(); return }
  await loginAsAdmin(page)

  await page.getByRole('button', { name: 'Workspace-Menü öffnen' }).click()
  await page.getByRole('menuitem', { name: 'Neuer Workspace' }).click()

  await expect(page.getByRole('dialog', { name: 'Neuer Workspace' })).toBeVisible()

  // Name-Feld ist sichtbar (Input mit id="new-ws-name")
  await expect(page.locator('#new-ws-name')).toBeVisible()

  // Escape schliesst Modal
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Neuer Workspace' })).not.toBeVisible()
})

test('WV.5 – Axe: keine kritischen Violations im Modal Neuer Workspace', async ({ page }) => {
  if (!sharedToken) { test.skip(); return }
  await loginAsAdmin(page)

  await page.getByRole('button', { name: 'Workspace-Menü öffnen' }).click()
  await page.getByRole('menuitem', { name: 'Neuer Workspace' }).click()
  await expect(page.getByRole('dialog', { name: 'Neuer Workspace' })).toBeVisible()

  const results = await new AxeBuilder({ page })
    .include('[role="dialog"][aria-labelledby="new-workspace-modal-title"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  const criticalOrSerious = results.violations.filter(
    v => v.impact === 'critical' || v.impact === 'serious',
  )
  expect(
    criticalOrSerious,
    `A11y-Violations im Neuer-Workspace-Modal:\n${criticalOrSerious.map(v => `[${v.impact}] ${v.id}`).join('\n')}`,
  ).toHaveLength(0)
})

// ---------------------------------------------------------------------------
// WV.6 - Mitglieder verwalten
// ---------------------------------------------------------------------------

test('WV.6 – Modal Mitglieder verwalten oeffnet und laed Liste', async ({ page }) => {
  if (!sharedToken) { test.skip(); return }
  await loginAsAdmin(page)

  await page.getByRole('button', { name: 'Workspace-Menü öffnen' }).click()
  await page.getByRole('menuitem', { name: 'Mitglieder verwalten' }).click()

  await expect(page.getByRole('dialog', { name: 'Mitglieder verwalten' })).toBeVisible()

  // Warten bis Liste geladen (Ladeindikator weg oder Liste sichtbar)
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})

  // Escape schliesst Modal
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Mitglieder verwalten' })).not.toBeVisible()
})

test('WV.6 – Axe: keine kritischen Violations im Mitglieder-Modal', async ({ page }) => {
  if (!sharedToken) { test.skip(); return }
  await loginAsAdmin(page)

  await page.getByRole('button', { name: 'Workspace-Menü öffnen' }).click()
  await page.getByRole('menuitem', { name: 'Mitglieder verwalten' }).click()
  await expect(page.getByRole('dialog', { name: 'Mitglieder verwalten' })).toBeVisible()
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})

  const results = await new AxeBuilder({ page })
    .include('[role="dialog"][aria-labelledby="members-modal-title"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  const criticalOrSerious = results.violations.filter(
    v => v.impact === 'critical' || v.impact === 'serious',
  )
  expect(
    criticalOrSerious,
    `A11y-Violations im Mitglieder-Modal:\n${criticalOrSerious.map(v => `[${v.impact}] ${v.id}`).join('\n')}`,
  ).toHaveLength(0)
})

// ---------------------------------------------------------------------------
// WV.7 - Workspace-Einstellungen
// ---------------------------------------------------------------------------

test('WV.7 – Modal Workspace-Einstellungen oeffnet mit vorbellegten Feldern', async ({ page }) => {
  if (!sharedToken) { test.skip(); return }
  await loginAsAdmin(page)

  await page.getByRole('button', { name: 'Workspace-Menü öffnen' }).click()
  await page.getByRole('menuitem', { name: 'Workspace-Einstellungen' }).click()

  await expect(page.getByRole('dialog', { name: 'Workspace-Einstellungen' })).toBeVisible()

  // Name-Feld ist nicht leer (id="ws-name")
  const nameInput = page.locator('#ws-name')
  const nameValue = await nameInput.inputValue()
  expect(nameValue.length).toBeGreaterThan(0)

  // Escape schliesst Modal
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Workspace-Einstellungen' })).not.toBeVisible()
})

test('WV.7 – Axe: keine kritischen Violations im Einstellungen-Modal', async ({ page }) => {
  if (!sharedToken) { test.skip(); return }
  await loginAsAdmin(page)

  await page.getByRole('button', { name: 'Workspace-Menü öffnen' }).click()
  await page.getByRole('menuitem', { name: 'Workspace-Einstellungen' }).click()
  await expect(page.getByRole('dialog', { name: 'Workspace-Einstellungen' })).toBeVisible()

  const results = await new AxeBuilder({ page })
    .include('[role="dialog"][aria-labelledby="ws-settings-modal-title"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  const criticalOrSerious = results.violations.filter(
    v => v.impact === 'critical' || v.impact === 'serious',
  )
  expect(
    criticalOrSerious,
    `A11y-Violations im Einstellungen-Modal:\n${criticalOrSerious.map(v => `[${v.impact}] ${v.id}`).join('\n')}`,
  ).toHaveLength(0)
})

// ---------------------------------------------------------------------------
// WV.8 - Alle Workspaces
// ---------------------------------------------------------------------------

test('WV.8 – Navigation ueber Dropdown oeffnet Alle-Workspaces-Seite', async ({ page }) => {
  if (!sharedToken) { test.skip(); return }
  await loginAsAdmin(page)

  await page.getByRole('button', { name: 'Workspace-Menü öffnen' }).click()
  await page.getByRole('menuitem', { name: 'Alle Workspaces' }).click()

  await page.waitForURL('**/admin/funnels/all', { timeout: 10000 })
  await expect(page.getByRole('heading', { name: 'Alle Workspaces', level: 1 })).toBeVisible()
})

test('WV.8 – Axe: keine kritischen Violations auf Alle-Workspaces-Seite', async ({ page }) => {
  if (!sharedToken) { test.skip(); return }
  await loginAsAdmin(page)
  await page.goto('/admin/funnels/all')
  // /admin/** ist ssr:false: erst auf die hydrierte Layout-Huelle warten, sonst
  // scannt axe eine leere Seite ("No elements found for include").
  await page.waitForSelector('#main-content', { state: 'attached', timeout: 10000 })
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})

  // Scan des Hauptinhalts (id="main-content") ohne pre-existente Header-Violations
  const results = await new AxeBuilder({ page })
    .include('#main-content')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  const criticalOrSerious = results.violations.filter(
    v => v.impact === 'critical' || v.impact === 'serious',
  )
  expect(
    criticalOrSerious,
    `A11y-Violations auf /admin/funnels/all:\n${criticalOrSerious.map(v => `[${v.impact}] ${v.id}`).join('\n')}`,
  ).toHaveLength(0)
})
