import { test, expect, type Page } from '@playwright/test'
import { authenticate, installApiMocks, menuTree, userInfo } from './fixtures'

/**
 * The delivery order list's session handling.
 *
 * The page polls while orders are running and is kept alive between visits, so
 * the risks are a response landing after the reader left, and the previous
 * account's orders surviving a sign-in. The rest of the module is validated
 * against a real backend; see docs/NETWORK_DELIVERY_VALIDATION.md.
 */

const order = (id: number, title: string, status = 'succeeded') =>
  ({ id, requestNo: `D-${id}`, title, status, version: 1, deviceCount: 2, succeededCount: 2, failedCount: 0, uncertainCount: 0, cancelledCount: 0, createdBy: 1, createdByName: 'admin', createdAt: '2026-11-16T08:00:00Z', updatedAt: '2026-11-16T08:00:00Z', editable: false, executable: false, cancellable: false, retryable: false })

const DELIVERY_MENU = {
  path: '/network', component: 'Layout', visible: '0', menuName: 'NetworkManagement', menuType: 'M', title: '网络管理', icon: 'apps', noCache: false,
  children: [{ path: 'delivery', component: '/network/delivery/index', visible: '0', menuName: 'NetworkDeliveryManage', menuType: 'C', title: '配置下发', icon: 'send', noCache: false, children: null }]
}

const setup = async(page: Page) => {
  const state = { orders: [order(1, '核心交换机 ACL 调整')], listCalls: 0 }
  await installApiMocks(page)
  await page.route('**/api/v1/getinfo*', route => route.fulfill({ json: { ...userInfo, data: { ...userInfo.data, permissions: ['network:delivery:query'] }}}))
  await page.route('**/api/v1/menurole*', route => route.fulfill({ json: { code: 200, data: [...menuTree.data, DELIVERY_MENU] }}))
  await page.route('**/api/v1/network-delivery/options*', route => route.fulfill({ json: { code: 200, msg: '', data: { enabled: true, configured: true, concurrency: 4, graceSeconds: 60, maxTargets: 200, maxScriptBytes: 65536, profiles: [] }}}))
  await page.route('**/api/v1/network-delivery/orders?*', route => {
    state.listCalls++
    return route.fulfill({ json: { code: 200, msg: '', data: { list: state.orders, count: state.orders.length, pageIndex: 1, pageSize: 10 }}})
  })
  return state
}

test.beforeEach(async({ context }) => { await authenticate(context) })

test('lists orders with their state', async({ page }) => {
  await setup(page)
  await page.goto('/#/network/delivery')
  const table = page.locator('.arco-table')
  await expect(table).toContainText('核心交换机 ACL 调整')
  await expect(table).toContainText('成功')
})

// Signing in again without leaving the page: the new account's orders replace
// the old ones straight away, rather than waiting for the page to be revisited.
test('a new sign-in reloads the list at once and drops the previous account\'s orders', async({ page }) => {
  const state = await setup(page)
  await page.goto('/#/network/delivery')
  const table = page.locator('.arco-table')
  await expect(table).toContainText('核心交换机 ACL 调整')
  const before = state.listCalls

  state.orders = [order(2, '汇聚层 VLAN 下发')]
  await page.evaluate(async() => { const path = '/src/stores/user.ts'; const { useUserStore } = await import(path); useUserStore().token = 'another-session' })

  await expect.poll(() => state.listCalls).toBeGreaterThan(before)
  await expect(table).toContainText('汇聚层 VLAN 下发')
  await expect(table).not.toContainText('核心交换机 ACL 调整')
})

test('coming back to the kept-alive page reloads it', async({ page }) => {
  const state = await setup(page)
  await page.goto('/#/network/delivery')
  await expect(page.locator('.arco-table')).toContainText('核心交换机 ACL 调整')
  await page.goto('/#/dashboard')
  await expect(page.getByRole('heading', { name: '运维总览' })).toBeVisible()
  const before = state.listCalls

  state.orders = [order(3, '出口防火墙策略同步', 'running')]
  await page.goto('/#/network/delivery')
  await expect.poll(() => state.listCalls).toBeGreaterThan(before)
  await expect(page.locator('.arco-table')).toContainText('出口防火墙策略同步')
  await expect(page.locator('.arco-table')).toContainText('执行中')
})
