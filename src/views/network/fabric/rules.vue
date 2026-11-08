<template>
  <AppDrawer :visible="visible" class="fabric-drawer" :title="t('networkFabric.rules')" :width="narrow ? '100%' : 1000" @update:visible="emit('update:visible', $event)">
    <p class="fabric-hint">{{ t('networkFabric.ruleHelp') }}</p>
    <a-alert v-if="failed" type="warning">{{ t('networkFabric.loadFailed') }}<template #action><a-button @click="load">{{ t('common.refresh') }}</a-button></template></a-alert>
    <a-spin :loading="loading" style="width:100%">
      <a-form :model="draft" layout="vertical" :disabled="pending">
        <div v-for="(rule, index) in draft.rules" :key="index" class="fabric-rule-row">
          <a-select v-model="rule.fabricId" v-input-label="t('networkFabric.region')"><a-option v-for="fabric in fabrics" :key="fabric.id" :value="fabric.id">{{ fabric.code }}</a-option></a-select>
          <a-input v-model="rule.pattern" :input-attrs="{ 'aria-label': t('networkFabric.pattern') }" />
          <a-switch v-model="rule.enabled" :aria-label="t('networkFabric.enabled')" />
          <a-button status="danger" :aria-label="t('common.delete')" @click="draft.rules.splice(index, 1)">×</a-button>
        </div>
      </a-form>
      <div class="fabric-action-bar"><a-button :disabled="pending || !fabrics.length" @click="draft.rules.push({ fabricId: fabrics[0]!.id, pattern: '', enabled: true })">{{ t('common.add') }}</a-button><a-button :loading="pending" :disabled="!valid" @click="preview">{{ t('networkFabric.preview') }}</a-button><span class="fabric-hint">{{ t('networkFabric.ruleVersion') }}: {{ draft.version }}</span></div>
      <a-alert v-if="previewed !== signature" type="info">{{ t('networkFabric.previewRequired') }}</a-alert>
      <a-table v-if="previewed === signature" :data="previewMembers" row-key="deviceId" :pagination="{ pageSize: 8, hideOnSinglePage: true }" :scroll="{ x: 600 }"><template #columns><a-table-column :title="t('networkFabric.device')" data-index="name" /><a-table-column :title="t('networkFabric.ip')" data-index="ip" /><a-table-column :title="t('networkFabric.state')"><template #cell="{ record }"><StateTag :value="record.status" /></template></a-table-column><a-table-column :title="t('networkFabric.candidates')"><template #cell="{ record }">{{ (record.candidates || []).map(fabricName).join(', ') || '—' }}</template></a-table-column></template></a-table>
      <section class="fabric-section"><h2>{{ t('networkFabric.membership') }}</h2><ProTable :table="members" :panels="false" row-key="deviceId" :actions-width="90" :scroll="{ x: 620 }"><template #search><a-form-item :label="t('networkFabric.memberKeyword')"><a-input v-model="members.query.keyword" :input-attrs="{ 'aria-label': t('networkFabric.memberKeyword') }" allow-clear /></a-form-item><a-form-item :label="t('networkFabric.state')"><a-select v-model="members.query.status" allow-clear><a-option v-for="state in ['conflict', 'unmatched', 'assigned']" :key="state" :value="state">{{ t(`networkFabric.states.${state}`) }}</a-option></a-select></a-form-item></template><a-table-column data-index="name" :title="t('networkFabric.device')" :width="210" /><a-table-column data-index="ip" :title="t('networkFabric.ip')" :width="150" /><a-table-column data-index="status" :title="t('networkFabric.state')" :width="110"><template #cell="{ record }"><StateTag :value="record.status" /></template></a-table-column><a-table-column data-index="mode" :title="t('networkFabric.membershipMode')" :width="100"><template #cell="{ record }"><StateTag :value="record.mode" /></template></a-table-column><template #actions="{ row }"><a-button type="text" @click="editMember(row)">{{ t('common.edit') }}</a-button></template></ProTable></section>
    </a-spin>
    <template #footer><a-button :disabled="pending" @click="emit('update:visible', false)">{{ t('common.close') }}</a-button><a-button type="primary" :loading="pending" :disabled="!valid || previewed !== signature || loading || failed" @click="save">{{ t('common.dialogConfirm') }}</a-button></template>
    <AppModal v-model:visible="memberVisible" :title="t('networkFabric.membership')" :width="narrow ? '95%' : 500" :mask-closable="false"><a-form :model="membership" layout="vertical" :disabled="pending"><p>{{ selectedMember?.name }} · {{ selectedMember?.ip }}</p><a-form-item :label="t('networkFabric.membershipMode')"><a-radio-group v-model="membership.mode"><a-radio value="auto">{{ t('networkFabric.automatic') }}</a-radio><a-radio value="manual">{{ t('networkFabric.manual') }}</a-radio></a-radio-group></a-form-item><a-form-item v-if="membership.mode === 'manual'" :label="t('networkFabric.region')"><a-select v-model="membership.fabricId"><a-option :value="0">{{ t('networkFabric.unassigned') }}</a-option><a-option v-for="fabric in fabrics" :key="fabric.id" :value="fabric.id">{{ fabric.code }}</a-option></a-select></a-form-item></a-form><template #footer><a-button :disabled="pending" @click="memberVisible = false">{{ t('common.cancel') }}</a-button><a-button type="primary" :loading="pending" @click="saveMember">{{ t('common.dialogConfirm') }}</a-button></template></AppModal>
  </AppDrawer>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDrawer from '@/components/AppDrawer/index.vue'
import AppModal from '@/components/AppModal/index.vue'
import ProTable from '@/components/ProTable/index.vue'
import { useTable } from '@/composables'
import { useNarrowScreen } from '@/composables/useNarrowScreen'
import { getRules, previewRules, updateRules, listMember, updateMember } from '@/api/network/fabric'
import type { Fabric, FabricQuery, RuleSet, Member } from '@/types/network-fabric'
import { vInputLabel } from '../shared/input-label'
import { useOperation } from './use-operation'
import StateTag from './state-tag.vue'
defineOptions({ name: 'FabricRules' })
const props = defineProps<{ visible: boolean, fabrics: Fabric[] }>()
const emit = defineEmits<{ 'update:visible': [value: boolean], saved: [] }>()
const { t } = useI18n()
const narrow = useNarrowScreen()
const { pending, run, invalidate } = useOperation()
const draft = reactive<RuleSet>({ version: 0, rules: [], updatedAt: '' })
const previewed = ref('')
const previewMembers = ref<Member[]>([])
const loading = ref(false)
const failed = ref(false)
const memberVisible = ref(false)
const selectedMember = ref<Member>()
const membership = reactive<{ fabricId: number, mode: 'auto' | 'manual' }>({ fabricId: 0, mode: 'auto' })
const signature = computed(() => JSON.stringify(draft.rules))
const valid = computed(() => draft.rules.every(rule => rule.fabricId > 0 && rule.pattern.trim()))
const fabricName = (id: number) => props.fabrics.find(fabric => fabric.id === id)?.code || `#${id}`
const members = useTable<Member, FabricQuery>({ api: listMember, idKey: 'deviceId', defaultQuery: () => ({ keyword: '', status: undefined }) })
async function load() { loading.value = true; failed.value = true; await run(getRules, response => { Object.assign(draft, response.data); failed.value = false }); loading.value = false; if (!draft.version) failed.value = true }
function preview() { const snapshot = signature.value; void run(() => previewRules(draft.rules.map(rule => ({ ...rule }))), response => { previewMembers.value = response.data; previewed.value = snapshot }) }
function save() { if (!valid.value || previewed.value !== signature.value) return; void run(() => updateRules({ version: draft.version, rules: draft.rules.map(rule => ({ ...rule })) }), response => { Object.assign(draft, response.data); emit('saved'); void members.getList() }) }
function editMember(member: Member) { selectedMember.value = member; membership.fabricId = member.fabricId || 0; membership.mode = member.mode; memberVisible.value = true }
function saveMember() { if (!selectedMember.value) return; const id = selectedMember.value.deviceId; void run(() => updateMember(id, { mode: membership.mode, fabricId: membership.fabricId || null }), () => { memberVisible.value = false; emit('saved'); void members.getList(); previewed.value = '' }) }
watch(() => props.visible, value => { if (!value) invalidate() })
onMounted(load)
</script>
