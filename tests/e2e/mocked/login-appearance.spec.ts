import { test, expect } from '@playwright/test'
import { installLoginMocks } from './fixtures'

test('login layout position persists and a phone keeps the form in view', async({ page }) => {
  await installLoginMocks(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/#/login')
  await expect(page.locator('.captcha-img')).toBeVisible()
  await page.getByRole('button', { name: '登录页布局', exact: true }).click()
  await page.getByRole('menuitem', { name: '居左' }).click()
  await expect(page.locator('.login-shell')).toHaveClass(/login-shell-left/)
  await page.reload()
  await expect(page.locator('.login-shell')).toHaveClass(/login-shell-left/)
  await page.setViewportSize({ width: 375, height: 812 })
  await expect(page.locator('.submit-btn')).toBeInViewport()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
})

test('login boots when browser storage is blocked', async({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError') } }))
  await installLoginMocks(page)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/#/login')
  await expect(page.locator('.captcha-img')).toBeVisible()
  expect(errors).toEqual([])
})
