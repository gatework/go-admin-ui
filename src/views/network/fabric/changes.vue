<template>
  <section>
    <p class="fabric-hint">{{ t('networkFabric.changeHelp') }}</p>
    <ProTable :table="table" :panels="false" row-key="id" :actions-width="100"><template #toolbar><a-button v-if="allowed('preview')" type="primary" :disabled="!fabric.completeScope" @click="create">{{ t('networkFabric.newChange') }}</a-button><a-button @click="refresh">{{ t('networkFabric.refreshJobs') }}</a-button></template><a-table-column data-index="id" :title="t('networkFabric.job')" :width="100" /><a-table-column data-index="kind" :title="t('networkFabric.kind')" :width="190"><template #cell="{ record }">{{ t(`networkFabric.kinds.${record.kind}`) }}</template></a-table-column><a-table-column data-index="vni" title="VNI" :width="120" /><a-table-column data-index="status" :title="t('networkFabric.state')" :width="150"><template #cell="{ record }"><StateTag :value="record.status" /></template></a-table-column><a-table-column data-index="createdAt" :title="t('common.createdAt')" :width="125"><template #cell="{ record }"><DateCell :value="record.createdAt" /></template></a-table-column><template #actions="{ row }"><a-button type="text" @click="show(row.id)">{{ t('networkFabric.view') }}</a-button></template></ProTable>
    <AppDrawer v-model:visible="editorVisible" class="fabric-drawer" :title="t('networkFabric.newChange')" :width="narrow ? '100%' : 860" :mask-closable="!pending" @close="invalidate">
      <a-alert v-if="!fabric.completeScope" type="warning">{{ t('networkFabric.partialScope') }}</a-alert>
      <a-form v-if="!plan && !inspectId" :model="draft" layout="vertical" :disabled="pending">
        <a-form-item v-input-label="t('networkFabric.source')" :label="t('networkFabric.source')"><a-select :model-value="draft.sourceDeviceId || undefined" :placeholder="t('common.selectPlaceholder')" allow-search @change="chooseSource(Number($event))"><a-option v-for="node in leaves.filter(item => !initialTargets?.includes(item.deviceId))" :key="node.deviceId" :value="node.deviceId">{{ node.name }} · {{ node.ip }}</a-option></a-select></a-form-item>
        <div class="fabric-inline-fields"><a-form-item v-input-label="t('networkFabric.kind')" :label="t('networkFabric.kind')"><a-select v-model="draft.kind"><a-option v-for="kind in kinds" :key="kind" :value="kind">{{ t(`networkFabric.kinds.${kind}`) }}</a-option></a-select></a-form-item><a-form-item label="VNI"><a-input-number :model-value="draft.vni || undefined" :min="1" :max="16777215" :input-attrs="{ 'aria-label': 'VNI' }" @change="draft.vni = Number($event) || 0" /></a-form-item></div>
        <a-form-item v-if="draft.kind === 'svi_acl'" :label="t('networkFabric.direction')"><a-radio-group v-model="draft.direction"><a-radio value="in">{{ t('networkFabric.aclIn') }}</a-radio><a-radio value="out">{{ t('networkFabric.aclOut') }}</a-radio></a-radio-group></a-form-item>
        <section v-if="sourceSegment" class="fabric-change-context" role="region" :aria-label="t('networkFabric.changeScope')"><h3>{{ t('networkFabric.changeScope') }}</h3><a-descriptions :column="narrow ? 1 : 2" bordered><a-descriptions-item :label="t('networkFabric.vrf')">{{ sourceSegment.vrf || '—' }} · VNI {{ draft.vni }}</a-descriptions-item><a-descriptions-item :label="t('networkFabric.configuration')"><StateTag :value="sourceNode?.configState || 'unknown'" /></a-descriptions-item><a-descriptions-item :label="t('networkFabric.segment')"><SegmentInfo :configuration="sourceCell?.configuration" /></a-descriptions-item><a-descriptions-item v-if="draft.kind === 'svi_acl'" :label="t(draft.direction === 'out' ? 'networkFabric.aclOut' : 'networkFabric.aclIn')"><strong>{{ sourceACL }}</strong></a-descriptions-item></a-descriptions></section>
        <p class="fabric-hint">{{ t('networkFabric.candidateHelp') }}</p><a-alert v-if="initialTargets" type="info">{{ t('networkFabric.scopedCandidates', { count: initialTargets.length }) }}</a-alert>
        <div class="fabric-action-bar"><a-button :loading="candidateLoading" :disabled="!candidateInput || pending" @click="refreshCandidates">{{ t('networkFabric.checkTargets') }}</a-button><span>{{ t('networkFabric.selectedTargets', { count: draft.targetDeviceIds.length }) }}</span></div>
        <a-alert v-if="candidateFailed" type="warning">{{ t('networkFabric.candidateFailed') }}</a-alert>
        <a-spin :loading="candidateLoading" style="width:100%">
          <template v-if="candidates">
            <section class="fabric-candidates"><h3>{{ t('networkFabric.candidateReady', { count: candidates.ready.length }) }}</h3><a-checkbox-group v-model="draft.targetDeviceIds" :disabled="pending" class="fabric-candidate-list"><a-checkbox v-for="candidate in candidates.ready" :key="candidate.deviceId" :value="candidate.deviceId"><strong>{{ candidate.name }}</strong> · {{ candidate.ip }}<span class="fabric-secondary">{{ reason(candidate.reason) }}</span></a-checkbox></a-checkbox-group></section>
            <section v-for="group in ['unchanged', 'blocked'] as const" :key="group" class="fabric-candidates"><h3>{{ t(group === 'unchanged' ? 'networkFabric.candidateUnchanged' : 'networkFabric.candidateBlocked', { count: candidates[group].length }) }}</h3><div v-for="candidate in candidates[group]" :key="candidate.deviceId" class="fabric-mobile-cell"><div><strong>{{ candidate.name }}</strong> · {{ candidate.ip }}<span class="fabric-secondary">{{ reason(candidate.reason) }}</span></div><StateTag :value="group === 'unchanged' ? 'satisfied' : 'unknown'" /></div></section>
          </template>
          <p v-else class="fabric-hint">{{ t('networkFabric.noTargets') }}</p>
        </a-spin>
      </a-form>
      <a-spin v-else-if="!plan && pending" :loading="true" />
      <a-alert v-else-if="!plan" type="warning">{{ t('networkFabric.loadFailed') }}<template #action><a-button @click="show(inspectId!)">{{ t('common.refresh') }}</a-button></template></a-alert>
      <template v-else>
        <div class="fabric-section-heading"><h2>#{{ plan.id }} · VNI {{ plan.vni }}</h2><StateTag :value="plan.status" /></div>
        <a-descriptions :column="1" bordered><a-descriptions-item :label="t('networkFabric.source')">{{ nodeName(plan.sourceDeviceId) }}</a-descriptions-item><a-descriptions-item :label="t('networkFabric.kind')">{{ t(`networkFabric.kinds.${plan.kind}`) }}</a-descriptions-item><a-descriptions-item :label="t('networkFabric.planHash')"><code class="fabric-secondary">{{ plan.planHash }}</code></a-descriptions-item><a-descriptions-item :label="t('networkFabric.groupingHash')"><code class="fabric-secondary">{{ plan.groupingHash }}</code></a-descriptions-item><a-descriptions-item :label="t('networkFabric.deliveryOrder')">#{{ plan.deliveryOrderId }}</a-descriptions-item></a-descriptions>
        <h3>{{ t('networkFabric.receipts') }}</h3>
        <a-collapse><a-collapse-item v-for="target in plan.targets" :key="target.deviceId" :header="nodeName(target.deviceId)"><template #extra><StateTag :value="target.status" /></template><p>{{ t('networkFabric.completedSteps') }}: {{ target.completedSteps }} <span>{{ target.errorCode }}</span></p><a-descriptions :column="1" bordered><a-descriptions-item :label="t('networkFabric.configurationVerified')"><StateTag :value="target.configurationVerified === true ? 'satisfied' : 'unknown'" /></a-descriptions-item><a-descriptions-item :label="t('networkFabric.runtimeState')"><StateTag :value="target.runtimeState || 'unknown'" /></a-descriptions-item></a-descriptions><h4>{{ t('networkFabric.commands') }}</h4><pre class="fabric-code">{{ (target.commands || []).join('\n') || '—' }}</pre><div v-for="receipt in target.receipts || []" :key="receipt.step" class="fabric-mobile-cell"><code>{{ receipt.command }}</code><StateTag :value="receipt.status" /><DateCell :value="receipt.at" /></div><h4>{{ t('networkFabric.preEvidence') }}</h4><pre class="fabric-code">{{ pretty(target.preEvidence) }}</pre><h4>{{ t('networkFabric.postEvidence') }}</h4><pre class="fabric-code">{{ pretty(target.postEvidence) }}</pre></a-collapse-item></a-collapse>
        <a-alert v-if="plan.status === 'preview'" type="info" style="margin-top:16px">{{ t('networkFabric.executeHelp') }}</a-alert>
      </template>
      <template #footer><a-button :disabled="pending" @click="editorVisible = false">{{ t('common.close') }}</a-button><template v-if="plan"><a-button v-if="allowed('execute') && ['preview', 'queued'].includes(plan.status)" :loading="pending" @click="cancel">{{ t('networkFabric.cancelChange') }}</a-button><a-popconfirm v-if="allowed('execute') && plan.status === 'preview'" :content="t('networkFabric.executeHelp')" @ok="execute"><a-button type="primary" :loading="pending" :disabled="!fabric.completeScope">{{ t('networkFabric.execute') }}</a-button></a-popconfirm><a-button v-else @click="show(plan.id)">{{ t('common.refresh') }}</a-button></template><a-button v-else-if="!inspectId" type="primary" :loading="pending" :disabled="!valid || !fabric.completeScope" @click="preview">{{ t('networkFabric.preview') }}</a-button></template>
    </AppDrawer>
  </section>
</template>
<script setup lang="ts">
import { computed, inject, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDrawer from '@/components/AppDrawer/index.vue'
import ProTable from '@/components/ProTable/index.vue'
import DateCell from '@/components/DateCell/index.vue'
import { useTable } from '@/composables'
import { useNarrowScreen } from '@/composables/useNarrowScreen'
import { useUserStore } from '@/stores/user'
import { listChange, addChange, getChange, executeChange, cancelChange } from '@/api/network/fabric'
import type { Change, ChangeCandidateInput, ChangeInput, ChangeKind, FabricDetail } from '@/types/network-fabric'
import { vInputLabel } from '../shared/input-label'
import type { FabricTasks } from './use-tasks'
import { pretty, sourceConfiguration } from './presentation'
import { useOperation } from './use-operation'
import { useChangeCandidates } from './use-candidates'
import StateTag from './state-tag.vue'
import SegmentInfo from './segment-info.vue'
defineOptions({ name: 'FabricChanges' })
const props = defineProps<{ fabric: FabricDetail, initialVni?: number, initialTargets?: number[], initialKind?: ChangeKind, initialDirection?: 'in' | 'out' }>()
const emit = defineEmits<{ changed: [] }>()
const { t, te } = useI18n()
const tasks = inject<FabricTasks>('fabricTasks')
const user = useUserStore()
const narrow = useNarrowScreen()
const { pending, run, invalidate } = useOperation()
const allowed = (action: string) => user.permisaction.some(value => value === '*:*:*' || value === `network:fabric:${action}`)
const kinds: ChangeKind[] = ['vlan_vni_add', 'svi_gateway_add', 'svi_acl']
const draft = reactive<ChangeInput>({ sourceDeviceId: 0, targetDeviceIds: [], kind: 'vlan_vni_add', vni: 0, direction: 'in' })
const editorVisible = ref(false)
const plan = ref<Change>()
const inspectId = ref<number>()
let requestKey = crypto.randomUUID()
let requestSignature = ''
const leaves = computed(() => props.fabric.nodes.filter(node => ['leaf', 'leaf_switch', 'LEF'].includes(node.role) && node.supported))
const sourceNode = computed(() => props.fabric.nodes.find(node => node.deviceId === draft.sourceDeviceId))
const sourceSegment = computed(() => sourceConfiguration(props.fabric.segments, draft.vni, draft.sourceDeviceId))
const sourceCell = computed(() => sourceSegment.value?.cell)
const sourceACL = computed(() => {
  const name = draft.direction === 'out' ? sourceCell.value?.aclOut : sourceCell.value?.aclIn
  return name && name !== 'unbound' ? name : t('networkFabric.unbound')
})
const candidateInput = computed<ChangeCandidateInput | undefined>(() => {
  if (!editorVisible.value || plan.value || inspectId.value || !allowed('preview') || !props.fabric.completeScope || draft.sourceDeviceId <= 0 || !Number.isInteger(draft.vni) || draft.vni < 1 || draft.vni > 16777215) return undefined
  if (props.initialTargets && !props.initialTargets.length) return undefined
  const targets = props.initialTargets
  return { sourceDeviceId: draft.sourceDeviceId, kind: draft.kind, vni: draft.vni, ...(draft.kind === 'svi_acl' ? { direction: draft.direction } : {}), ...(targets ? { targetDeviceIds: [...targets] } : {}) }
})
const { candidates, loading: candidateLoading, failed: candidateFailed, refresh: refreshCandidates } = useChangeCandidates(props.fabric.id, () => candidateInput.value)
const valid = computed(() => !candidateLoading.value && !candidateFailed.value && Boolean(candidates.value) && draft.targetDeviceIds.length > 0 && !draft.targetDeviceIds.includes(draft.sourceDeviceId) && draft.targetDeviceIds.every(id => candidates.value?.ready.some(candidate => candidate.deviceId === id)))
const reason = (code: string) => te(`networkFabric.candidateReasons.${code}`) ? t(`networkFabric.candidateReasons.${code}`) : t('networkFabric.candidateReasonUnknown', { code })
let selectionSignature = ''
const excludedTargets = new Set<number>()
watch(candidates, value => {
  if (!value) { draft.targetDeviceIds = []; return }
  const signature = JSON.stringify(candidateInput.value)
  if (signature !== selectionSignature) { excludedTargets.clear(); selectionSignature = signature }
  draft.targetDeviceIds = value.ready.filter(candidate => !excludedTargets.has(candidate.deviceId)).map(candidate => candidate.deviceId)
}, { flush: 'sync' })
watch(() => [...draft.targetDeviceIds], selected => {
  if (!candidates.value || candidateLoading.value) return
  for (const candidate of candidates.value.ready) { if (selected.includes(candidate.deviceId)) excludedTargets.delete(candidate.deviceId); else excludedTargets.add(candidate.deviceId) }
}, { flush: 'sync' })
const nodeName = (id: number) => props.fabric.nodes.find(node => node.deviceId === id)?.name || `#${id}`
const table = useTable<Change>({ api: query => listChange(props.fabric.id, query), idKey: 'id' })
watch(() => table.rows, rows => { for (const row of rows) tasks?.track('change', row) })
watch(() => tasks?.revision.value, () => { void table.getList() })
watch(() => tasks?.changes.value, rows => { if (plan.value && rows?.[plan.value.id]) plan.value = rows[plan.value.id] })
function chooseSource(id: number) { draft.sourceDeviceId = id }
function create() { if (pending.value || !allowed('preview')) return; inspectId.value = undefined; plan.value = undefined; Object.assign(draft, { sourceDeviceId: 0, targetDeviceIds: [], kind: 'vlan_vni_add', vni: 0, direction: 'in' }); requestKey = crypto.randomUUID(); excludedTargets.clear(); selectionSignature = ''; editorVisible.value = true }
function preview() { if (!valid.value || !props.fabric.completeScope || !allowed('preview')) return; const signature = JSON.stringify(draft); if (signature !== requestSignature) { requestKey = crypto.randomUUID(); requestSignature = signature } const data = { requestKey, sourceDeviceId: draft.sourceDeviceId, targetDeviceIds: [...draft.targetDeviceIds], kind: draft.kind, vni: draft.vni, ...(draft.kind === 'svi_acl' ? { direction: draft.direction } : {}) }; void run(() => addChange(props.fabric.id, data), response => { plan.value = response.data; tasks?.track('change', response.data); void table.getList() }) }
function show(id: number) { if (pending.value) return; inspectId.value = id; plan.value = undefined; editorVisible.value = true; void run(() => getChange(id), response => { plan.value = response.data; tasks?.track('change', response.data) }) }
function execute() { if (!plan.value || plan.value.status !== 'preview' || !props.fabric.completeScope || !allowed('execute')) return; const current = plan.value; void run(() => executeChange(current.id, current.version), response => { plan.value = response.data; tasks?.track('change', response.data); void table.getList(); emit('changed') }) }
function cancel() { if (!plan.value || !allowed('execute')) return; const current = plan.value; void run(() => cancelChange(current.id, current.version), response => { plan.value = response.data; tasks?.track('change', response.data); void table.getList() }) }
function refresh() { void table.getList(); if (plan.value && editorVisible.value) show(plan.value.id) }
onMounted(() => { if (props.initialVni && allowed('preview') && props.fabric.completeScope) { create(); draft.vni = props.initialVni; draft.kind = props.initialKind || 'vlan_vni_add'; draft.direction = props.initialDirection || 'in' } })
watch(editorVisible, value => { if (!value) invalidate() })
</script>
