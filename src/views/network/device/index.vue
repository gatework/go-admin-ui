<template>
  <PageContainer class="device-page network-list" :class="{ 'device-page--empty': !table.rows.length }">
    <a-alert v-if="statusFailed" type="warning" class="device-page__feedback">
      {{ t('network.device.statusFailed') }}
      <template #action><a-button :loading="statusLoading" @click="refreshStatus">{{ t('network.device.checkSync') }}</a-button></template>
    </a-alert>
    <a-alert v-else-if="syncFailed || syncStatus?.status === 'failed'" type="warning" class="device-page__feedback">
      {{ t('network.device.syncFailed') }}
    </a-alert>
    <a-alert v-else-if="syncStatus?.status === 'running' && !syncing" class="device-page__feedback">
      {{ t('network.device.syncRunning') }}
      <template #action><a-button :loading="statusLoading" @click="refreshStatusAndList">{{ t('network.device.checkSync') }}</a-button></template>
    </a-alert>
    <a-alert v-else-if="syncResult" type="success" class="device-page__feedback" aria-live="polite">
      {{ t('network.device.syncSucceeded', { ...syncResult }) }}
    </a-alert>
    <a-alert v-if="syncStatus && !syncStatus.configured && table.rows.length" type="warning" class="device-page__feedback" :title="t('network.device.unconfigured')">
      {{ t('network.device.unconfiguredHelp') }}
    </a-alert>

    <a-button v-if="compactGroups" class="device-page__group-trigger" @click="groupDrawerVisible = true"><template #icon><icon-folder /></template>{{ t('network.device.groups.title') }} · {{ currentScope }}</a-button>
    <div class="device-page__layout" :class="{ 'device-page__layout--compact': compactGroups }">
      <a-card v-if="!compactGroups" class="device-page__groups">
        <GroupPanel :data="groups" :selected="appliedFilters.groupId" :loading="groupsLoading" :failed="groupsFailed" @select="selectGroup" @create="createGroup" @edit="editGroup" @refresh="refreshGroups" @changed="groupRemoved" />
      </a-card>
      <div class="device-page__results">
        <ProTable :table="table" :selection="canEdit" row-key="id" :actions-width="canEdit ? 136 : 84" :scroll="{ x: 1310 }">
          <template #search>
            <a-form-item :label="t('network.device.keyword')">
              <a-input v-model="table.query.keyword" :input-attrs="{ 'aria-label': t('network.device.keyword') }" :placeholder="t('network.device.keywordPlaceholder')" allow-clear />
            </a-form-item>
            <a-form-item v-input-label="t('network.device.status')" :label="t('network.device.status')">
              <a-select v-model="table.query.status" :placeholder="t('common.selectPlaceholder')" allow-clear>
                <a-option v-for="status in deviceStatuses" :key="status" :value="status">{{ t(`network.device.statusValues.${status}`) }}</a-option>
              </a-select>
            </a-form-item>
            <a-form-item v-input-label="t('network.device.deviceType')" :label="t('network.device.deviceType')">
              <a-select v-model="table.query.deviceType" :placeholder="t('common.selectPlaceholder')" allow-clear>
                <a-option v-for="type in deviceTypes" :key="type" :value="type">{{ t(`network.device.typeValues.${type}`) }}</a-option>
              </a-select>
            </a-form-item>
            <a-form-item v-input-label="t('network.device.vendor')" :label="t('network.device.vendor')">
              <a-select v-model="table.query.vendor" :placeholder="t('common.selectPlaceholder')" allow-search allow-clear>
                <a-option v-for="vendor in options.vendors" :key="vendor" :value="vendor">{{ vendor }}</a-option>
              </a-select>
            </a-form-item>
            <a-form-item v-input-label="t('network.device.model')" :label="t('network.device.model')">
              <a-select v-model="table.query.model" :placeholder="t('common.selectPlaceholder')" allow-search allow-clear>
                <a-option v-for="model in options.models" :key="model" :value="model">{{ model }}</a-option>
              </a-select>
            </a-form-item>
            <a-form-item v-input-label="t('network.device.deviceRole')" :label="t('network.device.deviceRole')">
              <a-select v-model="table.query.deviceRole" :placeholder="t('common.selectPlaceholder')" allow-clear>
                <a-option v-for="role in deviceRoles" :key="role" :value="role">{{ t(`network.device.roleValues.${role}`) }}</a-option>
              </a-select>
            </a-form-item>
            <a-form-item :label="t('network.device.tag')"><a-input v-model="table.query.tag" :input-attrs="{ 'aria-label': t('network.device.tag') }" allow-clear /></a-form-item>
          </template>
          <template #toolbar>
            <a-button v-if="canSync" type="primary" :loading="syncing" :disabled="!syncStatus?.configured || statusLoading || syncStatus.status === 'running'" @click="sync">
              {{ t(syncing ? 'network.device.syncing' : 'network.device.sync') }}
            </a-button>
            <a-button v-if="canExport" :loading="exporting" :disabled="table.loading || !table.total" :title="t('network.device.exportHelp')" @click="download">
              {{ t('common.export') }}
            </a-button>
            <a-button v-if="canEdit" :disabled="table.multiple || table.loading || groupsLoading || groupsFailed || table.selection.length > 200" :title="t('network.device.groups.selectionLimit')" @click="showAssignment(table.selection)">{{ t('network.device.groups.assign') }}</a-button>
            <div class="device-page__summary">
              <span>{{ t('network.device.groups.scope', { name: currentScope }) }}</span>
              <span>{{ t('network.device.resultCount', { count: table.total }) }}</span>
              <span>{{ t('network.device.source') }}</span>
              <span>{{ t('network.device.lastSync') }}: {{ lastSyncLabel }}</span>
            </div>
          </template>
          <a-table-column :title="t('network.device.identity')" data-index="name" :width="232">
            <template #cell="{ record }">
              <div class="device-page__identity">
                <a-button v-if="canQuery" type="text" class="device-page__name" @click="showDetail(record.id)">{{ record.name || record.hostname || record.ip }}</a-button>
                <strong v-else>{{ record.name || record.hostname || record.ip }}</strong>
                <span>{{ [record.vendor, record.model].filter(Boolean).join(' ') || '—' }}</span>
              </div>
            </template>
          </a-table-column>
          <a-table-column :title="t('network.device.ip')" data-index="ip" :width="148" ellipsis tooltip />
          <a-table-column :title="t('network.device.deviceRole')" data-index="deviceRole" :width="140" ellipsis tooltip>
            <template #cell="{ record }">{{ record.deviceRole ? t(`network.device.roleValues.${record.deviceRole}`) : '—' }}</template>
          </a-table-column>
          <a-table-column :title="t('network.device.deviceType')" data-index="deviceType" :width="128" ellipsis tooltip>
            <template #cell="{ record }">{{ record.deviceType ? t(`network.device.typeValues.${record.deviceType}`) : '—' }}</template>
          </a-table-column>
          <a-table-column :title="t('network.device.serial')" data-index="serial" :width="158" ellipsis tooltip>
            <template #cell="{ record }">{{ record.serial || '—' }}</template>
          </a-table-column>
          <a-table-column :title="t('network.device.location')" data-index="location" :width="160" ellipsis tooltip>
            <template #cell="{ record }">{{ record.location || '—' }}</template>
          </a-table-column>
          <a-table-column :title="t('network.device.status')" data-index="status" :width="112">
            <template #cell="{ record }"><a-tag :color="statusColors[record.status as DeviceStatus]">{{ t(`network.device.statusValues.${record.status}`) }}</a-tag></template>
          </a-table-column>
          <a-table-column :title="t('network.device.group')" data-index="group" :width="132" ellipsis tooltip>
            <template #cell="{ record }">{{ record.group || t('network.device.groups.ungrouped') }}</template>
          </a-table-column>
          <template v-if="canQuery || canEdit" #actions="{ row }">
            <a-button v-if="canQuery && !canEdit" type="text" @click="showDetail(row.id)">{{ t('network.device.view') }}</a-button>
            <a-button v-if="canEdit" type="text" @click="showEditor(row.id)">{{ t('common.edit') }}</a-button>
            <AppDropdown v-if="canEdit" trigger="click" @select="rowAction($event, row)">
              <a-button type="text">{{ t('common.actions') }}<icon-down /></a-button>
              <template #content>
                <a-doption v-if="canQuery" value="view">{{ t('network.device.view') }}</a-doption>
                <a-doption value="assign" :disabled="groupsLoading || groupsFailed">{{ t('network.device.groups.assign') }}</a-doption>
              </template>
            </AppDropdown>
          </template>
          <template #empty>
            <a-result v-if="!table.loading" :status="listFailed ? 'error' : 'info'" :title="emptyTitle" :subtitle="emptyHelp">
              <template #extra>
                <a-button v-if="hasFilters" @click="table.resetQuery">{{ t('network.device.resetFilters') }}</a-button>
                <a-button v-else-if="listFailed" @click="table.getList">{{ t('network.device.retry') }}</a-button>
              </template>
            </a-result>
          </template>
        </ProTable>
        <a-result v-if="narrow && !table.loading && !table.rows.length" :status="listFailed ? 'error' : 'info'" :title="emptyTitle" :subtitle="emptyHelp">
          <template #extra>
            <a-button v-if="hasFilters" @click="table.resetQuery">{{ t('network.device.resetFilters') }}</a-button>
            <a-button v-else-if="listFailed" @click="table.getList">{{ t('network.device.retry') }}</a-button>
          </template>
        </a-result>
      </div>
    </div>
    <AppDrawer v-if="compactGroups" v-model:visible="groupDrawerVisible" class="network-drawer" :title="t('network.device.groups.title')" :width="narrow ? '100%' : 360">
      <GroupPanel :data="groups" :selected="appliedFilters.groupId" :loading="groupsLoading" :failed="groupsFailed" :show-title="false" @select="selectGroup" @create="createGroup" @edit="editGroup" @refresh="refreshGroups" @changed="groupRemoved" />
      <template #footer><a-button @click="groupDrawerVisible = false">{{ t('common.close') }}</a-button></template>
    </AppDrawer>
    <DeviceDetail :id="selectedId" v-model:visible="detailVisible" :can-edit="canEdit" @edit="showEditor" />
    <DeviceEditor :id="selectedId" v-model:visible="editorVisible" :groups="groups.items" :groups-loading="groupsLoading" :groups-failed="groupsFailed" @saved="reloadInventory" />
    <GroupEditor v-model:visible="groupEditorVisible" :record="groupEditorRecord" :parent-id="groupParentId" :groups="groups.items" :refresh="refreshGroupEditor" @saved="reloadInventory" />
    <GroupAssignment v-model:visible="assignmentVisible" :records="assignmentRecords" :groups="groups.items" @saved="reloadInventory" @refresh="reloadInventory" />
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import PageContainer from '@/components/PageContainer/index.vue'
import ProTable from '@/components/ProTable/index.vue'
import AppDrawer from '@/components/AppDrawer/index.vue'
import AppDropdown from '@/components/AppDropdown/index.vue'
import { useTable } from '@/composables'
import { useNarrowScreen } from '@/composables/useNarrowScreen'
import { useUserStore } from '@/stores/user'
import { usePreferencesStore } from '@/stores/preferences'
import { preferenceTime } from '@/utils/preference-time'
import { exportDevice, getDeviceOptions, getDeviceSyncStatus, listDevice, listDeviceGroup, syncDevice } from '@/api/network/device'
import { deviceRoles, deviceStatuses, deviceTypes, type Device, type DeviceGroupNode, type DeviceGroupTree, type DeviceOptions, type DeviceQuery, type DeviceStatus, type DeviceSyncResult, type DeviceSyncStatus } from '@/types/network'
import DeviceDetail from './detail.vue'
import DeviceEditor from './editor.vue'
import GroupPanel from './groups/panel.vue'
import GroupEditor from './groups/editor.vue'
import GroupAssignment from './groups/assignment.vue'
import { flattenGroups } from './groups/tree'
import { vInputLabel } from '../shared/input-label'
import '../shared/list.scss'

defineOptions({ name: 'NetworkDeviceManage' })
const { t } = useI18n()
const user = useUserStore()
const preferences = usePreferencesStore()
const narrow = useNarrowScreen()
const compactGroups = useNarrowScreen(1023)
const allowed = (action: string) => user.permisaction.some(permission => permission === '*:*:*' || permission === `network:device:${action}`)
const canQuery = computed(() => allowed('query'))
const canEdit = computed(() => allowed('edit'))
const canSync = computed(() => allowed('sync'))
const canExport = computed(() => allowed('export'))
const options = ref<DeviceOptions>({ vendors: [], models: [] })
const groups = ref<DeviceGroupTree>({ items: [], totalDeviceCount: 0, ungroupedDeviceCount: 0 })
const groupsLoading = ref(false)
const groupsFailed = ref(false)
const groupDrawerVisible = ref(false)
const groupEditorVisible = ref(false)
const groupEditorRecord = ref<DeviceGroupNode>()
const groupParentId = ref<number>()
const assignmentVisible = ref(false)
const assignmentRecords = ref<Device[]>([])
const syncStatus = ref<DeviceSyncStatus>()
const syncResult = ref<DeviceSyncResult>()
const statusLoading = ref(false)
const statusFailed = ref(false)
const syncFailed = ref(false)
const syncing = ref(false)
const exporting = ref(false)
const listFailed = ref(false)
const appliedFilters = ref<DeviceQuery>({})
const detailVisible = ref(false)
const editorVisible = ref(false)
const selectedId = ref<number>()
let active = true
let generation = 0
let statusRequest = 0
let optionsRequest = 0
let groupsRequest = 0
const statusColors: Record<DeviceStatus, string> = { pending: 'orange', active: 'green', maintenance: 'blue', disabled: 'gray', retired: 'gray' }

const defaultQuery = (): DeviceQuery => ({ keyword: '', vendor: undefined, model: undefined, status: undefined, deviceType: undefined, deviceRole: undefined, groupId: undefined, tag: '' })
const table = useTable<Device, DeviceQuery>({
  idKey: 'id',
  defaultQuery,
  api: async query => {
    table.handleSelectionChange([])
    const current = generation
    const token = user.token
    listFailed.value = false
    const { pageIndex, pageSize, ...filters } = query
    appliedFilters.value = { ...filters }
    const response = await listDevice({ ...filters, pageIndex, pageSize })
    return isCurrent(current, token) ? response : { code: 200, msg: '', data: { list: [], count: 0 }}
  },
  onError: () => { listFailed.value = true }
})
const hasFilters = computed(() => Object.values(appliedFilters.value).some(value => value !== undefined && value !== ''))
const currentScope = computed(() => appliedFilters.value.groupId === undefined ? t('network.device.groups.all') : appliedFilters.value.groupId === 0 ? t('network.device.groups.ungrouped') : flattenGroups(groups.value.items).find(node => node.id === appliedFilters.value.groupId)?.name ?? '—')
const emptyState = computed(() => listFailed.value ? 'listFailed' : hasFilters.value ? 'noResults' : syncStatus.value && !syncStatus.value.configured ? 'unconfigured' : 'firstSync')
const emptyTitle = computed(() => t(`network.device.${emptyState.value}`))
const emptyHelp = computed(() => t(`network.device.${emptyState.value}Help`))
const lastSyncLabel = computed(() => {
  const value = syncStatus.value?.lastSuccessAt
  if (!value) return t('network.device.neverSynced')
  return preferenceTime(value, preferences.timeZone) ?? '—'
})
const isCurrent = (current: number, token: string) => active && current === generation && user.token === token

function showDetail(id: number) { if (canQuery.value) { selectedId.value = id; detailVisible.value = true } }
function showEditor(id: number) {
  if (!canEdit.value) return
  detailVisible.value = false
  selectedId.value = id
  editorVisible.value = true
}
function selectGroup(id: number | undefined) {
  Object.assign(table.query, defaultQuery(), appliedFilters.value, { groupId: id })
  groupDrawerVisible.value = false
  void table.search()
}
function createGroup(parentId?: number) {
  groupParentId.value = parentId
  groupEditorRecord.value = undefined
  groupEditorVisible.value = true
}
function editGroup(id: number) {
  groupEditorRecord.value = flattenGroups(groups.value.items).find(node => node.id === id)
  groupParentId.value = undefined
  groupEditorVisible.value = Boolean(groupEditorRecord.value)
}
async function groupRemoved(id: number) {
  if (appliedFilters.value.groupId === id) Object.assign(table.query, defaultQuery(), appliedFilters.value, { groupId: undefined, pageIndex: 1 })
  await reloadInventory()
}
function showAssignment(records: Device[]) {
  if (!canEdit.value || groupsLoading.value || groupsFailed.value || !records.length || records.length > 200) return
  assignmentRecords.value = records.map(record => ({ ...record }))
  assignmentVisible.value = true
}
async function rowAction(value: string | number | Record<string, unknown> | undefined, record: Device) {
  await nextTick()
  if (value === 'view') showDetail(record.id)
  else if (value === 'assign') showAssignment([record])
}
async function refreshGroupEditor() {
  await refreshGroups()
  if (groupsFailed.value) throw new Error('Groups could not be refreshed')
  if (groupEditorRecord.value && !flattenGroups(groups.value.items).some(node => node.id === groupEditorRecord.value?.id)) groupEditorVisible.value = false
}
async function refreshGroups() {
  const current = generation
  const token = user.token
  const request = ++groupsRequest
  groupsLoading.value = true
  try {
    const response = await listDeviceGroup()
    if (!isCurrent(current, token) || request !== groupsRequest) return
    groups.value = response.data
    groupsFailed.value = false
    if (groupEditorRecord.value) groupEditorRecord.value = flattenGroups(response.data.items).find(node => node.id === groupEditorRecord.value?.id) ?? groupEditorRecord.value
  } catch { if (isCurrent(current, token) && request === groupsRequest) groupsFailed.value = true } finally { if (request === groupsRequest) groupsLoading.value = false }
}
async function refreshStatus() {
  const current = generation
  const token = user.token
  const request = ++statusRequest
  statusLoading.value = true
  try {
    const response = await getDeviceSyncStatus()
    if (!isCurrent(current, token) || request !== statusRequest) return
    syncStatus.value = response.data
    statusFailed.value = false
    syncFailed.value = response.data.status === 'failed'
  } catch {
    if (isCurrent(current, token) && request === statusRequest) statusFailed.value = true
  } finally {
    if (request === statusRequest) statusLoading.value = false
  }
}
async function refreshOptions() {
  const current = generation
  const token = user.token
  const request = ++optionsRequest
  try {
    const response = await getDeviceOptions()
    if (isCurrent(current, token) && request === optionsRequest) options.value = response.data
  } catch { /* The request client reports the error; text search remains available. */ }
}
async function reloadInventory() { await Promise.all([table.getList(), refreshOptions(), refreshGroups()]) }
async function refreshStatusAndList() { await Promise.all([refreshStatus(), table.getList(), refreshGroups()]) }
async function sync() {
  if (syncing.value || !canSync.value || !syncStatus.value?.configured || syncStatus.value.status === 'running') return
  const current = generation
  const token = user.token
  syncing.value = true
  syncFailed.value = false
  syncResult.value = undefined
  try {
    const response = await syncDevice()
    if (!isCurrent(current, token)) return
    syncResult.value = response.data
    await Promise.all([reloadInventory(), refreshStatus()])
  } catch {
    if (!isCurrent(current, token)) return
    syncFailed.value = true
    await refreshStatus()
    syncFailed.value = true
  } finally { syncing.value = false }
}
async function download() {
  if (exporting.value || table.loading || !canExport.value || !table.total) return
  const current = generation
  const token = user.token
  exporting.value = true
  try {
    const response = await exportDevice({ ...appliedFilters.value })
    if (!isCurrent(current, token)) return
    const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `device-inventory-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch { /* The shared request client owns error messages. */ } finally { exporting.value = false }
}
function invalidate() {
  active = false
  generation++
  detailVisible.value = false
  editorVisible.value = false
  groupDrawerVisible.value = false
  groupEditorVisible.value = false
  assignmentVisible.value = false
  assignmentRecords.value = []
  table.handleSelectionChange([])
}
watch(() => user.token, () => { invalidate(); table.rows = []; table.total = 0; options.value = { vendors: [], models: [] }; groups.value = { items: [], totalDeviceCount: 0, ungroupedDeviceCount: 0 }; syncStatus.value = undefined })
onMounted(() => { void refreshStatus(); void refreshOptions(); void refreshGroups() })
onActivated(() => {
  if (active) return
  active = true
  void refreshStatusAndList()
  void refreshOptions()
})
onDeactivated(invalidate)
onBeforeUnmount(invalidate)
</script>

<style scoped lang="scss">
.device-page__feedback { margin-bottom: 16px; }
.device-page__layout { display: grid; grid-template-columns: 244px minmax(0, 1fr); align-items: start; gap: 16px; }
.device-page__layout--compact { grid-template-columns: minmax(0, 1fr); }
.device-page__groups { min-width: 0; }
.device-page__groups :deep(.arco-card-body) { padding: 16px; }
.device-page__results { min-width: 0; }
.device-page__group-trigger { margin-bottom: 12px; max-width: 100%; height: auto; min-height: 32px; white-space: normal; text-align: left; }
.device-page__summary { display: flex; flex-wrap: wrap; gap: 4px 16px; margin-right: auto; color: var(--color-text-2); font-size: var(--motor-font-size-12); line-height: 1.6; }
.device-page__identity { display: flex; flex-direction: column; align-items: flex-start; min-width: 0; }
.device-page__identity > span { color: var(--color-text-2); font-size: var(--motor-font-size-12); line-height: 1.6; overflow-wrap: anywhere; }
.device-page__identity > strong { overflow-wrap: anywhere; }
.device-page__name { padding: 0; height: auto; max-width: 100%; font-weight: 600; white-space: normal; text-align: left; overflow-wrap: anywhere; }
.device-page :deep(.arco-table-td) { font-variant-numeric: tabular-nums; }
@media (max-width: 767px) {
  .device-page__summary { flex-direction: column; max-width: min(280px, calc(100vw - 64px)); }
  .device-page__feedback { margin: 0 12px 12px; width: auto; }
  .device-page__group-trigger { margin-left: 12px; max-width: calc(100% - 24px); min-height: 44px; }
  .device-page--empty :deep(.pro-table .arco-empty) { display: none; }
}
</style>
