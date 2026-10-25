<template>
  <a-tabs ref="tabs" v-bind="$attrs" @keydown="navigate">
    <template v-for="(_, name) in $slots" #[name]="scope"><slot :name="name" v-bind="scope || {}" /></template>
  </a-tabs>
</template>

<script setup lang="ts">
import { ref, useId, onMounted, onBeforeUnmount } from 'vue'
import { Tabs as ATabs } from '@arco-design/web-vue'

defineOptions({ name: 'AppTabs', inheritAttrs: false })
const tabs = ref<InstanceType<typeof ATabs>>()
const id = useId()
let observer: MutationObserver | undefined
const root = () => tabs.value?.$el as HTMLElement | undefined
const tabNodes = () => Array.from(root()?.querySelectorAll<HTMLElement>('.arco-tabs-nav-tab-list > .arco-tabs-tab') ?? [])
// Arco supplies rendering and activation; add the tab semantics and arrow keys
// that the previous framework supplied to keyboard/screen-reader users.
const sync = () => {
  const element = root()
  element?.querySelector('.arco-tabs-nav-tab-list')?.setAttribute('role', 'tablist')
  const panels = element?.querySelectorAll<HTMLElement>('.arco-tabs-content-item')
  tabNodes().forEach((tab, index) => {
    const active = tab.classList.contains('arco-tabs-tab-active')
    tab.id = `${id}-tab-${index}`
    tab.setAttribute('role', 'tab')
    tab.setAttribute('aria-selected', String(active))
    tab.setAttribute('tabindex', active ? '0' : '-1')
    const panel = panels?.[index]
    if (panel) {
      panel.id = `${id}-panel-${index}`
      panel.setAttribute('role', 'tabpanel')
      panel.setAttribute('aria-hidden', String(!active))
      panel.inert = !active
      panel.setAttribute('aria-labelledby', tab.id)
      tab.setAttribute('aria-controls', panel.id)
    }
  })
}
const navigate = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement
  if (!target.classList.contains('arco-tabs-tab')) return
  const nodes = tabNodes().filter(tab => !tab.classList.contains('arco-tabs-tab-disabled'))
  const index = nodes.indexOf(target)
  let next: HTMLElement | undefined
  if (event.key === 'ArrowRight') next = nodes[(index + 1) % nodes.length]
  else if (event.key === 'ArrowLeft') next = nodes[(index - 1 + nodes.length) % nodes.length]
  else if (event.key === 'Home') next = nodes[0]
  else if (event.key === 'End') next = nodes.at(-1)
  else if (event.key === ' ') next = target
  if (next) {
    event.preventDefault()
    next.click()
    next.focus()
  }
}
onMounted(() => {
  sync()
  if (root()) {
    observer = new MutationObserver(sync)
    observer.observe(root()!, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
  }
})
onBeforeUnmount(() => observer?.disconnect())
</script>
