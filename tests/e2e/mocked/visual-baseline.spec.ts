import { test } from '@playwright/test'
import { authenticate, installApiMocks, installLoginMocks } from './fixtures'

/**
 * Captures screenshots of the main surfaces so a styling change can be compared
 * against a known-good state.
 *
 * Not an assertion suite: it fails nothing and is excluded from `pnpm e2e`.
 * Run it explicitly with `pnpm e2e:shots` before and after a visual change and
 * diff the two folders by eye.
 *
 * Output goes to test-results/shots/<theme>/, which .gitignore already covers.
 */

const surfaces = [
  // No session: the guard bounces an authenticated visit to /login home
  { name: 'login', path: '/#/login', wait: '.login-shell', anonymous: true },
  { name: 'list-page', path: '/#/demo/product', wait: '.pro-table' },
  { name: 'dialog', path: '/#/demo/product', wait: '.pro-table', open: '新增' },
  // The densest surface: department tree, search bar, toolbar, sortable table
  { name: 'sys-user', path: '/#/admin/sys-user', wait: '.pro-table' },
  { name: 'sys-user-dialog', path: '/#/admin/sys-user', wait: '.pro-table', open: '新增' }
]

for (const width of [1440, 390]) {
  for (const theme of ['light', 'dark'] as const) {
    test.describe(`visual baseline (${theme}, ${width}px)`, () => {
      for (const surface of surfaces) {
        test(`${surface.name}`, async({ page, context }) => {
          await page.setViewportSize({ width, height: 900 })
          if (!surface.anonymous) await authenticate(context)
          await installApiMocks(page)
          if (surface.anonymous) await installLoginMocks(page)

          await page.addInitScript(value => localStorage.setItem('color-scheme', value), theme)
          await page.goto(surface.path)

          await page.waitForSelector(surface.wait, { timeout: 15_000 })

          if (surface.open) {
            const actions = page.locator('.pro-table__fab-btn')
            if (await actions.isVisible()) await actions.click()
            await page.getByRole('button', { name: surface.open }).click()
            await page.waitForSelector('.arco-modal', { state: 'visible' })
          }

          // Let transitions settle so shots are stable between runs
          await page.waitForTimeout(400)
          await page.screenshot({
            path: `test-results/shots/${theme}/${width}/${surface.name}.png`,
            fullPage: false
          })
        })
      }
    })
  }
}
