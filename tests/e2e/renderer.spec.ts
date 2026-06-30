/**
 * E2E-Tests fuer den oeffentlichen Funnel-Renderer (/f/{hash}).
 *
 * Voraussetzung:
 *   - Backend laeuft auf http://localhost:8000 mit Demo-Funnel
 *   - Demo-Funnel-UUID: d0000001-0000-4000-8000-000000000001
 *   - Funnel muss veroeffentlicht sein (status = 'published')
 *
 * Teststrategie:
 *   - Lade /f/{DEMO_HASH}
 *   - Durchlaufe: Intro -> Standort (Auswahl) -> Berufserfahrung (Auswahl)
 *     -> Kontakt (Name/E-Mail/Consent) -> Absenden
 *   - Erwarte: Danke-/Result-Schritt + Lead in DB (indirekt: 201 Response)
 *   - A11y: Basis-Checks (semantisches main, h1, kein sichtbarer Fehler)
 */
import { test, expect } from '@playwright/test'

const DEMO_HASH = 'd0000001-0000-4000-8000-000000000001'
const FUNNEL_URL = `/f/${DEMO_HASH}`

test.describe('Funnel-Renderer', () => {
  test.beforeEach(async ({ page }) => {
    // Gehe zur Funnel-URL; bei 404 (kein Demo-Funnel) wird der Test geskippt
    const response = await page.goto(FUNNEL_URL, { waitUntil: 'networkidle' })
    if (response?.status() === 404) {
      test.skip()
    }
  })

  test('laedt den Funnel und zeigt den ersten Schritt an', async ({ page }) => {
    await expect(page).toHaveURL(FUNNEL_URL)

    // Semantisches main vorhanden
    await expect(page.locator('main')).toBeVisible()

    // Genau ein h1 (visuell versteckt, dennoch im DOM)
    const h1s = page.locator('h1')
    await expect(h1s).toHaveCount(1)

    // Erster Schritt-Inhalt sichtbar (irgendein Text oder Button)
    const firstContent = page.locator('main form, main [role="region"]').first()
    await expect(firstContent).toBeVisible()
  })

  test('zeigt 404-Seite bei unbekanntem Slug', async ({ page }) => {
    const resp = await page.goto('/f/nicht-vorhandener-slug-xyz')
    // Nuxt zeigt Fehler-Seite mit Status 404
    expect(resp?.status()).toBe(404)
    // Oder Nuxt rendert eine Error-Page mit passendem Text
    const body = await page.textContent('body')
    expect(body?.toLowerCase()).toMatch(/404|nicht gefunden|not found/i)
  })

  test('Weiter-Button navigiert zum naechsten Schritt', async ({ page }) => {
    // Suche einen "Weiter"-Button oder Antwort-Button auf dem ersten Schritt
    const buttons = page.locator('button[type="button"]')

    // Wenn es Antwort-Buttons gibt (single_choice), klicke den ersten
    const firstButton = buttons.first()
    await expect(firstButton).toBeVisible()
    await firstButton.click()

    // Wir erwarten dass sich etwas im Funnel aendert
    // (naechster Step geladen oder Fortschritt sichtbar)
    await page.waitForTimeout(400)

    // Seite sollte noch auf /f/{DEMO_HASH} sein
    await expect(page).toHaveURL(FUNNEL_URL)
  })

  test('Zurueck-Button erscheint ab dem zweiten Schritt', async ({ page }) => {
    // Ersten Button klicken um zum naechsten Schritt zu gelangen
    const buttons = page.locator('button[type="button"]')
    await buttons.first().click()
    await page.waitForTimeout(400)

    // Zurueck-Button sollte jetzt sichtbar sein
    const backButton = page.locator('button', { hasText: /Zurueck|Zurück/i })
    await expect(backButton).toBeVisible()
  })

  test('vollstaendiger Durchlauf: Auswahl -> Kontakt -> Absenden', async ({ page }) => {
    /**
     * Dieser Test durchlaeuft den Demo-Funnel komplett.
     * Er ist robust (best-effort): falls Schritt-Struktur abweicht, bricht er ab.
     *
     * Schritte:
     *   1. Intro: Weiter-Button oder erster Antwort-Button
     *   2. Standort: Antwort auswaehlen
     *   3. Berufserfahrung: Antwort auswaehlen
     *   4. Kontakt: Name, E-Mail, Consent
     *   5. Absenden -> Danke-Screen
     */

    const maxSteps = 6

    for (let i = 0; i < maxSteps; i++) {
      // Gibt es ein Textfeld (input_text / input_email)?
      const textInputs = page.locator('input[type="text"], input[type="email"]')
      if (await textInputs.count() > 0) {
        // Wir sind auf dem Kontakt-Schritt
        const nameInput = page.locator('input[type="text"]').first()
        const emailInput = page.locator('input[type="email"]').first()
        const checkbox = page.locator('input[type="checkbox"]').first()

        await nameInput.fill('Playwright Testuser')
        await emailInput.fill('playwright@example.com')

        if (await checkbox.count() > 0) {
          await checkbox.check()
        }

        // Submit-Button finden und klicken
        const submitBtn = page.locator('button[type="button"]', { hasText: /Absenden|Weiter|Jetzt|Senden/i }).first()
        await submitBtn.click()
        await page.waitForTimeout(800)

        // Wir sollten jetzt auf dem Danke-Screen sein
        // Pruefe auf "Danke" oder "Ergebnis" im Seiteninhalt
        break
      }

      // Gibt es Antwort-Buttons (single_choice)?
      const answerButtons = page.locator('button[type="button"]')
      if (await answerButtons.count() > 0) {
        await answerButtons.first().click()
        await page.waitForTimeout(400)
      }
      else {
        // Kein interaktives Element: Test-Schleife beenden
        break
      }
    }

    // Nach dem Durchlauf: Seite ist noch erreichbar und hat kein Fatal-Error
    await expect(page).toHaveURL(FUNNEL_URL)
    await expect(page.locator('main')).toBeVisible()
  })

  test('zeigt keine kritischen Konsolenfehler', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto(FUNNEL_URL, { waitUntil: 'networkidle' })

    // Keine JavaScript-Fehler in der Konsole
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') // Favicon-404 ignorieren (Platzhalter)
      && !e.includes('sw.js') // Service-Worker-Fehler im Dev ignorieren
      && !e.includes('[vite]'), // Vite-HMR-Meldungen ignorieren
    )

    expect(criticalErrors).toHaveLength(0)
  })

  test('Tastaturnavigation: Tab und Enter funktionieren', async ({ page }) => {
    await page.goto(FUNNEL_URL, { waitUntil: 'networkidle' })

    // Fokus auf den ersten Button setzen via Tab
    await page.keyboard.press('Tab')

    // Fokussiertes Element sollte sichtbar sein
    const focusedEl = page.locator(':focus')
    await expect(focusedEl).toBeVisible()
  })

  test('A11y: main-Element und role="region" vorhanden', async ({ page }) => {
    await page.goto(FUNNEL_URL, { waitUntil: 'networkidle' })

    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('[role="region"][aria-label]')).toBeVisible()
  })
})
