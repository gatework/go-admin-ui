import { expect, test, type Page } from '@playwright/test'
import { authenticate, installApiMocks, userInfo } from './fixtures'
import { analysisFixture, apFixture, clientFixture, controllerFixture, detailFixture, deviceFixture, jobFixture } from '../../fixtures/network-wireless'
async function mockWireless(page: Page, permissions = ['list', 'query', 'collect', 'edit', 'import', 'export']) {
  await installApiMocks(page)
  const state = { detail: detailFixture(), controller: controllerFixture(), analysis: analysisFixture(), job: jobFixture(), writes: [] as { path: string, data: Record<string, unknown> }[], queries: [] as URL[], conflict: false, importConflict: false, readFailed: false, resourcesFailed: false, tasks: false }
  await page.route('**/api/v1/getinfo*', route => route.fulfill({ json: { ...userInfo, data: { ...userInfo.data, permissions: permissions.map(p => `network:wireless:${p}`) }}}))
  await page.route('**/api/v1/menurole*', route => route.fulfill({ json: { code: 200, data: [{ path: '/network', component: 'Layout', visible: '0', menuName: 'NetworkManagement', menuType: 'M', title: '网络管理', children: [{ path: 'wireless', component: '/network/wireless/index', visible: '0', menuName: 'NetworkWirelessManage', menuType: 'C', title: '无线管理', icon: 'wifi' }] }] }}))
  await page.route('**/api/v1/network-wireless/**', route => {
    const request = route.request(); const url = new URL(request.url()); const path = url.pathname.replace('/api/v1/network-wireless', ''); const data = request.method() === 'GET' ? {} : request.postDataJSON()
    const ok = (data: unknown) => route.fulfill({ json: { code: 200, data, msg: '' }}); const paged = (list: unknown[]) => ok({ list, count: list.length, pageIndex: 1, pageSize: 20 })
    if (request.method() === 'GET') state.queries.push(url); else state.writes.push({ path, data })
    if (path === '/groups') return ok({ items: [{ id: 1, name: 'SZX9', code: 'SZX9', parentId: null, children: [], version: 1, position: 0, enabled: true, description: '', directDeviceCount: 2, deviceCount: 2 }], totalDeviceCount: 2, ungroupedDeviceCount: 0 })
    if (path === '/controllers') return paged(url.searchParams.get('groupId') === '0' ? [] : [deviceFixture(), deviceFixture(2)])
    if (/^\/controllers\/\d+$/.test(path)) return state.readFailed ? route.fulfill({ status: 503, json: { code: 503, msg: 'Read failed' }}) : ok({ ...state.controller, device: deviceFixture(Number(path.split('/')[2])) })
    if (path.endsWith('/analysis')) return ok(state.analysis)
    if (path.endsWith('/collections') && request.method() === 'POST') { Object.assign(state.job, data); state.tasks = true; return ok(state.job) }
    if (path.endsWith('/collections')) return paged(state.tasks ? [state.job] : [])
    if (path.endsWith('/collections/31')) return ok(state.job)
    if (path.endsWith('/management')) { if (state.conflict) return route.fulfill({ status: 409, json: { code: 409, msg: 'Record changed' }}); Object.assign(state.detail.resource, data, { version: data.version + 1 }); return ok(state.detail.resource) }
    if (path.endsWith('/neighbor')) { Object.assign(state.detail.resource, { neighborDeviceId: data.deviceId, neighborInterface: data.interface, version: data.version + 1 }); return ok(state.detail) }
    if (/\/access-points\/\d+$/.test(path)) return ok(state.detail)
    if (path.endsWith('/access-points')) return state.resourcesFailed ? route.fulfill({ status: 503, json: { code: 503, msg: 'Read failed' }}) : paged([state.detail.resource, { ...apFixture(), id: 12, fields: { ...apFixture().fields, name: 'AP-B', apName: 'AP-B' }, health: 'affected' }].filter(row => !url.searchParams.get('exactAp') || row.fields.name === url.searchParams.get('ap')))
    if (path === '/clients') return paged([{ ...clientFixture(), controllerId: 2, controllerName: 'SZX9-AC-2' }])
    if (/\/clients\/\d+$/.test(path)) return ok({ ...clientFixture(), controllerId: Number(path.split('/')[2]) })
    if (path.endsWith('/clients')) return paged([clientFixture()])
    if (path.endsWith('/radios') || path.endsWith('/bsses')) return paged([])
    if (path === '/switches') return paged([{ id: 100, name: 'SZX9-SW-1', ip: '192.0.2.100' }])
    if (path === '/imports/preview') return ok({ digest: 'digest-123', rows: 1, errors: [] })
    if (path === '/imports/commit') return state.importConflict ? route.fulfill({ status: 409, json: { code: 409, msg: 'Version changed' }}) : ok(null)
    if (path.includes('/exports/')) return route.fulfill({ contentType: 'text/csv', body: 'id,version,localAlias,installationLocation,owner,notes\n11,1,,3F,Network,\n' })
    return route.fulfill({ status: 404, json: { code: 404, msg: path }})
  })
  return state
}
const shot = async(page: Page, name: string) => {
  if (!process.env.WIRELESS_CAPTURE) return
  for (const dialog of await page.getByRole('dialog').all()) {
    if (await dialog.isVisible()) await expect.poll(async() => { const box = await dialog.boundingBox(); return !!box && box.x >= 0 && box.x + box.width <= page.viewportSize()!.width + 1 }).toBe(true)
  }
  await page.screenshot({ path: `../output/wireless-ui/${name}.png`, fullPage: true, animations: 'disabled' })
}
test.describe('Wireless workspace', () => {
  test.use({ viewport: { width: 1440, height: 1000 }})
  test.beforeEach(async({ context }) => authenticate(context))
  test('labels controller groups and keeps counts and selection within wireless scope', async({ page }) => {
    const state = await mockWireless(page); await page.goto('/#/network/wireless?controller=1')
    const panel = page.locator('.wireless-navigation .group-panel')
    await expect(panel).toHaveAttribute('aria-label', '控制器分组')
    await expect(panel.locator('[data-tree-key="all"]')).toHaveText('全部控制器2')
    await expect(panel).toContainText('仅显示有可见无线控制器的分组，数量包含下级分组。')
    await expect(panel.getByText('全部设备', { exact: true })).toHaveCount(0)
    await panel.getByLabel('搜索控制器分组', { exact: true }).fill('SZX9')
    const group = panel.locator('[data-tree-key="1"]'); await group.focus(); await group.press('Enter')
    await expect(page).toHaveURL(/group=1/); await expect(page).not.toHaveURL(/controller=/)
    await expect.poll(() => state.queries.some(url => url.pathname.endsWith('/controllers') && url.searchParams.get('groupId') === '1')).toBe(true)
    await panel.locator('[data-tree-key="0"]').click()
    await expect.poll(() => state.queries.some(url => url.pathname.endsWith('/controllers') && url.searchParams.get('groupId') === '0')).toBe(true)
    await expect(panel.locator('[data-tree-key="all"]')).toHaveText('全部控制器2')
  })
  test('navigates overview, issue, AP and back with URL state', async({ page }) => {
    await mockWireless(page); await page.goto('/#/network/wireless?controller=1')
    await expect(page.locator('.wireless-issue-row')).toHaveCount(1); await shot(page, 'overview')
    await page.getByRole('button', { name: '查看同类问题', exact: true }).click(); await expect(page).toHaveURL(/issue=ap-availability/)
    await expect(page.locator('.wireless-issue-row')).toHaveCount(2)
    await page.locator('.wireless-issue-row').filter({ hasText: 'AP-A' }).getByRole('button', { name: '查看详情', exact: true }).click()
    await expect(page).toHaveURL(/ap=11/); const detail = page.getByRole('dialog', { name: 'AP 详情', exact: true }); await expect(detail).toBeVisible(); await shot(page, 'ap-details')
    await detail.getByRole('button', { name: '返回同类问题', exact: true }).click(); await expect(detail).not.toBeVisible(); await expect(page).toHaveURL(/issue=ap-availability/)
    await page.goBack(); await expect(detail).toBeVisible()
  })
  test('collects neighbors for the selected AP only', async({ page }) => {
    const state = await mockWireless(page); await page.goto('/#/network/wireless?controller=1&ap=11')
    const detail = page.getByRole('dialog', { name: 'AP 详情', exact: true }); await detail.getByRole('tab', { name: '接入邻居', exact: true }).click(); await detail.getByRole('button', { name: '采集数据', exact: true }).click()
    const collect = page.getByRole('dialog', { name: '采集数据', exact: true }); await expect(collect).toContainText('AP-A'); await collect.getByRole('button', { name: '采集数据', exact: true }).click()
    await expect.poll(() => state.writes.filter(w => w.path.endsWith('/collections')).length).toBe(1)
    expect(state.writes[0].data.apNames).toEqual(['AP-A']); expect(state.writes[0].data.dimensions).toEqual(['lldp'])
  })
  test('preserves dirty management through background update and handles conflicts', async({ page }) => {
    const state = await mockWireless(page); await page.clock.install(); await page.goto('/#/network/wireless?controller=1&ap=11')
    const detail = page.getByRole('dialog', { name: 'AP 详情', exact: true }); await detail.getByLabel('本地别名', { exact: true }).fill('Draft alias')
    state.detail.resource.version = 2; state.detail.resource.localAlias = 'Server alias'; await page.clock.runFor(15000)
    await expect(detail.getByLabel('本地别名', { exact: true })).toHaveValue('Draft alias'); await expect(detail.getByRole('button', { name: '保存', exact: true })).toBeDisabled()
    await detail.getByRole('button', { name: '读取最新记录', exact: true }).click(); await expect(detail.getByLabel('本地别名', { exact: true })).toHaveValue('Server alias')
    await detail.getByLabel('本地别名', { exact: true }).fill('Retry alias'); state.conflict = true; await detail.getByRole('button', { name: '保存', exact: true }).click(); await expect(detail.getByRole('button', { name: '保存', exact: true })).toBeDisabled()
    await expect(detail.getByLabel('本地别名', { exact: true })).toHaveValue('Retry alias'); await shot(page, 'edit-conflict')
  })
  test('previews a CSV before commit and invalidates a conflicting preview', async({ page }) => {
    const state = await mockWireless(page); await page.goto('/#/network/wireless?controller=1'); await page.getByRole('button', { name: '导入管理 CSV', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: '导入管理 CSV', exact: true }); await dialog.locator('input[type=file]').setInputFiles({ name: 'management.csv', mimeType: 'text/csv', buffer: Buffer.from('id,version,localAlias,installationLocation,owner,notes\n11,1,New,,,\n') })
    await dialog.getByRole('button', { name: '校验预览', exact: true }).click(); await expect(dialog.getByText('已校验 1 行，可提交导入。')).toBeVisible(); expect(state.writes).toHaveLength(1)
    state.importConflict = true; await dialog.getByRole('button', { name: '提交导入', exact: true }).click(); await expect(dialog.getByText('数据已发生变化，请重新预览。')).toBeVisible(); await expect(dialog.getByRole('button', { name: '提交导入', exact: true })).toHaveCount(0)
    expect(state.writes[1].data.digest).toBe('digest-123')
  })
  test('locates a client across controllers and opens its AP context', async({ page }) => {
    const state = await mockWireless(page); await page.goto('/#/network/wireless?controller=1&issue=ap-availability'); await page.getByRole('button', { name: '跨控制器定位', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: '跨控制器定位', exact: true }); await dialog.getByLabel('名称、IP 或 MAC', { exact: true }).fill('10.10.1.8'); await dialog.getByRole('button', { name: '搜索', exact: true }).click(); await expect.poll(() => state.queries.some(url => url.pathname.endsWith('/clients') && url.searchParams.get('keyword') === '10.10.1.8')).toBe(true)
    await dialog.getByRole('button', { name: '查看详情', exact: true }).click(); await expect(page).toHaveURL(/controller=2/); await expect(page).toHaveURL(/client=21/); await expect(page).not.toHaveURL(/issue=/)
    await expect(page.getByRole('dialog', { name: '客户端详情', exact: true })).toContainText('00:11:22:aa:bb:cc')
  })
  test('read-only permissions hide mutations and retain data on a failed refresh', async({ page }) => {
    const state = await mockWireless(page, ['query']); await page.goto('/#/network/wireless?controller=1'); await expect(page.locator('.wireless-stats')).toBeVisible()
    for (const name of ['采集数据', '导入管理 CSV', '导出管理模板']) await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0)
    state.readFailed = true; await page.getByRole('button', { name: '刷新', exact: true }).click(); await expect(page.getByText('读取失败，已保留现有结果。')).toBeVisible(); await expect(page.locator('.wireless-stats')).toBeVisible(); expect(state.writes).toHaveLength(0)
  })
  test('restores resource filters on history navigation within the same tab', async({ page }) => {
    const state = await mockWireless(page); await page.goto('/#/network/wireless?controller=1&tab=access-points&keyword=AP-A')
    const keyword = page.getByLabel('名称、IP 或 MAC', { exact: true }); await expect(keyword).toHaveValue('AP-A')
    await page.evaluate(() => { location.hash = '/network/wireless?controller=1&tab=access-points&keyword=AP-B&apFilter=AP-B&vlan=10&status=run' })
    await expect(keyword).toHaveValue('AP-B')
    await expect.poll(() => state.queries.some(url => url.searchParams.get('ap') === 'AP-B' && url.searchParams.get('vlan') === '10' && url.searchParams.get('status') === 'run')).toBe(true)
    await page.goBack(); await expect(keyword).toHaveValue('AP-A')
  })
  test('retains the current resource page when a background refresh fails', async({ page }) => {
    const state = await mockWireless(page); await page.clock.install(); await page.goto('/#/network/wireless?controller=1&tab=access-points')
    await expect(page.locator('.wireless-resources').getByRole('button', { name: '查看详情', exact: true })).toHaveCount(2)
    state.resourcesFailed = true; await page.clock.runFor(15000)
    await expect(page.locator('.wireless-resources')).toContainText('读取失败，已保留现有结果。')
    await expect(page.locator('.wireless-resources').getByRole('button', { name: '查看详情', exact: true })).toHaveCount(2)
  })
  test('supports English dark mobile and keyboard tabs without document overflow', async({ page }) => {
    await page.addInitScript(() => { localStorage.setItem('locale', 'en-US'); localStorage.setItem('color-scheme', 'dark') }); await mockWireless(page); await page.goto('/#/network/wireless?controller=1')
    await expect(page.getByRole('heading', { name: 'Wireless management', exact: true })).toBeVisible(); await expect(page.locator('body')).toHaveAttribute('arco-theme', 'dark'); await shot(page, 'dark')
    const overview = page.getByRole('tab', { name: 'Overview', exact: true }); await overview.focus(); await overview.press('ArrowRight'); await expect(page).toHaveURL(/tab=access-points/)
    await page.setViewportSize({ width: 390, height: 844 }); await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await shot(page, 'mobile')
    await page.getByRole('button', { name: /^Controller groups · / }).click(); await expect(page.getByRole('dialog', { name: 'Controller groups', exact: true })).toBeVisible(); await page.keyboard.press('Escape'); await expect(page.getByRole('dialog', { name: 'Controller groups', exact: true })).not.toBeVisible()
  })
})
