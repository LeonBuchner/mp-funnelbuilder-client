import { test, expect } from '@playwright/test'

test.describe('Einstieg', () => {
  test('leitet die Wurzel fuer nicht angemeldete Besucher zum Login', async ({ page }) => {
    await page.goto('/')
    await page.waitForURL('**/auth/login', { timeout: 10000 })
    await expect(page).toHaveURL(/\/auth\/login/)
    await expect(page.getByRole('button', { name: 'Anmelden' })).toBeVisible()
  })

  test('Login-Seite hat ein semantisches main-Element', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.locator('main')).toBeVisible()
  })
})
