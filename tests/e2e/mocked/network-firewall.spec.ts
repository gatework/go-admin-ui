import { expect, test, type Page } from '@playwright/test'
import { authenticate, installApiMocks, userInfo } from './fixtures'
import type { Analysis, Draft, Input, Normalized, SavedRequest } from '../../../src/types/firewall'
const normalized = (): Normalized => ({ rows: [{ key: 'line-1', source: '10.0.0.1', destination: '10.1.0.2', service: '443', notes: '', line: 1, sources: [{ value: '10.0.0.1', kind: 'address' }], destinations: [{ value: '10.1.0.2', kind: 'address' }], services: [{ value: 'tcp/443', kind: 'service' }], corrections: [{ field: 'service', token: '443', code: 'default_protocol', value: 'tcp/443' }], issues: [], status: 'ready' }], defaultProtocol: 'tcp', issues: [] })
const traffic = { icmpType: '', icmpCode: '', source: '10.0.0.1', destination: '10.1.0.2', protocol: 'tcp', sourcePort: '1-65535', destinationPort: '443' }
const analysis = (): Analysis => ({ id: 9, requestId: 4, requestVersion: 2, status: 'succeeded', at: '2026-10-29T01:00:00Z', stale: false, errorCode: '', result: { complete: false, issues: [], items: [{ rowKey: 'line-1', instanceId: 1, instanceName: 'Firewall A', revision: 'rev-1', scope: 'vsys1', routingScope: 'default', fromZone: 'trust', toZone: 'untrust', hitSide: 'source', basis: 'connected', status: 'partial', original: [traffic], policyView: 'native_policy', packetStatus: 'unknown', packetUnknown: [traffic], allowed: [], denied: [], unmatched: [traffic], unknown: [], trace: [], nat: [], issues: [{ field: '', token: '', code: 'packet_semantics_unavailable' }] }] }})
const draft = (): Draft => ({ id: 12, requestId: 4, analysisId: 9, title: 'Web access', version: 1, status: 'needs_review', stale: false, notes: '', result: { complete: false, at: '2026-10-29T01:00:00Z', items: [{ instanceId: 1, revision: 'rev-1', settingsVersion: 3, rowKeys: ['line-1'], status: 'needs_review', baseDigest: 'base-digest', resultDigest: '', changes: [], issues: [{ field: '', token: '', code: 'packet_semantics_unavailable' }], targetSatisfied: false, outsidePreserved: false, natUnchanged: true }] }})
async function mockFirewall(page: Page, permissions = ['list', 'query', 'import', 'edit', 'design']) {
  await installApiMocks(page)
  const state = { currentRevision: 'rev-1', writes: [] as { path: string, data: Record<string, unknown> }[], failed: false, conflict: false, delaySave: 0, deviceQueries: [] as URL[], request: { id: 4, title: 'Web access', domainId: 1, version: 2, input: { defaultProtocol: 'tcp', rows: [], text: '10.0.0.1\t10.1.0.2\t443' }, normalized: normalized(), createdAt: '', updatedAt: '' } as SavedRequest, analysis: analysis(), draft: draft() }
  await page.route('**/api/v1/getinfo*', route => route.fulfill({ json: { ...userInfo, data: { ...userInfo.data, permissions: permissions.map(p => `network:firewall:${p}`) }}}))
  await page.route('**/api/v1/menurole*', route => route.fulfill({ json: { code: 200, data: [{ path: '/network', component: 'Layout', visible: '0', menuName: 'NetworkManagement', menuType: 'M', title: '网络管理', children: [{ path: 'firewall', component: '/network/firewall/index', visible: '0', menuName: 'NetworkFirewallObjects', menuType: 'C', title: '防火墙对象' }, { path: 'firewall/query', component: '/network/firewall/query', visible: '0', menuName: 'NetworkFirewallQuery', menuType: 'C', title: '策略查询' }, { path: 'firewall/design', component: '/network/firewall/design', visible: '0', menuName: 'NetworkFirewallDesign', menuType: 'C', title: '策略设计' }] }] }}))
  await page.route('**/api/v1/network-device-group*', route => route.fulfill({ json: { code: 200, data: { items: [{ id: 2, name: 'Datacenter', code: 'dc', parentId: null, children: [], enabled: true, version: 1, deviceCount: 1, directDeviceCount: 1, position: 0, description: '' }], totalDeviceCount: 1, ungroupedDeviceCount: 0 }}}))
  await page.route(/\/api\/v1\/network-device(?:\?|$)/, route => { state.deviceQueries.push(new URL(route.request().url())); return route.fulfill({ json: { code: 200, data: { list: [{ id: 21, name: 'Inventory FW', ip: '192.0.2.21', vendor: 'paloalto' }], count: 1 }}}) })
  await page.route('**/api/v1/network-firewall/**', async route => {
    const request = route.request(); const path = new URL(request.url()).pathname.replace('/api/v1/network-firewall', ''); const body = request.method() === 'GET' ? {} : request.postDataJSON() as Record<string, unknown>
    const ok = (data: unknown) => route.fulfill({ json: { code: 200, data, msg: '' }}); const paged = (list: unknown[]) => ok({ list, count: list.length, pageIndex: 1, pageSize: 20 })
    const collection = { id: 25, kind: 'capture', status: 'partial', createdAt: '', cancelRequested: false, targets: [{ id: 1, instanceId: 1, deviceId: 1, name: 'Firewall A', ip: '192.0.2.1', status: 'partial', stage: 'finished', revision: 'rev-2', snapshotId: 4, complete: false, errorCode: 'capture_incomplete', sessionClosed: true }] }
    if (path === '/collection-batches') return paged([collection])
    if (path === '/collection-batches/25') return ok(collection)
    if (path === '/devices') { state.deviceQueries.push(new URL(request.url())); return paged([{ id: 21, name: 'Inventory FW', ip: '192.0.2.21', vendor: 'paloalto', status: 'pending', connection: { vendor: 'paloalto', profile: 'palo_alto', ready: false, reason: 'credentials_missing' }, instances: [] }]) }
    if (request.method() !== 'GET') state.writes.push({ path, data: body })
    if (state.failed && request.method() === 'GET') return route.fulfill({ status: 503, json: { code: 503, msg: 'Read failed' }})
    if (state.conflict && request.method() === 'PUT') return route.fulfill({ status: 409, json: { code: 409, msg: 'Version changed' }})
    if (path === '/options') return ok({ domains: [{ id: 1, name: 'Default', code: 'default' }], vendors: ['paloalto', 'cisco'], limits: { maxRows: 200, maxDesignRows: 50, maxFileBytes: 10000 }, defaultProtocol: 'tcp' })
    if (path === '/instances' && request.method() === 'POST') return ok({ id: 2, name: 'Inventory FW', ...body, currentRevision: '', version: 1, settingsVersion: 1 })
    if (path === '/instances') return paged([{ id: 1, deviceId: 1, name: 'Firewall A', vendor: 'paloalto', nativeContext: 'vsys1', mode: 'routed', domainId: 1, version: 1, currentRevision: state.currentRevision, settingsVersion: 3 }])
    if (path === '/instances/1') return ok({ id: 1, deviceId: 1, name: 'Firewall A', vendor: 'paloalto', nativeContext: 'vsys1', mode: 'routed', domainId: 1, version: 1, currentRevision: state.currentRevision, settingsVersion: 3 })
    if (path === '/instances/1/snapshots') return paged([{ id: state.currentRevision === 'rev-1' ? 3 : 4, instanceId: 1, revision: state.currentRevision, complete: state.currentRevision === 'rev-1', createdAt: '', current: true, diagnostics: state.currentRevision === 'rev-1' ? [] : [{ code: 'incomplete', message: 'new-capture-diagnostic', object: '' }], projectionState: 'ready' }])
    if (path === '/instances/1/imports' && request.method() === 'POST') return ok({ id: 5, instanceId: 1, status: 'queued', revision: '', errorCode: '', createdAt: '' })
    if (path === '/instances/1/imports') return paged([])
    if (path === '/instances/1/settings' && request.method() === 'PUT') return ok({ ...body, version: 4 })
    if (path === '/instances/1/settings') return ok({ version: 3, zones: [{ zone: 'trust', scope: 'vsys1', routingScope: 'default', domainId: 1, protected: true, networks: ['10.0.0.0/24'] }], scopes: [{ routingScope: 'default', domainId: 1 }] })
    if (path === '/instances/1/coverage') return ok([{ instanceId: 1, domainId: 1, revision: 'rev-1', bindingsVersion: 3, zone: 'trust', scope: 'vsys1', routingScope: 'default', network: '10.0.0.0/24', protected: true, origin: 'connected', known: true }])
    if (path.endsWith('/references')) return ok({ outgoing: [{ sourceKind: 'rule', sourceId: 7, targetKind: 'address', targetId: 8, role: 'source', position: 0, resolved: true }], incoming: [] })
    const object = { id: 7, kind: 'rule', nativeId: 'rule-7', name: 'Web policy', scope: 'vsys1', position: 1, state: 'ready', summary: 'Allow HTTPS', record: { name: 'Web policy', source: ['source-address'], action: 'allow', renderedCommands: ['DO NOT SHOW'] }, diagnostics: [] }
    if (/\/objects\/[a-z_]+\/\d+$/.test(path)) return ok(path.endsWith('/8') ? { ...object, id: 8, kind: 'address', name: 'source-address', record: { address: '10.0.0.1' }} : object)
    if (/\/objects\/[a-z_]+$/.test(path)) return paged([object])
    if (path === '/normalize') return ok(normalized())
    if (path === '/requests' && request.method() === 'POST') { if (state.delaySave) await new Promise(resolve => setTimeout(resolve, state.delaySave)); Object.assign(state.request, body); return ok(state.request) }
    if (path === '/requests') return paged([state.request])
    if (path === '/requests/4' && request.method() === 'PUT') { Object.assign(state.request, body, { version: Number(body.version) + 1 }); return ok(state.request) }
    if (path === '/requests/4') return ok(state.request)
    if (path === '/requests/4/analyses' && request.method() === 'POST') { state.analysis.requestVersion = Number(body.version); state.analysis.status = 'queued'; return ok(state.analysis) }
    if (path === '/requests/4/analyses') return paged([state.analysis])
    if (path === '/analyses/9/cancel') { state.analysis.status = 'cancelled'; return ok(state.analysis) }
    if (path === '/analyses/9') return ok(state.analysis)
    if (path === '/drafts' && request.method() === 'POST') return ok(state.draft)
    if (path === '/drafts') return paged([state.draft])
    if (path === '/drafts/12/reanalyze') return ok({ ...state.draft, id: 13 })
    if (path === '/drafts/12' && request.method() === 'PUT') { Object.assign(state.draft, body, { version: Number(body.version) + 1 }); return ok(state.draft) }
    if (path === '/drafts/12') return ok(state.draft)
    if (path === '/drafts/13') return ok({ ...state.draft, id: 13 })
    return route.fulfill({ status: 404, json: { code: 404, msg: path }})
  })
  return state
}
test.describe('Firewall workspace', () => {
  test.beforeEach(async({ context }) => authenticate(context))
  test('reloads metadata when a new capture returns to the same instance', async({ page }) => {
    const state = await mockFirewall(page)
    await page.goto('/#/network/firewall?instance=1')
    await expect(page.locator('.fw-section-title')).toContainText('rev-1')
    await page.getByRole('tab', { name: '采集任务', exact: true }).click()
    state.currentRevision = 'rev-2'
    await page.locator('.fw-main').getByRole('button', { name: '查看详情', exact: true }).click()
    await page.locator('.fw-batch-detail').getByRole('button', { name: '配置对象', exact: true }).click()
    await expect(page.locator('.fw-section-title')).toContainText('rev-2')
    await expect(page.getByText('new-capture-diagnostic', { exact: false })).toBeVisible()
    await expect(page.getByText('此快照证据不完整，策略结论将保留未知项。请排查并重新采集。')).toBeVisible()
  })
  test('browses typed objects and references, pins complete import and saves settings version', async({ page }) => {
    const state = await mockFirewall(page); await page.goto('/#/network/firewall?instance=1')
    await expect(page.locator('.fw-main').getByRole('button', { name: '查看详情', exact: true })).toBeVisible(); if (process.env.FIREWALL_CAPTURE) await page.screenshot({ path: '../output/firewall-ui/objects-desktop-light.png', fullPage: true, animations: 'disabled' }); await page.locator('.fw-main').getByRole('button', { name: '查看详情', exact: true }).click()
    const detail = page.getByRole('dialog', { name: '查看详情', exact: true }); await expect(detail).toContainText('Web policy'); await expect(page.getByText('DO NOT SHOW')).toHaveCount(0)
    await detail.getByRole('button', { name: '查看详情', exact: true }).click(); await expect(page).toHaveURL(/object=8/); await expect(detail).toContainText('10.0.0.1'); await page.keyboard.press('Escape')
    await page.getByRole('button', { name: '导入配置文件', exact: true }).click(); const importer = page.getByRole('dialog', { name: '导入配置文件', exact: true }); await importer.locator('input[type=file]').setInputFiles({ name: 'fw.cfg', mimeType: 'text/plain', buffer: Buffer.from('native configuration') }); await importer.getByRole('button', { name: '导入配置文件', exact: true }).click()
    await expect.poll(() => state.writes.some(item => item.path === '/instances/1/imports')).toBe(true); expect(state.writes.find(item => item.path === '/instances/1/imports')!.data).toMatchObject({ expectedRevision: 'rev-1', complete: true, text: 'native configuration', filename: 'fw.cfg' })
    await page.getByRole('button', { name: '保护范围', exact: true }).click(); const protection = page.getByRole('dialog', { name: '保护范围', exact: true }); await expect(protection).toContainText('10.0.0.0/24'); await protection.getByRole('button', { name: '添加安全域绑定', exact: true }).click(); await expect(protection.getByText('继承 VRF / 默认网络域', { exact: true })).toBeVisible(); await protection.getByRole('textbox', { name: '安全域 2', exact: true }).fill('outside'); await protection.getByRole('button', { name: '保存保护范围', exact: true }).click(); await expect.poll(() => state.writes.some(item => item.path.endsWith('/settings'))).toBe(true); expect(state.writes.find(item => item.path.endsWith('/settings'))!.data.version).toBe(3); expect((state.writes.find(item => item.path.endsWith('/settings'))!.data.zones as { domainId: number }[])[1].domainId).toBe(0)
  })
  test('corrects pasted input, persists request and analyses, then creates a draft without retyping', async({ page }) => {
    const state = await mockFirewall(page); await page.goto('/#/network/firewall/query')
    await page.getByLabel('标题', { exact: true }).fill('New traffic'); await page.getByRole('tab', { name: '粘贴 CSV / TSV / Excel 数据', exact: true }).click(); await page.getByRole('textbox', { name: '粘贴 CSV / TSV / Excel 数据', exact: true }).fill('10.0.0.1\t10.1.0.2\t443'); await page.getByRole('button', { name: '解析输入', exact: true }).click(); await expect(page.getByText('tcp/443', { exact: false }).first()).toBeVisible()
    await page.getByLabel('服务 line-1', { exact: true }).fill('tcp/8443'); await page.getByRole('button', { name: '保存查询', exact: true }).click(); await expect(page).toHaveURL(/request=4/)
    const save = state.writes.find(item => item.path === '/requests')!.data; expect((save.input as Input).rows[0]).toMatchObject({ key: 'line-1', service: 'tcp/8443' }); expect((save.input as Input).text).toBeUndefined()
    await page.getByRole('button', { name: '开始分析', exact: true }).click(); await expect(page).toHaveURL(/analysis=9/); await page.getByRole('button', { name: '取消任务', exact: true }).click(); await expect.poll(() => state.writes.some(item => item.path.endsWith('/cancel'))).toBe(true)
    state.analysis.status = 'succeeded'; await page.locator('.fw-main').getByRole('button', { name: '刷新', exact: true }).click(); if (process.env.FIREWALL_CAPTURE) await page.screenshot({ path: '../output/firewall-ui/query-desktop-light.png', fullPage: true, animations: 'disabled' }); await page.getByRole('button', { name: '从此分析创建设计草稿', exact: true }).click(); await expect(page).toHaveURL(/firewall\/design\?draft=12/); expect(state.writes.find(item => item.path === '/drafts')!.data.analysisId).toBe(9); await expect(page.getByText('NAT 行为保持: 是', { exact: false })).toBeVisible(); await expect(page.getByText('没有可证明的变更；请查看待确认问题。')).toBeVisible(); if (process.env.FIREWALL_CAPTURE) await page.screenshot({ path: '../output/firewall-ui/design-desktop-light.png', fullPage: true, animations: 'disabled' })
  })
  test('keeps request edits after optimistic conflict and disables analysis of changed inputs', async({ page }) => {
    const state = await mockFirewall(page); await page.goto('/#/network/firewall/query?request=4&analysis=9'); const title = page.getByLabel('标题', { exact: true }); await expect(title).toHaveValue('Web access'); await title.fill('Unsaved title'); await expect(page.getByRole('button', { name: '开始分析', exact: true })).toBeDisabled(); state.conflict = true; await page.getByRole('button', { name: '保存查询', exact: true }).click(); await expect(page.getByText('读取或提交失败，已保留现有内容。请刷新后重试。')).toBeVisible(); await expect(title).toHaveValue('Unsaved title'); expect(state.writes[0].data.version).toBe(2)
  })
  test('links an inventory device selected through the group tree', async({ page }) => {
    const state = await mockFirewall(page); await page.goto('/#/network/firewall'); await page.getByRole('button', { name: '关联库存设备', exact: true }).click(); const dialog = page.getByRole('dialog', { name: '关联库存设备', exact: true }); await dialog.locator('[data-group-key="2"]').click(); await expect.poll(() => state.deviceQueries.some(url => url.searchParams.get('groupId') === '2')).toBe(true); await dialog.getByRole('button', { name: '选择', exact: true }).click(); await dialog.getByLabel('原生上下文', { exact: true }).fill('vsys2'); await dialog.getByRole('button', { name: '保存', exact: true }).click(); await expect.poll(() => state.writes.some(item => item.path === '/instances')).toBe(true); expect(state.writes.find(item => item.path === '/instances')!.data).toMatchObject({ deviceId: 21, domainId: 1, vendor: 'paloalto', nativeContext: 'vsys2', mode: 'routed' })
  })
  test('ignores a late save after starting another query and blocks stale analysis drafts', async({ page }) => {
    const state = await mockFirewall(page); state.delaySave = 350; await page.goto('/#/network/firewall/query'); await page.getByLabel('标题', { exact: true }).fill('In flight'); const sent = page.waitForRequest(request => request.method() === 'POST' && request.url().endsWith('/requests')); await page.getByRole('button', { name: '保存查询', exact: true }).click(); await sent; await page.getByRole('button', { name: '新增', exact: true }).click(); await expect(page.getByLabel('标题', { exact: true })).toHaveValue(''); await expect(page.getByRole('button', { name: '保存查询', exact: true })).not.toHaveClass(/arco-btn-loading/); await expect(page).not.toHaveURL(/request=4/); state.analysis.stale = true; await page.goto('/#/network/firewall/query?request=4&analysis=9'); await expect(page.getByText('依据已变化，请重新分析。')).toBeVisible(); await expect(page.getByRole('button', { name: '从此分析创建设计草稿', exact: true })).toBeDisabled()
  })
  test('edits draft metadata with version and reanalyzes into a new persisted draft', async({ page }) => {
    const state = await mockFirewall(page); await page.goto('/#/network/firewall/design?draft=12'); await page.getByLabel('备注', { exact: true }).fill('Review routing scope'); await page.getByRole('button', { name: '保存', exact: true }).click(); await expect.poll(() => state.writes.some(item => item.path === '/drafts/12')).toBe(true); expect(state.writes.find(item => item.path === '/drafts/12')!.data).toMatchObject({ version: 1, notes: 'Review routing scope' }); await page.getByRole('button', { name: '按当前依据重新分析', exact: true }).click(); await expect(page).toHaveURL(/draft=13/); expect(state.writes.find(item => item.path.endsWith('/reanalyze'))!.data.version).toBe(2)
  })
  test('keeps all workspaces within a dark English phone viewport', async({ page }) => {
    await page.addInitScript(() => { localStorage.setItem('locale', 'en-US'); localStorage.setItem('color-scheme', 'dark') }); await page.setViewportSize({ width: 390, height: 844 }); await mockFirewall(page)
    for (const [name, url] of [['devices', '/#/network/firewall'], ['collections', '/#/network/firewall?area=collections&batch=25'], ['objects', '/#/network/firewall?instance=1'], ['query', '/#/network/firewall/query?request=4&analysis=9'], ['design', '/#/network/firewall/design?draft=12']]) {
      await page.goto(url)
      await expect(page.locator(`.fw-${['query', 'design'].includes(name) ? name : 'objects'}-page`)).toBeVisible()
      if (name === 'devices') await expect(page.locator('.fw-main')).toContainText('Inventory FW')
      if (name === 'collections') await expect(page.locator('.fw-batch-detail')).toContainText('Firewall A')
      if (name === 'query') await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Web access')
      if (name === 'design') await expect(page.locator('.fw-main')).toContainText('Design draft details #12')
      if (name === 'objects') await expect(page.locator('.fw-main')).toContainText('Firewall A')
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      if (process.env.FIREWALL_CAPTURE) await page.screenshot({ path: `../output/playwright/firewall-${name}-mobile-dark.png`, fullPage: true, animations: 'disabled' })
    }
  })
  test('keeps native policy partitions distinct from original packets and preserves NAT pipeline order', async({ page }) => {
    const state = await mockFirewall(page); state.analysis.result.items[0].allowed = [{ ...traffic, protocol: 'icmp', icmpType: '8', icmpCode: '0' }]; state.analysis.result.items[0].nat = [{ id: '', kind: 'pipeline', exact: false, possibleAllocation: true, steps: [{ id: 'destination-step', kind: 'static_nat', reverse: false }, { id: 'source-step', kind: 'dynamic_nat', reverse: true }], original: [traffic], translated: [{ ...traffic, source: '203.0.113.5' }] }]; await page.goto('/#/network/firewall/query?request=4&analysis=9'); await expect(page.getByText('策略地址视图', { exact: true })).toBeVisible(); await expect(page.getByText('原始报文状态', { exact: true })).toBeVisible(); await expect(page.getByRole('columnheader', { name: 'ICMP 类型', exact: true })).toBeVisible(); await expect(page.getByRole('cell', { name: '8', exact: true })).toBeVisible(); const nat = page.getByRole('tab', { name: 'NAT 路径', exact: true }); await nat.click(); const steps = page.locator('.fw-main ol li'); await expect(steps).toHaveText(['destination-step · 静态 NAT · 正向转换', 'source-step · 动态 NAT · 反向转换']); await expect(page.getByText('203.0.113.5', { exact: true })).toBeVisible()
  })
  test('rejects an analysis URL whose persisted request differs from the selected query', async({ page }) => {
    const state = await mockFirewall(page); state.analysis.requestId = 7; await page.goto('/#/network/firewall/query?request=4&analysis=9'); await expect(page.getByText('读取或提交失败，已保留现有内容。请刷新后重试。')).toBeVisible(); await expect(page.getByRole('button', { name: '从此分析创建设计草稿', exact: true })).toHaveCount(0)
  })
  test('limits mutations for read permission and supports dark English phone layout', async({ page }) => {
    await page.addInitScript(() => { localStorage.setItem('locale', 'en-US'); localStorage.setItem('color-scheme', 'dark') }); await page.setViewportSize({ width: 390, height: 844 }); await mockFirewall(page, ['list']); await page.goto('/#/network/firewall?instance=1'); await expect(page.getByRole('heading', { name: 'Firewall workbench', exact: true })).toBeVisible(); await expect(page.locator('body')).toHaveAttribute('arco-theme', 'dark'); await expect(page.getByRole('button', { name: 'Import configuration', exact: true })).toHaveCount(0); await expect(page.getByRole('button', { name: 'Link inventory device', exact: true })).toHaveCount(0); await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
})
