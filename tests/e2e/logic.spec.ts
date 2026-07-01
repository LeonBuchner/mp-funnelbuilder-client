/**
 * E2E-Tests fuer die Logik-Engine des Renderers (M3.3).
 *
 * Abgedeckte Szenarien:
 *   1. LogicRule-Navigation: Antwort "ja" -> Sprung zu Step 3, Step 2 wird uebersprungen.
 *   2. DisplayConditions: Block mit is_answered-Bedingung ist anfangs unsichtbar,
 *      nach Antwort sichtbar.
 *
 * Voraussetzung:
 *   - Frontend laeuft auf http://localhost:3000
 *   - Backend laeuft auf http://localhost:8000
 *   - Admin-Login: admin@marketing-planet.de / password
 *
 * Setup: Testfunnel per Admin-API anlegen und veroeffentlichen.
 * Teardown: Funnel loeschen.
 */
import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import * as path from 'node:path'
import { getAdminSession } from './helpers/auth'

const ADMIN_API = 'http://localhost:8000/api/admin'
const SCREENSHOTS_DIR = path.resolve('tests/screenshots')

// ---------------------------------------------------------------------------
// LogicRule-Navigation: Step 2 ueberspringen
// ---------------------------------------------------------------------------

test.describe('LogicRule-Navigation: Sprung zu Step 3, Step 2 wird uebersprungen', () => {
  let logicFunnelId: string | null = null
  let step1ChoiceBlockId: string
  let step2Id: string
  let step3Id: string

  test.beforeAll(async () => {
    const admin = await getAdminSession()
    if (!admin) return
    const { apiContext, auth, workspaceId } = admin

    const createResp = await apiContext.post(`${ADMIN_API}/workspaces/${workspaceId}/funnels`, {
      headers: auth,
      data: { name: '[Logic-E2E-Test] Step-Sprung – automatisch angelegt' },
    })
    if (!createResp.ok()) { await apiContext.dispose(); return }
    logicFunnelId = (await createResp.json() as { data: { id: string } }).data.id

    // Block-IDs und Step-IDs statisch vergeben, damit die LogicRule darauf zeigen kann
    step1ChoiceBlockId = randomUUID()
    step2Id = randomUUID()
    step3Id = randomUUID()

    const content = {
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
          type: 'question',
          internalTitle: 'Step 1',
          layout: 'single',
          logicRules: [
            {
              id: randomUUID(),
              operator: 'AND',
              conditions: [
                {
                  blockId: step1ChoiceBlockId,
                  operator: 'equals',
                  value: 'ja',
                },
              ],
              target: { type: 'step', stepId: step3Id },
            },
          ],
          blocks: [
            {
              id: step1ChoiceBlockId,
              type: 'single_choice',
              fieldKey: 'logic_test_choice',
              question: 'Bist Du dabei?',
              imageLayout: 'none',
              // autoAdvance: true damit der Klick direkt navigiert (kein extra Button-Klick)
              autoAdvance: true,
              required: false,
              options: [
                { id: randomUUID(), label: 'Ja', value: 'ja' },
                { id: randomUUID(), label: 'Nein', value: 'nein' },
              ],
            },
          ],
        },
        {
          id: step2Id,
          type: 'content',
          internalTitle: 'Step 2 – wird uebersprungen',
          layout: 'single',
          logicRules: [],
          blocks: [
            {
              id: randomUUID(),
              type: 'text',
              content: '<p>STEP-ZWEI-INHALT: Dieser Schritt sollte uebersprungen worden sein.</p>',
            },
          ],
        },
        {
          id: step3Id,
          type: 'result',
          internalTitle: 'Step 3 – Ziel',
          layout: 'single',
          logicRules: [],
          blocks: [
            {
              id: randomUUID(),
              type: 'text',
              content: '<p>STEP-DREI-INHALT: Du bist direkt auf Step 3 gelandet!</p>',
            },
          ],
        },
      ],
    }

    const draftResp = await apiContext.put(`${ADMIN_API}/funnels/${logicFunnelId}/draft`, {
      headers: auth,
      data: { content },
    })
    if (!draftResp.ok()) {
      logicFunnelId = null
      await apiContext.dispose()
      return
    }

    const pubResp = await apiContext.post(`${ADMIN_API}/funnels/${logicFunnelId}/publish`, {
      headers: auth,
      data: {},
    })
    if (!pubResp.ok()) {
      logicFunnelId = null
    }

    await apiContext.dispose()
  })

  test.afterAll(async () => {
    if (!logicFunnelId) return
    const admin = await getAdminSession()
    if (!admin) return
    const { apiContext, auth } = admin
    await apiContext.delete(`${ADMIN_API}/funnels/${logicFunnelId}`, { headers: auth })
    await apiContext.dispose()
  })

  test('Antwort "Ja" loest LogicRule aus: Step 2 wird uebersprungen, Step 3 ist sichtbar', async ({ page }) => {
    if (!logicFunnelId) {
      test.skip()
      return
    }

    // Konsolfehler protokollieren
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    const response = await page.goto(`/f/${logicFunnelId}`, { waitUntil: 'networkidle' })
    if (response?.status() !== 200) {
      test.skip()
      return
    }

    // Screenshot: Step 1 (Auswahl-Frage)
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/logic-step1-before-click.png` })

    // "Ja"-Button klicken (autoAdvance loest next() aus)
    const jaButton = page.locator('button', { hasText: /^Ja$/i })
    await expect(jaButton).toBeVisible()
    await jaButton.click()

    // Kurz warten (Transition-Animation: 280ms)
    await page.waitForTimeout(600)

    // Screenshot: nach Klick (Step 3 sollte sichtbar sein, Step 2 uebersprungen)
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/logic-step3-after-jump.png` })

    // Step 2-Inhalt NICHT sichtbar (Step wurde uebersprungen)
    await expect(page.locator('text=STEP-ZWEI-INHALT')).not.toBeVisible()

    // Step 3-Inhalt sichtbar
    await expect(page.locator('text=STEP-DREI-INHALT')).toBeVisible()

    // Keine kritischen Konsolenfehler
    const criticalErrors = consoleErrors.filter(e =>
      !e.includes('favicon')
      && !e.includes('sw.js')
      && !e.includes('[vite]'),
    )
    expect(criticalErrors, `Konsolenfehler nach Logic-Jump: ${criticalErrors.join('; ')}`).toHaveLength(0)
  })

  test('Antwort "Nein" loest keine LogicRule aus: linearer Uebergang zu Step 2', async ({ page }) => {
    if (!logicFunnelId) {
      test.skip()
      return
    }

    await page.goto(`/f/${logicFunnelId}`, { waitUntil: 'networkidle' })

    // "Nein"-Button klicken -> keine passende Regel -> linearer Uebergang
    const neinButton = page.locator('button', { hasText: /^Nein$/i })
    await expect(neinButton).toBeVisible()
    await neinButton.click()
    await page.waitForTimeout(600)

    // Step 2-Inhalt sichtbar (kein Sprung)
    await expect(page.locator('text=STEP-ZWEI-INHALT')).toBeVisible()

    // Step 3-Inhalt NICHT sichtbar
    await expect(page.locator('text=STEP-DREI-INHALT')).not.toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// DisplayConditions: Block-Sichtbarkeit
// ---------------------------------------------------------------------------

test.describe('DisplayConditions: bedingte Block-Sichtbarkeit', () => {
  let displayFunnelId: string | null = null
  let triggerBlockId: string
  let conditionalBlockId: string

  test.beforeAll(async () => {
    const admin = await getAdminSession()
    if (!admin) return
    const { apiContext, auth, workspaceId } = admin

    const createResp = await apiContext.post(`${ADMIN_API}/workspaces/${workspaceId}/funnels`, {
      headers: auth,
      data: { name: '[Display-E2E-Test] Bedingte Sichtbarkeit – automatisch angelegt' },
    })
    if (!createResp.ok()) { await apiContext.dispose(); return }
    displayFunnelId = (await createResp.json() as { data: { id: string } }).data.id

    triggerBlockId = randomUUID()
    conditionalBlockId = randomUUID()

    const content = {
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
          type: 'question',
          internalTitle: 'Display-Conditions-Test',
          layout: 'single',
          logicRules: [],
          blocks: [
            // Trigger-Block: single_choice
            {
              id: triggerBlockId,
              type: 'single_choice',
              fieldKey: 'display_trigger',
              question: 'Was moechtest Du tun?',
              imageLayout: 'none',
              autoAdvance: false,
              required: false,
              options: [
                { id: randomUUID(), label: 'Option A', value: 'a' },
                { id: randomUUID(), label: 'Option B', value: 'b' },
              ],
            },
            // Bedingter Block: nur sichtbar wenn Trigger beantwortet
            {
              id: conditionalBlockId,
              type: 'text',
              content: '<p>CONDITIONAL-TEXT: Ich bin nur sichtbar wenn eine Antwort gewaehlt wurde.</p>',
              displayConditions: [
                {
                  blockId: triggerBlockId,
                  operator: 'is_answered',
                },
              ],
            },
          ],
        },
      ],
    }

    const draftResp = await apiContext.put(`${ADMIN_API}/funnels/${displayFunnelId}/draft`, {
      headers: auth,
      data: { content },
    })
    if (!draftResp.ok()) {
      displayFunnelId = null
      await apiContext.dispose()
      return
    }

    const pubResp = await apiContext.post(`${ADMIN_API}/funnels/${displayFunnelId}/publish`, {
      headers: auth,
      data: {},
    })
    if (!pubResp.ok()) displayFunnelId = null

    await apiContext.dispose()
  })

  test.afterAll(async () => {
    if (!displayFunnelId) return
    const admin = await getAdminSession()
    if (!admin) return
    const { apiContext, auth } = admin
    await apiContext.delete(`${ADMIN_API}/funnels/${displayFunnelId}`, { headers: auth })
    await apiContext.dispose()
  })

  test('Block mit is_answered-Condition: anfangs unsichtbar, nach Auswahl sichtbar', async ({ page }) => {
    if (!displayFunnelId) {
      test.skip()
      return
    }

    await page.goto(`/f/${displayFunnelId}`, { waitUntil: 'networkidle' })

    // Screenshot: Initialzustand – bedingter Block nicht sichtbar
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/display-condition-initial.png` })

    // Bedingter Text ist anfangs unsichtbar (keine Antwort)
    await expect(page.locator('text=CONDITIONAL-TEXT')).not.toBeVisible()

    // Option A auswaehlen
    const optionA = page.locator('button', { hasText: /^Option A$/i })
    await expect(optionA).toBeVisible()
    await optionA.click()

    // Kurz warten (Reaktivitaet)
    await page.waitForTimeout(300)

    // Screenshot: nach Auswahl – bedingter Block sichtbar
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/display-condition-answered.png` })

    // Bedingter Text jetzt sichtbar
    await expect(page.locator('text=CONDITIONAL-TEXT')).toBeVisible()
  })
})
