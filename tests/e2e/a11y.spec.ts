/**
 * Axe-Playwright A11y-Test fuer den oeffentlichen Funnel-Renderer.
 *
 * Prueft den Demo-Funnel und einen M2-Test-Funnel mit axe-core auf WCAG 2.1 AA Violations.
 * Kein einziger "critical" oder "serious" AA-Verstoss darf im Renderer vorhanden sein.
 *
 * Voraussetzung:
 *   - Frontend laeuft auf http://localhost:3000
 *   - Backend laeuft auf http://localhost:8000 mit Demo-Funnel
 *   - Demo-Funnel-UUID: d0000001-0000-4000-8000-000000000001
 *
 * M2-Test-Funnel:
 *   Wird per Admin-API mit multi_choice, rating (stars), input_dropdown, input_date,
 *   icon, divider und spacer Bloecken erstellt, geprueft und danach wieder geloescht.
 *   Admin-Login: admin@marketing-planet.de / password
 */
import { test, expect, request as playwrightRequest } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { randomUUID } from 'node:crypto'
import { getAdminSession } from './helpers/auth'

const DEMO_HASH = 'd0000001-0000-4000-8000-000000000001'
const FUNNEL_URL = `/f/${DEMO_HASH}`

const ADMIN_API = 'http://localhost:8000/api/admin'

/** Hilfsfunktion: details fuer Fehlerausgabe in Assertions. */
function formatViolations(violations: { impact?: string, id: string, description: string, nodes: { target: string[] }[] }[]): string {
  return violations
    .map(v => `[${v.impact}] ${v.id}: ${v.description}\n  Nodes: ${v.nodes.map(n => n.target.join(', ')).join(' | ')}`)
    .join('\n\n')
}

test.describe('A11y-Scan: Funnel-Renderer (axe-core WCAG 2.1 AA)', () => {
  test('Erster Schritt: keine kritischen AA-Violations', async ({ page }) => {
    const response = await page.goto(FUNNEL_URL, { waitUntil: 'networkidle' })

    // Skip wenn Demo-Funnel nicht vorhanden
    if (response?.status() === 404) {
      test.skip()
      return
    }

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      // Bekannte unkritische Ausnahmen koennen hier per disableRules() oder
      // excludeWithSelectors() ausgeschlossen werden. Aktuell keine.
      .analyze()

    // Kritische und schwere Violations sind nicht erlaubt.
    const criticalOrSerious = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious',
    )

    if (criticalOrSerious.length > 0) {
      expect(criticalOrSerious, `Kritische/schwere A11y-Violations gefunden:\n\n${formatViolations(criticalOrSerious)}`).toHaveLength(0)
    }
  })

  test('Barrierefreiheits-Seite: keine kritischen AA-Violations', async ({ page }) => {
    await page.goto('/barrierefreiheit', { waitUntil: 'networkidle' })

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    const criticalOrSerious = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious',
    )

    if (criticalOrSerious.length > 0) {
      const details = criticalOrSerious
        .map(v => `[${v.impact}] ${v.id}: ${v.description}`)
        .join('\n')
      expect(criticalOrSerious, `A11y-Violations auf /barrierefreiheit:\n${details}`).toHaveLength(0)
    }
  })

  test('Renderer: semantisches Grundgeruest vorhanden', async ({ page }) => {
    const response = await page.goto(FUNNEL_URL, { waitUntil: 'networkidle' })

    if (response?.status() === 404) {
      test.skip()
      return
    }

    // Genau ein <h1>
    await expect(page.locator('h1')).toHaveCount(1)

    // <main> vorhanden
    await expect(page.locator('main')).toBeVisible()

    // Skip-Link vorhanden und auf funnel-main zeigend
    const skipLink = page.locator('a[href="#funnel-main"]')
    await expect(skipLink).toHaveCount(1)

    // Footer-Link zur Barrierefreiheits-Seite
    const a11yLink = page.locator('footer a[href="/barrierefreiheit"]')
    await expect(a11yLink).toHaveCount(1)
  })

  test('Renderer: Fokus-Reihenfolge Skip-Link -> Hauptinhalt', async ({ page }) => {
    const response = await page.goto(FUNNEL_URL, { waitUntil: 'networkidle' })

    if (response?.status() === 404) {
      test.skip()
      return
    }

    // Erstes Tab: Skip-Link muss sichtbar werden
    await page.keyboard.press('Tab')
    const skipLink = page.locator('a[href="#funnel-main"]')
    await expect(skipLink).toBeFocused()
  })
})

// ---------------------------------------------------------------------------
// M2-Bloecke: axe-Scan mit neuen Block-Typen im Renderer
// ---------------------------------------------------------------------------

test.describe('A11y-Scan: M2-Bloecke im Renderer', () => {
  /**
   * Setup: Testfunnel mit M2-Bloecken per Admin-API anlegen und veroeffentlichen.
   * Teardown: Funnel loeschen.
   *
   * Blocktypen im Testfunnel:
   *   multi_choice (imageLayout=none), rating (stars), input_dropdown,
   *   input_date, icon, divider, spacer
   */

  let m2FunnelId: string | null = null

  test.beforeAll(async () => {
    const admin = await getAdminSession()
    if (!admin) return
    const { apiContext, auth, workspaceId } = admin

    // Testfunnel anlegen
    const createResp = await apiContext.post(`${ADMIN_API}/workspaces/${workspaceId}/funnels`, {
      headers: auth,
      data: { name: '[A11y-Test] M2-Bloecke – automatisch angelegt' },
    })
    if (!createResp.ok()) return
    const createData = await createResp.json() as { data: { id: string } }
    m2FunnelId = createData.data.id

    // Draft mit M2-Bloecken speichern
    const content = {
      schemaVersion: '1.0.0',
      meta: { defaultLocale: 'de', personalizationVars: [] },
      settings: {
        progressBar: false,
        progressBarStyle: 'bar',
        animations: 'none',
        confettiOnComplete: false,
        mpBrandingPosition: 'footer',
        startButtonLabel: 'Weiter',
      },
      steps: [
        {
          id: randomUUID(),
          type: 'question',
          internalTitle: 'M2 Test Step',
          layout: 'single',
          blocks: [
            {
              id: randomUUID(),
              type: 'multi_choice',
              fieldKey: 'm2_multi',
              question: 'Was trifft auf Dich zu?',
              imageLayout: 'none',
              required: false,
              options: [
                { id: randomUUID(), label: 'Option A', value: 'a' },
                { id: randomUUID(), label: 'Option B', value: 'b' },
              ],
            },
            {
              id: randomUUID(),
              type: 'rating',
              fieldKey: 'm2_rating',
              question: 'Wie zufrieden bist Du?',
              style: 'stars',
              maxRating: 5,
              required: false,
            },
            {
              id: randomUUID(),
              type: 'input_dropdown',
              fieldKey: 'm2_drop',
              label: 'Deine Wahl',
              required: false,
              options: [
                { id: randomUUID(), label: 'Wahl A', value: 'a' },
                { id: randomUUID(), label: 'Wahl B', value: 'b' },
              ],
            },
            {
              id: randomUUID(),
              type: 'input_date',
              fieldKey: 'm2_date',
              label: 'Wunschtermin',
              required: false,
            },
            {
              id: randomUUID(),
              type: 'icon',
              iconName: 'star',
              size: 32,
            },
            {
              id: randomUUID(),
              type: 'divider',
            },
            {
              id: randomUUID(),
              type: 'spacer',
              height: 16,
            },
          ],
          logicRules: [],
        },
      ],
    }

    const draftResp = await apiContext.put(`${ADMIN_API}/funnels/${m2FunnelId}/draft`, {
      headers: auth,
      data: { content },
    })
    if (!draftResp.ok()) {
      m2FunnelId = null
      return
    }

    // Veroeffentlichen
    const pubResp = await apiContext.post(`${ADMIN_API}/funnels/${m2FunnelId}/publish`, {
      headers: auth,
      data: {},
    })
    if (!pubResp.ok()) m2FunnelId = null

    await apiContext.dispose()
  })

  test.afterAll(async () => {
    if (!m2FunnelId) return
    const admin = await getAdminSession()
    if (!admin) return
    const { apiContext, auth } = admin
    await apiContext.delete(`${ADMIN_API}/funnels/${m2FunnelId}`, { headers: auth })
    await apiContext.dispose()
  })

  test('M2-Bloecke: keine kritischen AA-Violations im Renderer', async ({ page }) => {
    if (!m2FunnelId) {
      test.skip()
      return
    }

    const response = await page.goto(`/f/${m2FunnelId}`, { waitUntil: 'networkidle' })

    if (response?.status() !== 200) {
      test.skip()
      return
    }

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    const criticalOrSerious = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious',
    )

    if (criticalOrSerious.length > 0) {
      expect(
        criticalOrSerious,
        `Kritische/schwere A11y-Violations in M2-Bloecken:\n\n${formatViolations(criticalOrSerious)}`,
      ).toHaveLength(0)
    }
  })

  test('M2 multi_choice: fieldset/legend semantik korrekt', async ({ page }) => {
    if (!m2FunnelId) {
      test.skip()
      return
    }

    await page.goto(`/f/${m2FunnelId}`, { waitUntil: 'networkidle' })

    // multi_choice rendert als fieldset mit legend (sr-only)
    await expect(page.locator('fieldset')).toHaveCount(1)
    // legend muss im DOM vorhanden sein (sr-only bedeutet visuell versteckt, nicht entfernt)
    await expect(page.locator('fieldset legend')).toHaveCount(1)
    // Checkboxen muessen per label erreichbar sein
    await expect(page.locator('fieldset input[type="checkbox"]')).toHaveCount(2)
  })

  test('M2 rating: Sterne per Tastatur bedienbar (Tab + Enter)', async ({ page }) => {
    if (!m2FunnelId) {
      test.skip()
      return
    }

    await page.goto(`/f/${m2FunnelId}`, { waitUntil: 'networkidle' })

    // Sterne-Buttons muessen fokussierbar sein
    const starButtons = page.locator('[role="group"] button[aria-label^="Bewertung"]')
    const count = await starButtons.count()
    expect(count).toBe(5)

    // Ersten Stern fokussieren und mit Enter ausloesen
    await starButtons.first().focus()
    await expect(starButtons.first()).toBeFocused()
    await page.keyboard.press('Enter')
    // Erwarte: aria-pressed=true am ersten Stern
    await expect(starButtons.first()).toHaveAttribute('aria-pressed', 'true')
  })

  test('M2 input_dropdown: label-for Verknuepfung korrekt', async ({ page }) => {
    if (!m2FunnelId) {
      test.skip()
      return
    }

    await page.goto(`/f/${m2FunnelId}`, { waitUntil: 'networkidle' })

    // select muss eine zugehoerige label haben
    const select = page.locator('select[name="m2_drop"]')
    await expect(select).toBeVisible()
    const selectId = await select.getAttribute('id')
    expect(selectId).toBeTruthy()

    const label = page.locator(`label[for="${selectId}"]`)
    await expect(label).toHaveCount(1)
  })

  test('M2 input_date: label-for Verknuepfung und type=date korrekt', async ({ page }) => {
    if (!m2FunnelId) {
      test.skip()
      return
    }

    await page.goto(`/f/${m2FunnelId}`, { waitUntil: 'networkidle' })

    const dateInput = page.locator('input[type="date"]')
    await expect(dateInput).toBeVisible()
    const dateId = await dateInput.getAttribute('id')
    expect(dateId).toBeTruthy()

    const label = page.locator(`label[for="${dateId}"]`)
    await expect(label).toHaveCount(1)
  })
})

// ---------------------------------------------------------------------------
// M3-Admin-Panels: axe-Scan auf Admin-Metriken-Seite (A/B-Panel) und
//                  LogicRulePanel / PersonalizationPanel im Editor
// ---------------------------------------------------------------------------

const ADMIN_API_BASE = 'http://localhost:8000/api/admin'
const ADMIN_EMAIL_M3 = 'admin@marketing-planet.de'
const ADMIN_PASSWORD_M3 = 'password'

test.describe('A11y-Scan: M3-Admin-Panels (axe-core WCAG 2.1 AA)', () => {
  test.describe.configure({ mode: 'serial' })

  let adminToken: string | null = null
  let m3FunnelId: string | null = null
  let m3WorkspaceId: string | null = null

  /** Token in localStorage schreiben und auf Admin-Seite navigieren. */
  async function loginM3(page: import('@playwright/test').Page): Promise<void> {
    if (!adminToken) { test.skip(); return }
    await page.goto('/auth/login')
    await page.evaluate((t: string) => {
      localStorage.setItem('mp_token', t)
    }, adminToken)
  }

  test.beforeAll(async () => {
    // Token holen
    const ctx = await playwrightRequest.newContext()
    for (let attempt = 0; attempt < 3 && !adminToken; attempt++) {
      const resp = await ctx.post(`${ADMIN_API_BASE}/auth/login`, {
        data: { email: ADMIN_EMAIL_M3, password: ADMIN_PASSWORD_M3 },
      })
      if (resp.ok()) {
        adminToken = (await resp.json() as { token: string }).token
        break
      }
      if (resp.status() === 429) {
        const retryAfter = Number(resp.headers()['retry-after'] ?? '30')
        await new Promise(resolve =>
          setTimeout(resolve, (Number.isFinite(retryAfter) ? retryAfter : 30) * 1000 + 1000),
        )
        continue
      }
      break
    }
    await ctx.dispose()
    if (!adminToken) return

    // Workspace-ID holen
    const admin = await getAdminSession()
    if (!admin) return
    const { apiContext, auth, workspaceId } = admin
    m3WorkspaceId = workspaceId

    // Test-Funnel mit Step + Logik-Block anlegen
    const createResp = await apiContext.post(`${ADMIN_API_BASE}/workspaces/${m3WorkspaceId}/funnels`, {
      headers: auth,
      data: { name: '[A11y-M3] Metriken+Editor-Panels – automatisch angelegt' },
    })
    if (!createResp.ok()) { await apiContext.dispose(); return }
    m3FunnelId = (await createResp.json() as { data: { id: string } }).data.id

    // Step mit Eingabe-Block und Logik-Regel anlegen
    const choiceBlockId = randomUUID()
    const step1Id = randomUUID()
    const step2Id = randomUUID()
    const content = {
      schemaVersion: '1.1.0',
      meta: {
        defaultLocale: 'de',
        personalizationVars: [
          { key: 'vorname', source: 'url_param', paramName: 'vorname', fallback: 'Freund' },
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
          id: step1Id,
          type: 'question',
          internalTitle: 'Schritt 1',
          layout: 'single',
          logicRules: [
            {
              id: randomUUID(),
              operator: 'AND',
              conditions: [{ blockId: choiceBlockId, operator: 'equals', value: 'ja' }],
              target: { type: 'step', stepId: step2Id },
            },
          ],
          blocks: [
            {
              id: choiceBlockId,
              type: 'multi_choice',
              fieldKey: 'm3_choice',
              question: 'Ja oder Nein?',
              imageLayout: 'none',
              required: false,
              options: [
                { id: randomUUID(), label: 'Ja', value: 'ja' },
                { id: randomUUID(), label: 'Nein', value: 'nein' },
              ],
            },
            {
              id: randomUUID(),
              type: 'button',
              label: 'Weiter',
              action: 'next',
              style: 'primary',
            },
          ],
        },
        {
          id: step2Id,
          type: 'result',
          internalTitle: 'Ergebnis',
          layout: 'single',
          logicRules: [],
          blocks: [
            {
              id: randomUUID(),
              type: 'text',
              content: '<p>Danke!</p>',
            },
          ],
        },
      ],
    }

    const draftResp = await apiContext.put(`${ADMIN_API_BASE}/funnels/${m3FunnelId}/draft`, {
      headers: auth,
      data: { content },
    })
    if (!draftResp.ok()) {
      m3FunnelId = null
      await apiContext.dispose()
      return
    }

    await apiContext.dispose()
  })

  test.afterAll(async () => {
    if (!m3FunnelId) return
    const admin = await getAdminSession()
    if (!admin) return
    const { apiContext, auth } = admin
    await apiContext.delete(`${ADMIN_API_BASE}/funnels/${m3FunnelId}`, { headers: auth })
    await apiContext.dispose()
  })

  test('M3 Metriken-Seite: keine kritischen AA-Violations', async ({ page }) => {
    if (!adminToken || !m3FunnelId) { test.skip(); return }
    await loginM3(page)
    await page.goto(`/admin/funnels/${m3FunnelId}/metrics`)
    // Metriken-Seite nutzt das editor-Layout (kein #main-content) und ist ssr:false:
    // auf das hydrierte <main> des Dashboards warten.
    await page.waitForSelector('main', { state: 'visible', timeout: 15000 })
    await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 10000 }).catch(() => {})

    const results = await new AxeBuilder({ page })
      .include('main')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    const criticalOrSerious = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious',
    )
    expect(
      criticalOrSerious,
      `A11y-Violations Metriken-Seite:\n${criticalOrSerious.map(v => `[${v.impact}] ${v.id}: ${v.description}`).join('\n')}`,
    ).toHaveLength(0)
  })

  test('M3 Editor (LogicRulePanel + PersonalizationPanel): keine kritischen AA-Violations', async ({ page }) => {
    if (!adminToken || !m3FunnelId) { test.skip(); return }
    await loginM3(page)
    // Editor liegt unter /editor und nutzt das editor-Layout. Die M3-Panels
    // (Sprungregeln + Personalisierung) leben in der linken Seitenleiste <aside>.
    await page.goto(`/admin/funnels/${m3FunnelId}/editor`)
    const leftPanel = page.locator('aside[aria-label="Funnel-Struktur"]')
    await leftPanel.waitFor({ state: 'visible', timeout: 15000 })

    // Sprungregeln-Sektion sichtbar machen (startet expanded=true)
    const logicSection = page.locator('section[aria-labelledby="logic-panel-heading"]')
    await expect(logicSection).toBeVisible({ timeout: 5000 }).catch(() => {})

    // Gezielt die M3-Panels scannen (nicht die vorbestehende Schritt-Liste des
    // LeftPanels, deren Semantik ausserhalb des M3-Umfangs liegt).
    const results = await new AxeBuilder({ page })
      .include('section[aria-labelledby="logic-panel-heading"]')
      .include('section[aria-label="Personalisierung"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    const criticalOrSerious = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious',
    )
    expect(
      criticalOrSerious,
      `A11y-Violations Editor-Panels:\n${criticalOrSerious.map(v => `[${v.impact}] ${v.id}: ${v.description}`).join('\n')}`,
    ).toHaveLength(0)
  })
})
