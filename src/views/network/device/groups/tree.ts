import type { SelectOptionData } from '@arco-design/web-vue'
import type { TreeNavItem } from '@/components/TreeNav/tree'
import type { DeviceGroupNode } from '@/types/network'

export function flattenGroups(nodes: DeviceGroupNode[]): DeviceGroupNode[] {
  return nodes.flatMap(node => [node, ...flattenGroups(node.children ?? [])])
}

export function groupOptions(nodes: DeviceGroupNode[], options: { preserveId?: number | null, excludeId?: number, assignment?: boolean } = {}, parentPath = ''): SelectOptionData[] {
  return nodes.filter(node => node.id !== options.excludeId).flatMap(node => {
    const label = parentPath ? `${parentPath} / ${node.name}` : node.name
    return [{ value: node.id, label, disabled: options.assignment && !node.enabled && node.id !== options.preserveId }, ...groupOptions(node.children ?? [], options, label)]
  })
}

/** Groups as TreeNav rows: the code is searchable, a disabled group says so. */
export function groupNavItems(nodes: DeviceGroupNode[], disabledNote: string): TreeNavItem[] {
  return nodes.map(node => ({
    key: node.id,
    title: node.name,
    count: node.deviceCount,
    searchText: node.code,
    note: node.enabled ? undefined : disabledNote,
    children: groupNavItems(node.children ?? [], disabledNote)
  }))
}
