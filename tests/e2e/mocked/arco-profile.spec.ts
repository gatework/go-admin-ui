import { test, expect } from '@playwright/test'
import { authenticate, installApiMocks } from './fixtures'

test.beforeEach(async({ page, context }) => {
  await authenticate(context)
  await installApiMocks(page)
  await page.route('**/api/v1/user/profile', route => route.fulfill({ json: {
    code: 200,
    data: {
      user: { userId: 7, username: 'tester', nickName: 'Tester', phone: '13800138000', email: 'tester@example.com', sex: '0', roleIds: [1], dept: { deptName: 'Operations' }},
      roles: [{ roleId: 1, roleName: 'Administrator' }]
    }
  }}))
  await page.goto('/#/profile')
  await expect(page.locator('input').first()).toBeVisible()
})

test('profile edits preserve the user ID and native radio value', async({ page }) => {
  const form = page.getByRole('tabpanel', { name: '基本资料', exact: true })
  await expect(form.locator('input').first()).toHaveValue('Tester')
  await form.locator('input').first().fill('Updated')
  await form.getByText('女', { exact: true }).click()
  const request = page.waitForRequest(req => req.url().endsWith('/api/v1/sys-user') && req.method() === 'PUT')
  await form.getByRole('button', { name: '保存' }).click()
  expect((await request).postDataJSON()).toMatchObject({ userId: 7, nickName: 'Updated', sex: '1' })
})

test('profile summary and editor share a desktop row', async({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const cards = page.locator('.account-sidebar, .account-section:not([hidden])')
  const summary = await cards.nth(0).boundingBox()
  const editor = await cards.nth(1).boundingBox()
  expect(Math.abs(summary!.y - editor!.y)).toBeLessThan(2)
  expect(editor!.x).toBeGreaterThan(summary!.x + summary!.width)
})

test('department tree stays beside the desktop user table', async({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/#/admin/sys-user')
  await expect(page.locator('.dept-pane')).toBeVisible()
  const tree = await page.locator('.dept-pane').boundingBox()
  const search = await page.locator('.pro-table__search-panel').boundingBox()
  expect(Math.abs(tree!.y - search!.y)).toBeLessThan(2)
  expect(search!.x).toBeGreaterThan(tree!.x + tree!.width - 2)
})

test('refresh icon remains legible inside the compact toolbar', async({ page }) => {
  await page.goto('/#/admin/sys-user')
  const icon = page.locator('.pro-table__refresh svg')
  await expect(icon).toBeVisible()
  expect((await icon.boundingBox())!.width).toBeGreaterThanOrEqual(12)
})

for (const selector of ['#hamburger-container', '#lang-select']) {
  test(`dark ${selector} uses the header text palette`, async({ page }) => {
    await page.evaluate(() => localStorage.setItem('color-scheme', 'dark'))
    await page.reload()
    const trigger = page.locator(selector)
    await expect(trigger).toBeVisible()
    const colors = await trigger.evaluate(el => {
      const reference = document.createElement('span')
      reference.style.color = 'var(--motor-text-2)'
      el.append(reference)
      const result = { actual: getComputedStyle(el).color, expected: getComputedStyle(reference).color }
      reference.remove()
      return result
    })
    expect(colors.actual).toBe(colors.expected)
  })
}

test('department search retains the matching node and filters users', async({ page }) => {
  await page.goto('/#/admin/sys-user')
  const tree = page.locator('.dept-pane')
  await tree.getByPlaceholder('请输入部门名称').fill('测试')
  await expect(tree.getByText('测试部', { exact: true })).toBeVisible()
  await expect(tree.getByText('研发部', { exact: true })).toBeHidden()
  const request = page.waitForRequest(req => req.url().includes('/api/v1/sys-user?') && new URL(req.url()).searchParams.get('deptId') === '/2/')
  await tree.getByText('测试部', { exact: true }).click()
  await request
})

test('opening an editor moves keyboard focus inside and contains Tab', async({ page }) => {
  await page.goto('/#/admin/sys-user')
  const trigger = page.getByRole('button', { name: '新增', exact: true })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: '添加用户' })
  await expect(dialog).toBeVisible()
  await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true)
  await dialog.getByRole('button', { name: '取 消' }).focus()
  await page.keyboard.press('Tab')
  await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
})

test('confirmation contains keyboard focus and cancellation sends no delete', async({ page }) => {
  let deletes = 0
  page.on('request', request => {
    if (request.method() === 'DELETE' && request.url().includes('/api/v1/sys-user')) deletes++
  })
  await page.goto('/#/admin/sys-user')
  const trigger = page.getByRole('row').filter({ hasText: 'tester' }).getByRole('button', { name: '删除', exact: true })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const dialog = page.locator('.arco-modal-simple')
  await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true)
  await dialog.getByRole('button', { name: '删除', exact: true }).focus()
  await page.keyboard.press('Tab')
  await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  expect(deletes).toBe(0)
})

test('password validation and keyboard tab navigation work together', async({ page }) => {
  const tab = page.getByRole('tab', { name: '基本资料', exact: true })
  await tab.focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('tab', { name: '修改密码' })).toBeFocused()
  const form = page.getByRole('tabpanel', { name: '修改密码', exact: true })
  await form.getByPlaceholder('请输入当前密码').fill('old-secret')
  await form.getByPlaceholder('请输入新密码').fill('new-secret')
  await form.getByPlaceholder('请再次输入新密码').fill('different')
  await form.getByRole('button', { name: '修改密码' }).click()
  await expect(form).toContainText('两次输入的密码不一致')
  await form.getByPlaceholder('请再次输入新密码').fill('new-secret')
  const request = page.waitForRequest(req => req.url().endsWith('/api/v1/user/pwd/set') && req.method() === 'PUT')
  await form.getByRole('button', { name: '修改密码' }).click()
  expect((await request).postDataJSON()).toEqual({ oldPassword: 'old-secret', newPassword: 'new-secret' })
})

test('language menu supports keyboard selection and returns focus', async({ page }) => {
  const trigger = page.locator('#lang-select')
  await trigger.focus()
  await page.keyboard.press('Enter')
  const english = page.getByRole('menuitem', { name: 'English', exact: true })
  await expect(english).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(english).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('tab', { name: 'Change Password' })).toBeVisible()
  await expect(trigger).toBeFocused()
})

test('avatar selection crops locally before uploading multipart data', async({ page }) => {
  let uploadCount = 0
  await page.route('**/api/v1/user/avatar', async route => {
    uploadCount++
    expect(route.request().headers()['content-type']).toContain('multipart/form-data; boundary=')
    expect(route.request().postDataBuffer()?.toString()).toContain('name="upload[]"')
    await route.fulfill({ json: { code: 200, msg: 'saved', data: 'static/uploadfile/avatar.png' }})
  })
  await page.getByTitle('更换头像').click()
  const dialog = page.getByRole('dialog', { name: '修改头像' })
  const imageData = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 256
    const context = canvas.getContext('2d')!
    context.fillStyle = '#165dff'
    context.fillRect(0, 0, 256, 256)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  await dialog.locator('input[type=file]').setInputFiles({
    name: 'avatar.png', mimeType: 'image/png',
    buffer: Buffer.from(imageData, 'base64')
  })
  await expect(dialog.locator('.vue-cropper img').first()).toHaveAttribute('src', /^(data:image|blob:)/)
  expect(uploadCount).toBe(0)
  await dialog.getByRole('button', { name: '保存头像', exact: true }).click()
  await expect.poll(() => uploadCount).toBe(1)
  await expect(dialog).toBeHidden()
  const form = page.getByRole('tabpanel', { name: '基本资料', exact: true })
  await form.locator('input').first().fill('New portrait')
  const save = page.waitForRequest(req => req.url().endsWith('/api/v1/sys-user') && req.method() === 'PUT')
  await form.getByRole('button', { name: '保存' }).click()
  expect((await save).postDataJSON()).toMatchObject({ avatar: 'static/uploadfile/avatar.png', nickName: 'New portrait' })
})
