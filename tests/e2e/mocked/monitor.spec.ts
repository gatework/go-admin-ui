import { test, expect } from '@playwright/test'
import { authenticate, installApiMocks, menuTree } from './fixtures'

const metrics = {
  code: 200,
  os: { hostName: 'motor-dev', goOs: 'linux', arch: 'arm64', ip: '10.0.0.5', version: 'go1.24.0', numGoroutine: 38, projectDir: '/workspace/go-admin', time: '2026-10-26 10:30:00' },
  cpu: { percent: 28.5, cpuNum: 8, cpuInfo: [{ modelName: 'Development CPU' }] },
  mem: { percent: 62.5, used: 5120, total: 8192 }, disk: { percent: 42, used: 84, total: 200 },
  net: { in: 123.45, out: 54.32 }, swap: { used: 0, total: 2147483648 }, bootTime: 36
}
async function setup(page: import('@playwright/test').Page, context: import('@playwright/test').BrowserContext) {
  await authenticate(context)
  await installApiMocks(page)
  await page.route('**/api/v1/menurole*', route => route.fulfill({ json: { ...menuTree, data: [...menuTree.data, {
    path: '/sys-tools', component: 'Layout', visible: '0', menuName: 'SysTools', title: 'Tools', icon: 'tool', noCache: false,
    children: [{ path: 'monitor', component: '/sys-tools/monitor', visible: '0', menuName: 'ServerMonitor', title: 'Monitor', icon: 'desktop', noCache: false, children: null }]
  }] }}))
}
for (const width of [375, 1440]) {
  test(`monitor metrics and account actions fit at ${width}px`, async({ page, context }, testInfo) => {
    await setup(page, context)
    await page.setViewportSize({ width, height: 900 })
    await page.route('**/api/v1/server-monitor', route => route.fulfill({ json: metrics }))
    await page.goto('/#/sys-tools/monitor')
    await expect(page.locator('.resource-values')).toContainText('28.5%')
    await expect(page.locator('.network-values')).toContainText('123.45')
    await expect(page.locator('.resource-chart canvas')).toBeVisible()
    await expect(page.locator('.monitor-details')).toHaveCount(3)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    await page.screenshot({ path: testInfo.outputPath('monitor-light.png'), fullPage: true, animations: 'disabled' })
    await page.locator('.user-trigger').click()
    const menu = page.locator('.arco-dropdown:visible')
    await expect(menu.getByRole('menuitem')).toHaveCount(4)
    for (const item of await menu.getByRole('menuitem').all()) await expect(item).toBeInViewport()
    expect(await menu.locator('.arco-dropdown-list-wrapper').evaluate(el => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1)
    await page.keyboard.press('Escape')
    await page.locator('#layout-settings').click()
    const drawer = page.getByRole('dialog', { name: '偏好设置', exact: true })
    await drawer.getByRole('button', { name: '暗色', exact: true }).click()
    await drawer.getByRole('button', { name: '关闭偏好设置' }).click()
    await expect(page.locator('body')).toHaveAttribute('arco-theme', 'dark')
    await page.screenshot({ path: testInfo.outputPath('monitor-dark.png'), fullPage: true, animations: 'disabled' })
  })
}

test('monitor pauses, retains last sample on failure and recovers with incomplete metrics', async({ page, context }) => {
  await setup(page, context)
  let requests = 0
  let failing = false
  let partial = false
  await page.route('**/api/v1/server-monitor', route => {
    requests++
    return route.fulfill({ json: failing ? { code: 500, msg: 'Sampling unavailable' } : partial ? { code: 200, cpu: { cpuInfo: [] }} : metrics })
  })
  await page.goto('/#/sys-tools/monitor')
  await expect(page.locator('.resource-values')).toContainText('62.5%')
  await page.locator('.monitor-controls .arco-checkbox').click()
  await expect(page.getByRole('checkbox', { name: '自动刷新' })).not.toBeChecked()
  const paused = requests
  await page.waitForTimeout(5200)
  expect(requests).toBe(paused)
  failing = true
  await page.getByRole('button', { name: '刷新数据' }).click()
  await expect(page.locator('.monitor-alert')).toBeVisible()
  await expect(page.locator('.resource-values')).toContainText('62.5%')
  failing = false; partial = true
  await page.getByRole('button', { name: '刷新数据' }).click()
  await expect(page.locator('.monitor-alert')).toBeHidden()
  await expect(page.locator('.resource-values')).not.toContainText('62.5%')
  await expect(page.locator('.monitor-system')).toContainText('未提供')
  await page.locator('.monitor-controls .arco-checkbox').click()
  await expect.poll(() => requests).toBeGreaterThan(paused + 2)
  await page.evaluate(() => { location.hash = '/dashboard' })
  await expect(page.locator('.server-monitor')).toBeHidden()
  const left = requests
  await page.waitForTimeout(5200)
  expect(requests).toBe(left)
  await page.evaluate(() => { location.hash = '/sys-tools/monitor' })
  await expect(page.locator('.server-monitor')).toBeVisible()
  await expect.poll(() => requests).toBeGreaterThan(left)
  await page.locator('.monitor-controls .arco-checkbox').click()
  const held = requests
  await page.evaluate(() => { location.hash = '/dashboard' })
  await expect(page.locator('.server-monitor')).toBeHidden()
  await page.evaluate(() => { location.hash = '/sys-tools/monitor' })
  await expect(page.locator('.server-monitor')).toBeVisible()
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect(page.getByRole('checkbox', { name: '自动刷新' })).not.toBeChecked()
  await page.waitForTimeout(500)
  expect(requests).toBe(held)
})

test('tablet monitor localizes labels and account configuration opens without scrolling', async({ page, context }, testInfo) => {
  await setup(page, context)
  await page.setViewportSize({ width: 768, height: 1024 })
  await context.addInitScript(() => { localStorage.setItem('locale', 'en-US') })
  await page.route('**/api/v1/server-monitor', route => route.fulfill({ json: metrics }))
  await page.goto('/#/sys-tools/monitor')
  await expect(page.getByRole('heading', { name: 'Server monitor', exact: true })).toBeVisible()
  await expect(page.locator('.resource-chart canvas')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(768)
  await page.screenshot({ path: testInfo.outputPath('monitor-tablet-english.png'), animations: 'disabled', fullPage: true })
  await page.locator('.user-trigger').click()
  await page.getByRole('menuitem', { name: 'System configuration', exact: true }).click()
  await expect(page).toHaveURL(/admin\/sys-config\/set/)
})
