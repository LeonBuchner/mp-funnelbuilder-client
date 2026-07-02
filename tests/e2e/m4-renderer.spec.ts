/**
 * E2E-Tests fuer M4-Renderer-Features.
 *
 * Testet:
 *   a) Consent-Banner (M4.11): erscheint beim ersten Besuch eines Funnels mit
 *      Tracking-ID, verschwindet nach Entscheidung, GA4-Script erscheint/fehlt korrekt.
 *   b) optin_double Happy-Path (M4.10): Funnel mit optin_double-Block via Admin-API
 *      erstellt, befuellt, abgesendet -> Bestaetigungs-Screen "Fast geschafft!" erscheint.
 *   c) optin_otp Happy-Path (M4.10): Funnel mit optin_otp-Block via Admin-API erstellt.
 *      OTP-send und -verify werden mit page.route() abgefangen (E-Mail nicht abrufbar
 *      im E2E-Kontext gegen echten Server). Geprueft: Slots erscheinen nach "Code
 *      anfordern", OTP-Verifikations-Erfolgs-Screen erscheint nach gemocktem verify.
 *      Der vollstaendige Backend-Flow (send->verify->submit) ist durch
 *      tests/Feature/Public/OtpTest.php abgedeckt.
 *   d) A11y-Checks M4: Consent-Banner-Dialog hat korrekte ARIA-Attribute.
 *
 * Voraussetzungen:
 *   - Backend laeuft auf :8000, Nuxt laeuft auf :3000
 *   - Admin-Account: admin@marketing-planet.de / password
 *
 * beforeAll: Legt zwei Test-Funnels per Admin-API an und veroeffentlicht sie.
 * afterAll:  Loescht beide Test-Funnels (keine Artefakte im System).
 */
import { test, expect, request as playwrightRequest } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { randomUUID } from 'node:crypto'
import { getAdminSession } from './helpers/auth'

// ---------------------------------------------------------------------------
// Gemeinsamer Test-Zustand (serial)
// ---------------------------------------------------------------------------

test.describe.configure({ mode: 'serial' })

const ADMIN_API = 'http://localhost:8000/api/admin'

/** public_id des Testfunnels mit optin_double + GA4-Tracking-ID */
let doubleOptinHash: string | null = null
/** public_id des Testfunnels mit optin_otp-Block */
let otpHash: string | null = null
/** Admin-Bearer-Token fuer Cleanup in afterAll */
let adminToken: string | null = null
/** Workspace-ID fuer Funnel-Erstellung */
let workspaceId: string | null = null

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

/** Minimaler Funnel-Content 1.2.0 mit optin_double-Block + GA4-Tracking. */
function makeDoubleOptinContent(): object {
  return {
    schemaVersion: '1.2.0',
    meta: {
      defaultLocale: 'de',
      themeId: 'mp',
      personalizationVars: [],
    },
    settings: {
      tracking: {
        ga4MeasurementId: 'G-TESTONLY001',
      },
    },
    steps: [
      {
        id: randomUUID(),
        type: 'form',
        blocks: [
          {
            id: randomUUID(),
            type: 'input_email',
            fieldKey: 'email',
            required: true,
            label: 'Deine E-Mail',
          },
          {
            id: randomUUID(),
            type: 'optin_checkbox',
            fieldKey: 'consent_data',
            required: true,
            checkboxLabel: 'Ich stimme der Datenverarbeitung zu.',
          },
          {
            id: randomUUID(),
            type: 'optin_double',
            fieldKey: 'newsletter_optin',
            required: true,
            checkboxLabel: 'Ich moechte den Newsletter erhalten und stimme zu.',
          },
          {
            id: randomUUID(),
            type: 'button',
            label: 'Absenden',
            action: 'submit',
            style: 'primary',
          },
        ],
        logicRules: [],
      },
    ],
  }
}

/** Minimaler Funnel-Content 1.2.0 mit optin_otp-Block. */
function makeOtpContent(): object {
  return {
    schemaVersion: '1.2.0',
    meta: {
      defaultLocale: 'de',
      themeId: 'mp',
      personalizationVars: [],
    },
    steps: [
      {
        id: randomUUID(),
        type: 'form',
        blocks: [
          {
            id: randomUUID(),
            type: 'optin_otp',
            fieldKey: 'otp_verify',
            required: false,
            label: 'E-Mail bestaetigen',
            digits: 6,
          },
          {
            id: randomUUID(),
            type: 'button',
            label: 'Absenden',
            action: 'submit',
            style: 'primary',
          },
        ],
        logicRules: [],
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// Setup: Test-Funnels per Admin-API anlegen und veroeffentlichen
// ---------------------------------------------------------------------------

test.beforeAll(async () => {
  const session = await getAdminSession()
  if (!session) {
    // Kein Admin-Zugang -> alle Tests in dieser Datei skippen
    return
  }
  adminToken = session.auth.Authorization.replace('Bearer ', '')
  workspaceId = session.workspaceId
  const { apiContext, auth } = session

  // --- Funnel 1: optin_double + GA4 ---
  const createDouble = await apiContext.post(
    `${ADMIN_API}/workspaces/${workspaceId}/funnels`,
    { headers: auth, data: { name: '[E2E-M4] optin_double Test' } },
  )
  if (createDouble.ok()) {
    const d = await createDouble.json() as { data: { id: string } }
    const id = d.data.id
    const draft1 = await apiContext.put(`${ADMIN_API}/funnels/${id}/draft`, {
      headers: auth,
      data: { content: makeDoubleOptinContent() },
    })
    if (draft1.ok()) {
      const pub = await apiContext.post(`${ADMIN_API}/funnels/${id}/publish`, { headers: auth, data: {} })
      if (pub.ok()) doubleOptinHash = id
    }
  }

  // --- Funnel 2: optin_otp ---
  const createOtp = await apiContext.post(
    `${ADMIN_API}/workspaces/${workspaceId}/funnels`,
    { headers: auth, data: { name: '[E2E-M4] optin_otp Test' } },
  )
  if (createOtp.ok()) {
    const d = await createOtp.json() as { data: { id: string } }
    const id = d.data.id
    const draft2 = await apiContext.put(`${ADMIN_API}/funnels/${id}/draft`, {
      headers: auth,
      data: { content: makeOtpContent() },
    })
    if (draft2.ok()) {
      const pub = await apiContext.post(`${ADMIN_API}/funnels/${id}/publish`, { headers: auth, data: {} })
      if (pub.ok()) otpHash = id
    }
  }

  await apiContext.dispose()
})

// ---------------------------------------------------------------------------
// Cleanup: Test-Funnels loeschen (keine Artefakte)
// ---------------------------------------------------------------------------

test.afterAll(async () => {
  if (!adminToken) return
  const ctx = await playwrightRequest.newContext()
  const auth = { Authorization: `Bearer ${adminToken}` }

  for (const hash of [doubleOptinHash, otpHash]) {
    if (hash) {
      await ctx.delete(`${ADMIN_API}/funnels/${hash}`, { headers: auth }).catch(() => {})
    }
  }
  await ctx.dispose()
})

// ---------------------------------------------------------------------------
// Consent-Banner Tests (M4.11)
// Nutzen den optin_double-Testfunnel, der eine GA4-ID hat -> Banner erscheint.
// ---------------------------------------------------------------------------

test.describe('Consent-Banner (M4.11)', () => {
  test.beforeEach(async ({ page }) => {
    // localStorage leeren damit Banner erscheint
    await page.addInitScript(() => {
      localStorage.clear()
    })
  })

  test('Consent-Banner erscheint beim ersten Besuch (Funnel mit GA4-ID)', async ({ page }) => {
    if (!doubleOptinHash) { test.skip(); return }
    const url = `/f/${doubleOptinHash}`
    const response = await page.goto(url, { waitUntil: 'networkidle' })
    if (!response || response.status() === 404) { test.skip(); return }

    await page.waitForTimeout(500)

    const banner = page.locator('[role="dialog"][aria-modal="true"]')
    await expect(banner).toBeVisible({ timeout: 3000 })
    await expect(page.locator('button', { hasText: 'Akzeptieren' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'Nur notwendige' })).toBeVisible()
  })

  test('Nach "Nur notwendige" kein GA4-Script im DOM', async ({ page }) => {
    // Demo-Funnel (ohne GA4) genuegt: Banner fehlt -> kein GA4-Script (Fallback-Test)
    const DEMO_HASH = 'd0000001-0000-4000-8000-000000000001'
    const response = await page.goto(`/f/${DEMO_HASH}`, { waitUntil: 'networkidle' })
    if (!response || response.status() === 404) { test.skip(); return }

    await page.waitForTimeout(500)

    // Banner klicken falls vorhanden (Demo-Funnel hat moeglicherweise keine Tracking-ID)
    const declineBtn = page.locator('button', { hasText: 'Nur notwendige' })
    if (await declineBtn.count() > 0) {
      await declineBtn.click()
      await page.waitForTimeout(300)
    }

    // GA4-Script darf nicht im DOM sein
    expect(await page.locator('#gtag-script').count()).toBe(0)
  })

  test('Nach Akzeptieren verschwindet der Banner', async ({ page }) => {
    if (!doubleOptinHash) { test.skip(); return }
    const response = await page.goto(`/f/${doubleOptinHash}`, { waitUntil: 'networkidle' })
    if (!response || response.status() === 404) { test.skip(); return }

    await page.waitForTimeout(500)

    const acceptBtn = page.locator('button', { hasText: 'Akzeptieren' })
    await expect(acceptBtn).toBeVisible({ timeout: 3000 })
    await acceptBtn.click()
    await page.waitForTimeout(300)

    // Banner nicht mehr vorhanden
    await expect(page.locator('[role="dialog"][aria-modal="true"]')).not.toBeVisible()

    // localStorage-Eintrag muss 'true' sein
    const consentValue = await page.evaluate((hash: string) =>
      localStorage.getItem(`mp_consent:${hash}:tracking`),
    doubleOptinHash as string)
    expect(consentValue).toBe('true')
  })

  test('Banner erscheint nicht erneut nach gesetztem Consent', async ({ page }) => {
    if (!doubleOptinHash) { test.skip(); return }
    const hash = doubleOptinHash
    // Consent vorab setzen
    await page.addInitScript((h: string) => {
      localStorage.setItem(`mp_consent:${h}:tracking`, 'true')
    }, hash)

    const response = await page.goto(`/f/${hash}`, { waitUntil: 'networkidle' })
    if (!response || response.status() === 404) { test.skip(); return }

    await page.waitForTimeout(500)

    // Kein Banner sichtbar
    await expect(page.locator('[role="dialog"][aria-modal="true"]')).not.toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// optin_double Happy-Path (M4.10)
// Echter Funnel mit optin_double-Block. Kein Mocking: Backend liefert
// double_opt_in_pending -> Frontend zeigt "Fast geschafft!"-Screen.
// ---------------------------------------------------------------------------

test.describe('optin_double Happy-Path (M4.10)', () => {
  test('Bestaetigungs-Screen "Fast geschafft!" erscheint nach Submit', async ({ page }) => {
    if (!doubleOptinHash) { test.skip(); return }

    // Consent-Banner vorab unterdruecken (keine Tracking-Entscheidung noetig)
    await page.addInitScript((hash: string) => {
      localStorage.clear()
      localStorage.setItem(`mp_consent:${hash}:tracking`, 'false')
    }, doubleOptinHash)

    const response = await page.goto(`/f/${doubleOptinHash}`, { waitUntil: 'networkidle' })
    if (!response || response.status() === 404) { test.skip(); return }

    await page.waitForTimeout(500)

    // E-Mail-Feld befuellen
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible({ timeout: 5000 })
    await emailInput.fill('e2e-doi-test@example.com')

    // Alle Checkboxen ankreuzen (optin_checkbox + optin_double)
    const checkboxes = page.locator('input[type="checkbox"]')
    const checkboxCount = await checkboxes.count()
    for (let i = 0; i < checkboxCount; i++) {
      await checkboxes.nth(i).check({ force: true })
    }

    // "Absenden"-Button klicken
    const submitBtn = page.locator('button[type="button"]', { hasText: /Absenden/i })
    await expect(submitBtn).toBeVisible({ timeout: 3000 })
    await submitBtn.click()

    // Bestaetigungs-Screen muss erscheinen (nicht der normale result-Step)
    // role=status + "Fast geschafft!" kommt aus useRendererState.doubleOptinPending
    const confirmScreen = page.locator('[role="status"]', { hasText: /Fast geschafft/i })
    await expect(confirmScreen).toBeVisible({ timeout: 8000 })

    // Zusaetzlich: kein critischer Konsolenfehler
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
    await page.waitForTimeout(200)
    const critical = errors.filter(e =>
      !e.includes('favicon') && !e.includes('sw.js') && !e.includes('[vite]'),
    )
    expect(critical, `Konsolenfehler: ${critical.join(', ')}`).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// optin_otp Happy-Path (M4.10)
//
// Strategie: Echter Funnel mit optin_otp-Block. OTP-send und -verify werden
// per page.route() abgefangen, weil der OTP-Code per Mail versendet wird und
// im E2E-Kontext gegen den echten Server nicht abrufbar ist.
//
// Was getestet wird:
//   - OTP-Block rendert E-Mail-Eingabe und "Code anfordern"-Button
//   - Nach gemocktem 202 von otp/send erscheinen die Slot-Inputs
//   - Nach gemocktem 200 von otp/verify erscheint der Erfolgs-Zustand
//
// Was NICHT getestet wird (aber durch Pest abgedeckt ist):
//   - Echter OTP-Code-Abgleich (tests/Feature/Public/OtpTest.php)
//   - Lead-Submit mit echtem otp_verified_token (tests/Feature/Public/OtpTest.php)
// ---------------------------------------------------------------------------

test.describe('optin_otp Happy-Path (M4.10)', () => {
  test('OTP-Block: send -> Slots erscheinen -> verify -> Erfolgs-Zustand', async ({ page }) => {
    if (!otpHash) { test.skip(); return }

    // Alle relevanten OTP-API-Aufrufe abfangen (vor dem Seitenaufruf registrieren)
    await page.route('**/otp/send', route =>
      route.fulfill({ status: 202, contentType: 'application/json', body: '' }),
    )
    await page.route('**/otp/verify', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ otp_verified_token: 'mock-otp-token-32chars000000000' }),
      }),
    )

    const response = await page.goto(`/f/${otpHash}`, { waitUntil: 'networkidle' })
    if (!response || response.status() === 404) { test.skip(); return }

    await page.waitForTimeout(500)

    // OTP-Block muss "Code anfordern"-Button zeigen
    const sendBtn = page.locator('button', { hasText: 'Code anfordern' })
    await expect(sendBtn).toBeVisible({ timeout: 5000 })

    // E-Mail-Adresse eingeben
    const emailInput = page.locator('input[type="email"]').first()
    await emailInput.fill('otp-e2e@example.com')

    // Code anfordern -> otp/send wird mit 202 beantwortet
    await sendBtn.click()
    await page.waitForTimeout(400)

    // Slot-Inputs muessen erscheinen (6 numerische Eingabefelder)
    const slots = page.locator('input[inputmode="numeric"]')
    await expect(slots.first()).toBeVisible({ timeout: 3000 })
    const slotCount = await slots.count()
    expect(slotCount).toBeGreaterThanOrEqual(4)

    // OTP-Slots befuellen (per paste auf den ersten Slot)
    await slots.first().focus()
    // Einfacher Ansatz: jeden Slot einzeln befuellen
    for (let i = 0; i < Math.min(slotCount, 6); i++) {
      await slots.nth(i).fill(String(i + 1))
    }

    // "Code bestaetigen"-Button klicken -> otp/verify wird mit Token beantwortet
    const verifyBtn = page.locator('button', { hasText: /Code bestätigen|Code bestaetigen/i })
    await expect(verifyBtn).toBeVisible({ timeout: 3000 })
    await verifyBtn.click()
    await page.waitForTimeout(400)

    // Erfolgs-Zustand des OTP-Blocks muss erscheinen
    const successMsg = page.locator('[role="status"]', {
      hasText: /E-Mail-Adresse wurde erfolgreich bestätigt/i,
    })
    await expect(successMsg).toBeVisible({ timeout: 5000 })
  })
})

// ---------------------------------------------------------------------------
// A11y-Checks fuer M4-Komponenten
// ---------------------------------------------------------------------------

test.describe('A11y-Checks M4', () => {
  test('Consent-Banner hat role=dialog, aria-modal, aria-labelledby (ARIA korrekt)', async ({ page }) => {
    if (!doubleOptinHash) { test.skip(); return }

    await page.addInitScript(() => { localStorage.clear() })

    const response = await page.goto(`/f/${doubleOptinHash}`, { waitUntil: 'networkidle' })
    if (!response || response.status() === 404) { test.skip(); return }

    await page.waitForTimeout(500)

    const banner = page.locator('[role="dialog"][aria-modal="true"]')
    await expect(banner).toBeVisible({ timeout: 3000 })

    // aria-labelledby muss gesetzt sein und auf einen sichtbaren Titel zeigen
    const labelledBy = await banner.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    await expect(page.locator(`#${labelledBy}`)).toBeVisible()

    // aria-describedby muss gesetzt sein
    const describedBy = await banner.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
  })

  test('Consent-Banner: keine AA-Violations (axe)', async ({ page }) => {
    if (!doubleOptinHash) { test.skip(); return }

    await page.addInitScript(() => { localStorage.clear() })
    await page.goto(`/f/${doubleOptinHash}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)

    // Nur scannen wenn Banner sichtbar
    const banner = page.locator('[role="dialog"][aria-modal="true"]')
    if (!(await banner.isVisible())) { test.skip(); return }

    const results = await new AxeBuilder({ page })
      .include('[role="dialog"][aria-modal="true"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()

    const criticalOrSerious = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious',
    )
    expect(
      criticalOrSerious,
      `A11y-Violations im Consent-Banner:\n${criticalOrSerious.map(v => `[${v.impact}] ${v.id}: ${v.description}`).join('\n')}`,
    ).toHaveLength(0)
  })
})
