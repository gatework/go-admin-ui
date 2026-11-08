import type { DeviceGroupNode } from '@/types/network'
import { filterTreeNav } from '@/components/TreeNav/tree'
import { flattenGroups, groupNavItems, groupOptions } from '@/views/network/device/groups/tree'

const navigationNodes = (groups: DeviceGroupNode[], search = '') => filterTreeNav(groupNavItems(groups, 'Disabled'), search)

const group = (id: number, name: string, children: DeviceGroupNode[] = [], enabled = true): DeviceGroupNode => ({ id, name, code: `site.${id}`, parentId: id === 2 ? 1 : null, description: '', enabled, position: 0, version: 1, directDeviceCount: 1, deviceCount: children.length + 1, children })

describe('device group hierarchy presentation', () => {
  const groups = [group(1, 'Campus', [group(2, 'DC')]), group(3, 'Retired', [], false)]

  it('keeps ancestors while matching a child and retains the complete subtree of a matching parent', () => {
    expect(navigationNodes(groups, 'dc')).toMatchObject([{ key: 1, title: 'Campus', children: [{ key: 2, title: 'DC', level: 2, parentKey: 1 }] }])
    expect(navigationNodes(groups, 'CAMPUS')[0]?.children).toHaveLength(1)
    expect(navigationNodes(groups, 'unknown')).toEqual([])
    expect(navigationNodes(groups, 'site.2')[0]?.children[0]).toMatchObject({ key: 2 })
    expect(flattenGroups(groups).map(node => node.id)).toEqual([1, 2, 3])
  })

  it('excludes the current group and all descendants from possible parents', () => {
    expect(groupOptions(groups, { excludeId: 1 }).map(node => node.value)).toEqual([3])
    expect(groupOptions(groups)[1]?.label).toBe('Campus / DC')
  })

  it('disables new assignments into a disabled group but preserves its unchanged current membership', () => {
    expect(groupOptions(groups, { assignment: true })[2]?.disabled).toBe(true)
    expect(groupOptions(groups, { assignment: true, preserveId: 3 })[2]?.disabled).toBe(false)
    expect(navigationNodes(groups)[1]).toMatchObject({ key: 3, note: 'Disabled' })
  })
})
