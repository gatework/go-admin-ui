import { mount } from '@vue/test-utils'
import { Input, Spin, Tree } from '@arco-design/web-vue'
import TreeNav from '@/components/TreeNav/index.vue'
import { filterTreeNav, flattenTreeNav, type TreeNavItem } from '@/components/TreeNav/tree'

const items: TreeNavItem[] = [
  { key: 1, title: 'Campus', searchText: 'site.campus', count: 3, children: [
    { key: 2, title: 'DC', count: 2, children: [{ key: 4, title: 'Row A', count: 1 }] }
  ] },
  { key: 0, title: 'Lab', note: 'Disabled', count: 0 }
]

describe('TreeNav filtering', () => {
  it('keeps a visible keyboard entry when a search hides the selected group', async() => {
    const wrapper = mount(TreeNav, {
      props: { items, pinned: [{ key: 'all', title: 'All' }], selected: 1, title: 'Groups', searchPlaceholder: 'Search groups' },
      global: {
        components: { AInput: Input, ASpin: Spin, ATree: Tree },
        stubs: { IconSearch: true, AButton: true, AResult: true }
      }
    })
    const entry = () => wrapper.findAll('[data-tree-key][tabindex="0"]')
    expect(entry()).toHaveLength(1)
    expect(entry()[0].attributes('data-tree-key')).toBe('1')
    await wrapper.get('input').setValue('Lab')
    expect(wrapper.find('[data-tree-key="1"]').exists()).toBe(false)
    expect(entry()).toHaveLength(1)
    expect(entry()[0].attributes('data-tree-key')).toBe('all')
    await wrapper.setProps({ selected: 2 })
    expect(entry()).toHaveLength(1)
    await wrapper.get('input').setValue('')
    await wrapper.setProps({ selected: 0 })
    expect(entry()).toHaveLength(1)
    expect(entry()[0].attributes('data-tree-key')).toBe('0')
    wrapper.unmount()
  })

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
