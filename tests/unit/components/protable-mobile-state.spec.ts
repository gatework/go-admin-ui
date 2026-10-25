import { h, nextTick } from 'vue'
import { shallowMount } from '@vue/test-utils'
import ProTable from '@/components/ProTable/index.vue'
import MobileCards from '@/components/ProTable/MobileCards.vue'
import { useTable } from '@/composables/useTable'

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
})
afterEach(() => vi.unstubAllGlobals())

const global = { stubs: { AForm: true, AButton: true, AIcon: true, ADrawer: true, ATable: true, ATableColumn: true, ACard: true, AEmpty: true, ACheckbox: true }, directives: { loading: () => {} }}

const row = (id: number, name = `row${id}`) => ({ id, name })
const setup = async(paginated = true) => {
  let result = [row(1)]
  const table = useTable({
    idKey: 'id', immediate: false, paginated,
    api: async() => ({ code: 200, msg: '', data: paginated ? { list: result, count: 30 } : result })
  })
  await table.getList()
  const wrapper = shallowMount(ProTable<ReturnType<typeof row>, Record<string, never>>, {
    global,
    props: { table, paginated, panels: false, rowKey: 'id', selection: true },
    slots: { default: () => h('a-table-column', { title: 'Name', dataIndex: 'name' }) }
  })
  await nextTick()
  return { table, wrapper, cards: () => wrapper.findComponent(MobileCards), setRows: (rows: typeof result) => { result = rows } }
}

it('replaces nonpaginated mobile results on refresh', async() => {
  const { table, wrapper, cards, setRows } = await setup(false)
  setRows([row(1, 'updated')])
  await table.getList()
  expect(cards().props('rows')).toEqual([row(1, 'updated')])
  wrapper.unmount()
})

it('replaces a refreshed page while retaining preceding pages', async() => {
  const { table, wrapper, cards, setRows } = await setup()
  setRows([row(2)])
  await table.handlePagination({ page: 2, limit: 10 })
  setRows([row(2, 'updated')])
  await table.getList()
  expect(cards().props('rows')).toEqual([row(1), row(2, 'updated')])
  wrapper.unmount()
})

it('clears invisible selections when searching and reflects external resets', async() => {
  const { table, wrapper, cards, setRows } = await setup()
  cards().vm.$emit('toggle', table.rows[0])
  await nextTick()
  expect(table.selectedIds).toEqual([1])
  setRows([row(2)])
  await table.search()
  expect(table.selectedIds).toEqual([])
  expect(cards().props('selected').size).toBe(0)
  cards().vm.$emit('toggle', table.rows[0])
  await table.resetQuery()
  expect(cards().props('selected').size).toBe(0)
  wrapper.unmount()
})

it('keeps the tree table renderer instead of dropping children on a phone', async() => {
  const { wrapper, cards } = await setup(false)
  await wrapper.setProps({ 'tree-props': { children: 'children' }} as never)
  expect(cards().exists()).toBe(false)
  expect(wrapper.find('a-table-stub').exists()).toBe(true)
  wrapper.unmount()
})

it('keeps covered actions and collapsed fields out of keyboard navigation', async() => {
  const wrapper = shallowMount(MobileCards, {
    global,
    props: {
      rows: [row(1)], rowKey: 'id', selected: new Set(), actions: true,
      columns: ['name', 'second', 'third', 'detail'].map(prop => ({ prop, label: prop }))
    },
    slots: { actions: '<button>Edit</button>' }
  })
  expect(wrapper.get('.pro-card__actions').attributes()).toHaveProperty('inert')
  expect(wrapper.get('.pro-card__more').attributes()).toHaveProperty('inert')
  const trigger = wrapper.get('.pro-card__action-toggle')
  await trigger.trigger('click')
  expect(wrapper.get('.pro-card__actions').attributes()).not.toHaveProperty('inert')
  await wrapper.get('.pro-card').trigger('keydown', { key: 'Escape' })
  expect(wrapper.get('.pro-card__actions').attributes()).toHaveProperty('inert')
  wrapper.unmount()
})

it('maps native selected keys to records and clears them when results are replaced', async() => {
  const { table, wrapper, setRows } = await setup(false)
  await wrapper.setProps({ card: false })
  const native = wrapper.findComponent({ name: 'ATable' })
  native.vm.$emit('selection-change', [1])
  expect(table.selectedIds).toEqual([1])
  setRows([row(2)])
  await table.getList()
  await nextTick()
  expect(table.selectedIds).toEqual([])
  wrapper.unmount()
})
