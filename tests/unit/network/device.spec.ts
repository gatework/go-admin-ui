import request from '@/utils/request'
import { addDeviceGroup, assignDeviceGroup, delDeviceGroup, exportDevice, listDeviceGroup, syncDevice, updateDevice, updateDeviceGroup } from '@/api/network/device'
import { toDeviceDraft } from '@/views/network/device/form'

vi.mock('@/utils/request', () => ({ default: vi.fn() }))

describe('device inventory boundaries', () => {
  beforeEach(() => vi.mocked(request).mockReset())

  it('sends only editable inventory fields with the version and owns its tag draft', async() => {
    const source = {
      id: 7, version: 3, ip: '192.0.2.7', name: 'core', serial: 'source-serial',
      groupId: 2, groupSource: 'auto', classificationSource: 'auto', status: 'active', deviceType: 'switch', deviceRole: 'core_switch',
      owner: 'Lee', contactEmail: '', contactPhone: '', tags: ['production'], notes: ''
    } as const
    const draft = toDeviceDraft({ ...source, tags: [...source.tags] })
    draft.tags.push('reviewed')
    vi.mocked(request).mockResolvedValue({ code: 200, data: {}, msg: '' })
    const withReadOnlyPresentation = { ...draft, ip: '192.0.2.7', displayName: 'Core device' }
    await updateDevice(withReadOnlyPresentation)
    expect(source.tags).toEqual(['production'])
    expect(request).toHaveBeenCalledWith({
      url: '/api/v1/network-device/7', method: 'put', data: {
        version: 3, groupId: 2, groupSource: 'auto', classificationSource: 'auto', status: 'active', deviceType: 'switch', deviceRole: 'core_switch',
        owner: 'Lee', contactEmail: '', contactPhone: '', tags: ['production', 'reviewed'], notes: ''
      }
    })
  })

  it('keeps deliberately ungrouped metadata manual and exports numeric zero with the role', async() => {
    await exportDevice({ groupId: 0, deviceRole: 'aggregate_switch', keyword: '', pageIndex: 3, pageSize: 20 })
    expect(vi.mocked(request).mock.calls[0]![0].params).toEqual({ groupId: 0, deviceRole: 'aggregate_switch' })
    const draft = toDeviceDraft({ id: 8, version: 4, groupId: null, groupSource: 'manual', classificationSource: 'manual', status: 'active', deviceType: 'router', deviceRole: 'other', owner: '', contactEmail: '', contactPhone: '', tags: [], notes: '' })
    expect(draft).toMatchObject({ groupId: null, groupSource: 'manual', classificationSource: 'manual' })
  })

  it('uses versioned group APIs and one atomic assignment request', async() => {
    const group = { code: 'site.campus', name: 'Campus', parentId: null, description: '', enabled: true, position: 0 }
    await listDeviceGroup()
    await addDeviceGroup(group)
    await updateDeviceGroup(2, { ...group, version: 4 })
    await delDeviceGroup(2, 4)
    await assignDeviceGroup({ devices: [{ id: 7, version: 3 }, { id: 8, version: 4 }], groupId: null, groupSource: 'auto' })
    expect(vi.mocked(request).mock.calls.map(([config]) => config)).toEqual([
      { url: '/api/v1/network-device-group', method: 'get' },
      { url: '/api/v1/network-device-group', method: 'post', data: group },
      { url: '/api/v1/network-device-group/2', method: 'put', data: { ...group, version: 4 }},
      { url: '/api/v1/network-device-group/2', method: 'delete', data: { version: 4 }},
      { url: '/api/v1/network-device/assign-group', method: 'put', data: { devices: [{ id: 7, version: 3 }, { id: 8, version: 4 }], groupId: null, groupSource: 'auto' }}
    ])
  })

  it('exports all matching rows without pagination and preserves JSON errors', async() => {
    vi.mocked(request).mockResolvedValue({ code: 200, data: 'ip\n192.0.2.7\n', msg: '' })
    await exportDevice({ keyword: 'core', vendor: 'Cisco', pageIndex: 4, pageSize: 10 })
    const config = vi.mocked(request).mock.calls[0]![0]
    expect(config.params).toEqual({ keyword: 'core', vendor: 'Cisco' })
    const transform = (config.transformResponse as Array<(data: string, headers: object, status: number) => unknown>)[0]!
    expect(transform('ip\n192.0.2.7\n', { 'content-type': 'text/csv; charset=utf-8' }, 200)).toEqual({ code: 200, msg: '', data: 'ip\n192.0.2.7\n' })
    expect(transform('{"code":403,"msg":"Forbidden","data":null}', { 'content-type': 'application/json' }, 200)).toEqual({ code: 403, msg: 'Forbidden', data: null })
    expect(transform('<html>Gateway error</html>', { 'content-type': 'text/html' }, 200)).toEqual({ code: 500, msg: '', data: null })
  })

  it('allows the bounded sync request to finish without the default 10 second timeout', async() => {
    await syncDevice()
    expect(request).toHaveBeenCalledWith({ url: '/api/v1/network-device/sync', method: 'post', timeout: 60000 })
  })
})
