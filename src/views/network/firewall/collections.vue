<template>
  <div class="fw-main">
    <a-alert v-if="workspace.failed.value" type="warning">{{ t('networkFirewall.loadFailed') }}<template #action><a-button @click="load">{{ t('networkFirewall.retry') }}</a-button></template></a-alert>
    <ProTable :table="batches" row-key="id" :actions-width="100">
      <template #toolbar><span>{{ t('networkFirewall.online.historyHelp') }}</span></template>
      <a-table-column title="ID" data-index="id" />
      <a-table-column :title="t('networkFirewall.online.operation')" data-index="kind"><template #cell="{ record }">{{ t(`networkFirewall.online.kinds.${record.kind}`) }}</template></a-table-column>
      <a-table-column :title="t('networkFirewall.status')" data-index="status"><template #cell="{ record }"><StateTag :value="record.status" /></template></a-table-column>
      <a-table-column :title="t('networkFirewall.online.progress')" data-index="targets"><template #cell="{ record }">{{ record.targets.filter((target: CollectionTarget) => !running(target.status)).length }} / {{ record.targets.length }}</template></a-table-column>
      <a-table-column :title="t('networkFirewall.createdAt')" data-index="createdAt"><template #cell="{ record }"><DateCell :value="record.createdAt" /></template></a-table-column>
      <template #actions="{ row }"><a-button type="text" @click="emit('select', row.id)">{{ t('networkFirewall.details') }}</a-button></template>
    </ProTable>
    <a-card v-if="batch" class="fw-batch-detail">
      <div class="fw-section-title">
        <h2>{{ t('networkFirewall.online.batchTitle', { id: batch.id }) }} · {{ t(`networkFirewall.online.kinds.${batch.kind}`) }}</h2>
        <a-space wrap>
          <a-button @click="load">{{ t('networkFirewall.refresh') }}</a-button>
          <a-button v-if="workspace.allowed('collect') && running(batch.status)" :disabled="batch.cancelRequested" :loading="workspace.pending.value" @click="cancel">{{ t(batch.cancelRequested ? 'networkFirewall.online.cancelling' : 'networkFirewall.cancel') }}</a-button>
          <a-button v-if="workspace.allowed('collect') && retryIds.length && !running(batch.status)" :loading="workspace.pending.value" @click="retry">{{ t('networkFirewall.online.retryFailed') }}</a-button>
        </a-space>
      </div>
      <a-alert v-if="batch.targets.some(target => target.revision && !target.complete)" type="warning">{{ t('networkFirewall.online.partialEvidence') }}</a-alert>
      <ProTable :table="targets" :panels="false" row-key="id" :actions-width="100" :scroll="{ x: 1000 }">
        <a-table-column :title="t('networkFirewall.device')" data-index="name" :width="160" ellipsis tooltip />
        <a-table-column title="IP" data-index="ip" :width="150" ellipsis tooltip />
        <a-table-column :title="t('networkFirewall.context')" data-index="nativeContext" :width="120" ellipsis tooltip />
        <a-table-column :title="t('networkFirewall.status')" data-index="status" :width="130"><template #cell="{ record }"><StateTag :value="record.status" /><p class="fw-muted">{{ stageText(record.stage) }}</p></template></a-table-column>
        <a-table-column :title="t('networkFirewall.online.result')" data-index="errorCode" :width="220"><template #cell="{ record }"><span>{{ record.errorCode ? reasonText(record.errorCode) : record.revision ? t(record.complete ? 'networkFirewall.online.completeCapture' : 'networkFirewall.online.partialCapture') : record.status === 'succeeded' ? t('networkFirewall.online.loginSucceeded') : '—' }}</span></template></a-table-column>
        <a-table-column :title="t('networkFirewall.revision')" data-index="revision" :width="120" ellipsis tooltip />
        <template #actions="{ row }"><a-button v-if="row.snapshotId" type="text" @click="emit('inspect', row)">{{ t('networkFirewall.objects') }}</a-button></template>
      </ProTable>
    </a-card>
  </div>
</template>
<script setup lang="ts">
defineOptions({ name: 'FirewallCollections' })
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ProTable from '@/components/ProTable/index.vue'
import DateCell from '@/components/DateCell/index.vue'
import { useTable } from '@/composables/useTable'
import * as api from '@/api/network/firewall'
import type { CollectionBatch, CollectionInput, CollectionTarget } from '@/types/firewall'
import StateTag from './state-tag.vue'
import { collectionSubmission } from './collection'
import { running } from './presentation'
import { usePolling, useWorkspace } from './workspace'
const props = defineProps<{ batchId?: number }>()
const emit = defineEmits<{ select: [number], inspect: [CollectionTarget] }>()
const { t, te } = useI18n(); const workspace = useWorkspace(); const batch = ref<CollectionBatch>()
const batches = useTable<CollectionBatch>({ api: query => workspace.guard(signal => api.listCollections(query, signal)), idKey: 'id', immediate: false, onError: () => { if (workspace.current()) workspace.failed.value = true } })
const targets = useTable<CollectionTarget>({ api: async() => ({ code: 200, msg: '', data: batch.value?.targets || [] }), paginated: false, immediate: false, idKey: 'id' })
const retryIds = computed(() => batch.value?.targets.filter(target => ['failed', 'partial', 'cancelled'].includes(target.status)).map(target => target.instanceId) || [])
let retryInput: CollectionInput | undefined
function reasonText(reason: string) { const key = `networkFirewall.online.reasons.${reason}`; return te(key) ? t(key) : t('networkFirewall.online.reasons.collection_failed') }
function stageText(stage: string) { const key = `networkFirewall.online.stages.${stage}`; return te(key) ? t(key) : '' }
async function load() {
  await batches.getList()
  if (!workspace.current()) return
  if (props.batchId) await workspace.read(signal => api.getCollection(props.batchId!, signal), result => { batch.value = result.data; targets.rows = result.data.targets })
}
function cancel() { if (batch.value && workspace.allowed('collect')) void workspace.write(() => api.cancelCollection(batch.value!.id), () => { void load() }) }
function retry() { if (!batch.value || !workspace.allowed('collect') || !retryIds.value.length) return; retryInput = collectionSubmission(batch.value.kind, retryIds.value, retryInput); void workspace.write(() => api.addCollection(retryInput!), result => { retryInput = undefined; emit('select', result.data.id) }) }
watch(() => props.batchId, () => { workspace.invalidate(); batch.value = undefined; targets.rows = []; retryInput = undefined; void load() })
usePolling(load, () => batches.rows.some(item => running(item.status)) || !!batch.value && running(batch.value.status))
onMounted(load)
</script>
