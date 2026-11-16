<template>
  <div class="wireless-ap-detail">
    <h2>{{ data.resource.localAlias || data.resource.fields.name }}</h2>
    <a-space wrap><StateTag :value="data.resource.health" /><span>{{ data.resource.fields.ip }} · {{ data.resource.fields.mac }}</span></a-space>
    <a-alert v-if="data.resource.missing" type="warning">{{ t('networkWireless.missing') }}</a-alert>
    <p class="wireless-muted">{{ t('networkWireless.observedAt') }} <DateCell :value="data.resource.observedAt" /> · {{ t('networkWireless.coverage') }} <StateTag :value="data.resource.coverage.state" /></p>
    <a-button v-if="issue" @click="$emit('returnIssue')">{{ t('networkWireless.returnIssue') }}</a-button>
    <a-space wrap><a-button v-for="group in issues" :key="group.key" type="text" @click="$emit('issue', group.key)">{{ t(`networkWireless.checks.${group.check}`) }} · {{ t('networkWireless.viewIssue') }}</a-button></a-space>
    <AppTabs v-model:active-key="tab">
      <a-tab-pane key="management" :title="t('networkWireless.management')">
        <a-alert v-if="conflict || newer" type="warning">{{ t('networkWireless.conflict') }}<template #action><a-button :loading="pending" @click="reload">{{ t('networkWireless.reload') }}</a-button></template></a-alert>
        <a-form :model="draft" layout="vertical" @submit-success="save"><a-form-item v-for="key in managementKeys" :key="key" :label="t(`networkWireless.${key}`)" :field="key"><a-textarea v-if="key === 'notes'" v-model="draft[key]" :max-length="4000" :disabled="!canEdit || pending" :aria-label="t(`networkWireless.${key}`)" /><a-input v-else v-model="draft[key]" :max-length="255" :disabled="!canEdit || pending" :input-attrs="{ 'aria-label': t(`networkWireless.${key}`) }" /></a-form-item><a-button v-if="canEdit" type="primary" html-type="submit" :loading="pending" :disabled="!changed || conflict || newer || !active">{{ t('networkWireless.save') }}</a-button></a-form>
      </a-tab-pane>
      <a-tab-pane key="neighbors" :title="t('networkWireless.neighbors')">
        <p class="wireless-muted">{{ t('networkWireless.neighborHint') }}</p><StateTag :value="data.neighborCoverage.status" /> <DateCell :value="data.neighborCoverage.observedAt" />
        <a-button v-if="canCollect" @click="$emit('collect', { dimensions: ['lldp'], apNames: [data.resource.fields.name] })">{{ t('networkWireless.collect') }}</a-button>
        <a-empty v-if="!data.neighbors.length" :description="t('networkWireless.noNeighbors')" />
        <div v-for="neighbor in data.neighbors" :key="neighbor.evidenceId" class="wireless-evidence-row"><div><strong>{{ neighbor.systemName || neighbor.chassisId }}</strong><p>{{ neighbor.managementIp }} · {{ neighbor.portId }}</p><span class="wireless-muted">{{ neighbor.localInterface }}</span></div><a-button v-if="canEdit" :disabled="data.neighborCoverage.state !== 'complete'" @click="choose(neighbor)">{{ t('networkWireless.associate') }}</a-button></div>
        <p v-if="data.resource.neighborDeviceId">{{ t('networkWireless.switch') }} #{{ data.resource.neighborDeviceId }} · {{ data.resource.neighborInterface }}</p>
        <a-form v-if="neighbor && canEdit" :model="association" layout="vertical" @submit-success="associate"><a-form-item :label="t('networkWireless.switch')"><a-select v-model="association.deviceId" allow-search allow-clear :filter-option="false" :options="switches" @search="searchSwitch" /></a-form-item><a-form-item :label="t('networkWireless.interface')"><a-input v-model="association.interface" :max-length="255" /></a-form-item><a-button type="primary" html-type="submit" :loading="pending" :disabled="!active || data.neighborCoverage.state !== 'complete' || !association.deviceId || !association.interface.trim()">{{ t('networkWireless.associate') }}</a-button><a-button v-if="data.resource.neighborDeviceId" :loading="pending" @click="associate(true)">{{ t('networkWireless.clearAssociation') }}</a-button></a-form>
      </a-tab-pane>
      <a-tab-pane v-for="kind in ['radios', 'bsses', 'clients'] as const" :key="kind" :title="t(`networkWireless.tabs.${kind}`)"><p class="wireless-muted">{{ t('networkWireless.partialChildren') }}</p><div v-for="row in data[kind]" :key="row.id" class="wireless-evidence-row"><div><strong>{{ row.fields.mac || row.fields.ssid || row.fields.radioId }}</strong><p>{{ [row.fields.ip, row.fields.ssid, row.fields.band, row.fields.channel].filter(Boolean).join(' · ') }}</p></div><StateTag :value="row.health" /></div><a-empty v-if="!data[kind].length" /></a-tab-pane>
    </AppTabs>
  </div>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppTabs from '@/components/AppTabs/index.vue'
import DateCell from '@/components/DateCell/index.vue'
import { getAP, updateManagement, updateNeighbor, listSwitch } from '@/api/network/wireless'
import type { APDetail, IssueGroup, Neighbor, Suggestion } from '@/types/network-wireless'
import { msgSuccess } from '@/utils/message'
import { management, dirty, isConflict } from './presentation'
import { useSession } from './session'
import StateTag from './state-tag.vue'
const props = defineProps<{ data: APDetail, canEdit: boolean, canCollect: boolean, issue?: string, issues: IssueGroup[] }>()
const emit = defineEmits<{ saved: [], returnIssue: [], issue: [key: string], collect: [value: Suggestion] }>()
const { t } = useI18n(); const { active, pending, run } = useSession()
const tab = ref('management'); const baseline = ref(management(props.data.resource)); const draft = reactive(management(props.data.resource)); const conflict = ref(false)
const managementKeys = ['localAlias', 'installationLocation', 'owner', 'notes'] as const
const changed = computed(() => dirty(draft, baseline.value))
const newer = computed(() => props.data.resource.version > draft.version)
watch(() => props.data.resource, value => { if (!pending.value && !changed.value && !conflict.value && value.version >= baseline.value.version) reset(value) })
function reset(value: typeof draft) { baseline.value = management(value); Object.assign(draft, management(value)); conflict.value = false }
async function reload() { try { const response = await run(signal => getAP(props.data.resource.controllerId, props.data.resource.id, signal)); if (response && response.data.resource.version >= props.data.resource.version && (!conflict.value || response.data.resource.version > draft.version)) reset(response.data.resource) } catch { /* retain draft */ } }
async function save() { if (!props.canEdit || !changed.value || conflict.value || newer.value) return; try { const response = await run(signal => updateManagement(props.data.resource.controllerId, props.data.resource.id, management(draft), signal)); if (response) { reset(response.data); msgSuccess(t('networkWireless.saved')); emit('saved') } } catch(e) { if (isConflict(e)) conflict.value = true } }
const neighbor = ref<Neighbor>(); const association = reactive<{ deviceId?: number, interface: string }>({ interface: '' }); const switches = ref<{ value: number, label: string }[]>([])
let abort: AbortController | undefined
async function searchSwitch(keyword = '') { abort?.abort(); const current = new AbortController(); abort = current; try { const response = await listSwitch({ keyword, pageIndex: 1, pageSize: 100 }, current.signal); if (active.value && current === abort) switches.value = response.data.list.map(d => ({ value: d.id, label: `${d.name} · ${d.ip}` })) } catch { /* interceptor */ } }
function choose(value: Neighbor) { neighbor.value = value; association.deviceId = value.candidates.length === 1 ? value.candidates[0].id : undefined; association.interface = value.portId; switches.value = value.candidates.map(d => ({ value: d.id, label: `${d.name} · ${d.ip}` })); void searchSwitch() }
async function associate(clear: boolean | unknown = false) { if (!neighbor.value || !props.canEdit) return; const evidence = neighbor.value; try { const response = await run(signal => updateNeighbor(props.data.resource.controllerId, props.data.resource.id, { version: props.data.resource.version, observationVersion: props.data.neighborCoverage.version, evidenceId: evidence.evidenceId, deviceId: clear === true ? null : association.deviceId!, interface: clear === true ? '' : association.interface }, signal)); if (response) { neighbor.value = undefined; emit('saved') } } catch(e) { if (isConflict(e)) { neighbor.value = undefined; emit('saved') } } }
onBeforeUnmount(() => abort?.abort())
</script>
