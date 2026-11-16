<template>
  <AppDrawer class="network-drawer delivery-drawer" :visible="visible" :title="t(id ? 'networkDelivery.edit' : 'networkDelivery.create')" :width="narrow ? '100%' : 'min(1120px, 96vw)'" :mask-closable="false" :closable="!saving" @update:visible="requestClose">
    <a-spin :loading="form.loading" class="delivery-editor">
      <a-result v-if="loadFailed" status="error" :title="t('networkDelivery.loadFailed')"><template #extra><a-button @click="load()">{{ t('networkDelivery.retry') }}</a-button></template></a-result>
      <template v-else-if="form.visible">
        <div v-if="narrow" class="delivery-current-step" role="status"><span>{{ t('networkDelivery.stepOf', { step, total: 3 }) }}</span><strong>{{ t(['networkDelivery.chooseDevices', 'networkDelivery.writeByRole', 'networkDelivery.reviewScripts'][step - 1]) }}</strong></div>
        <a-steps v-else :current="step" size="small" class="delivery-steps"><a-step :title="t('networkDelivery.chooseDevices')" /><a-step :title="t('networkDelivery.writeByRole')" /><a-step :title="t('networkDelivery.reviewScripts')" /></a-steps>
        <a-alert v-if="conflict" type="warning" class="delivery-notice" :title="t('networkDelivery.conflict')">{{ t('networkDelivery.conflictHelp') }}<template #action><a-button @click="reload">{{ t('networkDelivery.reload') }}</a-button></template></a-alert>
        <a-alert v-else-if="submissionUnknown" type="warning" class="delivery-notice">{{ t('networkDelivery.submissionUnknown') }}</a-alert>
        <a-alert v-else-if="saveFailed" type="error" class="delivery-notice">{{ t('networkDelivery.saveFailed') }}</a-alert>
        <Picker v-if="step === 1" :devices="devices" :options="options" :can-configure="allowed('connection')" :disabled="locked" @update:devices="setDevices" />
        <a-form v-show="step === 2" :ref="form.bindFormRef" :model="form.model" :rules="form.rules" layout="vertical" :disabled="locked" @submit-success="next">
          <a-form-item field="title" :label="t('networkDelivery.name')"><a-input v-model="form.model.title" :input-attrs="{ 'aria-label': t('networkDelivery.name') }" :max-length="160" :placeholder="t('networkDelivery.namePlaceholder')" /></a-form-item>
          <Scripts :targets="form.model.targets" :scripts="groupScripts" :disabled="locked" @group-script="writeGroup" @individual="individual" @target-script="writeTarget" />
          <a-alert v-if="validationError" type="warning" class="delivery-notice" role="alert">{{ t(`networkDelivery.rules.${validationError}`) }}</a-alert>
        </a-form>
        <section v-if="step === 3" class="delivery-review">
          <div class="delivery-review-heading"><h2>{{ form.model.title }}</h2><p>{{ t('networkDelivery.reviewSummary', { devices: t('networkDelivery.deviceCount', { count: devices.length }), groups: t('networkDelivery.groupCount', { count: groups.length }), individual: t('networkDelivery.individualCount', { count: individualCount }) }) }}</p></div>
          <Scripts :targets="form.model.targets" :scripts="groupScripts" :disabled="true" review />
          <a-alert v-if="!options.enabled || !options.configured" type="info" class="delivery-notice">{{ t('networkDelivery.serviceHelp') }}</a-alert>
        </section>
      </template>
    </a-spin>
    <template #footer>
      <div class="delivery-editor-footer"><p>{{ t('networkDelivery.submitHelp', { minutes: options.graceSeconds / 60 }) }}</p><div>
        <a-button :disabled="saving || submissionUnknown" @click="requestClose">{{ t('common.cancel') }}</a-button>
        <a-button v-if="step > 1" :disabled="locked" @click="step--">{{ t(step === 2 ? 'networkDelivery.back' : 'networkDelivery.backToScripts') }}</a-button>
        <a-button v-if="step < 3" type="primary" :disabled="!devices.length || locked || form.loading" @click="next">{{ t(step === 1 ? 'networkDelivery.nextWrite' : 'networkDelivery.next') }}</a-button>
        <a-button v-else type="primary" :loading="saving" :disabled="form.loading || !form.visible || conflict || !options.enabled || !options.configured" @click="save">{{ t(submissionUnknown ? 'networkDelivery.resolveSubmission' : 'networkDelivery.submit') }}</a-button>
      </div></div>
    </template>
  </AppDrawer>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onDeactivated, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDrawer from '@/components/AppDrawer/index.vue'
import { useForm } from '@/composables'
import { useNarrowScreen } from '@/composables/useNarrowScreen'
import { useUserStore } from '@/stores/user'
import { confirmAction } from '@/utils/modal'
import { addDelivery, getDelivery, updateDelivery } from '@/api/network/delivery'
import type { DeliveryDraft, DeliveryOptions, DeviceSnapshot, DraftTarget } from '@/types/network-delivery'
import { emptyDraft, fromOrder, isSubmissionUncertain, toPayload, validateDraft } from './form'
import { buildGroups, initializeGroupScripts, reconcileGroupedTargets, setIndividualScript, updateGroupScript } from './groups'
import Picker from './picker.vue'
import Scripts from './scripts.vue'
import '../shared/drawer.scss'

defineOptions({ name: 'DeliveryEditor' })
const props = defineProps<{ visible: boolean, id?: number, options: DeliveryOptions, initialDevices?: DeviceSnapshot[] }>()
const emit = defineEmits<{ 'update:visible': [boolean], saved: [number] }>()
const { t } = useI18n()
const user = useUserStore()
const narrow = useNarrowScreen()
const step = ref(1)
const groupScripts = ref<Record<string, string>>({})
const targetCache = new Map<number, DraftTarget>()
const loadFailed = ref(false)
const saveFailed = ref(false)
const conflict = ref(false)
const submissionUnknown = ref(false)
const saving = ref(false)
const attempted = ref(false)
const baseline = ref('')
let controller: AbortController | undefined
let session = ''
let generation = 0
let savedId = 0
let confirming = false
const allowed = (action: string) => user.permisaction.some(p => p === '*:*:*' || p === `network:delivery:${action}`)
const form = useForm<DeliveryDraft, number>({
  defaultModel: emptyDraft, idKey: 'id',
  rules: computed(() => ({ title: [{ required: true, message: t('networkDelivery.rules.titleRequired') }] })),
  api: {
    get: async id => {
      const current = generation
      const result = await getDelivery(id, controller?.signal)
      const draft = fromOrder(result.data)
      if (current === generation && session === user.token) { baseline.value = JSON.stringify(toPayload(draft)); conflict.value = !result.data.editable }
      return { ...result, data: draft }
    }
  },
  submit: async draft => {
    if (!props.visible || session !== user.token || !allowed(props.id ? 'edit' : 'add')) throw new Error('Inactive delivery form')
    const payload = toPayload(draft)
    const result = props.id ? await updateDelivery(props.id, { ...payload, version: draft.version }) : await addDelivery({ ...payload, requestKey: draft.requestKey })
    savedId = result.data.id
  },
  successMessage: () => t('networkDelivery.submitted'),
  onError: error => {
    if (form.loading) loadFailed.value = true
    else if (error.code === 409) conflict.value = true
    else { saveFailed.value = true; if (!props.id && isSubmissionUncertain(error.code)) submissionUnknown.value = true }
  },
  onSuccess: () => { if (session !== user.token) return; submissionUnknown.value = false; emit('saved', savedId); emit('update:visible', false) }
})
const locked = computed(() => saving.value || conflict.value || submissionUnknown.value)
const devices = computed(() => form.model.targets.map(target => target.device))
const groups = computed(() => buildGroups(form.model.targets))
const individualCount = computed(() => form.model.targets.filter(target => target.individual).length)
const validationError = computed(() => attempted.value ? validateDraft(form.model, props.options) : undefined)
const dirty = computed(() => form.visible && baseline.value !== JSON.stringify(toPayload(form.model)))
function setDevices(value: DeviceSnapshot[]) {
  for (const target of form.model.targets) targetCache.set(target.deviceId, { ...target, device: { ...target.device }})
  form.model.targets = reconcileGroupedTargets(form.model.targets, value, groupScripts.value, targetCache)
}
function writeGroup(key: string, value: string) { if (!locked.value) updateGroupScript(form.model.targets, groupScripts.value, key, value) }
function individual(target: DraftTarget, value: boolean) { if (!locked.value) setIndividualScript(target, value, groupScripts.value) }
function writeTarget(target: DraftTarget, value: string) { if (!locked.value) target.script = value }
async function next() {
  if (locked.value || !devices.value.length) return
  if (step.value === 1) { step.value = 2; return }
  attempted.value = true
  if (validateDraft(form.model, props.options)) return
  step.value = 3
}
async function load(reselect = false) {
  if (!props.visible || saving.value) return
  const current = ++generation
  controller?.abort(); controller = new AbortController(); session = user.token
  loadFailed.value = false; saveFailed.value = false; conflict.value = false; submissionUnknown.value = false; attempted.value = false; groupScripts.value = {}; targetCache.clear()
  step.value = props.id || (!reselect && props.initialDevices?.length) ? 2 : 1
  if (props.id) await form.openEdit(props.id)
  else { form.openCreate(); baseline.value = JSON.stringify(toPayload(form.model)); setDevices(reselect ? [] : props.initialDevices || []) }
  if (current === generation) groupScripts.value = initializeGroupScripts(form.model.targets)
}
async function mayDiscard() {
  if (!dirty.value) return true
  if (confirming || submissionUnknown.value) return false
  confirming = true
  try { await confirmAction({ title: t('networkDelivery.dirty'), content: t('networkDelivery.dirtyHelp'), okText: t('networkDelivery.discard'), cancelText: t('networkDelivery.keepEditing') }); return true } catch { return false } finally { confirming = false }
}
async function requestClose() {
  if (saving.value || submissionUnknown.value || !(await mayDiscard())) return false
  invalidate(); emit('update:visible', false); return true
}
async function reload() { if (!saving.value && await mayDiscard()) await load(true) }
async function save() {
  if (saving.value || form.loading || !form.visible || conflict.value || confirming || session !== user.token || !props.options.enabled || !props.options.configured) return
  attempted.value = true
  if (validateDraft(form.model, props.options)) return
  if (!submissionUnknown.value) {
    confirming = true
    try { await confirmAction({ title: t('networkDelivery.confirmSubmit', { count: devices.value.length }), content: t('networkDelivery.confirmSubmitHelp', { name: form.model.title }), okText: t('networkDelivery.submit') }) } catch { return } finally { confirming = false }
  }
  if (!props.visible || session !== user.token) return
  saving.value = true; saveFailed.value = false
  try { await form.submit() } finally { saving.value = false }
}
function invalidate() { generation++; controller?.abort(); form.close() }
watch(() => [props.visible, props.id], () => { if (props.visible) void load(); else invalidate() }, { immediate: true })
watch(() => user.token, () => { invalidate(); emit('update:visible', false) })
onDeactivated(invalidate)
onBeforeUnmount(invalidate)
defineExpose({ requestClose })
</script>
