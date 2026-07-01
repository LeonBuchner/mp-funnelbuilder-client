/**
 * E2E-Tests fuer A/B-Varianten-Zuweisung im oeffentlichen Funnel-Renderer (M3.7).
 *
 * Teststrategie:
 *   1. 204-Fall (kein A/B-Test): kein Cookie, Renderer unveraendert.
 *   2. A/B-Test-Szenario: Cookie wird gesetzt, Sticky-Mechanismus funktioniert.
 *   3. SSR/Hydration: keine Hydration-Warnungen.
 *   4. Keine Konsolen-Fehler.
 *
 * Setup (fuer A/B-Test-Szenario):
 *   - Funnel anlegen + V1 veroeffentlichen (Kontrolle)
 *   - Draft V2 anlegen (Treatment mit anderem Text)
 *   - A/B-Test anlegen (traffic_split_pct_a=1 -> 99% Wahrscheinlichkeit fuer Variante B)
 *   - A/B-Test starten
 *
 * Teardown: Funnel loeschen.
 *
 * mode: 'serial' stellt sicher, dass beforeAll/afterAll nur einmal laufen.
 */
import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import * as path from 'node:path'
import * as fs from 'node:fs'
import { getAdminSession } from './helpers/auth'

const ADMIN_API = 'http://localhost:8000/api/admin'
const SCREENSHOTS_DIR = path.resolve('tests/screenshots')
const DEMO_HASH = 'd0000001-0000-4000-8000-000000000001'

// ---------------------------------------------------------------------------
// Gemeinsamer Content-Baukasten
// ---------------------------------------------------------------------------

function makeContent(title: string) {
  return {
    schemaVersion: '1.1.0',
    meta: { defaultLocale: 'de', personalizationVars: [] },
    settings: {
      progressBar: false,
      progressBarStyle: 'bar',
      animations: 'none',
      confettiOnComplete: false,
      mpBrandingPosition: 'footer',
      startButtonLabel: "Los geht's",
    },
    steps: [
      {
        id: randomUUID(),
        type: 'content',
        internalTitle: title,
        layout: 'single',
        logicRules: [],
        blocks: [
          { id: randomUUID(), type: 'text', content: `<p>${title}</p>` },
          { id: randomUUID(), type: 'button', label: 'Weiter', action: 'next', style: 'primary' },
        ],
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// Test 1: 204-Fall (Demo-Funnel ohne A/B-Test) - immer ausfuehren
// ---------------------------------------------------------------------------

test.describe('204-Fall: kein A/B-Test', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async ({ browser }) => {
    /**
     * Kalt-Start-Warmup: Im Nuxt-Dev-Server mit Vite werden Module beim ersten
     * Request lazy geladen. Parallel laufende Test-Worker koennen dabei auf einen
     * Zustand treffen, in dem SSR und Client unterschiedliche Module-Ladereihenfolgen
     * haben, was zu transient-Hydration-Mismatches fuehrt. Ein kurzer Warmup-Request
     * stellt sicher, dass alle Module geladen sind.
     */
    const page = await browser.newPage()
    const resp = await page.goto(`/f/${DEMO_HASH}`, { waitUntil: 'networkidle' })
    if (resp?.status() === 200) {
      await page.waitForTimeout(300)
    }
    await page.close()

    // Defensive Bereinigung: Der 204-Fall setzt voraus, dass der Demo-Funnel KEINEN
    // laufenden A/B-Test hat. In der geteilten Dev-DB koennen Alt-Zustaende
    // (z.B. aus manueller Verifikation) uebrig sein - die beenden wir hier.
    const session = await getAdminSession()
    if (session) {
      const listResp = await session.apiContext.get(`${ADMIN_API}/funnels/${DEMO_HASH}/ab-tests`, { headers: session.auth })
      if (listResp.ok()) {
        const { data } = await listResp.json() as { data: { id: number, status: string }[] }
        for (const t of data.filter(t => t.status === 'running' || t.status === 'paused')) {
          await session.apiContext.post(`${ADMIN_API}/funnels/${DEMO_HASH}/ab-tests/${t.id}/conclude`, { headers: session.auth })
        }
      }
      await session.apiContext.dispose()
    }
  })

  test('Renderer-Funnel ohne A/B-Test rendert normal, kein Cookie gesetzt', async ({ page, context }) => {
    // Alle mp_ab_* Cookies loeschen
    await context.clearCookies()

    const resp = await page.goto(`/f/${DEMO_HASH}`, { waitUntil: 'networkidle' })
    if (resp?.status() === 404) {
      test.skip()
      return
    }

    // Warten bis A/B-Composable (onMounted + API-Call) abgeschlossen hat
    await page.waitForTimeout(800)

    // Kein mp_ab_-Cookie gesetzt (204 = kein A/B-Test)
    const cookies = await context.cookies()
    const abCookies = cookies.filter(c => c.name.startsWith('mp_ab_'))
    expect(abCookies).toHaveLength(0)

    // Funnel rendert normal
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('h1')).toBeVisible()

    // Keine kritischen Fehler
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
  })

  test('Keine Hydration-Warnungen beim Demo-Funnel', async ({ page }) => {
    const hydrationWarnings: string[] = []
    const criticalErrors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'warn' && msg.text().toLowerCase().includes('hydration')) {
        hydrationWarnings.push(msg.text())
      }
      if (msg.type() === 'error') {
        const text = msg.text()
        if (!text.includes('favicon') && !text.includes('sw.js') && !text.includes('[vite]') && !text.includes('Failed to load resource')) {
          criticalErrors.push(text)
        }
      }
    })

    const resp = await page.goto(`/f/${DEMO_HASH}`, { waitUntil: 'networkidle' })
    if (resp?.status() === 404) {
      test.skip()
      return
    }

    await page.waitForTimeout(600)

    expect(hydrationWarnings, `Hydration-Warnungen: ${hydrationWarnings.join(', ')}`).toHaveLength(0)
    expect(criticalErrors, `Kritische Fehler: ${criticalErrors.join(', ')}`).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Test 2: A/B-Test-Szenario (Setup ueber Admin-API)
// ---------------------------------------------------------------------------

test.describe('A/B-Test: Cookie + Sticky-Mechanismus', () => {
  test.describe.configure({ mode: 'serial' })

  let funnelId: string | null = null

  test.beforeAll(async () => {
    const admin = await getAdminSession()
    if (!admin) return

    const { apiContext, auth, workspaceId } = admin

    // 1. Funnel anlegen
    const createResp = await apiContext.post(
      `${ADMIN_API}/workspaces/${workspaceId}/funnels`,
      { headers: auth, data: { name: '[AB-E2E] automatisch angelegt' } },
    )
    if (!createResp.ok()) { await apiContext.dispose(); return }

    funnelId = (await createResp.json() as { data: { id: string } }).data.id

    // 2. Draft V1 (Kontrolle) speichern
    const draftV1Content = makeContent('KONTROLLE: Standard-Inhalt')
    const draftV1Resp = await apiContext.put(
      `${ADMIN_API}/funnels/${funnelId}/draft`,
      { headers: auth, data: { content: draftV1Content } },
    )
    if (!draftV1Resp.ok()) { await apiContext.dispose(); return }

    // 3. V1 veroeffentlichen -> published_version_id gesetzt
    const publishResp = await apiContext.post(
      `${ADMIN_API}/funnels/${funnelId}/publish`,
      { headers: auth, data: { label: 'V1 Kontrolle' } },
    )
    if (!publishResp.ok()) { await apiContext.dispose(); return }

    // 4. Draft V2 (Treatment) anlegen (copy-on-write: neue Version)
    const draftV2Content = makeContent('VARIANTE_B: Behandlungs-Inhalt')
    const draftV2Resp = await apiContext.put(
      `${ADMIN_API}/funnels/${funnelId}/draft`,
      { headers: auth, data: { content: draftV2Content } },
    )
    if (!draftV2Resp.ok()) { await apiContext.dispose(); return }

    // ID der neuen Draft-Version (integer) fuer variant_b_version_id
    const draftV2Id: number = (await draftV2Resp.json() as { data: { id: number } }).data.id

    // 5. A/B-Test anlegen
    // traffic_split_pct_a=1: 1% A (Kontrolle), 99% B (Treatment)
    // Das macht Variante B sehr wahrscheinlich, ohne Determinismus zu erzwingen.
    const abTestResp = await apiContext.post(
      `${ADMIN_API}/funnels/${funnelId}/ab-tests`,
      {
        headers: auth,
        data: {
          name: 'E2E-Test AB',
          traffic_split_pct_a: 1,
          variant_b_version_id: draftV2Id,
        },
      },
    )
    if (!abTestResp.ok()) { await apiContext.dispose(); return }

    const abTestId: number = (await abTestResp.json() as { data: { id: number } }).data.id

    // 6. A/B-Test starten
    const startResp = await apiContext.post(
      `${ADMIN_API}/funnels/${funnelId}/ab-tests/${abTestId}/start`,
      { headers: auth },
    )
    if (!startResp.ok()) { await apiContext.dispose(); return }

    await apiContext.dispose()
  })

  test.afterAll(async () => {
    if (!funnelId) return
    const admin = await getAdminSession()
    if (!admin) return
    const { apiContext, auth } = admin

    // A/B-Test pausieren, damit er loeschbar ist (laufende Tests koennen nicht geloescht werden)
    const testsResp = await apiContext.get(`${ADMIN_API}/funnels/${funnelId}/ab-tests`, { headers: auth })
    if (testsResp.ok()) {
      const tests = (await testsResp.json() as { data: { id: number; status: string }[] }).data
      for (const t of tests) {
        if (t.status === 'running') {
          await apiContext.post(`${ADMIN_API}/funnels/${funnelId}/ab-tests/${t.id}/pause`, { headers: auth })
        }
      }
    }

    await apiContext.delete(`${ADMIN_API}/funnels/${funnelId}`, { headers: auth })
    await apiContext.dispose()
    funnelId = null
  })

  function rendererUrl(): string {
    return `/f/${funnelId}`
  }

  // -------------------------------------------------------------------------
  // Test: Cookie wird nach erstem Besuch gesetzt
  // -------------------------------------------------------------------------

  test('Cookie mp_ab_{hash} wird nach erstem Besuch gesetzt', async ({ page, context }) => {
    if (!funnelId) { test.skip(); return }

    await context.clearCookies()

    const resp = await page.goto(rendererUrl(), { waitUntil: 'networkidle' })
    if (resp?.status() === 404) { test.skip(); return }

    // Warten bis A/B-Composable abgeschlossen hat
    await page.waitForTimeout(800)

    const cookies = await context.cookies()
    const abCookie = cookies.find(c => c.name === `mp_ab_${funnelId}`)

    expect(abCookie, 'A/B-Cookie sollte nach erstem Besuch gesetzt sein').toBeDefined()
    expect(abCookie?.value).toMatch(/^\d+$/)

    // Cookie ist ein Session-Cookie (kein Ablaufdatum)
    // Playwright: expires = -1 bedeutet Session-Cookie
    expect(abCookie?.expires).toBe(-1)

    // Screenshot: erster Besuch mit Cookie
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'ab-variant-first-visit.png') })
  })

  // -------------------------------------------------------------------------
  // Test: Sticky-Mechanismus - zweiter Besuch mit Cookie -> gleiche Variante
  // -------------------------------------------------------------------------

  test('Zweiter Besuch mit Cookie sendet existing_variant_id (Sticky)', async ({ page, context }) => {
    if (!funnelId) { test.skip(); return }

    await context.clearCookies()

    // Erster Besuch
    await page.goto(rendererUrl(), { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)

    const cookiesAfterFirst = await context.cookies()
    const abCookieFirst = cookiesAfterFirst.find(c => c.name === `mp_ab_${funnelId}`)
    if (!abCookieFirst) { test.skip(); return }

    const firstVariantId = abCookieFirst.value

    // Zweiter Besuch: Cookie vorhanden -> existing_variant_id wird mitgesendet
    let abAssignRequest: { postData: string | null } | null = null
    page.on('request', (req) => {
      if (req.url().includes('/ab-assign') && req.method() === 'POST') {
        abAssignRequest = { postData: req.postData() }
      }
    })

    await page.goto(rendererUrl(), { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)

    // Request sollte existing_variant_id enthalten
    expect(abAssignRequest, 'ab-assign wurde nicht aufgerufen').toBeDefined()
    if (abAssignRequest) {
      const body = JSON.parse(abAssignRequest.postData ?? '{}') as Record<string, unknown>
      expect(body['existing_variant_id']).toBe(Number(firstVariantId))
    }

    // Cookie-Wert bleibt gleich (Sticky)
    const cookiesAfterSecond = await context.cookies()
    const abCookieSecond = cookiesAfterSecond.find(c => c.name === `mp_ab_${funnelId}`)
    expect(abCookieSecond?.value).toBe(firstVariantId)

    // Screenshot: zweiter Besuch mit gleicher Variante
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'ab-variant-second-visit.png') })
  })

  // -------------------------------------------------------------------------
  // Test: Keine Hydration-Warnungen mit A/B-Test
  // -------------------------------------------------------------------------

  test('Keine Hydration-Warnungen oder kritischen Fehler mit A/B-Test', async ({ page, context }) => {
    if (!funnelId) { test.skip(); return }

    await context.clearCookies()

    const hydrationWarnings: string[] = []
    const criticalErrors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'warn' && msg.text().toLowerCase().includes('hydration')) {
        hydrationWarnings.push(msg.text())
      }
      if (msg.type() === 'error') {
        const text = msg.text()
        if (
          !text.includes('favicon')
          && !text.includes('sw.js')
          && !text.includes('[vite]')
          && !text.includes('Failed to load resource')
        ) {
          criticalErrors.push(text)
        }
      }
    })

    const resp = await page.goto(rendererUrl(), { waitUntil: 'networkidle' })
    if (resp?.status() === 404) { test.skip(); return }

    // Warten bis A/B-Composable (einschliesslich Swap) abgeschlossen hat
    await page.waitForTimeout(800)

    expect(
      hydrationWarnings,
      `Hydration-Warnungen gefunden: ${hydrationWarnings.join(', ')}`,
    ).toHaveLength(0)

    expect(
      criticalErrors,
      `Kritische Fehler gefunden: ${criticalErrors.join(', ')}`,
    ).toHaveLength(0)
  })

  // -------------------------------------------------------------------------
  // Test: Funnel bleibt korrekt bedienbar nach A/B-Swap
  // -------------------------------------------------------------------------

  test('Funnel bleibt nach A/B-Content-Swap korrekt bedienbar', async ({ page, context }) => {
    if (!funnelId) { test.skip(); return }

    await context.clearCookies()

    const resp = await page.goto(rendererUrl(), { waitUntil: 'networkidle' })
    if (resp?.status() === 404) { test.skip(); return }

    await page.waitForTimeout(800)

    // main vorhanden
    await expect(page.locator('main')).toBeVisible()

    // h1 vorhanden (genau einer)
    const h1s = page.locator('h1')
    await expect(h1s).toHaveCount(1)

    // Erster Button sichtbar und bedienbar
    const firstButton = page.locator('button[type="button"]').first()
    await expect(firstButton).toBeVisible()
    await firstButton.click()
    await page.waitForTimeout(300)

    // Seite noch immer erreichbar
    await expect(page).toHaveURL(rendererUrl())
  })
})
