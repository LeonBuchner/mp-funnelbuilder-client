/**
 * Axe-Playwright A11y-Test fuer den oeffentlichen Funnel-Renderer.
 *
 * Prueft den Demo-Funnel mit axe-core auf WCAG 2.1 AA Violations.
 * Kein einziger "critical" oder "serious" AA-Verstoss darf im Renderer vorhanden sein.
 *
 * Voraussetzung:
 *   - Frontend laeuft auf http://localhost:3000
 *   - Backend laeuft auf http://localhost:8000 mit Demo-Funnel
 *   - Demo-Funnel-UUID: d0000001-0000-4000-8000-000000000001
 */
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const DEMO_HASH = 'd0000001-0000-4000-8000-000000000001'
const FUNNEL_URL = `/f/${DEMO_HASH}`

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
      // Hilfreich: Violations in der Fehlermeldung ausgeben
      const details = criticalOrSerious
        .map(v => `[${v.impact}] ${v.id}: ${v.description}\n  Nodes: ${v.nodes.map(n => n.target.join(', ')).join(' | ')}`)
        .join('\n\n')
      expect(criticalOrSerious, `Kritische/schwere A11y-Violations gefunden:\n\n${details}`).toHaveLength(0)
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
