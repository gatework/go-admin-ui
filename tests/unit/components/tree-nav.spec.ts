import { filterTreeNav, flattenTreeNav, type TreeNavItem } from '@/components/TreeNav/tree'

const items: TreeNavItem[] = [
  { key: 1, title: 'Campus', searchText: 'site.campus', count: 3, children: [
    { key: 2, title: 'DC', count: 2, children: [{ key: 4, title: 'Row A', count: 1 }] }
  ] },
  { key: 0, title: 'Lab', note: 'Disabled', count: 0 }
]

describe('TreeNav filtering', () => {
  it('keeps the path to a nested match and records level and parent for keyboard navigation', () => {
    const [campus] = filterTreeNav(items, 'row')
    expect(campus).toMatchObject({ key: 1, level: 1, parentKey: undefined })
    expect(campus.children[0]).toMatchObject({ key: 2, level: 2, parentKey: 1 })
    expect(campus.children[0].children[0]).toMatchObject({ key: 4, level: 3, parentKey: 2 })
  })

  it('keeps the whole subtree of a matching parent', () => {
    expect(flattenTreeNav(filterTreeNav(items, 'campus')).map(node => node.key)).toEqual([1, 2, 4])
  })

  it('matches search text besides the title, ignoring case and surrounding spaces', () => {
    expect(filterTreeNav(items, '  SITE.CAMPUS ')).toHaveLength(1)
  })

  it('treats the numeric key 0 as a real row and carries counts and notes through', () => {
    expect(filterTreeNav(items, 'lab')).toEqual([{ key: 0, title: 'Lab', count: 0, note: 'Disabled', level: 1, parentKey: undefined, children: [] }])
  })

  it('returns nothing when no row matches', () => {
    expect(filterTreeNav(items, 'missing')).toEqual([])
  })
})
