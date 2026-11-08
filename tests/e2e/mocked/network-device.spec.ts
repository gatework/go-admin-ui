import { expect, test, type Page } from '@playwright/test'
import type { Device, DeviceGroupNode } from '../../../src/types/network'
import { authenticate, installApiMocks, userInfo } from './fixtures'

const device: Device = {
  id: 7, ip: '192.0.2.7', name: 'DC-CORE-SW-01', hostname: 'dc-core.example.test', serial: 'SERIAL-7',
  vendor: 'Cisco', model: 'C9500', os: 'IOS XE', osVersion: '17.12', location: 'DC Room A', contact: 'Network team',
  description: 'Core switch', macAddress: '00:11:22:33:44:55', sourceTags: ['netdisco'],
  sourceCreatedAt: '2026-10-01T10:00:00', lastDiscoveredAt: '2026-10-26T02:00:00Z',
  lastSyncedAt: '2026-10-26T02:01:00Z', createdAt: '2026-10-01T10:00:00Z', updatedAt: '2026-10-26T02:01:00Z', version: 3,
  group: 'DC', groupId: 2, groupSource: 'auto', classificationSource: 'auto', status: 'active', deviceType: 'switch', deviceRole: 'core_switch', owner: 'Lee',
  contactEmail: 'lee@example.test', contactPhone: '', tags: ['production'], notes: 'Keep source details read-only'
}

const group = (id: number, name: string, parentId: number | null = null, children: DeviceGroupNode[] = []): DeviceGroupNode => ({ id, name, code: `site.${id}`, parentId, children, description: '', enabled: true, position: 0, version: 2, directDeviceCount: children.length ? 0 : 1, deviceCount: 1 })

async function inventoryMock(page: Page, permissions = ['list', 'query', 'edit', 'sync', 'export']) {
  await installApiMocks(page)
  const state = {
    record: structuredClone(device), queries: [] as URLSearchParams[], exports: [] as URLSearchParams[],
    writes: [] as Record<string, unknown>[], syncs: 0, conflict: false, syncFailed: false, detailFailed: false,
    configured: true, empty: false, detailDelay: 0, writeDelay: 0,
    groups: [group(1, 'Campus', null, [group(2, 'DC', 1)]), { ...group(3, 'Retired'), enabled: false, deviceCount: 0, directDeviceCount: 0 }],
    groupWrites: [] as Record<string, unknown>[], assignments: [] as Record<string, unknown>[], groupFailed: false, groupConflict: false, listDelay: 0,
    additionalRecords: [] as Device[]
  }
  await page.route('**/api/v1/getinfo*', route => route.fulfill({ json: { ...userInfo, data: { ...userInfo.data, permissions: permissions.map(action => action.includes(':') ? action : `network:device:${action}`) }}}))
  await page.route('**/api/v1/menurole*', route => route.fulfill({ json: { code: 200, data: [{
    path: '/network', component: 'Layout', visible: '0', menuName: 'NetworkManagement', menuType: 'M', title: '网络管理', icon: 'network', noCache: false,
    children: [{ path: 'device', component: '/network/device/index', visible: '0', menuName: 'NetworkDeviceManage', menuType: 'C', title: '设备管理', icon: 'desktop', noCache: false, children: null }]
  }] }}))
  await page.route('**/api/v1/network-device**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const endpoint = url.pathname.split('/').at(-1)
    if (url.pathname.includes('network-device-group')) {
      if (request.method() === 'GET') {
        if (state.groupFailed) return route.fulfill({ status: 500, json: { code: 500, msg: 'Group read failed', data: null }})
        return route.fulfill({ json: { code: 200, data: { items: state.groups, totalDeviceCount: 1, ungroupedDeviceCount: 0 }}})
      }
      state.groupWrites.push({ method: request.method(), ...request.postDataJSON() })
      if (state.groupConflict) return route.fulfill({ json: { code: 409, msg: 'Group conflict', data: null }})
      if (request.method() === 'POST') {
        const item = { ...group(4, ''), ...request.postDataJSON(), deviceCount: 0, directDeviceCount: 0 }
        state.groups.push(item)
        return route.fulfill({ json: { code: 200, data: item }})
      }
      if (request.method() === 'DELETE') state.groups = state.groups.filter(item => item.id !== Number(endpoint))
      return route.fulfill({ json: { code: 200, data: null }})
    }
    if (endpoint === 'assign-group') {
      state.assignments.push(request.postDataJSON())
      if (state.writeDelay) await new Promise(resolve => setTimeout(resolve, state.writeDelay))
      if (state.conflict) return route.fulfill({ json: { code: 409, msg: 'Version conflict', data: null }})
      return route.fulfill({ json: { code: 200, data: { updated: request.postDataJSON().devices.length }}})
    }
    if (endpoint === 'options') return route.fulfill({ json: { code: 200, data: { vendors: ['Cisco'], models: ['C9500'] }}})
    if (endpoint === 'sync-status') return route.fulfill({ json: { code: 200, data: { configured: state.configured, status: state.syncFailed ? 'failed' : 'succeeded', lastSuccessAt: device.lastSyncedAt, deviceCount: state.empty ? 0 : 1 }}})
    if (endpoint === 'sync') {
      state.syncs++
      if (state.syncFailed) return route.fulfill({ status: 502, json: { code: 502, msg: 'Sync failed', data: null }})
      return route.fulfill({ json: { code: 200, data: { imported: 1, updated: 2, total: 3, syncedAt: device.lastSyncedAt }}})
    }
    if (endpoint === 'export') {
      state.exports.push(url.searchParams)
      return route.fulfill({ contentType: 'text/csv; charset=utf-8', body: 'ip,name\n192.0.2.7,DC-CORE-SW-01\n' })
    }
    if (endpoint === '7') {
      if (request.method() === 'PUT') {
        state.writes.push(request.postDataJSON())
        if (state.writeDelay) await new Promise(resolve => setTimeout(resolve, state.writeDelay))
        if (state.conflict) return route.fulfill({ json: { code: 409, msg: 'Version conflict', data: null }})
        state.record = { ...state.record, ...request.postDataJSON(), version: state.record.version + 1 }
        return route.fulfill({ json: { code: 200, data: state.record }})
      }
      if (state.detailDelay) await new Promise(resolve => setTimeout(resolve, state.detailDelay))
      if (state.detailFailed) return route.fulfill({ status: 500, json: { code: 500, msg: 'Read failed', data: null }})
      return route.fulfill({ json: { code: 200, data: state.record }})
    }
    state.queries.push(url.searchParams)
    if (state.listDelay) await new Promise(resolve => setTimeout(resolve, state.listDelay))
    const list = state.empty || (url.searchParams.get('keyword') && !state.record.name.includes(url.searchParams.get('keyword')!)) ? [] : [state.record, ...state.additionalRecords]
    return route.fulfill({ json: { code: 200, data: { list, count: list.length, pageIndex: 1, pageSize: 10 }}})
  })
  return state
}

test.describe('device inventory', () => {
  test.beforeEach(async({ context }) => authenticate(context))

  test('filters, resets, opens source details and restores keyboard focus', async({ page }) => {
    const state = await inventoryMock(page)
    await page.goto('/#/network/device')
    await expect(page.getByRole('button', { name: device.name, exact: true })).toBeVisible()
    await expect(page.getByRole('textbox', { name: '台账状态', exact: true })).toBeVisible()
    await expect(page.locator('.pro-table__toolbar').getByRole('button', { name: '同步台账', exact: true })).toBeVisible()
    await page.getByPlaceholder('名称、IP、序列号、厂商、型号或位置').fill('no-such-device')
    await page.locator('.pro-table__search').getByRole('button', { name: '搜索', exact: true }).click()
    await expect(page.getByText('没有符合筛选条件的设备')).toBeVisible()
    expect(state.queries.at(-1)?.get('keyword')).toBe('no-such-device')
    await page.getByRole('button', { name: '重置筛选', exact: true }).click()
    const trigger = page.getByRole('button', { name: device.name, exact: true })
    await trigger.click()
    const detail = page.getByRole('dialog', { name: '设备详情', exact: true })
    await expect(detail.getByText('SERIAL-7', { exact: true })).toBeVisible()
    await expect(detail.getByText('来源资料', { exact: true })).toBeVisible()
    await expect(detail.getByText('2026-10-01 10:00:00', { exact: true })).toBeVisible()
    await detail.getByRole('button', { name: '关闭', exact: true }).click()
    await expect(trigger).toBeFocused()
  })

  test('edits only metadata and keeps a conflicted draft until explicitly reloaded', async({ page }) => {
    const state = await inventoryMock(page)
    await page.goto('/#/network/device')
    await page.getByRole('row', { name: /DC-CORE-SW-01/ }).getByRole('button', { name: '修改', exact: true }).click()
    const editor = page.getByRole('dialog', { name: '编辑台账', exact: true })
    await expect(editor.getByLabel('负责人', { exact: true })).toHaveValue('Lee')
    await expect(editor.getByText(device.name, { exact: true })).toBeVisible()
    await expect(editor.getByRole('textbox', { name: '设备类型', exact: true })).toBeDisabled()
    await editor.getByLabel('负责人', { exact: true }).fill('New owner')
    state.conflict = true
    await editor.getByRole('button', { name: '保存', exact: true }).click()
    await expect(editor.getByText('台账已被其他操作更新', { exact: true })).toBeVisible()
    await expect(page.locator('.arco-message-content').filter({ hasText: 'Version conflict' })).toHaveCount(1)
    await expect(editor.getByLabel('负责人', { exact: true })).toHaveValue('New owner')
    expect(state.writes[0]).toMatchObject({ owner: 'New owner', version: 3, groupSource: 'auto', classificationSource: 'auto', groupId: 2 })
    expect(state.writes[0]).not.toHaveProperty('ip')
    expect(state.writes[0]).not.toHaveProperty('serial')
    state.record.owner = 'Concurrent owner'
    state.record.version = 4
    state.conflict = false
    await editor.getByRole('button', { name: '丢弃草稿并重新加载', exact: true }).click()
    await expect(editor.getByLabel('负责人', { exact: true })).toHaveValue('Concurrent owner')
    await editor.getByLabel('负责人', { exact: true }).fill('Reviewed owner')
    await editor.getByRole('button', { name: '保存', exact: true }).click()
    await expect(editor).not.toBeVisible()
    expect(state.writes[1]).toMatchObject({ owner: 'Reviewed owner', version: 4 })
  })

  test('group tree searches and selects a subtree, then keeps applied scope for export and reset', async({ page }) => {
    const state = await inventoryMock(page)
    await page.goto('/#/network/device')
    const tree = page.getByRole('tree', { name: '设备分组' })
    await expect(tree.getByRole('treeitem', { name: /Campus/ })).toBeVisible()
    await page.getByPlaceholder('搜索分组').fill('DC')
    await expect(tree.getByRole('treeitem', { name: /DC/ })).toBeVisible()
    await expect(tree.getByRole('treeitem', { name: /Retired/ })).toHaveCount(0)
    await tree.getByRole('treeitem', { name: /DC/ }).click()
    await expect.poll(() => state.queries.at(-1)?.get('groupId')).toBe('2')
    await page.getByPlaceholder('名称、IP、序列号、厂商、型号或位置').fill('CORE')
    await page.locator('.pro-table__search').getByRole('button', { name: '搜索', exact: true }).click()
    await expect.poll(() => state.queries.at(-1)?.get('keyword')).toBe('CORE')
    await tree.getByRole('treeitem', { name: /未分组/ }).click()
    await expect.poll(() => state.queries.at(-1)?.get('groupId')).toBe('0')
    expect(state.queries.at(-1)?.get('keyword')).toBe('CORE')
    expect(state.queries.at(-1)?.get('pageIndex')).toBe('1')
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: '导出', exact: true }).click()
    await download
    expect(state.exports[0]?.get('groupId')).toBe('0')
    await page.locator('.pro-table__search').getByRole('button', { name: '重置', exact: true }).click()
    await expect.poll(() => state.queries.at(-1)?.has('groupId')).toBe(false)
    expect(state.queries.at(-1)?.get('keyword')).toBe('')
    await expect(tree.getByRole('treeitem', { name: /全部设备/ })).toHaveAttribute('aria-selected', 'true')
  })

  test('group tree supports keyboard traversal and keeps disabled groups readable', async({ page }) => {
    const state = await inventoryMock(page)
    await page.goto('/#/network/device')
    const tree = page.getByRole('tree', { name: '设备分组' })
    const all = tree.getByRole('treeitem', { name: /全部设备/ })
    await all.focus()
    await page.keyboard.press('ArrowDown')
    await expect(tree.getByRole('treeitem', { name: /未分组/ })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect.poll(() => state.queries.at(-1)?.get('groupId')).toBe('0')
    await page.keyboard.press('ArrowDown')
    const campus = tree.getByRole('treeitem', { name: /Campus/ })
    await expect(campus).toBeFocused()
    await page.keyboard.press('ArrowLeft')
    await expect(campus).toHaveAttribute('aria-expanded', 'false')
    await page.keyboard.press('ArrowRight')
    await expect(campus).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('ArrowRight')
    await expect(tree.getByRole('treeitem', { name: /DC/ })).toBeFocused()
    await page.keyboard.press('End')
    await expect(tree.getByRole('treeitem', { name: /Retired.*已停用/ })).toBeFocused()
    await page.keyboard.press(' ')
    await expect.poll(() => state.queries.at(-1)?.get('groupId')).toBe('3')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('textbox', { name: '查找设备', exact: true })).toBeFocused()
  })

  test('group CRUD validates fields, retains conflicts and excludes descendants from parent choices', async({ page }) => {
    const state = await inventoryMock(page, ['list', 'query', 'edit', 'network:device-group:add', 'network:device-group:edit', 'network:device-group:remove'])
    await page.goto('/#/network/device')
    await page.getByRole('button', { name: '新增分组', exact: true }).click()
    const create = page.getByRole('dialog', { name: '新增分组', exact: true })
    await create.getByRole('button', { name: '保存', exact: true }).click()
    await expect(create.getByText('请输入分组名称', { exact: true })).toBeVisible()
    expect(state.groupWrites).toHaveLength(0)
    await create.getByRole('textbox', { name: '分组名称', exact: true }).fill('Lab')
    await create.getByRole('textbox', { name: '分组编码', exact: true }).fill(' SITE.LAB ')
    await create.getByRole('button', { name: '保存', exact: true }).click()
    await expect(create).not.toBeVisible()
    expect(state.groupWrites[0]).toMatchObject({ method: 'POST', code: 'site.lab', name: 'Lab', parentId: null, enabled: true, position: 0 })
    const tree = page.getByRole('tree', { name: '设备分组' })
    await tree.getByRole('treeitem', { name: /Campus/ }).click()
    await page.getByRole('button', { name: '分组操作', exact: true }).click()
    await expect(page.getByRole('menuitem', { name: '删除', exact: true })).toHaveAttribute('aria-disabled', 'true')
    await page.getByRole('menuitem', { name: '修改', exact: true }).click()
    const editor = page.getByRole('dialog', { name: '编辑分组', exact: true })
    await expect(editor.getByRole('textbox', { name: '分组编码', exact: true })).toBeDisabled()
    await editor.locator('.arco-select-view-single').filter({ has: page.getByRole('textbox', { name: '上级分组', exact: true }) }).click()
    const popup = page.locator('.arco-select-dropdown:visible')
    await expect(popup.getByText('Campus', { exact: true })).toHaveCount(0)
    await expect(popup.getByText('DC', { exact: true })).toHaveCount(0)
    await page.keyboard.press('Escape')
    await editor.getByRole('textbox', { name: '分组名称', exact: true }).fill('Campus draft')
    state.groupConflict = true
    await editor.getByRole('button', { name: '保存', exact: true }).click()
    await expect(editor.getByText('分组已发生变化', { exact: true })).toBeVisible()
    await expect(editor.getByRole('textbox', { name: '分组名称', exact: true })).toHaveValue('Campus draft')
    expect(state.groupWrites[1]).toMatchObject({ method: 'PUT', name: 'Campus draft', version: 2 })
    state.groupFailed = true
    const failedRefresh = page.waitForResponse(response => response.url().endsWith('/network-device-group') && response.status() === 500)
    await editor.getByRole('button', { name: '丢弃草稿并重新加载', exact: true }).click()
    await failedRefresh
    await expect(editor.getByRole('textbox', { name: '分组名称', exact: true })).toHaveValue('Campus draft')
    await expect(editor.getByText('分组已发生变化', { exact: true })).toBeVisible()
    state.groupFailed = false
    state.groups[0]!.name = 'Campus updated'
    state.groups[0]!.version = 3
    await editor.getByRole('button', { name: '丢弃草稿并重新加载', exact: true }).click()
    await expect(editor.getByRole('textbox', { name: '分组名称', exact: true })).toHaveValue('Campus updated')
    await editor.getByRole('button', { name: '取消', exact: true }).click()
    await tree.getByRole('treeitem', { name: /Retired/ }).click()
    await page.getByRole('button', { name: '分组操作', exact: true }).click()
    await page.getByRole('menuitem', { name: '删除', exact: true }).click()
    await page.getByRole('dialog', { name: '提示', exact: true }).getByRole('button', { name: '删除', exact: true }).click()
    await expect(page.getByText('分组未删除，可能已被修改或仍有子分组、设备。刷新后重试。')).toBeVisible()
    await expect(tree.getByRole('treeitem', { name: /Retired/ })).toBeVisible()
  })

  test('a duplicate group code keeps the creation draft editable and child creation carries its parent', async({ page }) => {
    const state = await inventoryMock(page, ['list', 'network:device-group:add'])
    await page.goto('/#/network/device')
    await page.getByRole('treeitem', { name: /Campus/ }).click()
    const trigger = page.getByRole('button', { name: '分组操作', exact: true })
    await trigger.click()
    await page.getByRole('menuitem', { name: '新增子分组', exact: true }).click()
    const create = page.getByRole('dialog', { name: '新增分组', exact: true })
    await create.getByRole('textbox', { name: '分组名称', exact: true }).fill('Lab')
    await create.getByRole('textbox', { name: '分组编码', exact: true }).fill('site.1')
    state.groupConflict = true
    await create.getByRole('button', { name: '保存', exact: true }).click()
    await expect(create.getByText('保存未完成。请检查网络后重试，当前草稿已保留。', { exact: true })).toBeVisible()
    await expect(create.getByRole('button', { name: '保存', exact: true })).toBeEnabled()
    await expect(create.getByRole('textbox', { name: '分组名称', exact: true })).toHaveValue('Lab')
    await create.getByRole('textbox', { name: '分组编码', exact: true }).fill('site.lab')
    state.groupConflict = false
    await create.getByRole('button', { name: '保存', exact: true }).click()
    await expect(create).not.toBeVisible()
    await expect(trigger).toBeFocused()
    expect(state.groupWrites[1]).toMatchObject({ code: 'site.lab', name: 'Lab', parentId: 1 })
  })

  test('returning to automatic classification shows the saved values and preserves a disabled manual group', async({ page }) => {
    const state = await inventoryMock(page)
    state.record = { ...state.record, group: 'Retired', groupId: 3, groupSource: 'manual', classificationSource: 'manual', deviceType: 'router', deviceRole: 'other' }
    await page.goto('/#/network/device')
    await page.getByRole('row', { name: /DC-CORE-SW-01/ }).getByRole('button', { name: '修改', exact: true }).click()
    const editor = page.getByRole('dialog', { name: '编辑台账', exact: true })
    const field = (label: string) => editor.locator('.arco-select-view-single').filter({ has: page.getByRole('textbox', { name: label, exact: true }) })
    await field('分组').click()
    await expect(page.locator('.arco-select-dropdown:visible .arco-select-option').filter({ hasText: 'Retired' })).not.toHaveClass(/disabled/)
    await page.keyboard.press('Escape')
    await field('设备类型').click()
    await page.locator('.arco-select-dropdown:visible').getByText('防火墙', { exact: true }).click()
    await field('分类方式').click()
    await page.locator('.arco-select-dropdown:visible').getByText('按设备名称自动识别', { exact: true }).click()
    await expect(field('设备类型')).toContainText('路由器')
    await expect(editor.getByRole('textbox', { name: '设备类型', exact: true })).toBeDisabled()
    await editor.getByRole('textbox', { name: '负责人', exact: true }).fill('Reviewed')
    await editor.getByRole('button', { name: '保存', exact: true }).click()
    await expect(editor).not.toBeVisible()
    expect(state.writes[0]).toMatchObject({ groupId: 3, groupSource: 'manual', classificationSource: 'auto', owner: 'Reviewed' })
  })

  test('group read failures can be retried and group mutation permissions are independent', async({ page }) => {
    const state = await inventoryMock(page)
    state.groupFailed = true
    await page.goto('/#/network/device')
    const panel = page.getByRole('region', { name: '设备分组' })
    await expect(panel.getByText('分组读取失败', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '新增分组', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '分组操作', exact: true })).toHaveCount(0)
    state.groupFailed = false
    await panel.getByRole('button', { name: '重试', exact: true }).click()
    await expect(panel.getByRole('treeitem', { name: /Campus/ })).toBeVisible()
  })

  test('batch assignment is atomic, handles stale selection, and clears selection as queries begin', async({ page }) => {
    const state = await inventoryMock(page)
    state.additionalRecords = [{ ...device, id: 8, name: 'DC-ACCESS-SW-02', version: 6 }]
    await page.goto('/#/network/device')
    const toolbar = page.locator('.pro-table__toolbar')
    const batch = toolbar.getByRole('button', { name: '调整分组', exact: true })
    await expect(batch).toBeDisabled()
    await page.locator('.arco-table thead .arco-checkbox').click()
    await batch.click()
    const assignment = page.getByRole('dialog', { name: '调整分组', exact: true })
    await expect(assignment.getByText('已选择 2 台设备', { exact: true })).toBeVisible()
    state.conflict = true
    await assignment.getByRole('button', { name: '保存', exact: true }).click()
    await expect(assignment.getByText('所选设备已发生变化', { exact: true })).toBeVisible()
    expect(state.assignments[0]).toEqual({ devices: [{ id: 7, version: 3 }, { id: 8, version: 6 }], groupId: null, groupSource: 'auto' })
    await assignment.getByRole('button', { name: '刷新并重新选择', exact: true }).click()
    await expect(assignment).not.toBeVisible()
    await expect(batch).toBeDisabled()
    await page.getByRole('row', { name: /DC-CORE-SW-01/ }).locator('.arco-checkbox').click()
    await expect(batch).toBeEnabled()
    state.listDelay = 400
    await page.locator('.pro-table__search').getByRole('button', { name: '搜索', exact: true }).click()
    await expect(batch).toBeDisabled()
    await expect(page.getByRole('row', { name: /DC-CORE-SW-01/ }).getByRole('checkbox')).not.toBeChecked()
  })

  test('single assignment chooses manual Ungrouped and automatic classification stays independent', async({ page }) => {
    const state = await inventoryMock(page)
    await page.goto('/#/network/device')
    const row = page.getByRole('row', { name: /DC-CORE-SW-01/ })
    await row.getByRole('button', { name: '操作', exact: true }).click()
    await page.getByRole('menuitem', { name: '调整分组', exact: true }).click()
    const assignment = page.getByRole('dialog', { name: '调整分组', exact: true })
    await assignment.locator('.arco-select-view-single').filter({ has: page.getByRole('textbox', { name: '分组方式', exact: true }) }).click()
    await page.locator('.arco-select-dropdown:visible').getByText('手工指定分组', { exact: true }).click()
    await assignment.locator('.arco-select-view-single').filter({ has: page.getByRole('textbox', { name: '分组', exact: true }) }).click()
    const popup = page.locator('.arco-select-dropdown:visible')
    await expect(popup.locator('.arco-select-option-disabled').filter({ hasText: 'Retired' })).toBeVisible()
    await popup.getByText('未分组', { exact: true }).click()
    await assignment.getByRole('button', { name: '保存', exact: true }).click()
    await expect(assignment).not.toBeVisible()
    expect(state.assignments[0]).toEqual({ devices: [{ id: 7, version: 3 }], groupId: null, groupSource: 'manual' })
    await row.getByRole('button', { name: '修改', exact: true }).click()
    const editor = page.getByRole('dialog', { name: '编辑台账', exact: true })
    await editor.locator('.arco-select-view-single').filter({ has: page.getByRole('textbox', { name: '分类方式', exact: true }) }).click()
    await page.locator('.arco-select-dropdown:visible').getByText('手工指定', { exact: true }).click()
    await expect(editor.getByRole('textbox', { name: '设备类型', exact: true })).toBeEnabled()
    await editor.getByRole('button', { name: '保存', exact: true }).click()
    await expect(editor).not.toBeVisible()
    expect(state.writes[0]).toMatchObject({ groupId: 2, groupSource: 'auto', classificationSource: 'manual', deviceRole: 'core_switch' })
  })

  test('a late assignment response cannot revive a drawer or old inventory after session changes', async({ page }) => {
    const state = await inventoryMock(page)
    state.writeDelay = 450
    await page.goto('/#/network/device')
    await page.getByRole('row', { name: /DC-CORE-SW-01/ }).locator('.arco-checkbox').click()
    await page.locator('.pro-table__toolbar').getByRole('button', { name: '调整分组', exact: true }).click()
    const assignment = page.getByRole('dialog', { name: '调整分组', exact: true })
    const response = page.waitForResponse(request => request.url().endsWith('/network-device/assign-group'))
    await assignment.getByRole('button', { name: '保存', exact: true }).dblclick()
    await expect(assignment.getByRole('button', { name: '取消', exact: true })).toBeDisabled()
    await page.evaluate(async() => { const path = '/src/stores/user.ts'; const { useUserStore } = await import(path); useUserStore().token = 'replacement-session' })
    await response
    await expect(assignment).not.toBeVisible()
    await expect(page.getByRole('button', { name: device.name, exact: true })).toHaveCount(0)
    await expect(page.getByText('已调整 1 台设备的分组', { exact: true })).toHaveCount(0)
    expect(state.assignments).toHaveLength(1)
  })

  test('phone group navigation filters inventory and returns focus to its trigger', async({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const state = await inventoryMock(page)
    await page.goto('/#/network/device')
    const trigger = page.getByRole('button', { name: '设备分组 · 全部设备', exact: true })
    await trigger.click()
    const drawer = page.getByRole('dialog', { name: '设备分组', exact: true })
    await drawer.getByRole('treeitem', { name: /DC/ }).click()
    await expect(drawer).not.toBeVisible()
    await expect.poll(() => state.queries.at(-1)?.get('groupId')).toBe('2')
    await expect(page.getByRole('button', { name: '设备分组 · DC', exact: true })).toBeFocused()
    await expect(page.locator('.pro-card').first()).toContainText('核心交换机')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })

  test('shows sync counts, preserves the list on failure and exports applied filters', async({ page }) => {
    const state = await inventoryMock(page)
    await page.goto('/#/network/device')
    await page.getByRole('button', { name: '同步台账', exact: true }).click()
    await expect(page.getByText('同步完成：新增 1 台，更新 2 台，共 3 台。')).toBeVisible()
    state.syncFailed = true
    await page.getByRole('button', { name: '同步台账', exact: true }).click()
    await expect(page.getByText('同步未完成，已有台账保持不变。可稍后重试同步。')).toBeVisible()
    await expect(page.getByRole('button', { name: device.name, exact: true })).toBeVisible()
    await page.getByPlaceholder('名称、IP、序列号、厂商、型号或位置').fill('CORE')
    await page.locator('.pro-table__search').getByRole('button', { name: '搜索', exact: true }).click()
    await expect.poll(() => state.queries.at(-1)?.get('keyword')).toBe('CORE')
    await page.getByPlaceholder('名称、IP、序列号、厂商、型号或位置').fill('unsent draft')
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: '导出', exact: true }).click()
    const file = await download
    expect(file.suggestedFilename()).toMatch(/\.csv$/)
    const stream = await file.createReadStream()
    let csv = ''
    for await (const chunk of stream!) csv += chunk.toString()
    expect(csv).toContain('192.0.2.7,DC-CORE-SW-01')
    expect(state.exports[0]?.get('keyword')).toBe('CORE')
    expect(state.exports[0]?.has('pageIndex')).toBe(false)
    expect(state.syncs).toBe(2)
  })

  test('query-only users see source status and details without mutation controls', async({ page }) => {
    await inventoryMock(page, ['list', 'query'])
    await page.goto('/#/network/device')
    await expect(page.getByText('来源：Netdisco')).toBeVisible()
    await expect(page.getByRole('button', { name: '同步台账', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '修改', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '导出', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: device.name, exact: true }).click()
    await expect(page.getByRole('dialog', { name: '设备详情', exact: true })).toBeVisible()
  })

  test('lists without query permission keep the device identity as plain text', async({ page }) => {
    await inventoryMock(page, ['list'])
    await page.goto('/#/network/device')
    await expect(page.getByRole('cell', { name: /DC-CORE-SW-01/ })).toBeVisible()
    await expect(page.getByRole('button', { name: device.name, exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '查看', exact: true })).toHaveCount(0)
  })

  test('list-only users see the unconfigured source instead of a first-sync empty state', async({ page }) => {
    const state = await inventoryMock(page, ['list'])
    state.configured = false
    state.empty = true
    await page.goto('/#/network/device')
    await expect(page.getByText('尚未配置 Netdisco', { exact: true })).toBeVisible()
    await expect(page.getByText('尚无设备台账', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '同步台账', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '修改', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '导出', exact: true })).toHaveCount(0)
  })

  test('list-only users see failed sync warnings and the last success alongside existing rows', async({ page }) => {
    const state = await inventoryMock(page, ['list'])
    state.syncFailed = true
    await page.goto('/#/network/device')
    await expect(page.getByRole('cell', { name: /DC-CORE-SW-01/ })).toBeVisible()
    await expect(page.getByText('同步未完成，已有台账保持不变。可稍后重试同步。')).toBeVisible()
    await expect(page.locator('.pro-table__toolbar')).toContainText('最近同步:')
    await expect(page.locator('.pro-table__toolbar')).toContainText('2026-10-26')
    await expect(page.locator('.pro-table__toolbar')).not.toContainText('尚未同步')
    await expect(page.getByRole('button', { name: device.name, exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '查看', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '同步台账', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '修改', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '导出', exact: true })).toHaveCount(0)
  })

  test('renders unconfigured and retryable detail errors explicitly', async({ page }) => {
    const state = await inventoryMock(page)
    state.configured = false
    state.empty = true
    await page.goto('/#/network/device')
    await expect(page.getByText('尚未配置 Netdisco', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '同步台账', exact: true })).toBeDisabled()
    state.configured = true
    state.empty = false
    await page.getByRole('button', { name: '刷新', exact: true }).click()
    state.detailFailed = true
    await page.getByRole('button', { name: device.name, exact: true }).click()
    const detail = page.getByRole('dialog', { name: '设备详情', exact: true })
    await expect(detail.getByText('设备详情读取失败', { exact: true })).toBeVisible()
    state.detailFailed = false
    await detail.getByRole('button', { name: '重试', exact: true }).click()
    await expect(detail.getByText('SERIAL-7', { exact: true })).toBeVisible()
  })

  test('mobile English dark mode retains cards and reachable full-width drawer actions', async({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.addInitScript(() => { localStorage.setItem('locale', 'en-US'); localStorage.setItem('color-scheme', 'dark') })
    await inventoryMock(page)
    await page.goto('/#/network/device')
    await expect(page.locator('.pro-card').first()).toBeVisible()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.getByRole('button', { name: 'Page actions', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Sync inventory', exact: true })).toBeInViewport()
    await expect(page.locator('.pro-table__fab-menu')).toContainText('2026-10-26')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('button', { name: 'Page actions', exact: true }).click()
    await page.getByRole('button', { name: device.name, exact: true }).click()
    const detail = page.getByRole('dialog').filter({ hasText: 'Source details' })
    await expect(detail).toBeVisible()
    const box = await detail.boundingBox()
    expect(box?.width).toBeGreaterThanOrEqual(380)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(detail.locator('.arco-drawer-footer').getByRole('button', { name: 'Close', exact: true })).toBeVisible()
    const footer = await detail.locator('.arco-drawer-footer').boundingBox()
    expect(footer!.y + footer!.height).toBeLessThanOrEqual(844)
    expect((await detail.locator('.arco-drawer-footer').getByRole('button', { name: 'Close', exact: true }).boundingBox())!.height).toBeGreaterThanOrEqual(44)
    await detail.locator('.arco-drawer-footer').getByRole('button', { name: 'Edit', exact: true }).click()
    const editor = page.getByRole('dialog', { name: 'Edit inventory', exact: true })
    await expect(editor.getByRole('textbox', { name: 'Owner', exact: true })).toHaveValue('Lee')
    expect(await editor.getByRole('textbox', { name: 'Owner', exact: true }).evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16)
    expect((await editor.locator('.arco-input-wrapper').first().boundingBox())!.height).toBeGreaterThanOrEqual(44)
    expect((await editor.locator('.arco-drawer-footer').getByRole('button', { name: 'Save', exact: true }).boundingBox())!.height).toBeGreaterThanOrEqual(44)
    const editorFooter = await editor.locator('.arco-drawer-footer').boundingBox()
    expect(editorFooter!.y + editorFooter!.height).toBeLessThanOrEqual(844)
  })

  test('closing a loading detail prevents its late response from reopening the drawer', async({ page }) => {
    const state = await inventoryMock(page)
    state.detailDelay = 300
    await page.goto('/#/network/device')
    const response = page.waitForResponse(request => request.url().endsWith('/network-device/7'))
    await page.getByRole('button', { name: device.name, exact: true }).click()
    const detail = page.getByRole('dialog', { name: '设备详情', exact: true })
    await detail.getByRole('button', { name: '关闭', exact: true }).click()
    await response
    await expect(detail).not.toBeVisible()
    await expect(page.getByRole('button', { name: device.name, exact: true })).toBeFocused()
  })

  test('a pending save disables the draft and does not submit twice', async({ page }) => {
    const state = await inventoryMock(page)
    state.writeDelay = 400
    await page.goto('/#/network/device')
    await page.getByRole('row', { name: /DC-CORE-SW-01/ }).getByRole('button', { name: '修改', exact: true }).click()
    const editor = page.getByRole('dialog', { name: '编辑台账', exact: true })
    await expect(editor.getByLabel('负责人', { exact: true })).toHaveValue('Lee')
    await editor.getByRole('button', { name: '保存', exact: true }).dblclick()
    await expect(editor.getByLabel('负责人', { exact: true })).toBeDisabled()
    await expect(editor.getByRole('button', { name: '取消', exact: true })).toBeDisabled()
    await expect(editor).not.toBeVisible()
    expect(state.writes).toHaveLength(1)
  })
})
