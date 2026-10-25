<template>
  <a-menu mode="horizontal" :selected-keys="[selectedSection]" @menu-item-click="select">
    <a-menu-item v-for="item in menus" :key="item.path">
      <template v-if="item.meta?.icon" #icon><MenuIcon :name="String(item.meta.icon)" /></template>
      {{ routeTitle(item) }}
    </a-menu-item>
  </a-menu>
</template>

<script setup lang="ts">
import MenuIcon from '@/components/MenuIcon/index.vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import path from 'path'
import { usePermissionStore } from '@/stores/permission'
import { routeTitle } from '@/lang/backend'
import { isExternal } from '@/utils/validate'

const route = useRoute()
const router = useRouter()
const permission = usePermissionStore()
const menus = computed(() => permission.topbarRouters.filter(item => !(item as { hidden?: boolean }).hidden))
const activeMenu = computed(() => menus.value.find(item => route.path === item.path || route.path.startsWith(item.path + '/'))?.path || menus.value[0]?.path || '')
const selectedSection = ref('')
const setSection = (key: string) => {
  selectedSection.value = key
  const section = menus.value.find(item => item.path === key)
  if (!section) return
  const children = (section.children || []).filter(item => !(item as { hidden?: boolean }).hidden)
  if (children.length) {
    permission.setSidebarRouters(children.map(item => ({ ...item, path: isExternal(item.path) ? item.path : path.resolve(section.path, item.path) })))
  } else permission.setSidebarRouters([section])
}
const select = (key: string) => {
  if (isExternal(key)) window.open(key, '_blank', 'noopener,noreferrer')
  else {
    setSection(key)
    const section = menus.value.find(item => item.path === key)
    if (!section?.children?.length) router.push(key)
  }
}
watch(activeMenu, setSection, { immediate: true })
</script>
