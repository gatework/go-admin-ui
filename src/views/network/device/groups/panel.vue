<template>
  <section class="group-panel" :aria-label="labels.title">
    <div v-if="showTitle || canAdd || canEdit || canRemove" class="group-panel__header">
      <strong v-if="showTitle">{{ labels.title }}</strong>
      <a-space :size="4">
        <a-button v-if="canAdd" type="text" :aria-label="t('network.device.groups.add')" :title="t('network.device.groups.add')" @click="emit('create')"><template #icon><icon-plus /></template></a-button>
        <AppDropdown v-if="canAdd || canEdit || canRemove" trigger="click" @select="action">
          <a-button type="text" :disabled="!selectedGroup || removing" :aria-label="t('network.device.groups.actions')" :title="t('network.device.groups.actions')"><template #icon><icon-more /></template></a-button>
          <template #content>
            <a-doption v-if="canAdd" value="child">{{ t('network.device.groups.addChild') }}</a-doption>
            <a-doption v-if="canEdit" value="edit">{{ t('common.edit') }}</a-doption>
            <a-doption v-if="canRemove" value="remove" :disabled="Boolean(selectedGroup?.children.length || selectedGroup?.deviceCount)">{{ t('common.delete') }}</a-doption>
          </template>
        </AppDropdown>
      </a-space>
    </div>
    <a-input v-model="search" :placeholder="labels.search" :input-attrs="{ 'aria-label': labels.search }" allow-clear />
    <a-alert v-if="deleteFailed" type="error" class="group-panel__feedback">
      {{ t('network.device.groups.deleteFailed') }}
      <template #action><a-button @click="emit('refresh')">{{ t('common.refresh') }}</a-button></template>
    </a-alert>
    <a-spin :loading="loading" class="group-panel__body">
      <a-result v-if="failed" status="error" :title="t('network.device.groups.loadFailed')">
        <template #extra><a-button @click="emit('refresh')">{{ t('network.device.retry') }}</a-button></template>
      </a-result>
      <a-tree
        v-else
        ref="tree"
        class="group-panel__tree"
        role="tree"
        :aria-label="labels.title"
        :data="nodes"
        :selected-keys="[selected ?? 'all']"
        :expanded-keys="expandedKeys"
        :selectable="true"
        block-node
        @select="select"
        @expand="expanded = $event"
        @keydown="navigate"
      >
        <template #title="node">
          <span
            role="treeitem"
            :data-group-key="node.key"
            :tabindex="focusKey === node.key ? 0 : -1"
            :aria-selected="(selected ?? 'all') === node.key"
            :aria-level="node.level"
            :aria-expanded="node.children?.length ? expandedKeys.includes(node.key) : undefined"
            class="group-panel__node"
            @focus="focusKey = node.key"
          >
            <span class="group-panel__name" :title="node.title">{{ node.title }}<span v-if="!node.enabled" class="group-panel__disabled"> · {{ t('network.device.groups.disabled') }}</span></span>
            <span class="group-panel__count">{{ node.count }}</span>
          </span>
        </template>
      </a-tree>
      <p v-if="!failed && search && !matchedNodes.length" class="group-panel__help">{{ t('network.device.groups.noMatches') }}</p>
    </a-spin>
    <p class="group-panel__help">{{ labels.countHelp }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onDeactivated, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TreeNodeData } from '@arco-design/web-vue'
import AppDropdown from '@/components/AppDropdown/index.vue'
import { useRemove } from '@/composables'
import { delDeviceGroup } from '@/api/network/device'
import { useUserStore } from '@/stores/user'
import type { DeviceGroupNode, DeviceGroupTree } from '@/types/network'
import { flattenGroups, navigationNodes, type NavigationNode } from './tree'

const props = withDefaults(defineProps<{ data: DeviceGroupTree, selected?: number, loading: boolean, failed: boolean, showTitle?: boolean, readOnly?: boolean, labels?: Partial<Record<'title' | 'all' | 'search' | 'countHelp', string>> }>(), { showTitle: true, selected: undefined, readOnly: false, labels: undefined })
defineOptions({ name: 'DeviceGroupPanel' })
const emit = defineEmits<{ select: [id: number | undefined], create: [parentId?: number], edit: [id: number], refresh: [], changed: [removedId: number] }>()
const { t } = useI18n()
const labels = computed(() => ({
  title: props.labels?.title ?? t('network.device.groups.title'),
  all: props.labels?.all ?? t('network.device.groups.all'),
  search: props.labels?.search ?? t('network.device.groups.search'),
  countHelp: props.labels?.countHelp ?? t('network.device.groups.countHelp')
}))
const user = useUserStore()
const allowed = (action: string) => user.permisaction.some(value => value === '*:*:*' || value === `network:device-group:${action}`)
const canAdd = computed(() => !props.readOnly && allowed('add'))
const canEdit = computed(() => !props.readOnly && allowed('edit'))
const canRemove = computed(() => !props.readOnly && allowed('remove'))
const selectedGroup = computed(() => flattenGroups(props.data.items).find(node => node.id === props.selected))
const search = ref('')
const expanded = ref<(string | number)[]>([])
const focusKey = ref<string | number>('all')
const tree = ref<{ $el: HTMLElement }>()
const deleteFailed = ref(false)
const matchedNodes = computed(() => navigationNodes(props.data.items, search.value))
const nodes = computed<NavigationNode[]>(() => [
  { key: 'all', title: labels.value.all, count: props.data.totalDeviceCount, level: 1, enabled: true, children: [] },
  { key: 0, title: t('network.device.groups.ungrouped'), count: props.data.ungroupedDeviceCount, level: 1, enabled: true, children: [] },
  ...matchedNodes.value
])
const expandedKeys = computed(() => search.value.trim() ? flattenGroups(props.data.items).map(node => node.id) : expanded.value)
const nodeMap = computed(() => {
  const collect = (items: NavigationNode[]): NavigationNode[] => items.flatMap(node => [node, ...collect(node.children)])
  return new Map(collect(nodes.value).map(node => [node.key, node]))
})
watch(() => props.data.items, items => { expanded.value = [...new Set([...expanded.value, ...flattenGroups(items).filter(node => node.children.length).map(node => node.id)])] }, { immediate: true })
watch(() => props.selected, value => { focusKey.value = value ?? 'all'; deleteFailed.value = false; if (value === undefined) search.value = '' })
watch(nodes, () => { if (!nodeMap.value.has(focusKey.value)) focusKey.value = 'all' })

function select(keys: (string | number)[], data: { node?: TreeNodeData }) {
  // Arco 2.59 omits data.node for the valid numeric key 0.
  const key = keys[0] ?? data.node?.key
  if (key === undefined) return
  focusKey.value = key
  emit('select', typeof key === 'number' ? key : undefined)
}
async function focus(key: string | number) {
  focusKey.value = key
  await nextTick()
  tree.value?.$el.querySelector<HTMLElement>(`[data-group-key="${key}"]`)?.focus()
}
function navigate(event: KeyboardEvent) {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[role="treeitem"]')
  if (!target) return
  const node = nodeMap.value.get(focusKey.value)
  if (!node) return
  const items = Array.from(tree.value?.$el.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? []).filter(item => item.getClientRects().length)
  const index = items.indexOf(target)
  const focusItem = (item?: HTMLElement) => { if (item) { item.focus(); item.scrollIntoView({ block: 'nearest' }) } }
  if (event.key === 'ArrowDown') focusItem(items[index + 1])
  else if (event.key === 'ArrowUp') focusItem(items[index - 1])
  else if (event.key === 'Home') focusItem(items[0])
  else if (event.key === 'End') focusItem(items.at(-1))
  else if (event.key === 'ArrowRight') {
    if (node.children.length && !expandedKeys.value.includes(node.key)) expanded.value = [...expanded.value, node.key]
    else if (node.children[0]) void focus(node.children[0].key)
  } else if (event.key === 'ArrowLeft') {
    if (node.children.length && expandedKeys.value.includes(node.key) && !search.value) expanded.value = expanded.value.filter(key => key !== node.key)
    else if (node.parentKey !== undefined) void focus(node.parentKey)
  } else if (event.key === 'Enter' || event.key === ' ') emit('select', typeof node.key === 'number' ? node.key : undefined)
  else return
  event.preventDefault()
  event.stopPropagation()
}

let deleteContext: { node: DeviceGroupNode, token: string, generation: number } | undefined
let pending = false
let generation = 0
const currentDelete = () => deleteContext && deleteContext.token === user.token && deleteContext.generation === generation
const { remove, removing } = useRemove({
  api: async() => {
    if (!currentDelete() || !canRemove.value) throw new Error('Inactive group action')
    await delDeviceGroup(deleteContext!.node.id, deleteContext!.node.version)
  },
  confirmText: () => t('network.device.groups.deleteConfirm', { name: deleteContext?.node.name }),
  successMessage: null,
  onSuccess: () => { if (currentDelete()) emit('changed', deleteContext!.node.id) },
  onError: () => { if (currentDelete()) deleteFailed.value = true }
})
async function action(value: string | number | Record<string, unknown> | undefined) {
  const node = selectedGroup.value
  if (!node) return
  // Let AppDropdown restore its trigger before the drawer captures focus.
  await nextTick()
  if (value === 'child' && canAdd.value) emit('create', node.id)
  else if (value === 'edit' && canEdit.value) emit('edit', node.id)
  else if (value === 'remove' && canRemove.value && !pending && !node.children.length && !node.deviceCount) {
    pending = true
    deleteFailed.value = false
    deleteContext = { node: { ...node }, token: user.token, generation }
    try { await remove(node.id) } finally { pending = false }
  }
}
const invalidate = () => { generation++; search.value = '' }
watch(() => user.token, invalidate)
onDeactivated(invalidate)
onBeforeUnmount(invalidate)
</script>

<style scoped lang="scss">
.group-panel { min-width: 0; }
.group-panel__header { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
.group-panel__header strong { color: var(--color-text-1); }
.group-panel__body { display: block; min-height: 96px; margin-top: 12px; }
.group-panel__tree { max-height: min(680px, calc(100dvh - 300px)); overflow: auto; }
.group-panel__node { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-width: 0; width: 100%; line-height: 28px; border-radius: var(--border-radius-small); }
.group-panel__node:focus-visible { outline: 2px solid rgb(var(--primary-6)); outline-offset: 2px; }
.group-panel__name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.group-panel__count { flex-shrink: 0; color: var(--color-text-2); font-variant-numeric: tabular-nums; }
.group-panel__disabled { font-size: var(--motor-font-size-12); color: var(--color-text-2); }
.group-panel__help { margin: 12px 0 0; color: var(--color-text-2); font-size: var(--motor-font-size-12); line-height: 1.6; }
.group-panel__feedback { margin-top: 12px; }
.group-panel :deep(.arco-tree-node-title-text) { display: block; width: 100%; min-width: 0; }
.group-panel :deep(.arco-tree-node-title) { min-width: 0; }
@media (max-width: 767px) { .group-panel__node { min-height: 44px; } .group-panel__tree { max-height: none; } }
</style>
