<template>
  <AppDrawer class="network-drawer circuit-drawer" :visible="visible" :title="t(id ? 'networkCircuit.editTitle' : 'networkCircuit.createTitle')" :width="narrow ? '100%' : 760" :mask-closable="false" :closable="!saving" @update:visible="requestClose">
    <a-spin :loading="form.loading" class="circuit-editor">
      <a-result v-if="loadFailed" status="error" :title="t('networkCircuit.detailFailed')">
        <template #extra><a-button @click="load">{{ t('networkCircuit.retry') }}</a-button></template>
      </a-result>
      <template v-else-if="form.visible">
        <a-alert v-if="optionsFailed" type="warning" class="circuit-notice">{{ t('networkCircuit.lookupFailed') }}<template #action><a-button @click="emit('retryOptions')">{{ t('networkCircuit.retry') }}</a-button></template></a-alert>
        <a-alert v-if="conflict" type="warning" class="circuit-notice" :title="t('networkCircuit.conflict')">
          {{ t('networkCircuit.conflictHelp') }}
          <template #action><a-button @click="reload">{{ t('networkCircuit.reload') }}</a-button></template>
        </a-alert>
        <a-alert v-else-if="saveFailed" type="error" class="circuit-notice">{{ t('networkCircuit.saveFailed') }}</a-alert>
        <a-form :ref="form.bindFormRef" :model="form.model" :rules="form.rules" :disabled="saving" layout="vertical" scroll-to-first-error @submit-success="save">
          <section class="circuit-section">
            <h2>{{ t('networkCircuit.basics') }}</h2>
            <div class="circuit-grid">
              <a-form-item v-for="field in basicText" :key="field.key" :field="field.key" :label="t(`networkCircuit.${field.key}`)">
                <a-input v-model="form.model[field.key]" :input-attrs="{ 'aria-label': t(`networkCircuit.${field.key}`) }" :max-length="field.max" />
              </a-form-item>
              <a-form-item v-input-label="t('networkCircuit.provider')" field="provider" :label="t('networkCircuit.provider')">
                <a-auto-complete v-model="form.model.provider" :data="options?.providers || []" :max-length="160" allow-clear />
              </a-form-item>
              <a-form-item v-for="field in basicEnums" :key="field.key" v-input-label="t(`networkCircuit.${field.key}`)" :field="field.key" :label="t(`networkCircuit.${field.key}`)">
                <a-select v-model="form.model[field.key]" :disabled="field.key === 'status' && originalStatus === 'terminated'">
                  <a-option v-for="value in field.values" :key="value" :value="value">{{ t(`networkCircuit.${field.key}Values.${value}`) }}</a-option>
                </a-select>
              </a-form-item>
              <a-form-item v-input-label="t('networkCircuit.bandwidthMbps')" field="bandwidthMbps" :label="t('networkCircuit.bandwidthMbps')">
                <a-input-number :model-value="form.model.bandwidthMbps ?? undefined" :min="1" :max="1000000" :precision="0" @update:model-value="form.model.bandwidthMbps = $event ?? null" />
              </a-form-item>
              <a-form-item v-for="field in ['region', 'organization'] as const" :key="field" v-input-label="t(`networkCircuit.${field}`)" :field="field" :label="t(`networkCircuit.${field}`)">
                <a-auto-complete v-model="form.model[field]" :data="options?.[field === 'region' ? 'regions' : 'organizations'] || []" :max-length="field === 'region' ? 120 : 160" allow-clear />
              </a-form-item>
            </div>
            <p v-if="originalStatus === 'terminated'" class="circuit-help">{{ t('networkCircuit.terminatedHelp') }}</p>
          </section>
          <CircuitEndpointEditor v-model="form.model.aEndpoint" field="aEndpoint" side="a" :configured="options?.zabbixConfigured" />
          <CircuitEndpointEditor v-model="form.model.zEndpoint" field="zEndpoint" side="z" :configured="options?.zabbixConfigured" />
          <section class="circuit-section">
            <h2>{{ t('networkCircuit.contract') }}</h2>
            <div class="circuit-grid">
              <a-form-item field="contractNo" :label="t('networkCircuit.contractNo')"><a-input v-model="form.model.contractNo" :input-attrs="{ 'aria-label': t('networkCircuit.contractNo') }" :max-length="160" /></a-form-item>
              <a-form-item v-for="field in ['installedOn', 'expiresOn'] as const" :key="field" v-input-label="t(`networkCircuit.${field}`)" :field="field" :label="t(`networkCircuit.${field}`)">
                <a-date-picker :model-value="form.model[field] || undefined" value-format="YYYY-MM-DD" @update:model-value="(value: unknown) => form.model[field] = typeof value === 'string' ? value : ''" />
              </a-form-item>
              <a-form-item field="fee" :label="t('networkCircuit.fee')"><a-input v-model="form.model.fee" :input-attrs="{ 'aria-label': t('networkCircuit.fee'), inputmode: 'decimal' }" :max-length="13" /></a-form-item>
              <a-form-item field="currency" :label="t('networkCircuit.currency')"><a-input v-model="form.model.currency" :input-attrs="{ 'aria-label': t('networkCircuit.currency') }" :max-length="3" /></a-form-item>
              <a-form-item v-input-label="t('networkCircuit.billingCycle')" field="billingCycle" :label="t('networkCircuit.billingCycle')">
                <a-select v-model="form.model.billingCycle" allow-clear><a-option v-for="value in circuitBillingCycles" :key="value" :value="value">{{ t(`networkCircuit.billingCycleValues.${value}`) }}</a-option></a-select>
              </a-form-item>
              <a-form-item v-input-label="t('networkCircuit.payer')" field="payer" :label="t('networkCircuit.payer')">
                <a-select v-model="form.model.payer"><a-option v-for="value in circuitPayers" :key="value" :value="value">{{ t(`networkCircuit.payerValues.${value}`) }}</a-option></a-select>
              </a-form-item>
            </div>
            <a-form-item v-for="field in ['routeNotes', 'notes'] as const" :key="field" :field="field" :label="t(`networkCircuit.${field}`)">
              <a-textarea v-model="form.model[field]" :textarea-attrs="{ 'aria-label': t(`networkCircuit.${field}`) }" :max-length="10000" :auto-size="{ minRows: 3, maxRows: 8 }" show-word-limit />
            </a-form-item>
          </section>
        </a-form>
      </template>
    </a-spin>
    <template #footer>
      <a-button :disabled="saving" @click="requestClose">{{ t('common.cancel') }}</a-button>
      <a-button type="primary" :loading="saving" :disabled="form.loading || !form.visible || conflict" @click="save">{{ t('common.dialogConfirm') }}</a-button>
    </template>
  </AppDrawer>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onDeactivated, ref, watch } from 'vue'
import { isAxiosError } from 'axios'
import { useI18n } from 'vue-i18n'
import AppDrawer from '@/components/AppDrawer/index.vue'
import { useForm } from '@/composables'
import { useNarrowScreen } from '@/composables/useNarrowScreen'
import { useUserStore } from '@/stores/user'
import { confirmAction } from '@/utils/modal'
import { addCircuit, getCircuit, updateCircuit } from '@/api/network/circuit'
import { circuitBillingCycles, circuitCategories, circuitPayers, circuitPurposes, circuitStatuses } from '@/types/network-circuit'
import type { CircuitDraft, CircuitOptions, CircuitStatus } from '@/types/network-circuit'
import type { FormRules } from '@/types/ui'
import { emptyCircuitDraft, circuitPayload, toCircuitDraft, validateCircuit } from './form'
import CircuitEndpointEditor from './endpoint-editor.vue'
import { vInputLabel } from '../shared/input-label'
import '../shared/drawer.scss'

defineOptions({ name: 'CircuitEditor' })

const props = defineProps<{ visible: boolean, id?: number, options?: CircuitOptions, optionsFailed: boolean }>()
const emit = defineEmits<{ 'update:visible': [value: boolean], saved: [], retryOptions: [] }>()
const { t } = useI18n()
const user = useUserStore()
const narrow = useNarrowScreen()
const loadFailed = ref(false)
const saveFailed = ref(false)
const conflict = ref(false)
const saving = ref(false)
const originalStatus = ref<CircuitStatus>()
const baseline = ref('')
let generation = 0
let session = ''
let writeGeneration = 0
let writeSession = ''
let controller: AbortController | undefined
let confirming = false
const basicText = [{ key: 'circuitNo', max: 120 }, { key: 'name', max: 160 }] as const
const basicEnums = [{ key: 'category', values: circuitCategories }, { key: 'purpose', values: circuitPurposes }, { key: 'status', values: circuitStatuses }] as const
const rules = computed<FormRules>(() => {
  const fields = [...Object.keys(emptyCircuitDraft()).filter(key => !['id', 'version', 'aEndpoint', 'zEndpoint'].includes(key))]
  for (const side of ['aEndpoint', 'zEndpoint']) fields.push(...['deviceId', 'name', 'address', 'interface', 'ip', 'contactName', 'contactPhone', 'monitoring.hostId', 'monitoring.inItemId', 'monitoring.outItemId'].map(field => `${side}.${field}`))
  return Object.fromEntries(fields.map(field => [field, [...(['circuitNo', 'name', 'provider'].includes(field) ? [{ required: true, message: t('networkCircuit.rules.required') }] : []), { validator: (_value: unknown, callback: (error?: string) => void) => {
    const error = validateCircuit(form.model, originalStatus.value)[field]
    callback(error ? t(`networkCircuit.rules.${error}`) : undefined)
  } }]]))
})
const form = useForm<CircuitDraft, number>({
  defaultModel: emptyCircuitDraft, idKey: 'id', rules,
  api: {
    get: async id => {
      const current = generation
      const response = await getCircuit(id, controller?.signal)
      const draft = toCircuitDraft(response.data)
      if (current === generation && session === user.token) { baseline.value = JSON.stringify(draft); originalStatus.value = draft.status }
      return { ...response, data: draft }
    },
    add: draft => { writeGeneration = generation; writeSession = session; return addCircuit(circuitPayload(draft)) },
    update: draft => { writeGeneration = generation; writeSession = session; return updateCircuit(draft.id!, circuitPayload(draft)) }
  },
  onError: error => {
    if (form.loading) loadFailed.value = true
    else if (error.code === 409 || (isAxiosError(error) && error.response?.status === 409)) conflict.value = true
    else saveFailed.value = true
  },
  onSuccess: () => {
    if (writeSession !== user.token) return
    emit('saved')
    if (writeGeneration === generation) emit('update:visible', false)
  }
})
const dirty = computed(() => form.visible && baseline.value !== JSON.stringify(form.model))
function load() {
  if (!props.visible || saving.value) return
  generation++
  controller?.abort()
  controller = new AbortController()
  session = user.token
  loadFailed.value = false
  saveFailed.value = false
  conflict.value = false
  originalStatus.value = undefined
  if (props.id) void form.openEdit(props.id)
  else { form.openCreate(); baseline.value = JSON.stringify(form.model) }
}
async function mayDiscard() {
  if (!dirty.value) return true
  if (confirming) return false
  confirming = true
  try { await confirmAction({ title: t('networkCircuit.dirty'), content: t('networkCircuit.dirtyHelp'), okText: t('networkCircuit.discard'), cancelText: t('networkCircuit.keepEditing') }); return true } catch { return false } finally { confirming = false }
}
async function requestClose() {
  if (saving.value || !(await mayDiscard())) return false
  invalidate()
  emit('update:visible', false)
  return true
}
async function reload() { if (!saving.value && await mayDiscard()) load() }
async function save() {
  if (saving.value || form.loading || !form.visible || conflict.value || session !== user.token) return
  if (!user.permisaction.some(permission => permission === '*:*:*' || permission === `network:circuit:${props.id ? 'edit' : 'add'}`)) return
  saving.value = true
  saveFailed.value = false
  try { await form.submit() } finally { saving.value = false }
}
function invalidate() { generation++; controller?.abort(); form.close() }
watch(() => [props.visible, props.id], () => { if (props.visible) load(); else invalidate() }, { immediate: true })
watch(() => user.token, () => { invalidate(); emit('update:visible', false) })
onDeactivated(invalidate)
onBeforeUnmount(invalidate)
defineExpose({ requestClose })
</script>
