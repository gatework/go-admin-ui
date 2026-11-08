<template>
  <div class="fw-device-workspace">
    <p class="fw-muted">{{ t('networkFirewall.online.deviceHelp') }}</p>
    <a-alert v-if="workspace.failed.value" type="warning">{{ t('networkFirewall.loadFailed') }}<template #action><a-button @click="refresh">{{ t('networkFirewall.retry') }}</a-button></template></a-alert>
    <AsideLayout ref="aside" :title="t('network.device.groups.title')" :current="currentScope">
      <template #aside="{ compact }">
        <GroupPanel :data="groups" :selected="devices.query.groupId" :loading="workspace.loading.value" :failed="workspace.failed.value" :show-title="!compact" read-only @select="selectGroup" @refresh="loadGroups" />
      </template>
      <ProTable :table="devices" selection row-key="id" :actions-width="160" :scroll="{ x: 1000 }">
        <template #search>
          <a-form-item :label="t('networkFirewall.searchDevice')"><a-input v-model="devices.query.keyword" :input-attrs="{ 'aria-label': t('networkFirewall.searchDevice') }" /></a-form-item>
          <a-form-item :label="t('networkFirewall.vendor')"><a-input v-model="devices.query.vendor" /></a-form-item>
        </template>
        <template #toolbar>
          <div class="fw-toolbar fw-device-toolbar">
            <span class="fw-device-toolbar__summary">{{ t('networkFirewall.online.selected', { count: devices.selection.length, limit: options.limits.maxCollectionTargets || 100 }) }}</span>
            <a-button v-if="workspace.allowed('edit')" type="primary" @click="editorDevice = undefined; editorOpen = true">{{ t('networkFirewall.newInstance') }}</a-button>
            <a-select v-model="domainId" :aria-label="t('networkFirewall.domain')"><a-option v-for="domain in options.domains" :key="domain.id" :value="domain.id">{{ domain.name }}</a-option></a-select>
            <template v-if="workspace.allowed('collect')">
              <a-button :disabled="!canStart" :loading="workspace.pending.value" @click="start('connection_test')">{{ t('networkFirewall.online.testLogin') }}</a-button>
              <a-button :disabled="!canStart" :loading="workspace.pending.value" @click="start('capture')">{{ t('networkFirewall.online.capture') }}</a-button>
            </template>
          </div>
          <a-alert v-if="selectionIssue" type="warning">{{ reasonText(selectionIssue) }}</a-alert>
        </template>
        <a-table-column :title="t('networkFirewall.device')" data-index="name" :width="180" ellipsis tooltip />
        <a-table-column title="IP" data-index="ip" :width="150" ellipsis tooltip />
        <a-table-column :title="t('networkFirewall.vendor')" data-index="vendor" :width="110" ellipsis tooltip />
        <a-table-column :title="t('networkFirewall.online.readiness')" data-index="status" :width="220">
          <template #cell="{ record }"><a-tag class="fw-connection-status" :color="record.connection.ready ? 'green' : 'orange'">{{ record.connection.ready ? t('networkFirewall.online.readyToTest') : reasonText(record.connection.reason) }}</a-tag></template>
        </a-table-column>
        <a-table-column :title="t('networkFirewall.instance')" data-index="instances" :width="140">
          <template #cell="{ record }">
            <a-select v-if="record.instances.length > 1" v-model="chosen[record.id]" :aria-label="t('networkFirewall.online.contextFor', { name: record.name })" :placeholder="t('networkFirewall.online.chooseContext')"><a-option v-for="item in record.instances" :key="item.id" :value="item.id">{{ item.nativeContext || item.name }}</a-option></a-select>
            <span v-else>{{ record.instances[0]?.nativeContext || (record.instances.length ? t('networkFirewall.online.defaultContext') : t('networkFirewall.online.autoAssociate')) }}</span>
          </template>
        </a-table-column>
        <template #actions="{ row }">
          <a-button type="text" @click="connectionDevice = row">{{ t('networkFirewall.online.connection') }}</a-button>
          <AppDropdown trigger="click"><a-button type="text" :aria-label="t('networkFirewall.online.actionsFor', { name: row.name })">{{ t('networkFirewall.online.more') }}</a-button><template #content>
            <a-doption v-if="instanceFor(row)" @click="emit('inspect', instanceFor(row)!)">{{ t('networkFirewall.objects') }}</a-doption>
            <a-doption v-if="workspace.allowed('collect')" :disabled="!!choice(row).reason" @click="start('connection_test', [row])">{{ t('networkFirewall.online.testLogin') }}</a-doption>
            <a-doption v-if="workspace.allowed('collect')" :disabled="!!choice(row).reason" @click="start('capture', [row])">{{ t('networkFirewall.online.capture') }}</a-doption>
            <a-doption v-if="workspace.allowed('edit')" @click="editorDevice = row; editorOpen = true">{{ t('networkFirewall.newInstance') }}</a-doption>
          </template></AppDropdown>
        </template>
      </ProTable>
    </AsideLayout>
    <Connection :visible="!!connectionDevice" :device="connectionDevice" @update:visible="value => { if (!value) connectionDevice = undefined }" @saved="refresh" />
    <AppDrawer v-model:visible="editorOpen" :title="t('networkFirewall.newInstance')" :width="narrow ? '100%' : editorDevice ? 600 : 1000" :footer="false"><InstanceEditor v-if="editorOpen" :device="editorDevice" :options="options" @saved="associated" /></AppDrawer>
  </div>
</template>
<script setup lang="ts">
defineOptions({ name: 'FirewallDevices' })
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ProTable from '@/components/ProTable/index.vue'
import AppDrawer from '@/components/AppDrawer/index.vue'
import AppDropdown from '@/components/AppDropdown/index.vue'
import { useTable } from '@/composables/useTable'
import { useNarrowScreen } from '@/composables/useNarrowScreen'
import { listDeviceGroup } from '@/api/network/device'
import * as api from '@/api/network/firewall'
import type { DeviceGroupTree, DeviceQuery } from '@/types/network'
import type { CollectionBatch, CollectionInput, CollectionKind, FirewallDevice, Instance, Options } from '@/types/firewall'
import AsideLayout from '@/components/AsideLayout/index.vue'
import GroupPanel from '../shared/group-panel.vue'
import { flattenGroups } from '../device/groups/tree'
import Connection from './connection.vue'
import InstanceEditor from './instance-editor.vue'
import { chooseCollectionInstance, collectionSubmission } from './collection'
import { useWorkspace } from './workspace'
const props = defineProps<{ options: Options }>()
const emit = defineEmits<{ started: [CollectionBatch], inspect: [number] }>()
const { t, te } = useI18n(); const workspace = useWorkspace(); const narrow = useNarrowScreen()
const domainId = ref(props.options.domains[0]?.id); const chosen = reactive<Record<number, number>>({}); const connectionDevice = ref<FirewallDevice>(); const editorDevice = ref<FirewallDevice>()
const editorOpen = ref(false)
const groups = ref<DeviceGroupTree>({ items: [], totalDeviceCount: 0, ungroupedDeviceCount: 0 })
const devices = useTable<FirewallDevice, DeviceQuery>({ api: query => workspace.guard(signal => api.listFirewallDevices(query, signal)), defaultQuery: () => ({ keyword: '', vendor: '' }), pageSize: 20, idKey: 'id', onError: () => { if (workspace.current()) workspace.failed.value = true } })
const choice = (row: FirewallDevice) => chooseCollectionInstance(row, chosen[row.id], workspace.allowed('edit'))
const instanceFor = (row: FirewallDevice) => choice(row).instanceId
const selectionIssue = computed(() => devices.selection.length > (props.options.limits.maxCollectionTargets || 100) ? 'too_many_targets' : devices.selection.map(row => choice(row).reason).find(Boolean))
const canStart = computed(() => !!devices.selection.length && !selectionIssue.value && !!domainId.value && !workspace.pending.value)
let pending: CollectionInput | undefined
function reasonText(reason: string) { const key = `networkFirewall.online.reasons.${reason}`; return te(key) ? t(key) : t('networkFirewall.online.reasons.collection_failed') }
const aside = ref<InstanceType<typeof AsideLayout>>()
const currentScope = computed(() => {
  const id = devices.query.groupId
  if (id === undefined) return t('network.device.groups.all')
  if (id === 0) return t('network.device.groups.ungrouped')
  return flattenGroups(groups.value.items).find(node => node.id === id)?.name ?? '—'
})
function selectGroup(groupId?: number) { devices.query.groupId = groupId; aside.value?.close(); void devices.search() }
function loadGroups() { void workspace.read(() => listDeviceGroup(), response => { groups.value = response.data }) }
async function refresh() { await devices.getList() }
function associated(instance: Instance) { chosen[instance.deviceId] = instance.id; editorDevice.value = undefined; editorOpen.value = false; void refresh() }
function start(kind: CollectionKind, rows = devices.selection) {
  if (!workspace.allowed('collect') || workspace.pending.value || !rows.length || rows.length > (props.options.limits.maxCollectionTargets || 100) || rows.some(row => choice(row).reason) || !domainId.value) return
  const selected = [...rows]; const domain = domainId.value
  void workspace.write(async() => {
    const ids: number[] = []
    for (const row of selected) {
      if (!workspace.current()) throw new Error('Inactive collection workspace')
      const selected = choice(row)
      if (selected.reason) throw new Error('Collection context changed')
      if (selected.instanceId) ids.push(selected.instanceId)
      else {
        const result = await api.addInstance({ deviceId: row.id, vendor: row.connection.vendor, nativeContext: '', mode: 'routed', domainId: domain })
        if (!workspace.current()) throw new Error('Inactive collection workspace')
        row.instances.push(result.data); chosen[row.id] = result.data.id; ids.push(result.data.id)
      }
    }
    pending = collectionSubmission(kind, ids, pending)
    return api.addCollection(pending)
  }, response => { pending = undefined; emit('started', response.data) })
}
watch(() => props.options.domains, domains => { if (!domainId.value) domainId.value = domains[0]?.id })
onMounted(loadGroups)
</script>
