<template>
  <template v-if="!item.hidden">
    <a-menu-item v-if="leaf" :key="target" @click="navigate">
      <template v-if="icon" #icon><MenuIcon :name="icon" /></template>
      <a v-if="isExternal(target)" class="sidebar-external-link" :href="target" target="_blank" rel="noopener noreferrer" @click.stop>{{ routeTitle(leaf) }}</a>
      <span v-else class="menu-title" :title="routeTitle(leaf)">{{ routeTitle(leaf) }}</span>
    </a-menu-item>
    <a-sub-menu v-else :key="basePath" :title="routeTitle(item)">
      <template v-if="item.meta?.icon" #icon><MenuIcon :name="item.meta.icon" /></template>
      <SidebarItem v-for="child in visibleChildren" :key="resolvePath(child.path)" :item="child" :base-path="resolvePath(child.path)" />
    </a-sub-menu>
  </template>
</template>

<script setup lang="ts">
import MenuIcon from '@/components/MenuIcon/index.vue'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import path from 'path'
import { isExternal } from '@/utils/validate'
import { routeTitle } from '@/lang/backend'

defineOptions({ name: 'SidebarItem' })
const props = defineProps<{ item: any, basePath: string }>()
const router = useRouter()
const visibleChildren = computed(() => (props.item.children || []).filter((child: any) => !child.hidden))
const leaf = computed(() => {
  if (props.item.alwaysShow) return null
  if (!visibleChildren.value.length) return { ...props.item, path: '' }
  const child = visibleChildren.value[0]
  return visibleChildren.value.length === 1 && !child.children?.length ? child : null
})
const resolvePath = (routePath: string) => isExternal(routePath) ? routePath : isExternal(props.basePath) ? props.basePath : path.resolve(props.basePath, routePath)
const target = computed(() => resolvePath(leaf.value?.path || ''))
const icon = computed(() => leaf.value?.meta?.icon || props.item.meta?.icon)
const navigate = () => {
  if (isExternal(target.value)) window.open(target.value, '_blank', 'noopener,noreferrer')
  else router.push(target.value)
}
</script>
