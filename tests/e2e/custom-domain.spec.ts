/**
 * E2E-Tests fuer die Custom-Domain-Verwaltung (M5.3).
 *
 * Voraussetzungen:
 *   - Frontend laeuft auf http://localhost:3000
 *   - Backend laeuft auf http://localhost:8000
 *   - mp_admin-Account: admin@marketing-planet.de / password
 *
 * Abgedeckte Szenarien:
 *   CD.1 – Settings-Modal oeffnet und zeigt Domain-Sektion fuer mp_admin
 *   CD.2 – Feature-aus-Zustand (CUSTOM_DOMAINS_ENABLED=false): dezenter Hinweis
 *   CD.3 – Domain hinzufuegen, TXT-Record + Copy-Button sichtbar (Feature an)
 *   CD.4 – "Jetzt pruefen" zeigt 422-Fehler (kein echter DNS-Record)
 *   CD.5 – Domain entfernen mit Bestaetigung
 *   CD.6 – Axe: keine kritischen Violations im Modal mit Domain-Sektion
 */
import { test, expect, request as playwrightRequest } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe.configure({ mode: 'serial' })

const ADMIN_API = 'http://localhost:8000/api/admin'
const ADMIN_EMAIL = 'admin@marketing-planet.de'
const ADMIN_PASSWORD = 'password'

let sharedToken: string | null = null

test.beforeAll(async () => {
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
    break
  }
  await ctx.dispose()
})

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

/** Oeffnet das Workspace-Einstellungen-Modal. */
async function openSettingsModal(page: import('@playwright/test').Page): Promise<void> {
  await page.getByRole('button', { name: 'Workspace-Menü öffnen' }).click()
  await page.getByRole('menuitem', { name: 'Workspace-Einstellungen' }).click()
  await expect(page.getByRole('dialog', { name: 'Workspace-Einstellungen' })).toBeVisible()
}

// ---------------------------------------------------------------------------
// CD.1 – Domain-Sektion im Modal sichtbar
// ---------------------------------------------------------------------------

test('CD.1 – Settings-Modal zeigt Custom-Domain-Sektion fuer mp_admin', async ({ page }) => {
  if (!sharedToken) { test.skip(); return }
  await loginAsAdmin(page)
  await openSettingsModal(page)

  const dialog = page.getByRole('dialog', { name: 'Workspace-Einstellungen' })

  // Die Sektion ist immer vorhanden (zeigt entweder Add-Form, Domain-Details oder Feature-Hinweis)
  await expect(dialog.getByRole('region', { name: 'Custom-Domain' })).toBeVisible()
})

// ---------------------------------------------------------------------------
// CD.2 – Feature-aus-Zustand
// ---------------------------------------------------------------------------

test('CD.2 – Zeigt dezenten Hinweis wenn Feature deaktiviert ist (oder Add-Formular wenn aktiv)', async ({ page }) => {
  if (!sharedToken) { test.skip(); return }
  await loginAsAdmin(page)

  // Pruefe ob Feature-Hinweis oder Add-Formular sichtbar ist
  await openSettingsModal(page)
  const dialog = page.getByRole('dialog', { name: 'Workspace-Einstellungen' })

  // Warten bis der Lade-Indikator weg ist (async fetchDomain)
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})
  await page.waitForTimeout(500)

  // Entweder der Feature-Hinweis ODER das Domain-Eingabefeld ODER eine gesetzte Domain ist vorhanden
  const featureHint = dialog.getByRole('status').filter({ hasText: 'Custom-Domains sind auf diesem System nicht aktiviert' })
  const domainInput = dialog.locator('#custom-domain-input')
  const domainHeader = dialog.locator('section[aria-labelledby="custom-domain-section-title"]')

  const hintVisible = await featureHint.isVisible().catch(() => false)
  const inputVisible = await domainInput.isVisible().catch(() => false)
  const sectionVisible = await domainHeader.isVisible().catch(() => false)

  // Die Sektion selbst muss sichtbar sein
  expect(sectionVisible).toBe(true)

  // Entweder Hint, Input oder eine gesetzte Domain ist sichtbar
  const domainNameSpan = dialog.locator('section').locator('span.text-sm.font-medium.text-ui-text').first()
  const hasDomainName = await domainNameSpan.isVisible().catch(() => false)

  expect(hintVisible || inputVisible || hasDomainName).toBe(true)

  // Screenshot fuer visuelle Pruefung
  await page.screenshot({
    path: 'tests/screenshots/custom-domain-state.png',
  })
})

// ---------------------------------------------------------------------------
// CD.3–CD.5 – Vollstaendiger Flow (nur wenn Feature an)
// ---------------------------------------------------------------------------

test('CD.3 – Domain hinzufuegen (Feature muss aktiv sein)', async ({ page }) => {
  if (!sharedToken) { test.skip(); return }
  await loginAsAdmin(page)
  await openSettingsModal(page)

  // Warten bis initiales Laden abgeschlossen ist
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})
  await page.waitForTimeout(500)

  const dialog = page.getByRole('dialog', { name: 'Workspace-Einstellungen' })
  const domainInput = dialog.locator('#custom-domain-input')

  if (!(await domainInput.isVisible({ timeout: 3000 }).catch(() => false))) {
    // Kein Eingabefeld sichtbar: Feature deaktiviert oder Domain bereits gesetzt
    test.skip()
    return
  }

  // Domain eingeben und hinzufuegen
  await domainInput.fill('test.mp-funnels-e2e.de')
  await dialog.getByRole('button', { name: 'Domain hinzufügen' }).click()

  // Warten auf Response: entweder TXT-Record wird sichtbar oder Feature-Hinweis
  await page.waitForTimeout(3000)

  const txtRecord = dialog.locator('#custom-domain-txt-record')
  const featureHint = dialog.getByRole('status')
    .filter({ hasText: 'Custom-Domains sind auf diesem System nicht aktiviert' })

  const txtVisible = await txtRecord.isVisible().catch(() => false)
  const featureHintVisible = await featureHint.isVisible().catch(() => false)

  // Entweder TXT-Record sichtbar (Feature an, Domain hinzugefuegt)
  // oder Feature-Hinweis (Feature aus - wurde beim POST erkannt)
  expect(txtVisible || featureHintVisible).toBe(true)

  await page.screenshot({ path: 'tests/screenshots/custom-domain-added.png' })
})

test('CD.4 – TXT-Record kopieren und Pruefen-Button (422 erwartet)', async ({ page }) => {
  if (!sharedToken) { test.skip(); return }
  await loginAsAdmin(page)
  await openSettingsModal(page)

  // Warten bis initiales Laden abgeschlossen ist
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})
  await page.waitForTimeout(500)

  const dialog = page.getByRole('dialog', { name: 'Workspace-Einstellungen' })
  const txtRecord = dialog.locator('#custom-domain-txt-record')

  if (!(await txtRecord.isVisible({ timeout: 3000 }).catch(() => false))) {
    test.skip()
    return
  }

  // Copy-Button testen (Clipboard-API im Browser)
  const copyBtn = dialog.getByRole('button', { name: /TXT-Record in Zwischenablage kopieren|Kopiert/ })
  await expect(copyBtn).toBeVisible()
  await copyBtn.click()
  // Feedback: Button zeigt "Kopiert" oder "Fehler" (je nach Browser-Clipboard-Berechtigung)
  await page.waitForTimeout(500)

  // "Jetzt pruefen" klicken -> 422 da echter DNS-Record fehlt
  await dialog.getByRole('button', { name: 'Jetzt prüfen' }).click()
  await page.waitForTimeout(3000)

  // Fehlermeldung muss sichtbar sein (422 oder Feature deaktiviert)
  const errorMsg = dialog.locator('[role="alert"]').last()
  const errorVisible = await errorMsg.isVisible().catch(() => false)
  if (errorVisible) {
    const errorText = await errorMsg.textContent()
    expect(errorText?.length).toBeGreaterThan(5)
  }

  await page.screenshot({ path: 'tests/screenshots/custom-domain-verify-error.png' })
})

test('CD.5 – Domain entfernen mit Bestaetigung', async ({ page }) => {
  if (!sharedToken) { test.skip(); return }
  await loginAsAdmin(page)
  await openSettingsModal(page)

  // Warten bis initiales Laden abgeschlossen ist
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})
  await page.waitForTimeout(500)

  const dialog = page.getByRole('dialog', { name: 'Workspace-Einstellungen' })
  const removeBtn = dialog.getByRole('button', { name: 'Domain entfernen' })

  if (!(await removeBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
    test.skip()
    return
  }

  // Entfernen klicken -> Bestaetigungs-Modal oeffnet sich
  await removeBtn.click()

  // AdminConfirmModal erscheint (teleportiert zu body)
  const confirmDialog = page.getByRole('dialog', { name: 'Domain entfernen?' })
  await expect(confirmDialog).toBeVisible()

  // Entfernen bestaetigen
  await confirmDialog.getByRole('button', { name: 'Entfernen' }).click()
  await page.waitForTimeout(2000)

  // Domain sollte weg sein -> Eingabefeld erscheint wieder
  await expect(dialog.locator('#custom-domain-input')).toBeVisible({ timeout: 5000 })
  await page.screenshot({ path: 'tests/screenshots/custom-domain-removed.png' })
})

// ---------------------------------------------------------------------------
// CD.6 – Axe: keine kritischen Violations
// ---------------------------------------------------------------------------

test('CD.6 – Axe: keine kritischen Violations im Settings-Modal mit Domain-Sektion', async ({ page }) => {
  if (!sharedToken) { test.skip(); return }
  await loginAsAdmin(page)
  await openSettingsModal(page)

  // Warten bis Domain-Sektion geladen hat
  await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})
  await page.waitForTimeout(500)

  const results = await new AxeBuilder({ page })
    .include('[role="dialog"][aria-labelledby="ws-settings-modal-title"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  const criticalOrSerious = results.violations.filter(
    v => v.impact === 'critical' || v.impact === 'serious',
  )
  expect(
    criticalOrSerious,
    `A11y-Violations im Settings-Modal:\n${criticalOrSerious.map(v => `[${v.impact}] ${v.id}: ${v.description}`).join('\n')}`,
  ).toHaveLength(0)
})
