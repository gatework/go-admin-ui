import { shallowMount } from '@vue/test-utils'
import Pagination from '@/components/Pagination/index.vue'

it('resets to page one once when page size changes', () => {
  const wrapper = shallowMount(Pagination, {
    props: { total: 100, page: 4, limit: 10, autoScroll: false },
    global: { stubs: { APagination: { name: 'APagination', template: '<div />', emits: ['change', 'page-size-change'] }}}
  })
  const native = wrapper.findComponent({ name: 'APagination' })
  native.vm.$emit('page-size-change', 20)
  expect(wrapper.emitted('pagination')).toEqual([[{ page: 1, limit: 20 }]])
  expect(wrapper.emitted('update:page')).toEqual([[1]])
  wrapper.unmount()
})
