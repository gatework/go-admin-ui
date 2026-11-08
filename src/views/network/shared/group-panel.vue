<template>
  <TreeNav
    ref="treeNav"
    class="group-panel"
    :items="items"
    :pinned="pinned"
    :selected="selected ?? 'all'"
    :title="labels.title"
    :show-title="showTitle"
    :search-placeholder="labels.search"
    :loading="loading"
    :failed="failed"
    :failed-text="t('network.device.groups.loadFailed')"
    :no-match-text="t('network.device.groups.noMatches')"
    :help="labels.countHelp"
    @select="key => emit('select', typeof key === 'number' ? key : undefined)"
    @retry="emit('refresh')"
  >
    <template v-if="canAdd || canEdit || canRemove" #actions>
      <a-button v-if="canAdd" type="text" size="small" :aria-label="t('network.device.groups.add')" :title="t('network.device.groups.add')" @click="emit('create')"><template #icon><icon-plus /></template></a-button>
      <AppDropdown trigger="click" @select="action">
        <a-button type="text" size="small" :disabled="!selectedGroup || removing" :aria-label="t('network.device.groups.actions')" :title="t('network.device.groups.actions')"><template #icon><icon-more /></template></a-button>
        <template #content>
          <a-doption v-if="canAdd" value="child">{{ t('network.device.groups.addChild') }}</a-doption>
          <a-doption v-if="canEdit" value="edit">{{ t('common.edit') }}</a-doption>
          <a-doption v-if="canRemove" value="remove" :disabled="Boolean(selectedGroup?.children.length || selectedGroup?.deviceCount)">{{ t('common.delete') }}</a-doption>
        </template>
      </AppDropdown>
    </template>
    <template v-if="deleteFailed" #feedback>
      <a-alert type="error">
        {{ t('network.device.groups.deleteFailed') }}
        <template #action><a-button @click="emit('refresh')">{{ t('common.refresh') }}</a-button></template>
      </a-alert>
    </template>
  </TreeNav>
</template>

<script setup lang="ts">
/**
 * The device-group tree every network page scopes its list by: device
 * inventory, delivery, firewall and wireless. Maps groups onto TreeNav and adds
 * the group maintenance actions the user's permissions allow.
 */
import { computed, nextTick, onBeforeUnmount, onDeactivated, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDropdown from '@/components/AppDropdown/index.vue'
import TreeNav from '@/components/TreeNav/index.vue'
import { useRemove } from '@/composables'
import { delDeviceGroup } from '@/api/network/device'
import { useUserStore } from '@/stores/user'
import type { DeviceGroupNode, DeviceGroupTree } from '@/types/network'
import { flattenGroups, groupNavItems } from '../device/groups/tree'

const props = withDefaults(defineProps<{ data: DeviceGroupTree, selected?: number, loading?: boolean, failed?: boolean, showTitle?: boolean, readOnly?: boolean, labels?: Partial<Record<'title' | 'all' | 'search' | 'countHelp', string>> }>(), { showTitle: true, selected: undefined, loading: false, failed: false, readOnly: false, labels: undefined })
defineOptions({ name: 'DeviceGroupPanel' })
const emit = defineEmits<{ select: [id: number | undefined], create: [parentId?: number], edit: [id: number], refresh: [], changed: [removedId: number] }>()
const { t } = useI18n()
const labels = computed(() => ({
  title: props.labels?.title ?? t('network.device.groups.title'),
  all: props.labels?.all ?? t('network.device.groups.all'),
  search: props.labels?.search ?? t('network.device.groups.search'),
  countHelp: props.labels?.countHelp ?? t('network.device.groups.countHelp')
}))
const items = computed(() => groupNavItems(props.data.items, t('network.device.groups.disabled')))
const pinned = computed(() => [
  { key: 'all', title: labels.value.all, count: props.data.totalDeviceCount },
  { key: 0, title: t('network.device.groups.ungrouped'), count: props.data.ungroupedDeviceCount }
])

const user = useUserStore()
const allowed = (action: string) => user.permisaction.some(value => value === '*:*:*' || value === `network:device-group:${action}`)
const canAdd = computed(() => !props.readOnly && allowed('add'))
const canEdit = computed(() => !props.readOnly && allowed('edit'))
const canRemove = computed(() => !props.readOnly && allowed('remove'))
const selectedGroup = computed(() => flattenGroups(props.data.items).find(node => node.id === props.selected))
const deleteFailed = ref(false)
const treeNav = ref<InstanceType<typeof TreeNav>>()
watch(() => props.selected, value => { deleteFailed.value = false; if (value === undefined) treeNav.value?.clearSearch() })

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
const invalidate = () => { generation++; treeNav.value?.clearSearch() }
watch(() => user.token, invalidate)
onDeactivated(invalidate)
onBeforeUnmount(invalidate)
</script>
