<template>
  <section class="fabric-endpoints">
    <p class="fabric-hint">{{ t('networkFabric.endpointHelp') }}</p>
    <a-alert v-if="failed" type="warning">{{ t('networkFabric.loadFailed') }}</a-alert>
    <ProTable :table="table" :panels="false" :scroll="{ x: 1120 }" row-key="positionKey">
      <template #search><a-form-item :label="t('networkFabric.endpointKeyword')"><a-input v-model="table.query.keyword" :input-attrs="{ 'aria-label': t('networkFabric.endpointKeyword') }" allow-clear /></a-form-item><a-form-item :label="t('networkFabric.vrf')"><a-input v-model="table.query.vrf" :input-attrs="{ 'aria-label': t('networkFabric.vrf') }" allow-clear /></a-form-item></template>
      <a-table-column data-index="ip" :title="t('networkFabric.endpointKeyword')" :width="185"><template #cell="{ record }"><strong>{{ record.ip || '—' }}</strong><a-button v-if="record.ip" type="text" size="mini" :aria-label="t('networkFabric.copyIP')" @click="copy(record.ip)">⧉</a-button><span class="fabric-secondary fabric-mono">{{ record.mac || '—' }}<a-button v-if="record.mac" type="text" size="mini" :aria-label="t('networkFabric.copyMAC')" @click="copy(record.mac)">⧉</a-button></span></template></a-table-column>
      <a-table-column data-index="vrf" :title="t('networkFabric.vrf')" :width="110" />
      <a-table-column data-index="deviceName" :title="t('networkFabric.device')" :width="180"><template #cell="{ record }"><a-button v-if="canOpen" type="text" @click="navigate(record.fabricId, record.deviceId)">{{ record.deviceName }}</a-button><strong v-else>{{ record.deviceName }}</strong></template></a-table-column>
      <a-table-column data-index="kind" :title="t('networkFabric.kind')" :width="145"><template #cell="{ record }"><StateTag :value="record.kind" /><span v-if="record.vpcGroupKey" class="fabric-secondary">{{ t('networkFabric.vpcConfirmed', { key: record.vpcGroupKey }) }}</span><span v-else-if="record.candidateCount > 1" class="fabric-secondary"><StateTag value="multiple" /> <span>{{ t('networkFabric.candidateCount', { count: record.candidateCount }) }}</span></span></template></a-table-column>
      <a-table-column data-index="interface" :title="t('networkFabric.interface')" :width="140" />
      <a-table-column data-index="remoteVtep" :title="t('networkFabric.remoteVtep')" :width="150" />
      <a-table-column data-index="fabricId" :title="t('networkFabric.region')" :width="100"><template #cell="{ record }"><a-button v-if="canOpen" type="text" @click="navigate(record.fabricId)">{{ record.fabricCode || `#${record.fabricId}` }}</a-button><span v-else>{{ record.fabricCode || `#${record.fabricId}` }}</span></template></a-table-column><a-table-column data-index="vni" title="VNI / VLAN" :width="135"><template #cell="{ record }">{{ record.vni || '—' }} / {{ record.vlan || '—' }}</template></a-table-column>
      <a-table-column data-index="state" :title="t('networkFabric.state')" :width="130"><template #cell="{ record }"><StateTag :value="record.state" /></template></a-table-column>
      <a-table-column data-index="observedAt" :title="t('networkFabric.observedAt')" :width="125"><template #cell="{ record }"><DateCell :value="record.observedAt" /></template></a-table-column>
    </ProTable>
  </section>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onDeactivated, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Message } from '@arco-design/web-vue'
import ProTable from '@/components/ProTable/index.vue'
import DateCell from '@/components/DateCell/index.vue'
import { useTable } from '@/composables'
import { listEndpoint } from '@/api/network/fabric'
import type { Endpoint, EndpointQuery } from '@/types/network-fabric'
import StateTag from './state-tag.vue'
import { parseLocation } from './presentation'
defineOptions({ name: 'FabricEndpoints' })
const props = defineProps<{ fabricId?: number, canOpen: boolean }>()
const emit = defineEmits<{ navigate: [] }>()
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const failed = ref(false)
let controller: AbortController | undefined
const table = useTable<Endpoint & { positionKey: string }, EndpointQuery>({ immediate: false, defaultQuery: () => ({ keyword: parseLocation(route.query).endpoint, fabricId: props.fabricId, vrf: '' }), api: async query => {
  controller?.abort(); controller = new AbortController()
  if (!query.keyword.trim()) return { code: 200, msg: '', data: { list: [], count: 0 }}
  void router.replace({ query: { ...route.query, endpoint: query.keyword || undefined }})
  const response = await listEndpoint({ ...query }, controller.signal)
  failed.value = false
  return { ...response, data: { ...response.data, list: response.data.list.map((row, index) => ({ ...row, positionKey: [row.evidenceId, row.deviceId, row.vrf, row.ip, row.mac, row.interface, row.remoteVtep, index].join(':') })) }}
}, onError: () => { failed.value = true } })
async function copy(value: string) { try { await navigator.clipboard.writeText(value); Message.success(t('networkFabric.copied')) } catch { Message.error(t('networkFabric.copyFailed')) } }
function navigate(fabricId: number, deviceId?: number) { if (!props.canOpen) return; void router.push({ query: { ...route.query, fabric: fabricId, tab: deviceId ? 'nodes' : 'overview', device: deviceId, issue: undefined, issueStatus: undefined, issueScope: undefined, nodeStatus: undefined, kind: undefined, direction: undefined, targets: undefined, vni: undefined }}); emit('navigate') }
onMounted(() => { if (table.query.keyword.trim()) void table.getList() })
onBeforeUnmount(() => controller?.abort())
onDeactivated(() => controller?.abort())
</script>
