import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import StatStrip from '@/components/StatStrip/index.vue'

const stubs = { 'router-link': { props: ['to'], template: '<a class="link" :data-to="to"><slot /></a>' }, 'a-skeleton-line': { template: '<i class="skeleton" />' }}

describe('StatStrip', () => {
  it('shows a dash for a missing figure and keeps zero', () => {
    const wrapper = mount(StatStrip, { props: { items: [{ key: 'a', label: '设备', value: 0 }, { key: 'b', label: '专线' }] }, global: { stubs }})
    const values = wrapper.findAll('dd strong').map(node => node.text())
    expect(values).toEqual(['0', '—'])
  })

  it('links a figure that has somewhere to go, and only that one', () => {
    const wrapper = mount(StatStrip, { props: { items: [{ key: 'a', label: '设备', value: 3, to: '/network/device' }, { key: 'b', label: '专线', value: 1 }] }, global: { stubs }})
    expect(wrapper.findAll('.link')).toHaveLength(1)
    expect(wrapper.find('.link').attributes('data-to')).toBe('/network/device')
  })

  it('replaces the figure with a placeholder while loading', () => {
    const wrapper = mount(StatStrip, { props: { items: [{ key: 'a', label: '设备', loading: true }] }, global: { stubs }})
    expect(wrapper.find('.skeleton').exists()).toBe(true)
    expect(wrapper.find('dd strong').exists()).toBe(false)
  })

  it('marks the tone on the item', () => {
    const wrapper = mount(StatStrip, { props: { items: [{ key: 'a', label: '失败', value: 2, tone: 'danger' }] }, global: { stubs }})
    expect(wrapper.find('.stat-strip__item').classes()).toContain('is-danger')
  })
})
