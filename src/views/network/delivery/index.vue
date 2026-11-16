<template>
  <PageContainer class="delivery-page network-list" :title="t('networkDelivery.title')" :description="t('networkDelivery.description')">
    <a-alert v-if="optionsFailed" type="warning" class="delivery-notice">{{ t('networkDelivery.optionsFailed') }}<template #action><a-button @click="loadOptions">{{ t('networkDelivery.retry') }}</a-button></template></a-alert>
    <!-- Whether delivery is enabled is only known once options arrive; holding the notice and tabs until then keeps them from jumping down the page. -->
    <a-spin v-if="!options && !optionsFailed" :loading="true" class="delivery-options-loading" />
    <template v-else>
      <a-alert v-if="options && !ready" type="info" class="delivery-notice" :title="t(options.enabled ? 'networkDelivery.serviceUnavailable' : 'networkDelivery.serviceDisabled')">{{ t('networkDelivery.serviceHelp') }}</a-alert>
      <AppTabs v-model:active-key="activeTab" class="delivery-tabs">
        <a-tab-pane v-if="canBrowseDevices" key="devices" :title="t('networkDelivery.deviceList')">
          <a-card class="delivery-inventory-panel" :bordered="false">
            <div class="delivery-launch"><p>{{ t('networkDelivery.inventoryHelp') }}</p><a-button v-if="allowed('add')" type="primary" :disabled="!options || optionsFailed || !selectedDevices.length" @click="showEditor()">{{ t('networkDelivery.startTask', { count: selectedDevices.length }) }}</a-button></div>
            <Picker v-if="options" v-model:devices="selectedDevices" :options="options" :can-configure="allowed('connection')" :can-select="allowed('add')" :disabled="editorVisible" />
            <a-spin v-else-if="!optionsFailed" :loading="true" class="delivery-options-loading" />
          </a-card>
        </a-tab-pane>
        <a-tab-pane key="tasks" :title="t('networkDelivery.taskList')">
          <ProTable v-if="activeTab === 'tasks'" :table="table" row-key="id" :actions-width="allowed('edit') ? 132 : 82" :scroll="{ x: 1000 }">
            <template #search>
              <a-form-item :label="t('networkDelivery.keyword')"><a-input v-model="table.query.keyword" :input-attrs="{ 'aria-label': t('networkDelivery.keyword') }" :placeholder="t('networkDelivery.keywordPlaceholder')" allow-clear /></a-form-item>
              <a-form-item v-input-label="t('networkDelivery.status')" :label="t('networkDelivery.status')"><a-select v-model="table.query.status" :placeholder="t('common.selectPlaceholder')" allow-clear><a-option v-for="value in deliveryStatuses" :key="value" :value="value">{{ t(`networkDelivery.statuses.${value}`) }}</a-option></a-select></a-form-item>
            </template>
            <template #toolbar>
              <a-button v-if="allowed('add')" type="primary" @click="activeTab = 'devices'">{{ t('networkDelivery.chooseForTask') }}</a-button>
              <span class="delivery-list-summary">{{ t('networkDelivery.count', { count: table.total }) }}<span v-if="options"> · {{ t('networkDelivery.runtime', { count: options.concurrency, minutes: options.graceSeconds / 60 }) }}</span></span>
            </template>
            <a-table-column data-index="title" :title="t('networkDelivery.order')" :width="270"><template #cell="{ record }"><div class="delivery-identity"><a-button v-if="allowed('query')" type="text" class="delivery-name" @click="showDetail(record.id)">{{ record.title || record.requestNo }}</a-button><strong v-else>{{ record.title || record.requestNo }}</strong><span>{{ record.requestNo }}</span></div></template></a-table-column>
            <a-table-column data-index="status" :title="t('networkDelivery.status')" :width="112"><template #cell="{ record }"><a-tag :color="statusColors[record.status as DeliveryStatus]">{{ t(`networkDelivery.statuses.${record.status}`) }}</a-tag></template></a-table-column>
            <a-table-column data-index="deviceCount" :title="t('networkDelivery.progress')" :width="160"><template #cell="{ record }"><span>{{ t('networkDelivery.progressText', { done: record.succeededCount, total: record.deviceCount }) }}</span><span v-if="record.uncertainCount" class="delivery-attention">{{ t('networkDelivery.deviceCount', { count: record.uncertainCount }) }} · {{ t('networkDelivery.statuses.uncertain') }}</span></template></a-table-column>
            <a-table-column data-index="createdByName" :title="t('networkDelivery.creator')" :width="130" ellipsis tooltip />
            <a-table-column data-index="scheduledAt" :title="t('networkDelivery.scheduledAt')" :width="180"><template #cell="{ record }"><span :title="record.scheduledAt">{{ record.scheduledAt ? new Date(record.scheduledAt).toLocaleString() : '—' }}</span></template></a-table-column>
            <a-table-column data-index="createdAt" :title="t('common.createdAt')" :width="112"><template #cell="{ record }"><DateCell :value="record.createdAt" /></template></a-table-column>
            <template v-if="allowed('query') || allowed('edit')" #actions="{ row }"><a-button v-if="allowed('query')" type="text" @click="showDetail(row.id)">{{ t('networkDelivery.view') }}</a-button><a-button v-if="allowed('edit')" type="text" :disabled="!row.editable || !options" @click="showEditor(row.id)">{{ t('common.edit') }}</a-button></template>
            <template #empty><a-result :status="failed ? 'error' : 'info'" :title="emptyTitle" :subtitle="emptyHelp"><template #extra><a-button @click="failed ? reload() : table.resetQuery()">{{ t(failed ? 'networkDelivery.retry' : 'common.reset') }}</a-button></template></a-result></template>
          </ProTable>
        </a-tab-pane>
      </AppTabs>
    </template>
    <Editor v-if="options && editorVisible" :id="selectedId" ref="editor" v-model:visible="editorVisible" :options="options" :initial-devices="selectedDevices" @saved="saved" />
    <Detail v-if="detailVisible" :id="selectedId" v-model:visible="detailVisible" :ready="ready" @edit="showEditor" @changed="table.getList" @open="showDetail" />
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageContainer from '@/components/PageContainer/index.vue'
import ProTable from '@/components/ProTable/index.vue'
import DateCell from '@/components/DateCell/index.vue'
import AppTabs from '@/components/AppTabs/index.vue'
import { useTable } from '@/composables'
import { useUserStore } from '@/stores/user'
import { getDeliveryOptions, listDelivery } from '@/api/network/delivery'
import { deliveryStatuses } from '@/types/network-delivery'
import type { DeliveryOptions, DeliveryOrder, DeliveryQuery, DeliveryStatus, DeviceSnapshot } from '@/types/network-delivery'
import { vInputLabel } from '../shared/input-label'
import { isActive, statusColors } from './presentation'
import Editor from './editor.vue'
import Detail from './detail.vue'
import Picker from './picker.vue'
import '../shared/list.scss'
import '../shared/drawer.scss'
import './style.scss'

defineOptions({ name: 'NetworkDeliveryManage' })
const { t } = useI18n()
const user = useUserStore()
const allowed = (action: string) => user.permisaction.some(p => p === '*:*:*' || p === `network:delivery:${action}`)
const options = ref<DeliveryOptions>()
const optionsFailed = ref(false)
const failed = ref(false)
const selectedId = ref<number>()
const editorVisible = ref(false)
const detailVisible = ref(false)
const canBrowseDevices = computed(() => allowed('add') || allowed('connection'))
const activeTab = ref(canBrowseDevices.value ? 'devices' : 'tasks')
const selectedDevices = ref<DeviceSnapshot[]>([])
const editor = ref<InstanceType<typeof Editor>>()
const ready = computed(() => Boolean(options.value?.enabled && options.value.configured))
let active = true
let generation = 0
let listController: AbortController | undefined
let optionsController: AbortController | undefined
let timer: ReturnType<typeof setTimeout> | undefined
const table = useTable<DeliveryOrder, DeliveryQuery>({
  idKey: 'id', immediate: false, defaultQuery: () => ({ keyword: '', status: undefined }),
  api: async query => {
    listController?.abort(); listController = new AbortController(); clearTimeout(timer)
    const current = generation
    const result = await listDelivery({ keyword: query.keyword, status: query.status, pageIndex: query.pageIndex, pageSize: query.pageSize }, listController.signal)
    if (current !== generation || !active) throw new Error('Inactive delivery list')
    failed.value = false
    if (result.data.list.some(row => isActive(row.status))) timer = setTimeout(poll, 5000)
    return result
  },
  onError: () => { if (active) failed.value = true }
})
const emptyKey = computed(() => failed.value ? 'loadFailed' : table.query.keyword || table.query.status ? 'noResults' : 'empty')
const emptyTitle = computed(() => t(`networkDelivery.${emptyKey.value}`))
const emptyHelp = computed(() => t(`networkDelivery.${emptyKey.value}Help`))
function poll() { if (active && !document.hidden && !editorVisible.value) void table.getList(); else if (active) timer = setTimeout(poll, 5000) }
async function loadOptions() {
  const current = generation
  optionsController?.abort(); optionsController = new AbortController()
  const request = optionsController
  try { const result = await getDeliveryOptions(request.signal); if (active && current === generation && !request.signal.aborted) { options.value = result.data; optionsFailed.value = false } } catch { if (active && current === generation && !request.signal.aborted) optionsFailed.value = true }
}
async function reload() { await Promise.all([table.getList(), loadOptions()]) }
function showDetail(id: number) { if (!allowed('query')) return; selectedId.value = id; detailVisible.value = true }
function showEditor(id?: number) { if (!options.value || !allowed(id ? 'edit' : 'add')) return; detailVisible.value = false; selectedId.value = id; editorVisible.value = true }
function saved(id: number) { editorVisible.value = false; selectedDevices.value = []; activeTab.value = 'tasks'; void reload(); showDetail(id) }
function suspend() { active = false; generation++; listController?.abort(); optionsController?.abort(); clearTimeout(timer); detailVisible.value = false }
onBeforeRouteLeave(async() => !editorVisible.value || Boolean(await editor.value?.requestClose()))
onMounted(() => { void reload() })
onActivated(() => { if (!active) { active = true; void reload() } })
onDeactivated(suspend)
onBeforeUnmount(suspend)
watch(() => user.token, () => { suspend(); table.rows = []; options.value = undefined; selectedDevices.value = []; editorVisible.value = false; if (user.token) { active = true; void reload() } })
watch(canBrowseDevices, value => { if (!value) activeTab.value = 'tasks' })
</script>
