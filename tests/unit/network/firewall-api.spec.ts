import { beforeEach, describe, expect, it, vi } from 'vitest'
const request = vi.hoisted(() => vi.fn().mockResolvedValue({ code: 200, data: null }))
vi.mock('@/utils/request', () => ({ default: request }))
import { addImport, addAnalysis, addDraft, updateRequest, reanalyzeDraft, getReferences, saveSettings } from '@/api/network/firewall'
describe('firewall pinned API contracts', () => {
  beforeEach(() => request.mockClear())
  it('pins import CAS revision, completeness and request key', async() => {
    await addImport(2, { requestKey: 'stable-key', expectedRevision: 'old', text: 'native', filename: 'fw.cfg', complete: false })
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ url: '/api/v1/network-firewall/instances/2/imports', method: 'post', data: { requestKey: 'stable-key', expectedRevision: 'old', text: 'native', filename: 'fw.cfg', complete: false }}))
  })
  it('binds analyses and edits to optimistic versions and drafts to saved analyses', async() => {
    await updateRequest(4, { version: 7, title: 'Traffic', domainId: 1, input: { rows: [], text: 'raw', defaultProtocol: 'tcp' }})
    await addAnalysis(4, { requestKey: 'analysis', version: 8 }); await addDraft({ requestKey: 'draft', analysisId: 9, title: 'Traffic', rowKeys: ['line-2'] }); await reanalyzeDraft(12, { requestKey: 'again', version: 3 })
    expect(request.mock.calls.map(([config]) => [config.url, config.method, config.data])).toEqual([
      ['/api/v1/network-firewall/requests/4', 'put', { version: 7, title: 'Traffic', domainId: 1, input: { rows: [], text: 'raw', defaultProtocol: 'tcp' }}],
      ['/api/v1/network-firewall/requests/4/analyses', 'post', { requestKey: 'analysis', version: 8 }],
      ['/api/v1/network-firewall/drafts', 'post', { requestKey: 'draft', analysisId: 9, title: 'Traffic', rowKeys: ['line-2'] }],
      ['/api/v1/network-firewall/drafts/12/reanalyze', 'post', { requestKey: 'again', version: 3 }]
    ])
  })
  it('preserves inherited zone domain zero and explicit VRF domain mappings on save', async() => {
    const settings = { version: 3, zones: [{ zone: 'inside', scope: '', routingScope: 'blue', domainId: 0, protected: true, networks: [] }], scopes: [{ routingScope: 'blue', domainId: 2 }] }; await saveSettings(1, settings); expect(request).toHaveBeenCalledWith(expect.objectContaining({ url: '/api/v1/network-firewall/instances/1/settings', method: 'put', data: settings }))
  })
  it('fetches references within the immutable snapshot and forwards abort signal', async() => {
    const controller = new AbortController(); await getReferences(3, 'rule', 7, controller.signal)
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ url: '/api/v1/network-firewall/snapshots/3/objects/rule/7/references', signal: controller.signal }))
  })
})
