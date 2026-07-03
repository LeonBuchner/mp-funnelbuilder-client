/**
 * E2E-Tests fuer die Lead-Verwaltung / Kontakte-Tab (M4.4).
 *
 * Voraussetzungen:
 *   - Frontend laeuft auf http://localhost:3000
 *   - Backend laeuft auf http://localhost:8000
 *   - Admin-Account: admin@marketing-planet.de / password
 *   - Demo-Funnel (d0000001-0000-4000-8000-000000000001) oder beliebiger Funnel
 *     mit vorhandenen Leads
 *
 * Abgedeckte Happy-Paths:
 *   L1  - Kontakte-Tab oeffnet die Leads-Seite
 *   L2  - Tabelle laedt und zeigt Leads (wenn vorhanden)
 *   L3  - Filter-Leiste ist bedienbar (Status-Select, Von/Bis)
 *   L4  - Detail-Drawer oeffnet und schliesst (Keyboard Escape)
 *   L5  - client-Rolle: CSV- und Loeschen-Buttons NICHT im DOM
 *   L6  - axe: keine kritischen AA-Violations auf der Kontakte-Seite
 */
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { getAdminSession } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

const ADMIN_API = 'http://localhost:8000/api/admin'

let sharedToken: string | null = null
let funnelId: string | null = null
let workspaceId: string | null = null

/** Token in localStorage schreiben und auf Admin-Seite navigieren. */
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

  // Demo-Funnel oder ersten vorhandenen Funnel nehmen
  const funnelsResp = await apiContext.get(
    `${ADMIN_API}/workspaces/${workspaceId}/funnels`,
    { headers: auth },
  )
  if (!funnelsResp.ok()) {
    await apiContext.dispose()
    return
  }
  const funnelsData = await funnelsResp.json() as {
    data: { id: string }[]
  }
  funnelId = funnelsData.data[0]?.id ?? null

  // Falls kein Funnel: Testfunnel anlegen
  if (!funnelId) {
    const createResp = await apiContext.post(
      `${ADMIN_API}/workspaces/${workspaceId}/funnels`,
      { headers: auth, data: { name: '[L-Test] Kontakte E2E' } },
    )
    if (createResp.ok()) {
      const data = await createResp.json() as { data: { id: string } }
      funnelId = data.data.id
    }
  }

  await apiContext.dispose()
})

// ---------------------------------------------------------------------------
// L1 - Kontakte-Tab navigiert korrekt
// ---------------------------------------------------------------------------

test('L1 – Kontakte-Tab in der TopBar oeffnet die Leads-Seite', async ({ page }) => {
  if (!sharedToken || !funnelId) { test.skip(); return }
  await loginAsAdmin(page)
  await page.goto(`/admin/funnels/${funnelId}/metrics`)
  await page.waitForSelector('main', { state: 'visible', timeout: 15000 })

  // Kontakte-Tab klicken
  await page.getByRole('link', { name: 'Kontakte' }).click()
  await page.waitForURL(`**/funnels/${funnelId}/leads`, { timeout: 10000 })

  // h1 der Seite
  await expect(page.getByRole('heading', { name: 'Kontakte', level: 1 })).toBeVisible()
})

// ---------------------------------------------------------------------------
// L2 - Tabelle laedt
// ---------------------------------------------------------------------------

test('L2 – Kontakte-Seite laedt (Tabelle oder Leer-Zustand sichtbar)', async ({ page }) => {
  if (!sharedToken || !funnelId) { test.skip(); return }
  await loginAsAdmin(page)
  await page.goto(`/admin/funnels/${funnelId}/leads`)
  await page.waitForSelector('main', { state: 'visible', timeout: 15000 })

  // Warten bis Skeleton weg ist
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})

  // Entweder Tabelle oder Leer-Zustand sichtbar
  const hasTable = await page.locator('table').isVisible().catch(() => false)
  const hasEmpty = await page.getByText('Keine Kontakte gefunden').isVisible().catch(() => false)
  expect(hasTable || hasEmpty).toBe(true)
})

// ---------------------------------------------------------------------------
// L3 - Filter-Leiste bedienbar
// ---------------------------------------------------------------------------

test('L3 – Status-Filter loest neue Anfrage aus', async ({ page }) => {
  if (!sharedToken || !funnelId) { test.skip(); return }
  await loginAsAdmin(page)
  await page.goto(`/admin/funnels/${funnelId}/leads`)
  await page.waitForSelector('main', { state: 'visible', timeout: 15000 })
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})

  // Status-Filter aendern
  await page.locator('#lead-status-filter').selectOption('complete')
  await page.getByRole('button', { name: 'Filtern' }).click()

  // Warten auf neue Ladephase
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})

  // Seite sollte stabil sein (kein Crash)
  await expect(page.locator('main')).toBeVisible()
})

test('L3 – Datumsfilter loest neue Anfrage aus', async ({ page }) => {
  if (!sharedToken || !funnelId) { test.skip(); return }
  await loginAsAdmin(page)
  await page.goto(`/admin/funnels/${funnelId}/leads`)
  await page.waitForSelector('main', { state: 'visible', timeout: 15000 })
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})

  // Datumsbereich eintragen
  await page.fill('#lead-from-filter', '2026-01-01')
  await page.fill('#lead-to-filter', '2026-12-31')
  await page.getByRole('button', { name: 'Filtern' }).click()

  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})
  await expect(page.locator('main')).toBeVisible()
})

// ---------------------------------------------------------------------------
// L4 - Detail-Drawer (nur wenn Leads vorhanden)
// ---------------------------------------------------------------------------

test('L4 – Detail-Drawer oeffnet und schliesst per Escape', async ({ page }) => {
  if (!sharedToken || !funnelId) { test.skip(); return }
  await loginAsAdmin(page)
  await page.goto(`/admin/funnels/${funnelId}/leads`)
  await page.waitForSelector('main', { state: 'visible', timeout: 15000 })
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})

  // Nur wenn Leads vorhanden
  const firstAnsehen = page.getByRole('button', { name: /ansehen/i }).first()
  const hasLeads = await firstAnsehen.isVisible().catch(() => false)
  if (!hasLeads) {
    test.skip()
    return
  }

  await firstAnsehen.click()

  // Drawer-Dialog muss sichtbar sein
  const dialog = page.getByRole('dialog', { name: 'Kontakt-Details' })
  await expect(dialog).toBeVisible({ timeout: 5000 })

  // Lade-Zustand abwarten (damit Focus gesetzt wird)
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 5000 }).catch(() => {})

  // Escape schliesst den Drawer (Locator.press fokussiert das Element zuerst)
  await dialog.press('Escape')
  await expect(dialog).not.toBeVisible({ timeout: 5000 })
})

// ---------------------------------------------------------------------------
// L5 - client-Rolle: Loeschen/CSV-Buttons NICHT im DOM
// ---------------------------------------------------------------------------

test('L5 – client-Rolle: CSV- und Loeschen-Buttons nicht im DOM', async ({ page }) => {
  if (!sharedToken || !funnelId) { test.skip(); return }

  // auth/me-Endpunkt intercepten und alle Memberships auf 'client' setzen.
  // Das auth.client.ts-Plugin ruft fetchMe() (GET /auth/me) beim App-Start auf,
  // wodurch die Memberships in den Store geladen werden.
  await page.route('**/auth/me', async (route) => {
    const response = await route.fetch()
    const json = await response.json() as {
      user: Record<string, unknown>
      memberships: { role: string; workspace: Record<string, unknown> }[]
    }
    if (json.memberships) {
      json.memberships = json.memberships.map((m) => ({ ...m, role: 'client' }))
    }
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(json),
    })
  })

  // Token setzen und zur Leads-Seite navigieren (fetchMe -> client-Rolle)
  await page.goto('/auth/login')
  await page.evaluate((t: string) => {
    localStorage.setItem('mp_token', t)
  }, sharedToken)
  await page.goto(`/admin/funnels/${funnelId}/leads`)
  await page.waitForSelector('main', { state: 'visible', timeout: 15000 })
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})

  // CSV-Export-Button darf NICHT im DOM sein (nicht nur versteckt)
  const exportBtn = page.locator('[data-testid="export-csv-btn"]')
  await expect(exportBtn).not.toBeAttached()

  // Loeschen-Buttons duerften NICHT im DOM sein
  const deleteBtn = page.locator('[data-testid="delete-lead-btn"]').first()
  await expect(deleteBtn).not.toBeAttached()
})

// ---------------------------------------------------------------------------
// L6 - axe: keine kritischen AA-Violations
// ---------------------------------------------------------------------------

test('L6 – axe: keine kritischen AA-Violations auf der Kontakte-Seite', async ({ page }) => {
  if (!sharedToken || !funnelId) { test.skip(); return }
  await loginAsAdmin(page)
  await page.goto(`/admin/funnels/${funnelId}/leads`)

  // Admin ist ssr:false: auf die hydrierte main warten
  await page.waitForSelector('main', { state: 'visible', timeout: 15000 })
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})

  const results = await new AxeBuilder({ page })
    .include('main')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  const criticalOrSerious = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  )
  expect(
    criticalOrSerious,
    `A11y-Violations auf Kontakte-Seite:\n${criticalOrSerious.map((v) => `[${v.impact}] ${v.id}: ${v.description}`).join('\n')}`,
  ).toHaveLength(0)
})

test('L6 – axe: keine kritischen AA-Violations im offenen Drawer', async ({ page }) => {
  if (!sharedToken || !funnelId) { test.skip(); return }
  await loginAsAdmin(page)
  await page.goto(`/admin/funnels/${funnelId}/leads`)
  await page.waitForSelector('main', { state: 'visible', timeout: 15000 })
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})

  const firstAnsehen = page.getByRole('button', { name: /ansehen/i }).first()
  const hasLeads = await firstAnsehen.isVisible().catch(() => false)
  if (!hasLeads) {
    test.skip()
    return
  }

  await firstAnsehen.click()
  await page.getByRole('dialog', { name: 'Kontakt-Details' }).waitFor({ state: 'visible', timeout: 5000 })
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 5000 }).catch(() => {})

  // CSS-Slide-Transition (duration-300) abwarten, bevor axe die Farben berechnet.
  // Chromium legt transformierte Elemente in einen GPU-Compositing-Layer, der die
  // Farbberechnung von axe verfaelscht wenn der Scan mitten in der Transition laeuft.
  await page.waitForTimeout(400)

  const results = await new AxeBuilder({ page })
    .include('[role="dialog"][aria-labelledby="drawer-title"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  const criticalOrSerious = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  )
  expect(
    criticalOrSerious,
    `A11y-Violations im Drawer:\n${criticalOrSerious.map((v) => `[${v.impact}] ${v.id}: ${v.description}`).join('\n')}`,
  ).toHaveLength(0)
})

// ---------------------------------------------------------------------------
// L7 - Board-Umschalter und Board-Ansicht
// ---------------------------------------------------------------------------

test('L7 – Board-Toggle wechselt in die Board-Ansicht', async ({ page }) => {
  if (!sharedToken || !funnelId) { test.skip(); return }
  await loginAsAdmin(page)
  await page.goto(`/admin/funnels/${funnelId}/leads`)
  await page.waitForSelector('main', { state: 'visible', timeout: 15000 })
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})

  // Board-Button klicken
  await page.locator('[data-testid="view-toggle-board"]').click()

  // Board-Region muss erscheinen
  await expect(page.locator('[data-testid="leads-board"]')).toBeVisible({ timeout: 10000 })

  // Tabellenspezifische Elemente verschwinden
  await expect(page.locator('table')).not.toBeVisible()
})

test('L7 – Board laedt und zeigt Spalten', async ({ page }) => {
  if (!sharedToken || !funnelId) { test.skip(); return }
  await loginAsAdmin(page)
  await page.goto(`/admin/funnels/${funnelId}/leads`)
  await page.waitForSelector('main', { state: 'visible', timeout: 15000 })
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})

  await page.locator('[data-testid="view-toggle-board"]').click()

  // Board geladen
  await page.waitForSelector('[data-testid="leads-board"]', { state: 'visible', timeout: 10000 })
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})

  // Alle 5 Spalten-Ueberschriften sichtbar (per ID der Board-Spalten-Labels)
  for (const stage of ['neu', 'gesichtet', 'interview', 'zusage', 'absage']) {
    await expect(page.locator(`#board-col-${stage}-label`)).toBeVisible({ timeout: 5000 })
  }
})

// ---------------------------------------------------------------------------
// L8 - Umschalter speichert den Zustand (localStorage)
// ---------------------------------------------------------------------------

test('L8 – Ansichts-Umschalter: Zustand bleibt nach Reload erhalten', async ({ page }) => {
  if (!sharedToken || !funnelId) { test.skip(); return }
  await loginAsAdmin(page)
  await page.goto(`/admin/funnels/${funnelId}/leads`)
  await page.waitForSelector('main', { state: 'visible', timeout: 15000 })
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})

  // Board aktivieren
  await page.locator('[data-testid="view-toggle-board"]').click()
  await page.waitForSelector('[data-testid="leads-board"]', { state: 'visible', timeout: 10000 })

  // Seite neuladen
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('main', { state: 'visible', timeout: 15000 })
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})

  // Board sollte noch aktiv sein
  await expect(page.locator('[data-testid="leads-board"]')).toBeVisible({ timeout: 10000 })

  // Zurueck zu Tabelle setzen (Aufraumen fuer nachfolgende Tests)
  await page.locator('[data-testid="view-toggle-table"]').click()
  await page.waitForSelector('table', { state: 'visible', timeout: 5000 }).catch(() => {})
})

// ---------------------------------------------------------------------------
// L9 - Stage per Select-Fallback aendern (persistiert)
// ---------------------------------------------------------------------------

test('L9 – Phase per Stage-Select aendern und Reload bestaetigt Aenderung', async ({ page }) => {
  if (!sharedToken || !funnelId) { test.skip(); return }
  await loginAsAdmin(page)
  await page.goto(`/admin/funnels/${funnelId}/leads`)
  await page.waitForSelector('main', { state: 'visible', timeout: 15000 })
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})

  // Board-Ansicht
  await page.locator('[data-testid="view-toggle-board"]').click()
  await page.waitForSelector('[data-testid="leads-board"]', { state: 'visible', timeout: 10000 })
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})

  // Erstes Stage-Select im Board
  const firstSelect = page.locator('[data-testid="stage-select"]').first()
  const hasSelect = await firstSelect.isVisible().catch(() => false)
  if (!hasSelect) {
    test.skip()
    return
  }

  // Aktuellen Wert merken
  const currentStage = await firstSelect.inputValue()
  // Neue Phase waehlen (naechste in Liste oder Fallback)
  const stages = ['neu', 'gesichtet', 'interview', 'zusage', 'absage']
  const newStage = stages[(stages.indexOf(currentStage) + 1) % stages.length] ?? 'gesichtet'

  await firstSelect.selectOption(newStage)

  // Kurz warten damit der PATCH abgesendet wird
  await page.waitForTimeout(1500)

  // Seite neuladen
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('main', { state: 'visible', timeout: 15000 })
  await page.waitForSelector('[data-testid="leads-board"]', { state: 'visible', timeout: 10000 })
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})

  // Die Stage-Selects in der neuen Phase muessen den Lead enthalten
  const newStageSelects = page.locator('[data-testid="stage-select"]')
  const allValues = await newStageSelects.evaluateAll(
    (selects) => selects.map((s) => (s as HTMLSelectElement).value),
  )
  expect(allValues).toContain(newStage)
})

// ---------------------------------------------------------------------------
// L10 - client-Rolle: kein Stage-Select im Board
// ---------------------------------------------------------------------------

test('L10 – client-Rolle: Stage-Select nicht im DOM auf dem Board', async ({ page }) => {
  if (!sharedToken || !funnelId) { test.skip(); return }

  // auth/me auf client-Rolle umbiegen
  await page.route('**/auth/me', async (route) => {
    const response = await route.fetch()
    const json = await response.json() as {
      user: Record<string, unknown>
      memberships: { role: string; workspace: Record<string, unknown> }[]
    }
    if (json.memberships) {
      json.memberships = json.memberships.map((m) => ({ ...m, role: 'client' }))
    }
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(json),
    })
  })

  await page.goto('/auth/login')
  await page.evaluate((t: string) => {
    localStorage.setItem('mp_token', t)
  }, sharedToken)
  await page.goto(`/admin/funnels/${funnelId}/leads`)
  await page.waitForSelector('main', { state: 'visible', timeout: 15000 })
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})

  // Board-Ansicht oeffnen
  await page.locator('[data-testid="view-toggle-board"]').click()
  await page.waitForSelector('[data-testid="leads-board"]', { state: 'visible', timeout: 10000 })
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})

  // Stage-Select darf NICHT im DOM sein
  const stageSelect = page.locator('[data-testid="stage-select"]').first()
  await expect(stageSelect).not.toBeAttached()
})

// ---------------------------------------------------------------------------
// L11 - axe: keine kritischen AA-Violations auf dem Board
// ---------------------------------------------------------------------------

test('L11 – axe: keine kritischen AA-Violations auf dem Board', async ({ page }) => {
  if (!sharedToken || !funnelId) { test.skip(); return }
  await loginAsAdmin(page)
  await page.goto(`/admin/funnels/${funnelId}/leads`)
  await page.waitForSelector('main', { state: 'visible', timeout: 15000 })
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})

  await page.locator('[data-testid="view-toggle-board"]').click()
  await page.waitForSelector('[data-testid="leads-board"]', { state: 'visible', timeout: 10000 })
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})

  const results = await new AxeBuilder({ page })
    .include('main')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  const criticalOrSerious = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  )
  expect(
    criticalOrSerious,
    `A11y-Violations auf Board:\n${criticalOrSerious.map((v) => `[${v.impact}] ${v.id}: ${v.description}`).join('\n')}`,
  ).toHaveLength(0)
})
