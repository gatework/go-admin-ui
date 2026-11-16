import { expect, test, type Page } from '@playwright/test'
import { authenticate, installApiMocks, userInfo } from './fixtures'
import { fabricFixture, problemFixture, changeFixture, endpointFixture, memberFixture } from '../../fixtures/network-fabric'
import type { ChangeCandidates } from '../../../src/types/network-fabric'

async function mockFabric(page: Page, permissions = ['list', 'query', 'edit', 'collect', 'preview', 'execute']) {
  await installApiMocks(page)
  const state = { fabric: fabricFixture(), plan: changeFixture(), candidates: { sourceDeviceId: 1, kind: 'vlan_vni_add', vni: 10100, ready: [{ deviceId: 2, name: 'SZX9-LEF-2', ip: '192.0.2.2', reason: 'missing_increment' }], unchanged: [], blocked: [] } as ChangeCandidates, writes: [] as { path: string, data: Record<string, unknown> }[], queries: [] as URL[], failDetail: false, failPreview: false }
  await page.route('**/api/v1/getinfo*', route => route.fulfill({ json: { ...userInfo, data: { ...userInfo.data, permissions: permissions.map(action => `network:fabric:${action}`) }}}))
  await page.route('**/api/v1/menurole*', route => route.fulfill({ json: { code: 200, data: [{ path: '/network', component: 'Layout', visible: '0', menuName: 'NetworkManagement', menuType: 'M', title: '网络管理', icon: 'branch', children: [{ path: 'fabric', component: '/network/fabric/index', visible: '0', menuName: 'NetworkFabricManage', menuType: 'C', title: 'Fabric 管理', icon: 'branch', noCache: false }] }] }}))
  const pageData = (list: unknown[]) => ({ list, count: list.length, pageIndex: 1, pageSize: 10 })
  await page.route('**/api/v1/network-fabrics**', route => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1/network-fabrics', '')
    const data = request.method() === 'GET' ? {} : request.postDataJSON()
    const ok = (data: unknown) => route.fulfill({ json: { code: 200, data, msg: '' }})
    if (request.method() !== 'GET') state.writes.push({ path, data })
    if (path === '') return ok(pageData([state.fabric]))
    if (path === '/1') return state.failDetail ? route.fulfill({ status: 503, json: { code: 503, msg: 'Detail unavailable' }}) : ok(state.fabric)
    if (path === '/rules/preview') return ok([{ ...memberFixture(), status: 'conflict', candidates: [1, 2] }])
    if (path === '/rules') return ok({ version: request.method() === 'PUT' ? 2 : 1, rules: data.rules || [{ fabricId: 1, pattern: '^SZX9-', enabled: true }], updatedAt: '2026-10-26T03:30:00Z' })
    if (path === '/members') return ok(pageData([memberFixture()]))
    if (path.startsWith('/members/')) return ok({ ...memberFixture(), ...data })
    if (path === '/endpoints') { state.queries.push(url); return ok(pageData([endpointFixture(), { ...endpointFixture(), vrf: 'ISOLATED', deviceId: 2, interface: '', remoteVtep: '192.0.2.12', kind: 'remote_vtep' }])) }
    if (path === '/1/settings') { Object.assign(state.fabric, data, { version: 2 }); return ok(state.fabric) }
    if (path === '/1/change-candidates') return ok({ ...state.candidates, sourceDeviceId: data.sourceDeviceId, kind: data.kind, vni: data.vni, direction: data.direction })
    if (path === '/1/collections') return ok(request.method() === 'GET' ? pageData([]) : { id: 31, fabricId: 1, ...data, version: 1, status: 'queued', createdAt: '2026-10-26T03:30:00Z', targets: [{ deviceId: 1, status: 'pending' }] })
    if (path === '/collections/31') return ok({ id: 31, fabricId: 1, version: 2, status: 'succeeded', targets: [{ deviceId: 1, status: 'complete' }] })
    if (path === '/1/changes') {
      if (request.method() === 'GET') return ok(pageData(url.searchParams.get('status') === 'active' && !['queued', 'running'].includes(state.plan.status) ? [] : [state.plan]))
      if (state.failPreview) return route.fulfill({ status: 503, json: { code: 503, msg: 'Preview unavailable' }})
      Object.assign(state.plan, data); return ok(state.plan)
    }
    if (path === '/changes/21/execute') { state.plan.status = 'queued'; state.plan.version++; return ok(state.plan) }
    if (path === '/changes/21/cancel') { state.plan.status = 'cancelled'; state.plan.version++; return ok(state.plan) }
    if (path === '/changes/21') return ok(state.plan)
    return route.fulfill({ status: 404, json: { code: 404, msg: path }})
  })
  return state
}

async function select(page: Page, label: string, option: string) {
  await page.getByLabel(label, { exact: true }).locator('..').click()
  await page.locator('.arco-select-dropdown:visible').last().getByText(option, { exact: true }).click()
}

test.describe('Fabric workspace', () => {
  test.use({ viewport: { width: 1440, height: 1100 }})
  test.beforeEach(async({ context }) => authenticate(context))

  test('navigates overview to a business problem, device and the same Fabric comparison with URL history', async({ page }) => {
    const state = await mockFabric(page)
    state.fabric = problemFixture()
    await page.goto('/#/network/fabric?fabric=1')
    await expect(page.locator('.fabric-issue-row')).toHaveCount(3)
    await expect(page.getByText('3 类问题 · 2 条检查发现', { exact: true })).toBeVisible()
    if (process.env.FABRIC_CAPTURE) await page.screenshot({ path: '../output/fabric-ui/problem-overview.png', animations: 'disabled' })
    await page.locator('.fabric-issue-row').filter({ hasText: 'PRODUCTION · VNI 10100' }).filter({ hasText: '业务网段覆盖' }).getByRole('button', { name: '查看全域对照', exact: true }).click()
    await expect(page).toHaveURL(/issue=production-10100-presence/)
    await expect(page.locator('.fabric-comparison-row')).toHaveCount(4)
    for (const status of ['受影响', '正常', '未知', '不适用']) await expect(page.locator('.fabric-comparison .arco-tag').getByText(status, { exact: true })).toBeVisible()
    if (process.env.FABRIC_CAPTURE) await page.screenshot({ path: '../output/fabric-ui/problem-comparison.png', animations: 'disabled' })
    const unknownFilter = page.locator('.fabric-issue-counts').getByRole('button', { name: '未知 1', exact: true })
    await unknownFilter.focus()
    await unknownFilter.press('Enter')
    await expect(page).toHaveURL(/issueStatus=unknown/)
    await expect(page.locator('.fabric-comparison-row')).toHaveCount(1)
    await expect(page.locator('.fabric-issue-counts').getByRole('button', { name: '正常 1', exact: true })).toBeVisible()
    await page.reload()
    await expect(page.locator('.fabric-comparison-row')).toHaveCount(1)
    await page.goBack()
    await expect(page.locator('.fabric-comparison-row')).toHaveCount(4)
    await page.locator('.fabric-comparison-row').filter({ hasText: 'SZX9-LEF-2' }).getByRole('button', { name: '查看设备', exact: true }).click()
    await expect(page).toHaveURL(/device=2/)
    const device = page.getByRole('dialog', { name: '证据详情', exact: true })
    await expect(device.getByRole('heading', { name: '此设备的问题', exact: true })).toBeVisible()
    await expect(device.locator('.fabric-node-issues .fabric-mobile-cell')).toHaveCount(2)
    if (process.env.FABRIC_CAPTURE) await page.screenshot({ path: '../output/fabric-ui/problem-device.png', animations: 'disabled' })
    await page.reload()
    await expect(device).toBeVisible()
    await device.getByRole('button', { name: '返回同类问题全域对照', exact: true }).click()
    await expect(device).not.toBeVisible()
    await expect(page).not.toHaveURL(/device=/)
    await expect(page.locator('.fabric-comparison-row')).toHaveCount(4)
    await page.locator('.fabric-issue-breadcrumb').getByRole('button', { name: '概览', exact: true }).click()
    await expect(page.locator('.fabric-issue-row')).toHaveCount(3)
    expect(state.writes).toEqual([])
  })

  test('starts with a device, returns to its business problem and retains scope filters and partial visibility', async({ page }) => {
    const state = await mockFabric(page)
    state.fabric = problemFixture()
    await page.goto('/#/network/fabric?fabric=1&tab=nodes')
    await page.getByLabel('按问题筛选设备', { exact: true }).click()
    await page.locator('.arco-select-dropdown:visible').last().getByText('受影响', { exact: true }).click()
    await expect(page).toHaveURL(/nodeStatus=affected/)
    await expect(page.getByRole('button', { name: 'SZX9-LEF-4', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'SZX9-LEF-2', exact: true }).click()
    const device = page.getByRole('dialog', { name: '证据详情', exact: true })
    await device.locator('.fabric-mobile-cell').filter({ hasText: 'ACL 方向绑定' }).getByRole('button', { name: '查看 Fabric 同类问题', exact: true }).click()
    await expect(page).toHaveURL(/issue=production-10100-acl-out/)
    await expect(page).toHaveURL(/nodeStatus=affected/)
    await expect(page.getByRole('heading', { name: 'ACL 方向绑定', exact: true })).toBeVisible()
    await expect(page.locator('.fabric-comparison-row')).toHaveCount(4)
    await page.locator('.fabric-issue-breadcrumb').getByRole('button', { name: '概览', exact: true }).click()
    await page.getByLabel('业务范围', { exact: true }).click()
    await page.locator('.arco-select-dropdown:visible').last().getByText('ISOLATED · VNI 20200', { exact: true }).click()
    await expect(page.locator('.fabric-issue-row')).toHaveCount(1)
    await page.reload()
    await expect(page.locator('.fabric-issue-row')).toHaveCount(1)
    await expect(page.locator('.fabric-issue-row')).toContainText('ISOLATED')
    state.fabric.completeScope = false
    state.fabric.issueGroups.forEach(group => { group.completeScope = false })
    await page.goto('/#/network/fabric?fabric=1&issue=production-10100-presence')
    await page.reload()
    await expect(page.getByText('仅展示有权查看的设备；不能据此判断整个区域健康。', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: '新增 VLAN / VNI', exact: true })).toHaveCount(0)
    state.fabric.issueGroups = []
    state.fabric.issueCount = 0
    await page.getByRole('button', { name: '刷新', exact: true }).click()
    await expect(page.getByText('此问题已不在当前分析中，已返回最新问题列表。', { exact: true })).toBeVisible()
    await expect(page.locator('.fabric-comparison-row')).toHaveCount(0)
  })

  test('problem comparisons and return links remain usable in dark English and narrow layouts', async({ page }) => {
    await page.addInitScript(() => { localStorage.setItem('locale', 'en-US'); localStorage.setItem('color-scheme', 'dark') })
    const state = await mockFabric(page)
    state.fabric = problemFixture()
    await page.goto('/#/network/fabric?fabric=1&issue=production-10100-presence')
    await expect(page.getByRole('heading', { name: 'Service segment coverage', exact: true })).toBeVisible()
    await expect(page.locator('body')).toHaveAttribute('arco-theme', 'dark')
    if (process.env.FABRIC_CAPTURE) await page.screenshot({ path: '../output/fabric-ui/problem-dark.png', animations: 'disabled' })
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.locator('#loader-wrapper')).not.toBeVisible()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.locator('.fabric-comparison-row')).toHaveCount(4)
    if (process.env.FABRIC_CAPTURE) await page.screenshot({ path: '../output/fabric-ui/problem-mobile.png', fullPage: true, animations: 'disabled' })
    await page.locator('.fabric-issue-counts').evaluate(element => element.scrollIntoView({ block: 'center' }))
    for (const status of ['Affected 1', 'Healthy 1', 'Unknown 1', 'Not applicable 1']) await expect(page.locator('.fabric-issue-counts').getByRole('button', { name: status, exact: true })).toBeInViewport({ ratio: 1 })
    if (process.env.FABRIC_CAPTURE) await page.screenshot({ path: '../output/fabric-ui/problem-mobile-statuses.png', animations: 'disabled' })
    const lastDevice = page.locator('.fabric-comparison-row').filter({ hasText: 'SZX9-LEF-4' })
    await lastDevice.scrollIntoViewIfNeeded()
    if (process.env.FABRIC_CAPTURE) await page.screenshot({ path: '../output/fabric-ui/problem-mobile-bottom.png', animations: 'disabled' })
    await lastDevice.getByRole('button', { name: 'Investigate device', exact: true }).click()
    const device = page.getByRole('dialog', { name: 'Evidence details', exact: true })
    await expect(device.getByRole('button', { name: 'Return to Fabric comparison', exact: true })).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (process.env.FABRIC_CAPTURE) await page.screenshot({ path: '../output/fabric-ui/problem-mobile-device.png', animations: 'disabled' })
    await device.getByRole('button', { name: 'Return to Fabric comparison', exact: true }).click()
    await expect(device).not.toBeVisible()
  })

  test('cross-Fabric endpoint navigation clears the previous problem and change context', async({ page }) => {
    const state = await mockFabric(page)
    state.fabric = problemFixture()
    await page.route('**/api/v1/network-fabrics/2', route => route.fulfill({ json: { code: 200, data: { ...problemFixture(), id: 2, code: 'SZX8', name: 'SZX8' }}}))
    await page.route('**/api/v1/network-fabrics/endpoints*', route => route.fulfill({ json: { code: 200, data: { list: [{ ...endpointFixture(), fabricId: 2, deviceName: 'SZX8-LEF-1' }], count: 1 }}}))
    await page.goto('/#/network/fabric?fabric=1&issue=production-10100-presence&issueStatus=unknown&nodeStatus=affected&kind=svi_acl&direction=out&targets=2&vni=10100&endpoint=10.1.0.8')
    await page.getByRole('button', { name: '跨区域查询', exact: true }).click()
    await page.getByRole('dialog', { name: '跨区域查询', exact: true }).getByRole('button', { name: 'SZX8-LEF-1', exact: true }).click()
    await expect(page).toHaveURL(/fabric=2/)
    await expect(page).toHaveURL(/device=1/)
    for (const key of ['issue', 'issueStatus', 'nodeStatus', 'kind', 'direction', 'targets', 'vni']) await expect(page).not.toHaveURL(new RegExp(`[?&]${key}=`))
    await expect(page.getByRole('dialog', { name: '证据详情', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'SZX8', exact: true })).toBeVisible()
  })

  test('opens evidence, preserves failed refresh, shares matrix and locates isolated endpoints', async({ page }) => {
    const state = await mockFabric(page)
    await page.goto('/#/network/fabric')
    await page.getByRole('button', { name: '查看详情', exact: true }).click()
    await expect(page).toHaveURL(/fabric=1/)
    await expect(page.getByText('50%', { exact: true })).toBeVisible()
    if (process.env.FABRIC_CAPTURE) await page.screenshot({ path: '../output/fabric-ui/overview.png', animations: 'disabled' })
    state.failDetail = true
    await page.getByRole('button', { name: '刷新', exact: true }).click()
    await expect(page.getByText('读取失败，请重试。已有结果保留。', { exact: true })).toBeVisible()
    await expect(page.getByText('50%', { exact: true })).toBeVisible()
    state.failDetail = false
    await page.locator('.fabric-detail > .arco-card-body > .arco-spin').getByRole('button', { name: '刷新', exact: true }).click()
    await expect(page.getByText('读取失败，请重试。已有结果保留。', { exact: true })).toHaveCount(0)
    await expect(page.locator('.arco-message')).toHaveCount(0, { timeout: 10000 })
    await page.getByRole('tab', { name: '设备与 vPC', exact: true }).click()
    await page.getByRole('button', { name: '证据详情', exact: true }).first().click()
    await expect(page.getByText('最近完整证据', { exact: true }).first()).toBeVisible()
    await page.keyboard.press('Escape')
    await page.getByRole('tab', { name: '网段与 ACL', exact: true }).click()
    await expect(page.locator('.fabric-matrix')).toContainText('APP-IN')
    await expect(page.locator('.fabric-matrix')).not.toContainText('SZX9-SPN')
    if (process.env.FABRIC_CAPTURE) await page.screenshot({ path: '../output/fabric-ui/matrix.png', animations: 'disabled' })
    await expect(page).toHaveURL(/tab=segments/)
    await page.reload()
    await expect(page.getByRole('tab', { name: '网段与 ACL', exact: true })).toHaveAttribute('aria-selected', 'true')
    await page.getByRole('tab', { name: '终端定位', exact: true }).click()
    await page.getByLabel('IP、MAC 或 CIDR', { exact: true }).fill('10.1.0.0/24')
    await page.locator('.fabric-endpoints').getByRole('button', { name: '搜索', exact: true }).click()
    await expect.poll(() => state.queries.at(-1)?.searchParams.get('keyword')).toBe('10.1.0.0/24')
    await expect(page.getByText('ISOLATED', { exact: true })).toBeVisible()
    await expect(page.getByText('远端 VTEP', { exact: true }).first()).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.getByRole('button', { name: '复制 IP', exact: true }).first().click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('10.1.0.8')
    await page.getByRole('button', { name: '跨区域查询', exact: true }).click()
    await expect.poll(() => state.queries.at(-1)?.searchParams.has('fabricId')).toBe(false)
    await page.getByRole('dialog', { name: '跨区域查询', exact: true }).getByRole('button', { name: 'SZX9-LEF-1', exact: true }).first().click()
    await expect(page.getByRole('tab', { name: '设备与 vPC', exact: true })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('dialog', { name: '证据详情', exact: true })).toBeVisible()
  })

  test('previews rules, invalidates stale previews, updates manual membership and collects', async({ page }) => {
    const state = await mockFabric(page)
    await page.goto('/#/network/fabric')
    await page.getByRole('button', { name: '归属规则与人工覆盖', exact: true }).click()
    const rules = page.getByRole('dialog', { name: '归属规则与人工覆盖', exact: true })
    await expect(rules.getByRole('button', { name: '保存', exact: true })).toBeDisabled()
    await rules.getByRole('button', { name: '生成预览', exact: true }).click()
    await expect(rules.getByText('冲突', { exact: true })).toBeVisible()
    await rules.getByLabel('名称表达式', { exact: true }).fill('^SZX9-LEF')
    await expect(rules.getByRole('button', { name: '保存', exact: true })).toBeDisabled()
    await rules.getByRole('button', { name: '生成预览', exact: true }).click()
    await rules.getByRole('button', { name: '保存', exact: true }).click()
    await expect.poll(() => state.writes.filter(row => row.path === '/rules').length).toBe(1)
    await rules.getByRole('button', { name: '修改', exact: true }).click()
    const member = page.getByRole('dialog', { name: '人工归属', exact: true })
    await member.getByText('人工指定', { exact: true }).click()
    await member.getByRole('button', { name: '保存', exact: true }).click()
    await expect.poll(() => state.writes.filter(row => row.path === '/members/2').length).toBe(1)
    await rules.getByRole('button', { name: '关闭', exact: true }).click()
    await page.getByRole('button', { name: '查看详情', exact: true }).click()
    await page.getByRole('button', { name: '采集证据', exact: true }).click()
    const collection = page.getByRole('dialog', { name: '采集证据', exact: true })
    await collection.getByRole('button', { name: '保存', exact: true }).click()
    await collection.getByRole('button', { name: '采集证据', exact: true }).click()
    await expect.poll(() => state.writes.filter(row => row.path === '/1/collections').length).toBe(1)
    await expect(collection.getByText('任务编号 #31', { exact: true })).toBeVisible()
    await collection.getByRole('button', { name: '刷新任务与回执', exact: true }).click()
    await expect(collection.getByText('完整', { exact: true })).toBeVisible()
  })

  test('requires explicit source and targets, previews immutable commands then confirms execution', async({ page }) => {
    const state = await mockFabric(page)
    await page.goto('/#/network/fabric?fabric=1&tab=changes')
    await page.getByRole('button', { name: '预览增量变更', exact: true }).click()
    const editor = page.getByRole('dialog', { name: '预览增量变更', exact: true })
    await expect(editor.getByRole('button', { name: '生成预览', exact: true })).toBeDisabled()
    await select(page, '标准设备', 'SZX9-LEF-1 · 192.0.2.1')
    await editor.getByLabel('VNI', { exact: true }).fill('10100')
    await editor.getByLabel('VNI', { exact: true }).press('Tab')
    await expect(editor.getByRole('checkbox', { name: /SZX9-LEF-2/ })).toBeChecked()
    await editor.getByRole('button', { name: '生成预览', exact: true }).click()
    await expect(editor.getByText('plan-v1', { exact: true })).toBeVisible()
    await editor.getByText('SZX9-LEF-2', { exact: true }).click()
    await expect(editor.locator('pre').first()).toContainText('vn-segment 10100')
    await expect(editor.locator('textarea')).toHaveCount(0)
    await editor.getByRole('button', { name: '确认执行', exact: true }).click()
    await page.getByRole('button', { name: '确定', exact: true }).click()
    await expect.poll(() => state.writes.filter(row => row.path === '/changes/21/execute').length).toBe(1)
    const preview = state.writes.find(row => row.path === '/1/changes')!.data
    expect(preview).toMatchObject({ sourceDeviceId: 1, targetDeviceIds: [2], vni: 10100, kind: 'vlan_vni_add' })
    expect(preview).not.toHaveProperty('commands')
    await expect(editor.getByText('排队中', { exact: true }).first()).toBeVisible()
  })

  test('mobile dark English uses per-segment device lists and accessible tab keys', async({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.addInitScript(() => { localStorage.setItem('locale', 'en-US'); localStorage.setItem('color-scheme', 'dark') })
    await mockFabric(page)
    await page.goto('/#/network/fabric?fabric=1&tab=segments')
    await expect(page.locator('.fabric-mobile-segment')).toContainText('APP-IN')
    await expect(page.locator('.fabric-matrix')).toHaveCount(0)
    await expect(page.locator('body')).toHaveAttribute('arco-theme', 'dark')
    if (process.env.FABRIC_CAPTURE) await page.screenshot({ path: '../output/fabric-ui/mobile-dark-matrix.png', animations: 'disabled' })
    const tab = page.getByRole('tab', { name: 'Segments', exact: true })
    await tab.focus(); await tab.press('ArrowRight')
    await expect(page.getByRole('tab', { name: 'Endpoints', exact: true })).toHaveAttribute('aria-selected', 'true')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (process.env.FABRIC_CAPTURE) await page.screenshot({ path: '../output/fabric-ui/mobile-dark.png', animations: 'disabled' })
  })

  test('list-only users cannot enter detail or start operations', async({ page }) => {
    const state = await mockFabric(page, ['list'])
    await page.goto('/#/network/fabric?fabric=1&tab=changes')
    await expect(page.getByRole('button', { name: '查看详情', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '预览增量变更', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '归属规则与人工覆盖', exact: true })).toHaveCount(0)
    expect(state.writes).toEqual([])
  })

  test('cancels a preview and prevents changes with partial visibility', async({ page }) => {
    await page.clock.install()
    const state = await mockFabric(page)
    await page.goto('/#/network/fabric?fabric=1&tab=changes')
    await page.getByRole('button', { name: '查看详情', exact: true }).click()
    const editor = page.getByRole('dialog', { name: '预览增量变更', exact: true })
    await expect(editor.getByText('plan-v1', { exact: true })).toBeVisible()
    await editor.getByRole('button', { name: '取消变更', exact: true }).click()
    await expect(editor.getByText('已取消', { exact: true })).toBeVisible()
    expect(state.writes.find(row => row.path.endsWith('/cancel'))?.data).toEqual({ version: 1 })
    await editor.getByRole('button', { name: '关闭', exact: true }).click()
    state.fabric.completeScope = false
    const restricted: string[] = []
    let partialDetails = 0
    page.on('request', request => {
      if (/network-fabrics\/1\/(changes|collections)/.test(request.url())) restricted.push(request.url())
      if (new URL(request.url()).pathname === '/api/v1/network-fabrics/1') partialDetails++
    })
    await page.reload()
    await expect(page.getByText('仅展示有权查看的设备；不能据此判断整个区域健康。', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '预览增量变更', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '采集证据', exact: true })).toHaveCount(0)
    await page.clock.runFor(15000)
    await expect.poll(() => partialDetails).toBe(2)
    expect(restricted).toEqual([])
  })

  test('desktop dark and small light layouts retain readable matrix controls', async({ page }) => {
    await page.addInitScript(() => localStorage.setItem('color-scheme', 'dark'))
    await mockFabric(page)
    await page.goto('/#/network/fabric?fabric=1&tab=segments')
    await expect(page.locator('.fabric-matrix')).toContainText('10.1.0.0/24')
    await expect(page.locator('.fabric-matrix')).toContainText('10.1.0.1/24')
    if (process.env.FABRIC_CAPTURE) await page.screenshot({ path: '../output/fabric-ui/desktop-dark.png', animations: 'disabled' })
    await page.evaluate(() => { localStorage.setItem('color-scheme', 'light'); const preferences = JSON.parse(localStorage.getItem('motor-admin-ui-preferences') || '{}'); localStorage.setItem('motor-admin-ui-preferences', JSON.stringify({ ...preferences, theme: 'light' })) })
    await page.setViewportSize({ width: 320, height: 844 })
    await page.reload()
    await expect(page.locator('.fabric-mobile-segment')).toContainText('网关: 10.1.0.1/24')
    await expect(page.locator('#loader-wrapper')).not.toBeVisible()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.locator('body')).not.toHaveAttribute('arco-theme', 'dark')
    if (process.env.FABRIC_CAPTURE) await page.screenshot({ path: '../output/fabric-ui/mobile-light.png', animations: 'disabled' })
  })

  for (const action of ['collect', 'preview', 'execute', 'edit']) {
    test(`${action} permission includes the detail reads required for its workflow`, async({ page }) => {
      await mockFabric(page, [action])
      await page.goto('/#/network/fabric')
      await page.getByRole('button', { name: '查看详情', exact: true }).click()
      await expect(page.getByText('50%', { exact: true })).toBeVisible()
      if (action === 'collect') await expect(page.getByRole('button', { name: '采集证据', exact: true })).toBeVisible()
      if (action === 'edit') await expect(page.getByRole('button', { name: '归属规则与人工覆盖', exact: true })).toBeVisible()
      if (action === 'preview' || action === 'execute') {
        await page.getByRole('tab', { name: '变更记录', exact: true }).click()
        if (action === 'preview') await expect(page.getByRole('button', { name: '预览增量变更', exact: true })).toBeEnabled()
        else {
          await page.getByRole('button', { name: '查看详情', exact: true }).click()
          await expect(page.getByRole('button', { name: '确认执行', exact: true })).toBeEnabled()
          await expect(page.getByRole('button', { name: '生成预览', exact: true })).toHaveCount(0)
        }
      }
    })
  }

  test('selects only missing devices, excludes matching and blocked devices, and lets users narrow the task', async({ page }) => {
    const state = await mockFabric(page)
    const node = state.fabric.nodes[1]
    state.fabric.nodes.push({ ...node, deviceId: 4, name: 'SZX9-LEF-4', ip: '192.0.2.4' }, { ...node, deviceId: 5, name: 'SZX9-LEF-5', ip: '192.0.2.5' }, { ...node, deviceId: 6, name: 'SZX9-LEF-6', ip: '192.0.2.6' })
    state.candidates.ready.push({ deviceId: 6, name: 'SZX9-LEF-6', ip: '192.0.2.6', reason: 'missing_increment' })
    state.candidates.unchanged = [{ deviceId: 4, name: 'SZX9-LEF-4', ip: '192.0.2.4', reason: 'already_consistent' }]
    state.candidates.blocked = [{ deviceId: 5, name: 'SZX9-LEF-5', ip: '192.0.2.5', reason: 'evidence_unavailable' }]
    await page.goto('/#/network/fabric?fabric=1&tab=changes')
    await page.getByRole('button', { name: '预览增量变更', exact: true }).click()
    const editor = page.getByRole('dialog', { name: '预览增量变更', exact: true })
    await select(page, '标准设备', 'SZX9-LEF-1 · 192.0.2.1')
    await editor.getByLabel('VNI', { exact: true }).fill('10100')
    await editor.getByLabel('VNI', { exact: true }).press('Tab')
    await expect(editor.getByRole('heading', { name: '需要此变更（2）', exact: true })).toBeVisible()
    await expect(editor.getByRole('heading', { name: '已一致（1）', exact: true })).toBeVisible()
    await expect(editor.getByRole('heading', { name: '受阻或证据不足（1）', exact: true })).toBeVisible()
    await expect(editor.getByRole('checkbox', { name: /SZX9-LEF-4|SZX9-LEF-5/ })).toHaveCount(0)
    await expect(editor.getByRole('checkbox', { name: /SZX9-LEF-2/ })).toBeChecked()
    await editor.getByText('SZX9-LEF-6', { exact: true }).click()
    await expect(editor.getByRole('checkbox', { name: /SZX9-LEF-6/ })).not.toBeChecked()
    await editor.getByRole('button', { name: '检查目标设备', exact: true }).click()
    await expect.poll(() => state.writes.filter(row => row.path === '/1/change-candidates').length).toBe(2)
    await expect(editor.getByRole('checkbox', { name: /SZX9-LEF-6/ })).not.toBeChecked()
    if (process.env.FABRIC_CAPTURE) await page.screenshot({ path: '../output/fabric-ui/missing-only-candidates.png', animations: 'disabled' })
    await editor.getByRole('button', { name: '生成预览', exact: true }).click()
    await expect.poll(() => state.writes.filter(row => row.path === '/1/changes').length).toBe(1)
    expect(state.writes.find(row => row.path === '/1/changes')?.data.targetDeviceIds).toEqual([2])
  })

  test('distinguishes confirmed vPC pairs from unresolved endpoint candidates', async({ page }) => {
    await mockFabric(page)
    await page.route('**/api/v1/network-fabrics/endpoints*', route => route.fulfill({ json: { code: 200, data: { list: [{ ...endpointFixture(), candidateCount: 3 }, { ...endpointFixture(), deviceId: 2, kind: 'vpc_dual_homed', candidateCount: 2, vpcGroupKey: '1:2' }], count: 2 }}}))
    await page.goto('/#/network/fabric?fabric=1&tab=endpoints&endpoint=10.1.0.8')
    await expect(page.getByText('3 个候选位置，接入归属尚未确认', { exact: true })).toBeVisible()
    await expect(page.getByText('已确认 vPC 配对 1:2', { exact: true })).toBeVisible()
  })

  test('a finding carries its exact change kind, direction and affected device scope into candidate checks', async({ page }) => {
    const state = await mockFabric(page)
    state.fabric.segments[0].cells[0].aclOut = 'APP-OUT'
    state.fabric.segments[0].cells[0].configuration.svi = { addresses: ['10.1.0.1/24'], vrf: 'PRODUCTION', acl_bindings: { in: 'APP-IN', out: 'APP-OUT' }}
    state.fabric.findings.push({ vni: 10100, code: 'repair_svi_acl_out', severity: 'warning', message: '1 台 Leaf 未绑定出方向 ACL', evidence: { deviceIds: [2] }, remediation: { kind: 'svi_acl', vni: 10100, direction: 'out', targetDeviceIds: [2] }})
    state.fabric.issueGroups.push({ ...problemFixture().issueGroups[2], key: 'acl-out-exact', title: '1 Leaf missing outbound ACL', findingIndices: [1] })
    state.fabric.issueCount = state.fabric.issueGroups.length
    state.fabric.findingCount = state.fabric.findings.length
    await page.goto('/#/network/fabric?fabric=1')
    await page.locator('.fabric-issue-row').filter({ hasText: '出方向 ACL' }).getByRole('button', { name: '查看全域对照', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'ACL 方向绑定', exact: true })).toBeVisible()
    if (process.env.FABRIC_CAPTURE) await page.screenshot({ path: '../output/fabric-ui/issue-entry.png', animations: 'disabled' })
    await page.getByRole('button', { name: '绑定已有 ACL', exact: true }).click()
    const editor = page.getByRole('dialog', { name: '预览增量变更', exact: true })
    await expect(editor.getByText('仅检查此问题涉及的 1 台设备；仍将按所选标准设备重新核对可执行条件。', { exact: true })).toBeVisible()
    await expect(editor.getByRole('radio', { name: '出方向 ACL', exact: true })).toBeChecked()
    await select(page, '标准设备', 'SZX9-LEF-1 · 192.0.2.1')
    await expect(editor.getByRole('checkbox', { name: /SZX9-LEF-2/ })).toBeChecked()
    expect(state.writes.find(row => row.path === '/1/change-candidates')?.data).toEqual({ sourceDeviceId: 1, kind: 'svi_acl', vni: 10100, direction: 'out', targetDeviceIds: [2] })
    await expect(editor.getByRole('region', { name: '所选标准设备的业务观测', exact: true })).toContainText('PRODUCTION')
    await expect(editor.getByRole('region', { name: '所选标准设备的业务观测', exact: true })).toContainText('APP-OUT')
    if (process.env.FABRIC_CAPTURE) await page.screenshot({ path: '../output/fabric-ui/issue-targets.png', animations: 'disabled' })
    await editor.getByRole('button', { name: '生成预览', exact: true }).click()
    await expect.poll(() => state.writes.filter(row => row.path === '/1/changes').length).toBe(1)
    expect(state.writes.find(row => row.path === '/1/changes')?.data).toMatchObject({ sourceDeviceId: 1, kind: 'svi_acl', vni: 10100, direction: 'out', targetDeviceIds: [2] })
  })
  test('tracks collection completion after its drawer closes and refreshes assessment once without losing context', async({ page }) => {
    const state = await mockFabric(page)
    let details = 0; let polls = 0
    await page.route('**/api/v1/network-fabrics/1', route => { details++; return route.fulfill({ json: { code: 200, data: state.fabric }}) })
    await page.route('**/api/v1/network-fabrics/collections/31', route => { polls++; return route.fulfill({ json: { code: 200, data: { id: 31, fabricId: 1, status: 'succeeded', targets: [] }}}) })
    await page.goto('/#/network/fabric?fabric=1&issue=runtime-bgp&issueStatus=unknown')
    await page.locator('.fabric-section-heading').first().getByRole('button', { name: '采集证据', exact: true }).click()
    const drawer = page.getByRole('dialog', { name: '采集证据', exact: true })
    await drawer.getByRole('button', { name: '采集证据', exact: true }).click()
    await expect(drawer.getByRole('heading', { name: '任务编号 #31', exact: true })).toBeVisible()
    await drawer.getByRole('button', { name: '关闭', exact: true }).click()
    const baseline = details
    await expect.poll(() => polls, { timeout: 8000 }).toBe(1)
    await expect.poll(() => details).toBe(baseline + 1)
    await expect(page).toHaveURL(/issue=runtime-bgp&issueStatus=unknown/)
    await expect(page.locator('.fabric-comparison-row')).toHaveCount(2)
  })
  test('restores an existing running change after a hidden window becomes visible', async({ page }) => {
    const state = await mockFabric(page); state.plan.status = 'running'
    let polls = 0
    await page.route('**/api/v1/network-fabrics/changes/21', route => { polls++; return route.fulfill({ json: { code: 200, data: state.plan }}) })
    await page.goto('/#/network/fabric?fabric=1')
    await expect.poll(() => polls).toBe(1)
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')) })
    const baseline = polls
    await page.waitForTimeout(3500); expect(polls).toBe(baseline)
    state.plan.status = 'succeeded'
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')) })
    await expect.poll(() => polls).toBe(baseline + 1)
    expect(state.writes).toEqual([])
  })
  test('uses source SVI VRF across duplicate VNI rows and locates only the issue VRF', async({ page }) => {
    const state = await mockFabric(page); state.fabric = problemFixture()
    state.fabric.segments.unshift({ ...state.fabric.segments[0], vrf: 'OTHER', cells: [{ ...state.fabric.segments[0].cells[1], configuration: { svi: { vrf: 'OTHER' }}}] })
    await page.goto('/#/network/fabric?fabric=1&issue=production-10100-presence')
    await page.getByRole('button', { name: '网段与 ACL', exact: true }).click()
    await expect(page).toHaveURL(/vrf=PRODUCTION/)
    await expect(page.locator('.fabric-selected-segment')).toHaveCount(1)
    await expect(page.locator('.fabric-selected-segment')).toContainText('PRODUCTION')
    await page.goto('/#/network/fabric?fabric=1&tab=changes&vni=10100&kind=vlan_vni_add&targets=2')
    await select(page, '标准设备', 'SZX9-LEF-1 · 192.0.2.1')
    const scope = page.getByRole('region', { name: '所选标准设备的业务观测', exact: true })
    await expect(scope).toContainText('PRODUCTION'); await expect(scope).not.toContainText('OTHER')
    expect(state.writes.find(row => row.path === '/1/change-candidates')?.data.targetDeviceIds).toEqual([2])
  })
  test('labels unresolved business attribution as Fabric-wide rather than default VRF', async({ page }) => {
    const state = await mockFabric(page); state.fabric = problemFixture()
    state.fabric.issueGroups.push({ ...state.fabric.issueGroups[0], key: 'unresolved', scope: 'fabric', vrf: undefined, check: 'fabric_gateway', title: '网关全域证据', remediations: [] })
    await page.goto('/#/network/fabric?fabric=1&issue=unresolved')
    await expect(page.getByText('Fabric 全域 · VNI 10100', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '网段与 ACL', exact: true })).toHaveCount(0)
    expect(state.writes).toEqual([])
  })
})

// Request counts describe the mounted workspace, including its shared detail queue.
async function observeSync(page: Page, state: Awaited<ReturnType<typeof mockFabric>>) {
  const counts = { detail: 0, collectionDiscovery: 0, changeDiscovery: 0, task: 0, concurrent: 0, maxConcurrent: 0 }
  let release: (() => void) | undefined
  const control = { hold: false, counts, release: () => { release?.(); release = undefined } }
  await page.route('**/api/v1/network-fabrics/1', async route => {
    counts.detail++; counts.concurrent++; counts.maxConcurrent = Math.max(counts.maxConcurrent, counts.concurrent)
    if (control.hold) await new Promise<void>(resolve => { release = resolve })
    counts.concurrent--
    await route.fulfill(state.failDetail ? { status: 503, json: { code: 503, msg: 'Detail unavailable' }} : { json: { code: 200, data: state.fabric }})
  })
  page.on('request', request => {
    const url = new URL(request.url())
    if (url.searchParams.get('status') === 'active') {
      if (url.pathname.endsWith('/collections')) counts.collectionDiscovery++
      if (url.pathname.endsWith('/changes')) counts.changeDiscovery++
    }
    if (/\/network-fabrics\/(collections|changes)\/\d+$/.test(url.pathname)) counts.task++
  })
  return control
}
async function hidden(page: Page, value: boolean) {
  await page.evaluate(value => { Object.defineProperty(document, 'hidden', { configurable: true, value }); document.dispatchEvent(new Event('visibilitychange')) }, value)
}
async function openSettings(page: Page) {
  await page.getByRole('button', { name: '采集证据', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: '采集证据', exact: true })
  await expect(drawer.getByLabel('运行与终端周期（分钟）', { exact: true })).toHaveValue('5')
  return drawer
}

test.describe('Fabric continuous synchronization', () => {
  test.use({ viewport: { width: 1440, height: 1100 }})
  test.beforeEach(async({ context, page }) => { await authenticate(context); await page.clock.install() })

  test('discovers external work after idle, tracks at three seconds, and preserves the filter and device drawer', async({ page }) => {
    const state = await mockFabric(page)
    const { counts } = await observeSync(page, state)
    await page.goto('/#/network/fabric?fabric=1&tab=nodes&nodeStatus=unknown&device=2')
    const drawer = page.getByRole('dialog', { name: '证据详情', exact: true })
    await expect(drawer).toBeVisible()
    await drawer.locator('.arco-collapse-item-header').first().click()
    const body = drawer.locator('.arco-drawer-body')
    await expect.poll(() => body.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true)
    const scrollTop = await body.evaluate(element => { element.scrollTop = 200; return element.scrollTop })
    expect(scrollTop).toBeGreaterThan(0)
    await expect.poll(() => counts.changeDiscovery).toBe(1)
    expect(counts).toMatchObject({ detail: 1, collectionDiscovery: 1, task: 0 })
    state.plan.status = 'running'
    await page.clock.runFor(15000)
    await expect.poll(() => counts.task).toBe(1)
    await expect.poll(() => counts.detail).toBe(2)
    expect(counts.changeDiscovery).toBe(2)
    await page.clock.runFor(3000)
    await expect.poll(() => counts.task).toBe(2)
    state.plan.status = 'succeeded'; state.plan.version++
    state.fabric.evidenceCoverage = 100
    await page.clock.runFor(3000)
    await expect.poll(() => counts.detail).toBe(3)
    await expect(drawer).toBeVisible()
    await expect(page).toHaveURL(/tab=nodes&nodeStatus=unknown&device=2/)
    expect(await body.evaluate(element => element.scrollTop)).toBeCloseTo(scrollTop, 0)
    expect(counts).toMatchObject({ collectionDiscovery: 2, changeDiscovery: 2, task: 3, maxConcurrent: 1 })
    expect(state.writes).toEqual([])
    console.log('external-work counts', counts)
  })

  test('periodic detail sees short external work and pauses both readers while hidden', async({ page }) => {
    const state = await mockFabric(page)
    const { counts } = await observeSync(page, state)
    await page.goto('/#/network/fabric?fabric=1')
    await expect(page.getByText('50%', { exact: true })).toBeVisible()
    await expect.poll(() => counts.changeDiscovery).toBe(1)
    state.fabric.evidenceCoverage = 100; state.fabric.assessmentId++
    await page.clock.runFor(15000)
    await expect(page.getByText('100%', { exact: true })).toBeVisible()
    await expect.poll(() => counts.changeDiscovery).toBe(2)
    await hidden(page, true)
    const baseline = { ...counts }
    await page.clock.runFor(45000)
    expect(counts).toEqual(baseline)
    await hidden(page, false)
    await expect.poll(() => counts.detail).toBe(3)
    await expect.poll(() => counts.changeDiscovery).toBe(3)
    expect(counts).toMatchObject({ collectionDiscovery: 3, task: 0, maxConcurrent: 1 })
    console.log('visibility counts', counts)
  })

  test('slow detail coalesces periodic ticks and simultaneous task completions without stopping task reads', async({ page }) => {
    const state = await mockFabric(page)
    state.plan.status = 'running'
    const sync = await observeSync(page, state)
    const rows = [31, 32].map(id => ({ id, fabricId: 1, version: 1, status: 'running', targets: [] }))
    await page.route('**/api/v1/network-fabrics/1/collections?**', route => route.fulfill({ json: { code: 200, data: { list: rows, count: 2 }}}))
    await page.route(/\/network-fabrics\/collections\/3[12]$/, route => route.fulfill({ json: { code: 200, data: rows.find(row => route.request().url().endsWith(String(row.id))) }}))
    await page.goto('/#/network/fabric?fabric=1')
    await expect.poll(() => sync.counts.task).toBe(3)
    sync.hold = true
    await page.getByRole('button', { name: '刷新', exact: true }).click()
    await expect.poll(() => sync.counts.detail).toBe(2)
    rows.forEach(row => { row.status = 'succeeded'; row.version++ }); state.plan.status = 'succeeded'; state.plan.version++
    await page.clock.runFor(3000)
    await expect.poll(() => sync.counts.task).toBe(6)
    await page.clock.runFor(30000)
    await expect.poll(() => sync.counts.changeDiscovery).toBe(3)
    expect(sync.counts.detail).toBe(2)
    sync.hold = false; sync.release()
    await expect.poll(() => sync.counts.detail).toBe(3)
    expect(sync.counts.maxConcurrent).toBe(1)
    expect(sync.counts.task).toBe(6)
    console.log('coalesced counts', sync.counts)
  })

  test('pristine settings follow detail while dirty settings retain their version until explicit reload and authoritative save', async({ page }) => {
    const state = await mockFabric(page)
    const sync = await observeSync(page, state)
    await page.goto('/#/network/fabric?fabric=1')
    const drawer = await openSettings(page)
    const runtime = drawer.getByLabel('运行与终端周期（分钟）', { exact: true })
    state.fabric.version = 2; state.fabric.runtimeMinutes = 8
    await page.clock.runFor(15000)
    await expect(runtime).toHaveValue('8')
    await runtime.fill('12')
    await expect(runtime).toBeFocused()
    state.fabric.version = 3; state.fabric.runtimeMinutes = 9
    await page.clock.runFor(15000)
    await expect(drawer.getByText('设置已在其他位置更新，当前草稿已保留。', { exact: true })).toBeVisible()
    await expect(runtime).toHaveValue('12')
    await expect(runtime).toBeFocused()
    const baseline = sync.counts.detail
    await drawer.getByRole('button', { name: '载入最新设置', exact: true }).click()
    await expect(runtime).toHaveValue('9')
    expect(sync.counts.detail).toBe(baseline)
    await runtime.fill('14'); await runtime.press('Tab')
    await page.route('**/api/v1/network-fabrics/1/settings', route => {
      state.writes.push({ path: '/1/settings', data: route.request().postDataJSON() })
      Object.assign(state.fabric, { version: 4, runtimeMinutes: 15, configMinutes: 60, collectionEnabled: true })
      return route.fulfill({ json: { code: 200, data: state.fabric }})
    })
    await drawer.getByRole('button', { name: '保存', exact: true }).click()
    await expect(runtime).toHaveValue('15')
    await expect(drawer.getByLabel('配置周期（分钟）', { exact: true })).toHaveValue('60')
    expect(state.writes.at(-1)?.data).toEqual({ version: 3, runtimeMinutes: 14, configMinutes: 30, collectionEnabled: false })
  })

  test('conflict reload joins the real queue, retains draft on swallowed failure, and ignores a late closed-drawer completion', async({ page }) => {
    const state = await mockFabric(page)
    const sync = await observeSync(page, state)
    await page.route('**/api/v1/network-fabrics/1/settings', route => {
      state.writes.push({ path: '/1/settings', data: route.request().postDataJSON() })
      return route.fulfill({ status: 409, json: { code: 409, msg: 'Settings conflict' }})
    })
    await page.goto('/#/network/fabric?fabric=1')
    const drawer = await openSettings(page)
    const runtime = drawer.getByLabel('运行与终端周期（分钟）', { exact: true })
    const save = drawer.getByRole('button', { name: '保存', exact: true })
    const reload = drawer.getByRole('button', { name: '载入最新设置', exact: true })
    await runtime.fill('12'); await runtime.press('Tab'); await save.click()
    await expect(save).toBeDisabled()
    state.failDetail = true
    await reload.click()
    await expect(drawer.getByText('未能取得更新的设置，草稿已保留，请重试。', { exact: true })).toBeVisible()
    await expect(runtime).toHaveValue('12'); await expect(save).toBeDisabled()
    state.failDetail = false; sync.hold = true
    await reload.click()
    await expect.poll(() => sync.counts.detail).toBe(3)
    await drawer.getByRole('button', { name: '关闭', exact: true }).click()
    await page.getByRole('button', { name: '采集证据', exact: true }).click()
    // Closing unmounts CollectionPanel. Protect the newly opened draft from the old reload.
    await expect(runtime).toHaveValue('5')
    await runtime.fill('17'); await runtime.press('Tab')
    state.fabric.version = 2; state.fabric.runtimeMinutes = 8
    sync.hold = false; sync.release()
    await expect(drawer.getByText('设置已在其他位置更新，当前草稿已保留。', { exact: true })).toBeVisible()
    await expect(runtime).toHaveValue('17'); await expect(save).toBeEnabled()
    await reload.click(); await expect(runtime).toHaveValue('8'); await expect(save).toBeEnabled()
    await runtime.fill('16'); await runtime.press('Tab'); await save.click(); await expect(save).toBeDisabled()
    sync.hold = true
    await page.clock.runFor(15000)
    await expect.poll(() => sync.counts.detail).toBe(4)
    await reload.click()
    state.fabric.version = 3; state.fabric.runtimeMinutes = 10
    sync.hold = false; sync.release()
    await expect.poll(() => sync.counts.detail).toBe(5)
    await expect(runtime).toHaveValue('10'); await expect(save).toBeEnabled()
    expect(sync.counts.maxConcurrent).toBe(1)
    expect(state.writes).toHaveLength(2)
    console.log('settings queue counts', sync.counts)
  })

  for (const mode of ['light', 'dark', 'narrow'] as const) {
    test(`settings conflict warning and reload actions remain reachable in ${mode}`, async({ page }) => {
      if (mode === 'dark') await page.addInitScript(() => localStorage.setItem('color-scheme', 'dark'))
      if (mode === 'narrow') await page.setViewportSize({ width: 390, height: 844 })
      await mockFabric(page)
      await page.route('**/api/v1/network-fabrics/1/settings', route => route.fulfill({ json: { code: 409, msg: 'Settings conflict' }}))
      await page.goto('/#/network/fabric?fabric=1')
      const drawer = await openSettings(page)
      await drawer.getByLabel('运行与终端周期（分钟）', { exact: true }).fill('12')
      await drawer.getByRole('button', { name: '保存', exact: true }).click()
      const reload = drawer.getByRole('button', { name: '载入最新设置', exact: true })
      await expect(reload).toBeVisible(); await reload.scrollIntoViewIfNeeded()
      await expect(reload).toBeInViewport({ ratio: 1 })
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      if (mode === 'dark') await expect(page.locator('body')).toHaveAttribute('arco-theme', 'dark')
      const toast = page.getByText('Settings conflict', { exact: true })
      await expect(toast).toHaveCount(1)
      await page.clock.runFor(3500)
      await expect(toast).not.toBeVisible()
      if (process.env.FABRIC_CAPTURE) await page.screenshot({ path: `../output/fabric-ui/settings-conflict-${mode}.png`, animations: 'disabled' })
      await reload.focus(); await reload.press('Enter')
      await expect(drawer.getByText('未能取得更新的设置，草稿已保留，请重试。', { exact: true })).toBeVisible()
    })
  }
})
