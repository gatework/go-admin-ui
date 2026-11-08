import type { SelectOptionData, TreeNodeData } from '@arco-design/web-vue'
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

export interface NavigationNode extends TreeNodeData {
  key: string | number
  title: string
  count: number
  level: number
  parentKey?: number
  enabled: boolean
  children: NavigationNode[]
}

export function navigationNodes(nodes: DeviceGroupNode[], search = '', level = 1): NavigationNode[] {
  const query = search.trim().toLocaleLowerCase()
  return nodes.flatMap(node => {
    const matches = !query || `${node.name} ${node.code}`.toLocaleLowerCase().includes(query)
    const children = navigationNodes(node.children ?? [], matches ? '' : query, level + 1)
    return matches || children.length ? [{ key: node.id, title: node.name, count: node.deviceCount, level, parentKey: node.parentId ?? undefined, enabled: node.enabled, children }] : []
  })
}
