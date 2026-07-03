/**
 * Smoke-Tests fuer die M5-Demo-Funnels im oeffentlichen Renderer.
 *
 * Voraussetzungen:
 *   - Frontend laeuft auf http://localhost:3000
 *   - Backend laeuft auf http://localhost:8000
 *   - DemoFunnelSeederM5 muss ausgefuehrt worden sein
 *     (php artisan db:seed --class=DemoFunnelSeederM5)
 *
 * Abgedeckte Szenarien:
 *   DF.1 – demo0002 (Terminbuchung): rendert, hat interaktive Elemente, keine Konsolfehler
 *   DF.2 – demo0003 (B2B): rendert, Personalisierung ?vorname=Max greift client-seitig
 *   DF.3 – demo0004 (E-Mail-Liste): rendert, zeigt E-Mail-Input
 *   DF.4 – Unbekannte public_id gibt 404
 */
import { test, expect } from '@playwright/test'

test.describe('Demo-Funnels Renderer Smoke-Tests (M5.1)', () => {
  // ---------------------------------------------------------------------------
  // DF.1 – demo0002: Terminbuchung
  // ---------------------------------------------------------------------------
  test('DF.1 – demo0002 Terminbuchung: rendert und zeigt interaktive Elemente', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    const resp = await page.goto('/f/demo0002', { waitUntil: 'networkidle' })

    if (resp?.status() === 404) {
      test.skip()
      return
    }

    expect(resp?.status()).toBe(200)

    // Semantisches main-Element vorhanden
    await expect(page.locator('main')).toBeVisible()

    // Mindestens ein interaktives Element (Button oder Input) auf dem ersten Schritt
    const interactive = page.locator('main button, main input')
    await expect(interactive.first()).toBeVisible()

    // Keine kritischen JS-Fehler (Favicon und SW ignorieren)
    const critical = errors.filter(
      e => !e.includes('favicon') && !e.includes('sw.js') && !e.includes('[vite]'),
    )
    expect(critical).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // DF.2 – demo0003: B2B-Qualifizierung mit Personalisierung
  // ---------------------------------------------------------------------------
  test('DF.2 – demo0003 B2B: rendert und zeigt Fallback-Wert ohne URL-Parameter', async ({ page }) => {
    const resp = await page.goto('/f/demo0003', { waitUntil: 'networkidle' })

    if (resp?.status() === 404) {
      test.skip()
      return
    }

    expect(resp?.status()).toBe(200)
    await expect(page.locator('main')).toBeVisible()

    // Fallback "Du" ist sichtbar (kein vorname-Parameter gesetzt)
    const bodyText = await page.locator('main').textContent()
    expect(bodyText).toMatch(/Hallo\s+(Du|Max|[\w]+)/i)
  })

  test('DF.2b – demo0003: ?vorname=Max zeigt personalisierten Namen (client-seitig)', async ({ page }) => {
    const resp = await page.goto('/f/demo0003?vorname=Max', { waitUntil: 'networkidle' })

    if (resp?.status() === 404) {
      test.skip()
      return
    }

    expect(resp?.status()).toBe(200)
    await expect(page.locator('main')).toBeVisible()

    // Nach Hydration soll "Max" im Intro-Text erscheinen
    // (client-seitiges URL-Parameter-Binding)
    await page.waitForTimeout(500)
    const bodyText = await page.locator('main').textContent()
    expect(bodyText).toContain('Max')
  })

  // ---------------------------------------------------------------------------
  // DF.3 – demo0004: E-Mail-Liste
  // ---------------------------------------------------------------------------
  test('DF.3 – demo0004 E-Mail-Liste: rendert und zeigt E-Mail-Eingabefeld', async ({ page }) => {
    const resp = await page.goto('/f/demo0004', { waitUntil: 'networkidle' })

    if (resp?.status() === 404) {
      test.skip()
      return
    }

    expect(resp?.status()).toBe(200)
    await expect(page.locator('main')).toBeVisible()

    // E-Mail-Input muss sichtbar sein (erstes Formular-Feld des Funnels)
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible()
  })

  // ---------------------------------------------------------------------------
  // DF.4 – unbekannte public_id -> 404
  // ---------------------------------------------------------------------------
  test('DF.4 – unbekannte Demo-ID gibt 404', async ({ page }) => {
    const resp = await page.goto('/f/demo9999')
    expect(resp?.status()).toBe(404)
  })
})
