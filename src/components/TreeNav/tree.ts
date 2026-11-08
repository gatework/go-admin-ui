/** One row in a TreeNav. Keys keep the API's own type: a numeric 0 is a real key. */
export interface TreeNavItem {
  key: string | number
  title: string
  /** Shown right-aligned; omit for rows that have no count. */
  count?: number
  /** Extra words the search matches besides the title, such as a code. */
  searchText?: string
  /** Rendered after the title, muted, e.g. "Disabled". */
  note?: string
  children?: TreeNavItem[]
}

/** A row as the tree renders it, with what keyboard navigation needs. */
export interface TreeNavNode {
  key: string | number
  title: string
  count?: number
  note?: string
  level: number
  parentKey?: string | number
  children: TreeNavNode[]
}

export function flattenTreeNav<T extends { children?: T[] }>(items: T[]): T[] {
  return items.flatMap(item => [item, ...flattenTreeNav(item.children ?? [])])
}

/**
 * The rows to render for a search.
 *
 * A match keeps its whole subtree, and a non-matching parent stays when one of
 * its descendants matches, so a result never appears without its path.
 */
export function filterTreeNav(items: TreeNavItem[], search = '', level = 1, parentKey?: string | number): TreeNavNode[] {
  const query = search.trim().toLocaleLowerCase()
  return items.flatMap(item => {
    const matches = !query || `${item.title} ${item.searchText ?? ''}`.toLocaleLowerCase().includes(query)
    const children = filterTreeNav(item.children ?? [], matches ? '' : query, level + 1, item.key)
    return matches || children.length
      ? [{ key: item.key, title: item.title, count: item.count, note: item.note, level, parentKey, children }]
      : []
  })
}
