<template>
  <section class="delivery-picker" :aria-label="t('networkDelivery.chooseDevices')">
    <div v-if="canSelect" class="delivery-selection" aria-live="polite">
      <div><strong>{{ t('networkDelivery.selected', { count: devices.length, max: options.maxTargets }) }}</strong><a-button v-if="devices.length" type="text" :aria-expanded="showSelected" @click="showSelected = !showSelected">{{ t(showSelected ? 'networkDelivery.hideSelected' : 'networkDelivery.showSelected') }}</a-button></div>
      <a-button v-if="devices.length" type="text" :aria-label="t('networkDelivery.clearSelection')" :title="t('networkDelivery.clearSelection')" :disabled="disabled || collecting" @click="emit('update:devices', [])"><template v-if="narrow" #icon><icon-close /></template><template v-if="!narrow">{{ t('networkDelivery.clearSelection') }}</template></a-button>
    </div>
    <div v-if="showSelected && devices.length" class="delivery-picked-list">
      <div v-for="device in devices" :key="device.id"><span>{{ deviceName(device) }} <small>{{ device.ip }}</small></span><a-button type="text" :aria-label="t('networkDelivery.removeDevice', { name: deviceName(device) })" :disabled="disabled || collecting" @click="remove(device.id)"><template #icon><icon-close /></template></a-button></div>
    </div>
    <a-alert v-if="selectionError" type="warning" class="delivery-notice" closable @close="selectionError = ''">{{ t(`networkDelivery.${selectionError}`, { max: options.maxTargets }) }}</a-alert>
    <AsideLayout class="delivery-inventory" :title="t('networkDelivery.selectArea')" :card="false" :breakpoint="767" collapse="none">
      <template #aside>
        <div class="delivery-inventory-nav" :inert="collecting || undefined">
          <GroupPanel :data="groupTree" :selected="table.query.groupId" :labels="{ title: t('networkDelivery.selectArea') }" read-only @select="selectArea" />
        </div>
      </template>
      <a-form :model="searchModel" class="delivery-device-filters" layout="vertical" @submit-success="search">
        <a-form-item v-if="narrow" v-input-label="t('networkDelivery.selectArea')" :label="t('networkDelivery.area')"><a-select :model-value="table.query.groupId ?? 'all'" allow-search :disabled="collecting" @change="selectArea($event === 'all' ? undefined : Number($event))">
          <a-option value="all">{{ t('networkDelivery.allDevices') }} · {{ groupTree.totalDeviceCount }}</a-option>
          <a-option v-for="option in areaOptions" :key="String(option.value)" :value="option.value">{{ option.label }}</a-option>
          <a-option :value="0">{{ t('network.device.groups.ungrouped') }} · {{ groupTree.ungroupedDeviceCount }}</a-option>
        </a-select></a-form-item>
        <a-form-item v-input-label="t('networkDelivery.deviceRoles')" :label="t('networkDelivery.deviceRoles')"><a-select v-model="searchModel.role" :placeholder="t('networkDelivery.allRoles')" allow-clear allow-search :disabled="collecting" @change="search"><a-option v-for="role in roles" :key="role" :value="role">{{ role === '__empty__' ? t('networkDelivery.noRole') : t(`network.device.roleValues.${role}`) }}</a-option></a-select></a-form-item>
        <a-form-item v-input-label="t('networkDelivery.vendor')" :label="t('networkDelivery.vendor')"><a-select v-model="searchModel.vendor" :placeholder="t('networkDelivery.allVendors')" allow-clear allow-search :disabled="collecting" @change="changeVendor"><a-option v-for="vendor in vendors" :key="vendor" :value="vendor">{{ vendor === '__empty__' ? t('networkDelivery.unknownVendor') : vendor }}</a-option></a-select></a-form-item>
        <a-form-item v-input-label="t('networkDelivery.model')" :label="t('networkDelivery.model')"><a-select v-model="searchModel.model" :placeholder="t('networkDelivery.allModels')" allow-clear allow-search :disabled="collecting" @change="search"><a-option v-for="model in models" :key="model" :value="model">{{ model }}</a-option></a-select></a-form-item>
        <div class="delivery-device-search"><a-form-item hide-label :label="t('networkDelivery.deviceSearch')"><a-input v-model="searchModel.keyword" :input-attrs="{ 'aria-label': t('networkDelivery.deviceSearch') }" :placeholder="t('networkDelivery.devicePlaceholder')" allow-clear :disabled="collecting"><template #prefix><icon-search /></template></a-input></a-form-item><a-button html-type="submit" :loading="table.loading" :disabled="collecting">{{ t('common.search') }}</a-button><a-button :disabled="collecting" @click="resetFilters">{{ t('common.reset') }}</a-button></div>
      </a-form>
      <div v-if="canSelect" class="delivery-selection-actions">
        <a-checkbox :model-value="pageSelected" :indeterminate="pagePartial" :disabled="disabled || collecting || table.loading || !selectable.length" @change="selectPage">{{ t('networkDelivery.selectPage') }}</a-checkbox>
        <a-button type="text" :loading="collecting" :disabled="disabled || table.loading || !table.total" @click="selectResults">{{ t('networkDelivery.selectResults') }}</a-button>
        <span>{{ t('networkDelivery.matchingDevices', { count: table.total }) }}</span>
      </div>
      <ProTable :table="table" :panels="false" row-key="id" :actions-width="104" :scroll="{ x: 580 }">
        <a-table-column data-index="name" :title="t('networkDelivery.device')" :width="240"><template #cell="{ record }">
          <div class="delivery-device-check"><a-checkbox v-if="canSelect" :model-value="selectedIds.has(record.id)" :aria-label="t('networkDelivery.pick', { name: deviceName(record) })" :disabled="disabled || collecting || (!selectedIds.has(record.id) && (!record.connection.ready || devices.length >= options.maxTargets))" @change="toggle(record)" @click.stop @pointerdown.stop /><div class="delivery-identity"><strong>{{ deviceName(record) }}</strong><span>{{ record.ip }}</span><span>{{ [record.vendor, record.model].filter(Boolean).join(' · ') }}</span></div></div>
        </template></a-table-column>
        <a-table-column data-index="deviceRole" :title="t('networkDelivery.rolePlatform')" :width="180"><template #cell="{ record }"><div class="delivery-identity"><span class="delivery-role-label">{{ roleName(record, t) }}</span><span>{{ platformName(record.connection.profile, t) }}</span></div></template></a-table-column>
        <a-table-column data-index="connection" :title="t('networkDelivery.availability')" :width="160"><template #cell="{ record }"><span :class="{ 'delivery-available': record.connection.ready }">{{ record.connection.ready ? t('networkDelivery.ready') : t(`networkDelivery.reasons.${reasonKeys.has(record.connection.reason) ? record.connection.reason : 'unavailable'}`) }}</span></template></a-table-column>
        <template v-if="canConfigure" #actions="{ row }"><a-button type="text" :disabled="disabled || collecting" @click="configure(row)">{{ t(row.connection.profile ? 'networkDelivery.connectionOptions' : 'networkDelivery.identifyPlatform') }}</a-button></template>
        <template #empty><a-result :status="failed ? 'error' : 'info'" :title="t(failed ? 'networkDelivery.deviceLoadFailed' : 'networkDelivery.deviceEmpty')" :subtitle="t('networkDelivery.deviceEmptyHelp')"><template #extra><a-button @click="table.getList">{{ t('networkDelivery.retry') }}</a-button></template></a-result></template>
      </ProTable>
    </AsideLayout>
    <Connection v-model:visible="connectionVisible" :device="connectionDevice" :profiles="options.profiles" @saved="connectionSaved" />
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ProTable from '@/components/ProTable/index.vue'
import { useTable } from '@/composables'
import { useNarrowScreen } from '@/composables/useNarrowScreen'
import { getConnection, listDeliveryDevice } from '@/api/network/delivery'
import type { DeliveryDevice, DeliveryDeviceQuery, DeliveryOptions, DeviceSnapshot } from '@/types/network-delivery'
import { vInputLabel } from '../shared/input-label'
import Connection from './connection.vue'
import { deviceName } from './form'
import { inventoryQuery, mergeSelection, platformName, roleName, snapshotDevice, type InventoryFilters } from './inventory'
import AsideLayout from '@/components/AsideLayout/index.vue'
import GroupPanel from '../shared/group-panel.vue'
import { groupOptions } from '../device/groups/tree'
import { deviceRoles } from '@/types/network'
import { reasonKeys } from './presentation'

defineOptions({ name: 'DeliveryPicker' })
const props = withDefaults(defineProps<{ devices: DeviceSnapshot[], options: DeliveryOptions, canConfigure: boolean, disabled: boolean, canSelect?: boolean }>(), { canSelect: true })
const emit = defineEmits<{ 'update:devices': [DeviceSnapshot[]] }>()
const { t } = useI18n()
const narrow = useNarrowScreen()
const selectedIds = computed(() => new Set(props.devices.map(device => device.id)))
const groupTree = computed(() => props.options.deviceGroups || { items: [], totalDeviceCount: 0, ungroupedDeviceCount: 0 })
const areaOptions = computed(() => groupOptions(groupTree.value.items))
const facets = computed(() => props.options.inventoryGroups || [])
const roles = computed(() => [...deviceRoles.filter(role => facets.value.some(item => item.deviceRole === role)), ...(facets.value.some(item => !item.deviceRole) ? ['__empty__'] : [])])
const vendors = computed(() => [...new Set(facets.value.map(item => item.vendor || '__empty__'))].sort())
const models = computed(() => [...new Set(facets.value.filter(item => !searchModel.vendor || (item.vendor || '__empty__') === searchModel.vendor).map(item => item.model).filter((model): model is string => Boolean(model)))].sort())
const searchModel = reactive<InventoryFilters>({ keyword: '', role: undefined, vendor: undefined, model: undefined })
const showSelected = ref(false)
const failed = ref(false)
const collecting = ref(false)
const selectionError = ref('')
const connectionVisible = ref(false)
const connectionDevice = ref<DeviceSnapshot>()
let controller: AbortController | undefined
let bulkController: AbortController | undefined
let active = true
const table = useTable<DeliveryDevice, DeliveryDeviceQuery>({
  idKey: 'id', pageSize: 10, defaultQuery: () => ({ keyword: '' }),
  api: query => { controller?.abort(); controller = new AbortController(); failed.value = false; return listDeliveryDevice(query, controller.signal) },
  onError: () => { failed.value = true }
})
const selectable = computed(() => table.rows.filter(device => device.connection.ready || selectedIds.value.has(device.id)))
const pageSelected = computed(() => selectable.value.length > 0 && selectable.value.every(device => selectedIds.value.has(device.id)))
const pagePartial = computed(() => !pageSelected.value && selectable.value.some(device => selectedIds.value.has(device.id)))
function remove(id: number) { if (props.canSelect && !props.disabled && !collecting.value) emit('update:devices', props.devices.filter(device => device.id !== id)) }
function toggle(device: DeliveryDevice) {
  if (!props.canSelect || props.disabled || collecting.value) return
  if (selectedIds.value.has(device.id)) remove(device.id)
  else if (device.connection.ready && props.devices.length < props.options.maxTargets) emit('update:devices', [...props.devices, snapshotDevice(device)])
}
function selectPage(value: boolean | (string | number | boolean)[]) {
  if (!props.canSelect || props.disabled || collecting.value) return
  if (!value) { const ids = new Set(selectable.value.map(device => device.id)); emit('update:devices', props.devices.filter(device => !ids.has(device.id))); return }
  const next = mergeSelection(props.devices, selectable.value, props.options.maxTargets)
  if (next) { emit('update:devices', next); selectionError.value = '' } else selectionError.value = 'selectionLimit'
}
function selectArea(groupId: number | undefined) { if (!collecting.value) { table.query.groupId = groupId; void table.search() } }
function search() {
  for (const field of ['deviceRole', 'deviceRoleEmpty', 'vendor', 'vendorEmpty', 'model'] as const) delete table.query[field]
  Object.assign(table.query, inventoryQuery(searchModel))
  void table.search()
}
function changeVendor() { searchModel.model = undefined; search() }
function resetFilters() { Object.assign(searchModel, { keyword: '', role: undefined, vendor: undefined, model: undefined }); search() }
async function selectResults() {
  if (!props.canSelect || props.disabled || collecting.value) return
  collecting.value = true; selectionError.value = ''; bulkController = new AbortController()
  let next = [...props.devices]
  const query = { ...table.query, pageSize: 200 }
  try {
    for (let pageIndex = 1; ; pageIndex++) {
      const result = await listDeliveryDevice({ ...query, pageIndex }, bulkController.signal)
      if (!active || bulkController.signal.aborted || props.disabled) return
      const merged = mergeSelection(next, result.data.list, props.options.maxTargets)
      if (!merged) { selectionError.value = 'selectionLimit'; return }
      next = merged
      if (pageIndex * query.pageSize >= result.data.count || !result.data.list.length) break
    }
    const changed = next.length !== props.devices.length
    emit('update:devices', next)
    if (!changed) selectionError.value = 'noAdditionalDevices'
  } catch { if (active && !bulkController.signal.aborted) selectionError.value = 'selectionFailed' } finally { collecting.value = false }
}
function configure(device: DeliveryDevice) { connectionDevice.value = snapshotDevice(device); connectionVisible.value = true }
async function connectionSaved() {
  void table.getList()
  const device = connectionDevice.value
  if (!device || !selectedIds.value.has(device.id)) return
  try {
    const result = await getConnection(device.id)
    if (!active) return
    emit('update:devices', result.data.ready ? props.devices.map(item => item.id === device.id ? { ...item, profile: result.data.profile } : item) : props.devices.filter(item => item.id !== device.id))
  } catch { /* The request layer reports the error; the server revalidates on submission. */ }
}
onBeforeUnmount(() => { active = false; controller?.abort(); bulkController?.abort() })
</script>
