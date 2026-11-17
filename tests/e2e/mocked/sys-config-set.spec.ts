import { test, expect } from '@playwright/test'
import { authenticate, installApiMocks } from './fixtures'

/**
 * The settings page. Not a list -- a form over a handful of config keys, which
 * is why it is the one admin page with no useTable.
 */
test.describe('sys-config set', () => {
  test.beforeEach(async({ context }) => {
    await authenticate(context)
  })

  test('an oversized logo is rejected before any upload request', async({ page }) => {
    await installApiMocks(page)
    let uploads = 0
    await page.route('**/api/v1/public/uploadFile', async route => {
      uploads++
      await route.fulfill({ json: { code: 200, data: { full_path: '/static/logo.png' }}})
    })
    await page.goto('/#/admin/sys-config/set')
    await page.locator('input[type=file]').setInputFiles({
      name: 'large.png', mimeType: 'image/png', buffer: Buffer.alloc(2 * 1024 * 1024)
    })
    await expect(page.locator('.arco-message-error')).toContainText('文件大小超过 2MB')
    expect(uploads).toBe(0)
  })

  test('loads the saved settings', async({ page }) => {
    await installApiMocks(page)

    await page.goto('/#/admin/sys-config/set')
    await page.getByPlaceholder('请输入系统名称').waitFor()

    await expect(page.getByPlaceholder('请输入系统名称')).toHaveValue('go-admin')
    await expect(page.getByPlaceholder('请输入初始密码')).toHaveValue('Init@123')
  })

  // Reset refetches rather than calling resetFields, so the logo -- which sits
  // outside the a-form -- is restored along with the fields.
  test('reset puts the saved values back', async({ page }) => {
    await installApiMocks(page)

    await page.goto('/#/admin/sys-config/set')
    await page.getByPlaceholder('请输入系统名称').waitFor()

    const name = page.getByPlaceholder('请输入系统名称')
    await name.fill('改了一半')
    await expect(name).toHaveValue('改了一半')

    await page.getByRole('button', { name: '重置' }).click()
    await expect(name).toHaveValue('go-admin')
  })

  test('saving sends every key as a configKey/configValue pair', async({ page }) => {
    const { calls } = await installApiMocks(page)

    await page.goto('/#/admin/sys-config/set')
    await page.getByPlaceholder('请输入系统名称').waitFor()

    await page.getByPlaceholder('请输入系统名称').fill('go-admin pro')
    await page.getByRole('button', { name: '保存设置' }).click()

    await expect.poll(() => calls.extra.setConfigSaves).toBe(1)

    const sent = JSON.parse(calls.extra.setConfigBody || '[]')
    expect(Array.isArray(sent)).toBe(true)
    expect(sent).toContainEqual({ configKey: 'sys_app_name', configValue: 'go-admin pro' })
    // The page no longer edits the skin, but a key the server sent goes back
    // as it came: dropping it here would erase it on the next save.
    expect(sent).toContainEqual({ configKey: 'sys_index_skinName', configValue: 'skin-blue' })
  })

  test('a required field blocks the save', async({ page }) => {
    const { calls } = await installApiMocks(page)

    await page.goto('/#/admin/sys-config/set')
    await page.getByPlaceholder('请输入系统名称').waitFor()

    await page.getByPlaceholder('请输入系统名称').fill('')
    await page.getByRole('button', { name: '保存设置' }).click()

    await expect(page.getByText('请输入系统名称')).toBeVisible()
    await page.waitForTimeout(300)
    expect(calls.extra.setConfigSaves).toBe(0)
  })
})
