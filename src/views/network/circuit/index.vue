<template>
  <PageContainer class="circuit-page network-list" :title="t('networkCircuit.title')" :description="t('networkCircuit.subtitle')">
    <a-alert v-if="optionsFailed" type="warning" class="circuit-notice">{{ t('networkCircuit.lookupFailed') }}<template #action><a-button @click="loadOptions">{{ t('networkCircuit.retry') }}</a-button></template></a-alert>
    <a-alert v-if="removeFailed" type="warning" class="circuit-notice">{{ t('networkCircuit.removeConflict') }}<template #action><a-button @click="reload">{{ t('common.refresh') }}</a-button></template></a-alert>
    <ProTable :table="table" row-key="id" :actions-width="allowed('traffic') && allowed('edit') ? 172 : 124" :scroll="{ x: 1180 }">
      <template #search>
        <a-form-item :label="t('networkCircuit.keyword')"><a-input v-model="table.query.keyword" :input-attrs="{ 'aria-label': t('networkCircuit.keyword') }" :placeholder="t('networkCircuit.keywordPlaceholder')" allow-clear /></a-form-item>
        <a-form-item v-input-label="t('networkCircuit.status')" :label="t('networkCircuit.status')"><a-select v-model="table.query.status" allow-clear :placeholder="t('common.selectPlaceholder')"><a-option v-for="value in circuitStatuses" :key="value" :value="value">{{ t(`networkCircuit.statusValues.${value}`) }}</a-option></a-select></a-form-item>
        <a-form-item v-input-label="t('networkCircuit.category')" :label="t('networkCircuit.category')"><a-select v-model="table.query.category" allow-clear :placeholder="t('common.selectPlaceholder')"><a-option v-for="value in circuitCategories" :key="value" :value="value">{{ t(`networkCircuit.categoryValues.${value}`) }}</a-option></a-select></a-form-item>
        <a-form-item v-for="field in filterOptions" :key="field.key" v-input-label="t(`networkCircuit.${field.key}`)" :label="t(`networkCircuit.${field.key}`)"><a-auto-complete v-model="table.query[field.key]" :data="options?.[field.options] || []" allow-clear /></a-form-item>
        <a-form-item v-input-label="t('networkCircuit.monitored')" :label="t('networkCircuit.monitored')"><a-select v-model="table.query.monitored" allow-clear :placeholder="t('common.selectPlaceholder')"><a-option v-for="value in ['true', 'false']" :key="value" :value="value">{{ t(`networkCircuit.monitoredValues.${value}`) }}</a-option></a-select></a-form-item>
      </template>
      <template #toolbar>
        <a-button v-if="allowed('add')" type="primary" @click="showEditor()">{{ t('common.add') }}</a-button>
        <a-button v-if="allowed('export')" :loading="exporting" :disabled="table.loading || !table.total" :title="t('networkCircuit.exportHelp')" @click="download">{{ t('common.export') }}</a-button>
        <span class="circuit-page__count">{{ t('networkCircuit.resultCount', { count: table.total }) }}</span>
      </template>
      <a-table-column :title="t('networkCircuit.name')" data-index="name" :width="238">
        <template #cell="{ record }"><div class="circuit-page__identity"><a-button v-if="allowed('query')" type="text" class="circuit-page__name" @click="showDetail(record.id)">{{ record.name }}</a-button><strong v-else>{{ record.name }}</strong><span>{{ record.circuitNo }}</span></div></template>
      </a-table-column>
      <a-table-column :title="t('networkCircuit.provider')" data-index="provider" :width="156" ellipsis tooltip />
      <a-table-column :title="t('networkCircuit.endpoints')" data-index="aEndpoint" :width="240">
        <template #cell="{ record }"><div class="circuit-page__endpoints"><span><b>{{ t('networkCircuit.a') }}</b> {{ record.aEndpoint.name || record.aEndpoint.address || '—' }}</span><span><b>{{ t('networkCircuit.z') }}</b> {{ record.zEndpoint.name || record.zEndpoint.address || '—' }}</span></div></template>
      </a-table-column>
      <a-table-column :title="t('networkCircuit.status')" data-index="status" :width="112"><template #cell="{ record }"><a-tag :color="statusColors[record.status as CircuitStatus]">{{ t(`networkCircuit.statusValues.${record.status}`) }}</a-tag></template></a-table-column>
      <a-table-column :title="t('networkCircuit.bandwidth')" data-index="bandwidthMbps" :width="136"><template #cell="{ record }">{{ record.bandwidthMbps === null ? '—' : `${record.bandwidthMbps.toLocaleString()} Mbps` }}</template></a-table-column>
      <a-table-column :title="t('networkCircuit.category')" data-index="category" :width="136"><template #cell="{ record }">{{ t(`networkCircuit.categoryValues.${record.category}`) }}</template></a-table-column>
      <a-table-column :title="t('networkCircuit.monitored')" :width="100"><template #cell="{ record }">{{ t(`networkCircuit.monitoredValues.${hasMonitoring(record)}`) }}</template></a-table-column>
      <template v-if="allowed('traffic') || allowed('edit') || allowed('remove')" #actions="{ row }">
        <a-button v-if="allowed('traffic')" type="text" @click="showTraffic(row)">{{ t('networkCircuit.traffic') }}</a-button>
        <a-button v-if="allowed('edit')" type="text" @click="showEditor(row.id)">{{ t('common.edit') }}</a-button>
        <AppDropdown v-if="allowed('remove')" trigger="click" position="br"><a-button type="text" :aria-label="t('networkCircuit.more')"><template #icon><icon-more /></template></a-button><template #content><a-doption :disabled="row.status !== 'planned' || removing" :title="row.status !== 'planned' ? t('networkCircuit.plannedOnly') : undefined" @click="removeRow(row)">{{ t('common.delete') }}</a-doption></template></AppDropdown>
      </template>
      <template #empty><a-result v-if="!table.loading" :status="listFailed ? 'error' : 'info'" :title="emptyTitle" :subtitle="emptyHelp"><template #extra><a-button v-if="hasFilters" @click="table.resetQuery">{{ t('networkCircuit.resetFilters') }}</a-button><a-button v-else-if="listFailed" @click="table.getList">{{ t('networkCircuit.retry') }}</a-button></template></a-result></template>
    </ProTable>
    <CircuitDetail :id="selectedId" v-model:visible="detailVisible" :can-edit="allowed('edit')" :can-traffic="allowed('traffic')" @edit="showEditor" @traffic="showTraffic" />
    <CircuitEditor :id="selectedId" ref="editor" v-model:visible="editorVisible" :options="options" :options-failed="optionsFailed" @saved="reload" @retry-options="loadOptions" />
    <CircuitTraffic v-model:visible="trafficVisible" :record="trafficRecord" />
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { IconMore } from '@arco-design/web-vue/es/icon'
import PageContainer from '@/components/PageContainer/index.vue'
import ProTable from '@/components/ProTable/index.vue'
import AppDropdown from '@/components/AppDropdown/index.vue'
import { useRemove, useTable } from '@/composables'
import { useUserStore } from '@/stores/user'
import { circuitFilters, delCircuit, exportCircuit, getCircuitOptions, listCircuit } from '@/api/network/circuit'
import { circuitCategories, circuitStatuses } from '@/types/network-circuit'
import type { Circuit, CircuitOptions, CircuitQuery, CircuitStatus } from '@/types/network-circuit'
import { vInputLabel } from '../shared/input-label'
import '../shared/list.scss'
import './style.scss'
import CircuitDetail from './detail.vue'
import CircuitEditor from './editor.vue'
import CircuitTraffic from './traffic.vue'

defineOptions({ name: 'NetworkCircuitManage' })
const { t } = useI18n()
const user = useUserStore()
const allowed = (action: string) => user.permisaction.some(permission => permission === '*:*:*' || permission === `network:circuit:${action}`)
const options = ref<CircuitOptions>()
const optionsFailed = ref(false)
const filterOptions = [{ key: 'provider', options: 'providers' }, { key: 'region', options: 'regions' }, { key: 'organization', options: 'organizations' }] as const
const statusColors: Record<CircuitStatus, string> = { planned: 'blue', active: 'green', suspended: 'orange', terminated: 'gray' }
const detailVisible = ref(false)
const editorVisible = ref(false)
const trafficVisible = ref(false)
const selectedId = ref<number>()
const trafficRecord = ref<Circuit>()
const editor = ref<InstanceType<typeof CircuitEditor>>()
const exporting = ref(false)
const listFailed = ref(false)
const removeFailed = ref(false)
const appliedFilters = ref<CircuitQuery>({})
let active = true
let generation = 0
let optionsVersion = 0
let listController: AbortController | undefined
let optionsController: AbortController | undefined
let exportController: AbortController | undefined
let removalTarget: { id: number, version: number, name: string, token: string } | undefined
const table = useTable<Circuit, CircuitQuery>({
  idKey: 'id', defaultQuery: () => ({ keyword: '', status: undefined, category: undefined, provider: '', region: '', organization: '', monitored: undefined }),
  api: async query => {
    const current = generation
    const token = user.token
    listController?.abort()
    listController = new AbortController()
    const request = listController
    listFailed.value = false
    const filters = circuitFilters(query)
    const response = await listCircuit({ ...filters, pageIndex: query.pageIndex, pageSize: query.pageSize }, listController.signal)
    if (request.signal.aborted || !active || current !== generation || token !== user.token) return { code: 200, msg: '', data: { list: [], count: 0 }}
    appliedFilters.value = filters
    return response
  },
  onError: () => { if (active) listFailed.value = true }
})
const hasFilters = computed(() => Object.values(appliedFilters.value).some(Boolean))
const emptyKey = computed(() => listFailed.value ? 'loadFailed' : hasFilters.value ? 'noResults' : 'empty')
const emptyTitle = computed(() => t(`networkCircuit.${emptyKey.value}`))
const emptyHelp = computed(() => t(`networkCircuit.${emptyKey.value}Help`))
const hasMonitoring = (record: Circuit) => [record.aEndpoint, record.zEndpoint].some(endpoint => endpoint.monitoring.inItemId || endpoint.monitoring.outItemId)
const { remove, removing } = useRemove({
  api: async() => {
    const target = removalTarget
    if (!target || target.token !== user.token || !active || !allowed('remove')) throw new Error('Inactive circuit session')
    return delCircuit(target.id, target.version)
  },
  confirmText: () => t('networkCircuit.removeConfirm', { name: removalTarget?.name || '' }),
  onSuccess: () => reload(), onError: () => { removeFailed.value = true }
})
async function removeRow(record: Circuit) {
  if (removalTarget || record.status !== 'planned' || !allowed('remove')) return
  removalTarget = { id: record.id, version: record.version, name: record.name, token: user.token }
  removeFailed.value = false
  try { await remove(record.id) } finally { removalTarget = undefined }
}
function showDetail(id: number) { if (allowed('query')) { selectedId.value = id; detailVisible.value = true } }
function showEditor(id?: number) { if (allowed(id ? 'edit' : 'add')) { detailVisible.value = false; selectedId.value = id; editorVisible.value = true } }
function showTraffic(record: Circuit) { if (allowed('traffic')) { detailVisible.value = false; trafficRecord.value = record; trafficVisible.value = true } }
async function loadOptions() {
  const current = ++optionsVersion
  optionsController?.abort()
  optionsController = new AbortController()
  try {
    const response = await getCircuitOptions(optionsController.signal)
    if (active && current === optionsVersion) { options.value = response.data; optionsFailed.value = false }
  } catch { if (active && current === optionsVersion) { options.value = undefined; optionsFailed.value = true } }
}
async function reload() { removeFailed.value = false; await Promise.all([table.getList(), loadOptions()]) }
async function download() {
  if (exporting.value || table.loading || !table.total || !allowed('export')) return
  const current = generation
  const token = user.token
  exportController = new AbortController()
  exporting.value = true
  try {
    const response = await exportCircuit({ ...appliedFilters.value }, exportController.signal)
    if (!active || current !== generation || token !== user.token) return
    const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `circuit-inventory-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch { /* The shared client reports server errors. */ } finally { exporting.value = false }
}
function invalidate() {
  active = false
  generation++
  optionsVersion++
  listController?.abort()
  optionsController?.abort()
  exportController?.abort()
  detailVisible.value = false
  editorVisible.value = false
  trafficVisible.value = false
  trafficRecord.value = undefined
}
onBeforeRouteLeave(async() => !editorVisible.value || await editor.value?.requestClose())
watch(() => user.token, () => { invalidate(); table.rows = []; table.total = 0; options.value = undefined; optionsFailed.value = false })
onMounted(loadOptions)
onActivated(() => { if (!active) { active = true; void reload() } })
onDeactivated(invalidate)
onBeforeUnmount(invalidate)
</script>

<style scoped>
.circuit-page__count { margin-right: auto; }
.circuit-page__count, .circuit-page__identity > span { color: var(--color-text-2); }
.circuit-page__identity { display: flex; flex-direction: column; align-items: flex-start; min-width: 0; overflow-wrap: anywhere; }
.circuit-page__identity > span { font-size: var(--motor-font-size-12); line-height: 1.6; }
.circuit-page__name { padding: 0; height: auto; max-width: 100%; font-weight: 600; white-space: normal; text-align: left; overflow-wrap: anywhere; }
.circuit-page__endpoints { display: flex; flex-direction: column; gap: 4px; overflow-wrap: anywhere; }
.circuit-page__endpoints b { color: var(--color-text-2); font-weight: 400; margin-right: 4px; }
.circuit-page :deep(.arco-table-td) { font-variant-numeric: tabular-nums; }
@media (max-width: 767px) {
}
</style>
