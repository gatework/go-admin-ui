import { test, expect, type Page } from '@playwright/test'
import { authenticate, installApiMocks, menuTree } from './fixtures'

/**
 * The operations overview everyone lands on after signing in.
 *
 * It has no endpoint of its own: every figure is another module's list or
 * status call. So what can go wrong is at the seams -- a module the account
 * cannot open still being fetched, one module's outage blanking the rest, a
 * failed call read as a zero.
 */

const leaf = (path: string, component: string, menuName: string, title: string) =>
  ({ path, component, visible: '0', menuName, menuType: 'C', title, icon: 'apps', noCache: false, children: null })

const NETWORK = {
  path: '/network', component: 'Layout', visible: '0', menuName: 'NetworkManagement', menuType: 'M', title: '网络管理', icon: 'apps', noCache: false,
  children: [
    leaf('device', '/network/device/index', 'NetworkDeviceManage', '设备管理'),
    leaf('circuit', '/network/circuit/index', 'NetworkCircuitManage', '专线管理'),
    leaf('fabric', '/network/fabric/index', 'NetworkFabricManage', 'Fabric 管理'),
    leaf('delivery', '/network/delivery/index', 'NetworkDeliveryManage', '配置下发')
  ]
}

const page0 = <T>(list: T[], count = list.length) => ({ code: 200, msg: '', data: { list, count, pageIndex: 1, pageSize: 10 }})
const fabric = (id: number, code: string, state: string, issueCount: number) =>
  ({ id, code, name: code, state, issueCount, evidenceCoverage: 92, memberCount: 12, leafCount: 8, completeScope: true, observedAt: '2026-11-16T08:00:00Z' })
const order = (id: number, title: string, status: string) =>
  ({ id, requestNo: `D-${id}`, title, status, deviceCount: 4, succeededCount: 3, failedCount: 1, createdAt: '2026-11-16T08:00:00Z' })

interface Options { menu?: unknown[], circuitDown?: boolean }

const setup = async(page: Page, { menu = [...menuTree.data, NETWORK], circuitDown = false }: Options = {}) => {
  const calls: string[] = []
  await installApiMocks(page)
  await page.route('**/api/v1/menurole*', route => route.fulfill({ json: { code: 200, data: menu }}))
  await page.route('**/api/v1/network-**', route => {
    const url = new URL(route.request().url())
    calls.push(url.pathname)
    const path = url.pathname.replace('/api/v1/', '')
    if (path === 'network-device-group') return route.fulfill({ json: { code: 200, msg: '', data: { items: [], totalDeviceCount: 978, ungroupedDeviceCount: 12 }}})
    if (path === 'network-device/sync-status') return route.fulfill({ json: { code: 200, msg: '', data: { configured: true, status: 'succeeded', deviceCount: 978, lastSuccessAt: '2026-11-16T08:00:00Z' }}})
    if (path === 'network-circuit') return circuitDown ? route.fulfill({ json: { code: 500, msg: 'zabbix unreachable' }}) : route.fulfill({ json: page0([], url.searchParams.get('monitored') ? 31 : 46) })
    if (path === 'network-fabrics') return route.fulfill({ json: page0([fabric(1, 'DC-A', 'healthy', 0), fabric(2, 'DC-B', 'drifted', 3)]) })
    if (path === 'network-delivery/orders') return route.fulfill({ json: page0([order(7, '核心交换机 ACL 调整', 'partially_failed')], 18) })
    return route.fulfill({ json: page0([]) })
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/#/dashboard')
  await expect(page.getByRole('heading', { name: '运维总览' })).toBeVisible()
  return calls
}

const stat = (page: Page, label: string) => page.locator('.stat-strip__item', { has: page.locator('dt', { hasText: label }) })

test.beforeEach(async({ context }) => { await authenticate(context) })

test('shows each module\'s figures and links them to the module', async({ page }) => {
  await setup(page)
  await expect(stat(page, '设备').first().locator('strong')).toHaveText('978')
  await expect(stat(page, '设备').first()).toContainText('未分组 12 台')
  await expect(stat(page, '台账同步').locator('strong')).toHaveText('正常')
  await expect(stat(page, '专线').locator('strong')).toHaveText('46')
  await expect(stat(page, '专线')).toContainText('已接入监控 31 条')
  await expect(stat(page, '下发工单').locator('strong')).toHaveText('18')
  await stat(page, '专线').click()
  await expect(page).toHaveURL(/#\/network\/circuit/)
})

test('puts the Fabric region with open issues first and flags it', async({ page }) => {
  await setup(page)
  const rows = page.locator('.overview__panel', { hasText: 'Fabric 区域状态' }).locator('.overview__row')
  await expect(rows.first()).toContainText('DC-B')
  await expect(rows.first()).toContainText('3 类问题')
  await expect(stat(page, 'Fabric 区域')).toContainText('1 个区域存在待处理问题')
  await expect(stat(page, 'Fabric 区域')).toHaveClass(/is-warn/)
})

test('lists recent delivery orders with their state', async({ page }) => {
  await setup(page)
  const panel = page.locator('.overview__panel', { hasText: '最近下发工单' })
  await expect(panel).toContainText('核心交换机 ACL 调整')
  await expect(panel).toContainText('部分失败')
  await expect(panel).toContainText('3 / 4 台')
})

// A module that is down is its own tile's problem: no toast, no zero, and the rest still load.
test('one module failing leaves the others standing and raises no toast', async({ page }) => {
  await setup(page, { circuitDown: true })
  await expect(stat(page, '专线')).toContainText('暂时无法读取')
  await expect(stat(page, '专线').locator('strong')).toHaveText('—')
  await expect(stat(page, '设备').first().locator('strong')).toHaveText('978')
  await expect(page.locator('.arco-message')).toHaveCount(0)
})

test('neither draws nor fetches a module the account cannot open', async({ page }) => {
  const menu = [...menuTree.data, { ...NETWORK, children: NETWORK.children.filter(item => item.menuName === 'NetworkDeviceManage') }]
  const calls = await setup(page, { menu })
  await expect(stat(page, '设备').first().locator('strong')).toHaveText('978')
  await expect(stat(page, '专线')).toHaveCount(0)
  await expect(page.locator('.overview__module')).toHaveCount(1)
  expect(calls.filter(path => !path.includes('network-device'))).toEqual([])
})

test('says so when the account has no network module at all', async({ page }) => {
  await setup(page, { menu: menuTree.data })
  await expect(page.getByText('当前账户未开通网络管理模块')).toBeVisible()
  await expect(page.locator('.stat-strip')).toHaveCount(0)
})

test('fits a phone without scrolling sideways', async({ page }) => {
  await setup(page)
  await page.setViewportSize({ width: 375, height: 812 })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
})
