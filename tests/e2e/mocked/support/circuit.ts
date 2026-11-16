import type { Page } from '@playwright/test'
import { installApiMocks, userInfo } from '../fixtures'
import { circuitFixture, trafficFixture } from '../../../fixtures/network-circuit'

export async function circuitMock(page: Page, permissions = ['list', 'query', 'add', 'edit', 'remove', 'export', 'traffic']) {
  await installApiMocks(page)
  const state = {
    record: circuitFixture(), records: [] as ReturnType<typeof circuitFixture>[], writes: [] as Record<string, unknown>[], deletions: [] as unknown[], exports: [] as URLSearchParams[], queries: [] as URLSearchParams[], periods: [] as string[], hosts: [] as string[], items: [] as string[], conflict: false, duplicateNo: '', configured: true, empty: false, optionsError: false, trafficError: false, trafficEmpty: false, detailDelay: 0, periodDelay: 0, monitoringDelay: 0
  }
  await page.route('**/api/v1/getinfo*', route => route.fulfill({ json: { ...userInfo, data: { ...userInfo.data, permissions: permissions.map(action => `network:circuit:${action}`) }}}))
  await page.route('**/api/v1/menurole*', route => route.fulfill({ json: { code: 200, data: [{ path: '/network', component: 'Layout', visible: '0', menuName: 'NetworkManagement', menuType: 'M', title: '网络管理', icon: 'network', noCache: false, children: [{ path: 'circuit', component: '/network/circuit/index', visible: '0', menuName: 'NetworkCircuitManage', menuType: 'C', title: '专线管理', icon: 'network', noCache: false, children: null }] }] }}))
  await page.route('**/api/v1/network-device**', route => route.fulfill({ json: { code: 200, data: { list: [{ id: 8, name: 'TEST-DEVICE-A', ip: '192.0.2.1' }], count: 1 }}}))
  await page.route('**/api/v1/network-circuit**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const endpoint = url.pathname.split('/').at(-1)
    if (state.monitoringDelay && (['POST', 'PUT'].includes(request.method()) || endpoint === 'hosts' || endpoint === 'items')) {
      await new Promise(resolve => setTimeout(resolve, state.monitoringDelay))
    }
    if (['POST', 'PUT'].includes(request.method()) && state.duplicateNo && request.postDataJSON().circuitNo === state.duplicateNo) {
      state.writes.push(request.postDataJSON())
      return route.fulfill({ json: { code: 422, msg: 'Circuit number already exists', data: null }})
    }
    if (endpoint === 'options') return route.fulfill({ json: state.optionsError ? { code: 502, msg: 'Options unavailable', data: null } : { code: 200, data: { providers: ['Example Telecom'], regions: ['Shenzhen'], organizations: ['Network team'], zabbixConfigured: state.configured }}})
    if (endpoint === 'hosts') {
      state.hosts.push(url.searchParams.get('keyword') || '')
      return route.fulfill({ json: { code: 200, data: { items: [{ id: '22', name: 'TEST-EDGE-Z', host: 'test-edge-z' }], hasMore: false }}})
    }
    if (endpoint === 'items') {
      state.items.push(url.searchParams.get('hostId') || '')
      return route.fulfill({ json: { code: 200, data: { items: [{ id: '201', hostId: '22', name: 'Z inbound', key: 'net.if.in[eth0]', units: 'Bps' }, { id: '202', hostId: '22', name: 'Z outbound', key: 'net.if.out[eth0]', units: 'bps' }], hasMore: false }}})
    }
    if (endpoint === 'export') {
      state.exports.push(url.searchParams)
      return route.fulfill({ contentType: 'text/csv; charset=utf-8', body: '\uFEFFcircuitNo,name\nTEST-CIRCUIT-7,Verification circuit\n' })
    }
    if (endpoint === 'traffic') {
      const period = url.searchParams.get('period')!
      state.periods.push(period)
      if (state.periodDelay && period === '1h') await new Promise(resolve => setTimeout(resolve, state.periodDelay))
      if (state.trafficError) return route.fulfill({ json: { code: 502, msg: 'Monitoring unavailable', data: null }})
      const data = trafficFixture()
      if (period === '7d') data.series.forEach(series => { series.mode = 'trend' })
      return route.fulfill({ json: { code: 200, data: { ...data, configured: state.configured, period, series: state.trafficEmpty ? [] : data.series }}})
    }
    if (/^\d+$/.test(endpoint || '')) {
      if (request.method() === 'DELETE') {
        state.deletions.push(request.postDataJSON())
        state.empty = true
        return route.fulfill({ json: { code: 200, data: null }})
      }
      if (request.method() === 'PUT') {
        state.writes.push(request.postDataJSON())
        if (state.conflict) return route.fulfill({ json: { code: 409, msg: 'Version conflict', data: null }})
        state.record = { ...state.record, ...request.postDataJSON(), version: state.record.version + 1 }
      }
      if (state.detailDelay) await new Promise(resolve => setTimeout(resolve, state.detailDelay))
      return route.fulfill({ json: { code: 200, data: state.record }})
    }
    if (request.method() === 'POST') {
      state.writes.push(request.postDataJSON())
      state.record = { ...state.record, ...request.postDataJSON(), id: 9, version: 1 }
      return route.fulfill({ json: { code: 200, data: state.record }})
    }
    state.queries.push(url.searchParams)
    const keyword = url.searchParams.get('keyword')
    const list = state.empty || (keyword && !state.record.name.includes(keyword)) ? [] : [state.record]
    return route.fulfill({ json: { code: 200, data: { list, count: list.length, pageIndex: 1, pageSize: 10 }}})
  })
  return state
}
