<template>
  <PageContainer class="fabric-page">
    <header class="fabric-heading"><div><h1>{{ t('networkFabric.title') }}</h1><p>{{ t('networkFabric.description') }}</p></div><a-space wrap><a-button v-if="allowed('edit')" @click="rulesVisible = true">{{ t('networkFabric.rules') }}</a-button><a-button v-if="canReadDetail || allowed('list')" @click="endpointVisible = true">{{ t('networkFabric.allRegions') }}</a-button></a-space></header>
    <template v-if="!location.id || !canReadDetail">
      <a-alert v-if="failed" type="warning">{{ t('networkFabric.loadFailed') }}<template #action><a-button @click="table.getList">{{ t('common.refresh') }}</a-button></template></a-alert>
      <ProTable :table="table" row-key="id" :actions-width="100">
        <template #search><a-form-item :label="t('networkFabric.keyword')"><a-input v-model="table.query.keyword" :input-attrs="{ 'aria-label': t('networkFabric.keyword') }" allow-clear /></a-form-item></template>
        <template #toolbar><span class="fabric-hint">{{ t('networkFabric.scope') }}</span></template>
        <a-table-column data-index="code" :title="t('networkFabric.region')" :width="180"><template #cell="{ record }"><a-button v-if="canReadDetail" type="text" @click="select(record.id)">{{ record.code }}</a-button><strong v-else>{{ record.code }}</strong><span v-if="record.name !== record.code" class="fabric-secondary">{{ record.name }}</span></template></a-table-column>
        <a-table-column data-index="state" :title="t('networkFabric.state')" :width="140"><template #cell="{ record }"><StateTag :value="record.state" /><span v-if="!record.completeScope" class="fabric-secondary">{{ t('networkFabric.scope') }}</span></template></a-table-column>
        <a-table-column data-index="evidenceCoverage" :title="t('networkFabric.coverage')" :width="140"><template #cell="{ record }">{{ record.evidenceCoverage }}%<span class="fabric-secondary">{{ t('networkFabric.problem.title') }}: {{ record.issueCount }}</span></template></a-table-column>
        <a-table-column data-index="memberCount" :title="t('networkFabric.members')" :width="110" />
        <a-table-column data-index="leafCount" :title="t('networkFabric.leafCount')" :width="110" />
        <a-table-column data-index="observedAt" :title="t('networkFabric.observedAt')" :width="140"><template #cell="{ record }"><DateCell :value="record.observedAt" /></template></a-table-column>
        <template v-if="canReadDetail" #actions="{ row }"><a-button type="text" @click="select(row.id)">{{ t('networkFabric.view') }}</a-button></template>
      </ProTable>
    </template>
    <Detail v-else-if="canReadDetail" :id="location.id" :key="location.id" :tab="location.tab" @tab="setTab" @close="select(undefined)" />
    <Rules v-if="rulesVisible" v-model:visible="rulesVisible" :fabrics="table.rows" @saved="table.getList" />
    <AppDrawer v-model:visible="endpointVisible" :title="t('networkFabric.allRegions')" :width="narrow ? '100%' : 1100" :footer="false"><Endpoints v-if="endpointVisible" :can-open="canReadDetail" @navigate="endpointVisible = false" /></AppDrawer>
  </PageContainer>
</template>
<script setup lang="ts">
import { computed, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageContainer from '@/components/PageContainer/index.vue'
import ProTable from '@/components/ProTable/index.vue'
import DateCell from '@/components/DateCell/index.vue'
import AppDrawer from '@/components/AppDrawer/index.vue'
import { useTable } from '@/composables'
import { useNarrowScreen } from '@/composables/useNarrowScreen'
import { useUserStore } from '@/stores/user'
import { listFabric } from '@/api/network/fabric'
import type { Fabric, FabricQuery } from '@/types/network-fabric'
import { parseLocation, type FabricTab } from './presentation'
import Detail from './detail.vue'
import Rules from './rules.vue'
import Endpoints from './endpoints.vue'
import StateTag from './state-tag.vue'
import './style.scss'

defineOptions({ name: 'NetworkFabricManage' })
const { t } = useI18n()
const user = useUserStore()
const route = useRoute()
const router = useRouter()
const narrow = useNarrowScreen()
const location = computed(() => parseLocation(route.query))
const allowed = (action: string) => user.permisaction.some(value => value === '*:*:*' || value === `network:fabric:${action}`)
const canReadDetail = computed(() => ['query', 'edit', 'collect', 'preview', 'execute'].some(allowed))
const failed = ref(false)
const rulesVisible = ref(false)
const endpointVisible = ref(false)
let active = true
let controller: AbortController | undefined
const table = useTable<Fabric, FabricQuery>({ idKey: 'id', immediate: false, defaultQuery: () => ({ keyword: '' }), api: async query => {
  controller?.abort(); controller = new AbortController()
  const response = await listFabric({ ...query }, controller.signal)
  if (!active) throw new Error('Inactive Fabric page')
  failed.value = false
  return response
}, onError: () => { if (active) failed.value = true } })
function select(id?: number) { if (id && !canReadDetail.value) return; void router.push({ query: { ...route.query, fabric: id, tab: id ? 'overview' : undefined, issue: undefined, device: undefined, issueStatus: undefined, issueScope: undefined, nodeStatus: undefined, kind: undefined, direction: undefined, targets: undefined, vrf: undefined, vni: undefined }}) }
function setTab(tab: FabricTab) { void router.push({ query: { ...route.query, tab, device: undefined }}) }
function suspend() { active = false; controller?.abort(); rulesVisible.value = false; endpointVisible.value = false }
watch(() => user.token, suspend)
onMounted(() => { void table.getList() })
onActivated(() => { if (!active) { active = true; void table.getList() } })
onDeactivated(suspend)
onBeforeUnmount(suspend)
</script>
