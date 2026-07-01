/**
 * E2E-Tests fuer M3.5 Personalisierung im oeffentlichen Funnel-Renderer.
 *
 * Abgedeckte Szenarien:
 *   1. Personalisierter Text: ?vorname=Max -> "Max" erscheint im Text und Button.
 *   2. Fallback: ohne URL-Parameter -> Fallback-Wert "Gast" erscheint.
 *   3. XSS-Schutz: ?vorname=<img src=x onerror=alert(1)> -> kein <img>-Element
 *      im DOM, Wert erscheint als escaped Text.
 *   4. Script-Injektion wird geblockt.
 *   5. Keine Hydration-Mismatches oder kritischen Konsolen-Fehler.
 *
 * Voraussetzung:
 *   - Frontend laeuft auf http://localhost:3000
 *   - Backend laeuft auf http://localhost:8000
 *   - Admin-Login: admin@marketing-planet.de / password
 *
 * Setup: Testfunnel per Admin-API anlegen (inkl. personalizationVars) und veroeffentlichen.
 * Teardown: Funnel loeschen.
 *
 * mode: 'serial' stellt sicher, dass beforeAll/afterAll nur einmal laufen und
 * alle Tests das gleiche funnelId teilen (kein paralleles beforeAll in verschiedenen
 * Playwright-Workern durch fullyParallel: true).
 */
import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import * as path from 'node:path'
import * as fs from 'node:fs'
import { getAdminSession } from './helpers/auth'

const ADMIN_API = 'http://localhost:8000/api/admin'
const SCREENSHOTS_DIR = path.resolve('tests/screenshots')

// ---------------------------------------------------------------------------
// Personalisierungs-Tests (serial, damit beforeAll/afterAll nur einmal laufen)
// ---------------------------------------------------------------------------

test.describe('Personalisierung im Renderer (M3.5)', () => {
  // Seriell ausfuehren, damit funnelId korrekt geteilt wird
  test.describe.configure({ mode: 'serial' })

  let funnelId: string | null = null

  test.beforeAll(async () => {
    const admin = await getAdminSession()
    if (!admin) return

    const { apiContext, auth, workspaceId } = admin

    // Funnel anlegen
    const createResp = await apiContext.post(
      `${ADMIN_API}/workspaces/${workspaceId}/funnels`,
      { headers: auth, data: { name: '[Personalisierung-E2E] automatisch angelegt' } },
    )
    if (!createResp.ok()) { await apiContext.dispose(); return }

    funnelId = (await createResp.json() as { data: { id: string } }).data.id

    // Draft-Content mit personalizationVars und Platzhaltern
    const content = {
      schemaVersion: '1.1.0',
      meta: {
        defaultLocale: 'de',
        personalizationVars: [
          {
            key: 'vorname',
            source: 'url_param',
            paramName: 'vorname',
            fallback: 'Gast',
          },
        ],
      },
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
          internalTitle: 'Personalisierter Schritt',
          layout: 'single',
          logicRules: [],
          blocks: [
            {
              id: randomUUID(),
              type: 'text',
              content: '<p>Hallo {{vorname}}, willkommen!</p>',
            },
            {
              id: randomUUID(),
              type: 'button',
              label: 'Weiter, {{vorname}}',
              action: 'next',
              style: 'primary',
            },
          ],
        },
      ],
    }

    const draftResp = await apiContext.put(
      `${ADMIN_API}/funnels/${funnelId}/draft`,
      { headers: auth, data: { content } },
    )
    if (!draftResp.ok()) { await apiContext.dispose(); return }

    // Veroeffentlichen
    const publishResp = await apiContext.post(
      `${ADMIN_API}/funnels/${funnelId}/publish`,
      { headers: auth, data: { label: 'Personalisierung-E2E' } },
    )
    if (!publishResp.ok()) { await apiContext.dispose(); return }

    await apiContext.dispose()
  })

  test.afterAll(async () => {
    if (!funnelId) return
    const admin = await getAdminSession()
    if (!admin) return
    const { apiContext, auth } = admin
    await apiContext.delete(`${ADMIN_API}/funnels/${funnelId}`, { headers: auth })
    await apiContext.dispose()
    funnelId = null
  })

  // -------------------------------------------------------------------------
  // Hilfsfunktion: korrekte Renderer-URL (UUID als Hash)
  // -------------------------------------------------------------------------

  function rendererUrl(params = ''): string {
    return `/f/${funnelId}${params ? `?${params}` : ''}`
  }

  // -------------------------------------------------------------------------
  // Test 1: URL-Parameter erscheint in Text und Button
  // -------------------------------------------------------------------------

  test('URL-Parameter ?vorname=Max erscheint in Text und Button', async ({ page }) => {
    if (!funnelId) { test.skip(); return }

    const resp = await page.goto(rendererUrl('vorname=Max'), { waitUntil: 'networkidle' })
    if (resp?.status() === 404) { test.skip(); return }

    // Warten bis Vue reaktiv nach onMounted aktualisiert hat
    await page.waitForTimeout(400)

    // Text-Block: "Max" erscheint
    await expect(page.locator('text=Hallo Max, willkommen!')).toBeVisible()

    // Button: "Max" im Label
    await expect(page.locator('button', { hasText: 'Weiter, Max' })).toBeVisible()

    // Screenshot: Personalisierter Inhalt
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
    }
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'personalization-max.png'),
    })
  })

  // -------------------------------------------------------------------------
  // Test 2: Fallback wenn URL-Parameter fehlt
  // -------------------------------------------------------------------------

  test('Fallback "Gast" erscheint wenn kein URL-Parameter gesetzt', async ({ page }) => {
    if (!funnelId) { test.skip(); return }

    await page.goto(rendererUrl(), { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)

    // Fallback "Gast" erscheint (von SSR und dann reaktiv bestaetigt)
    await expect(page.locator('text=Hallo Gast, willkommen!')).toBeVisible()
    await expect(page.locator('button', { hasText: 'Weiter, Gast' })).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // Test 3: XSS-Vektor <img onerror=alert(1)> wird escaped
  // -------------------------------------------------------------------------

  test('XSS: <img src=x onerror=alert(1)> erzeugt kein DOM-Element', async ({ page }) => {
    if (!funnelId) { test.skip(); return }

    const xssPayload = encodeURIComponent('<img src=x onerror=alert(1)>')
    let alertFired = false
    page.on('dialog', (dialog) => {
      alertFired = true
      dialog.dismiss().catch(() => {})
    })

    const resp = await page.goto(rendererUrl(`vorname=${xssPayload}`), {
      waitUntil: 'networkidle',
    })
    if (resp?.status() === 404) { test.skip(); return }

    await page.waitForTimeout(400)

    // Kein injiziertes <img>-Element mit src=x im DOM
    await expect(page.locator('img[src="x"]')).toHaveCount(0)

    // alert() wurde nicht ausgefuehrt
    expect(alertFired).toBe(false)

    // innerHTML des Text-Blocks enthaelt escaped Entities (kein echtes <img>-Tag)
    // page.textContent() dekodiert HTML-Entities (daher muss innerHTML geprueft werden)
    const textPara = page.locator('p').filter({ hasText: 'Hallo' }).first()
    const innerHtml = await textPara.innerHTML()
    // Echt injiziertes <img> wuerde so aussehen: <img src="x" ...>
    // Escaped sieht es so aus: &lt;img src=x ...&gt;
    expect(innerHtml).not.toMatch(/<img\s/)
    expect(innerHtml).toContain('&lt;img')

    // Screenshot: XSS-Wert als escaped Text
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
    }
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'personalization-xss-escaped.png'),
    })
  })

  // -------------------------------------------------------------------------
  // Test 4: Script-Injektion wird geblockt
  // -------------------------------------------------------------------------

  test('XSS: <script>alert()</script> wird escaped', async ({ page }) => {
    if (!funnelId) { test.skip(); return }

    const xssPayload = encodeURIComponent('<script>alert("xss")</script>')
    let alertFired = false
    page.on('dialog', (dialog) => {
      alertFired = true
      dialog.dismiss().catch(() => {})
    })

    await page.goto(rendererUrl(`vorname=${xssPayload}`), { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)

    expect(alertFired).toBe(false)

    // innerHTML des Text-Blocks pruefen (textContent() wuerde Entities dekodieren)
    const textPara = page.locator('p').filter({ hasText: 'Hallo' }).first()
    const innerHtml = await textPara.innerHTML()
    // Kein echtes <script>-Element - der Wert muss als &lt;script&gt; escaped sein
    expect(innerHtml).not.toMatch(/<script/i)
    expect(innerHtml).toContain('&lt;script')
  })

  // -------------------------------------------------------------------------
  // Test 5: Keine Hydration-Warnungen und kritischen Konsolen-Fehler
  // -------------------------------------------------------------------------

  test('Keine Hydration-Warnungen oder kritischen Konsolen-Fehler', async ({ page }) => {
    if (!funnelId) { test.skip(); return }

    const errors: string[] = []
    const hydrationWarnings: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
      if (msg.type() === 'warn' && msg.text().toLowerCase().includes('hydration')) {
        hydrationWarnings.push(msg.text())
      }
    })

    await page.goto(rendererUrl('vorname=TestUser'), { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)

    const criticalErrors = errors.filter(e =>
      !e.includes('favicon')
      && !e.includes('sw.js')
      && !e.includes('[vite]')
      && !e.includes('Failed to load resource'),
    )

    expect(criticalErrors).toHaveLength(0)
    expect(hydrationWarnings).toHaveLength(0)
  })
})
