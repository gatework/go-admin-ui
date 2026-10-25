import { test, expect } from '@playwright/test'
import { authenticate, installApiMocks, installLoginMocks } from './fixtures'

for (const width of [375, 768, 1440]) {
  for (const theme of ['light', 'dark']) {
    test(`Motor surfaces fit at ${width}px in ${theme}`, async({ page, context }, info) => {
      const locale = theme === 'dark' ? 'en-US' : 'zh-CN'
      await authenticate(context); await installApiMocks(page)
      await page.setViewportSize({ width, height: 900 })
      await page.addInitScript(({ theme, locale }) => {
        localStorage.setItem('motor-admin-ui-preferences', JSON.stringify({ theme }))
        localStorage.setItem('locale', locale)
      }, { theme, locale })
      await page.route('**/api/v1/user/profile', route => route.fulfill({ json: { code: 200, data: {
        user: { userId: 7, username: 'tester', nickName: 'Tester', phone: '13800138000', email: 'tester@example.com', sex: '0', roleIds: [1] },
        roles: [{ roleId: 1, roleName: 'Administrator' }]
      }}}))
      await page.goto('/#/profile')
      await expect(page.locator('.account-section input').first()).toHaveValue('Tester')
      await expect(page.locator('#loader-wrapper')).toBeHidden()
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
      await page.screenshot({ path: info.outputPath('profile.png'), animations: 'disabled', fullPage: true })
      await page.locator('#layout-settings').click()
      const preferences = page.locator('.preferences-drawer')
      await expect(preferences).toBeVisible()
      await page.screenshot({ path: info.outputPath('preferences.png'), animations: 'disabled' })
      await preferences.getByRole('button', { name: /^(关闭偏好设置|Close preferences)$/ }).click()
      await page.goto('/#/admin/sys-menu')
      await page.getByRole('row', { name: /用户管理/ }).getByRole('button', { name: /^(修改|Edit)$/ }).click()
      const editor = page.locator('.menu-editor')
      await expect(editor.getByRole('button', { name: /^(保存|Save)$/ })).toBeInViewport()
      await page.screenshot({ path: info.outputPath('menu-editor.png'), animations: 'disabled' })
      await context.clearCookies(); await installLoginMocks(page)
      await page.goto('/?capture=login#/login')
      await expect(page.locator('.captcha-img')).toBeVisible()
      await expect(page.locator('#loader-wrapper')).toBeHidden()
      await expect(page.locator('.submit-btn')).toBeInViewport()
      await page.screenshot({ path: info.outputPath('login.png'), animations: 'disabled' })
    })
  }
}
