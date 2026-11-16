<template>
  <AppDrawer class="network-drawer delivery-drawer" :visible="visible" :title="t('networkDelivery.detail')" :width="narrow ? '100%' : 1040" :mask-closable="!busy" :closable="!busy" @update:visible="close">
    <a-spin :loading="loading" class="delivery-editor">
      <a-result v-if="failed && !order" status="error" :title="t('networkDelivery.loadFailed')"><template #extra><a-button @click="refresh">{{ t('networkDelivery.retry') }}</a-button></template></a-result>
      <template v-if="order">
        <a-alert v-if="failed || actionFailed" type="warning" class="delivery-notice">{{ t(failed ? 'networkDelivery.refreshFailed' : 'networkDelivery.actionFailed') }}<template #action><a-button :loading="refreshing" @click="refresh">{{ t('common.refresh') }}</a-button></template></a-alert>
        <div class="delivery-detail-heading"><div><h2>{{ order.title || order.requestNo }}</h2><p>{{ order.requestNo }}<span v-if="order.retryOfId"> · {{ t('networkDelivery.retryOf', { id: order.retryOfId }) }}</span></p></div><a-tag :color="statusColors[order.status]">{{ t(`networkDelivery.statuses.${order.status}`) }}</a-tag></div>
        <dl class="delivery-meta"><div><dt>{{ t('networkDelivery.creator') }}</dt><dd>{{ order.createdByName || '—' }}</dd></div><div><dt>{{ t('networkDelivery.scheduledAt') }}</dt><dd>{{ time(order.scheduledAt) }}</dd></div><div><dt>{{ t('networkDelivery.progress') }}</dt><dd>{{ t('networkDelivery.progressText', { done: order.succeededCount, total: order.deviceCount }) }}</dd></div></dl>
        <a-alert v-if="order.uncertainCount" type="warning" class="delivery-notice">{{ t('networkDelivery.uncertainHelp') }}</a-alert>
        <div class="delivery-output-toolbar"><strong>{{ t('networkDelivery.targets') }} · {{ order.deviceCount }}</strong><a-button type="text" :loading="refreshing" @click="refresh">{{ t('common.refresh') }}</a-button><span v-if="polling" role="status">{{ t('networkDelivery.live') }}</span></div>
        <div class="delivery-workbench">
          <nav class="delivery-target-list" :aria-label="t('networkDelivery.targets')"><button v-for="row in order.targets" :key="row.id" class="delivery-target" type="button" :aria-pressed="selectedId === row.id" @click="selectedId = row.id"><strong>{{ deviceName(row.device) }}</strong><span>{{ row.device.ip }}</span><a-tag :color="statusColors[row.status]">{{ t(`networkDelivery.statuses.${row.status}`) }}</a-tag></button></nav>
          <section class="delivery-script">
            <a-form layout="vertical" :model="{}" class="delivery-target-select"><a-form-item v-input-label="t('networkDelivery.selectedTarget')" :label="t('networkDelivery.selectedTarget')"><a-select v-model="selectedId"><a-option v-for="row in order.targets" :key="row.id" :value="row.id">{{ deviceName(row.device) }} · {{ t(`networkDelivery.statuses.${row.status}`) }}</a-option></a-select></a-form-item></a-form>
            <a-alert v-if="targetFailed" type="error" class="delivery-notice">{{ t('networkDelivery.outputFailed') }}<template #action><a-button @click="loadTarget">{{ t('networkDelivery.retry') }}</a-button></template></a-alert>
            <a-spin :loading="targetLoading && !target" class="delivery-target-content">
              <template v-if="target">
                <div class="delivery-script-heading"><strong>{{ target.device.ip }}</strong><span>{{ t('networkDelivery.completedSteps', { count: target.completedSteps }) }}</span></div>
                <a-alert v-if="target.errorCode" :type="target.status === 'uncertain' ? 'warning' : 'error'" class="delivery-notice">{{ t(`networkDelivery.errors.${errorKeys.has(target.errorCode) ? target.errorCode : 'unknown'}`) }}</a-alert>
                <AppTabs v-model:active-key="tab" type="line">
                  <a-tab-pane key="output" :title="t('networkDelivery.output')">
                    <pre v-if="target.output" class="delivery-code" tabindex="0" :aria-label="t('networkDelivery.output')">{{ target.output }}</pre>
                    <a-empty v-else :description="t('networkDelivery.outputEmpty')" class="delivery-output-empty"><template #bottom><p class="delivery-help">{{ t(target.status === 'pending' ? 'networkDelivery.outputPending' : 'networkDelivery.outputHelp') }}</p></template></a-empty>
                  </a-tab-pane>
                  <a-tab-pane key="script" :title="t('networkDelivery.script')"><pre class="delivery-code" tabindex="0" :aria-label="t('networkDelivery.script')">{{ target.script }}</pre><p class="delivery-hash">{{ t('networkDelivery.sha') }}: {{ target.scriptSha256 }}</p></a-tab-pane>
                </AppTabs>
              </template>
            </a-spin>
          </section>
        </div>
      </template>
    </a-spin>
    <template #footer>
      <div class="delivery-detail-actions"><a-button :disabled="busy" @click="close">{{ t('common.close') }}</a-button>
        <template v-if="order">
          <a-button v-if="order.editable && allowed('edit')" :disabled="busy || failed" @click="emit('edit', order.id)">{{ t('common.edit') }}</a-button>
          <a-button v-if="order.cancellable && allowed('cancel')" status="danger" :disabled="busy || failed" @click="action('cancel')">{{ t('networkDelivery.cancel') }}</a-button>
          <a-button v-if="order.retryable && allowed('retry')" :disabled="busy || failed || !ready" @click="action('retry')">{{ t('networkDelivery.retryFailed') }}</a-button>
          <a-button v-if="order.executable && allowed('execute')" type="primary" :loading="busy" :disabled="failed || !ready" @click="action('execute')">{{ t('networkDelivery.execute') }}</a-button>
        </template>
      </div>
    </template>
  </AppDrawer>
</template>

<script setup lang="ts">
import { ref, toRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDrawer from '@/components/AppDrawer/index.vue'
import AppTabs from '@/components/AppTabs/index.vue'
import { useNarrowScreen } from '@/composables/useNarrowScreen'
import { useUserStore } from '@/stores/user'
import { confirmAction } from '@/utils/modal'
import { cancelDelivery, executeDelivery, retryDelivery } from '@/api/network/delivery'
import { useDetail } from './use-detail'
import { deviceName, retryRequestKey } from './form'
import { errorKeys, statusColors } from './presentation'
import { vInputLabel } from '../shared/input-label'

defineOptions({ name: 'DeliveryDetail' })
const props = defineProps<{ visible: boolean, id?: number, ready: boolean }>()
const emit = defineEmits<{ 'update:visible': [boolean], edit: [number], changed: [], open: [number] }>()
const { t } = useI18n()
const narrow = useNarrowScreen()
const user = useUserStore()
const { order, target, selectedId, loading, refreshing, failed, targetLoading, targetFailed, polling, refresh, loadTarget } = useDetail(toRef(props, 'id'), toRef(props, 'visible'))
const busy = ref(false)
const actionFailed = ref(false)
const tab = ref('output')
const allowed = (value: string) => user.permisaction.some(p => p === '*:*:*' || p === `network:delivery:${value}`)
const time = (value?: string) => value ? new Date(value).toLocaleString() : '—'
function close() { if (!busy.value) emit('update:visible', false) }
watch(() => props.id, () => { actionFailed.value = false; tab.value = 'output' })
watch(() => user.token, () => emit('update:visible', false))
async function action(kind: 'execute' | 'cancel' | 'retry') {
  const record = order.value
  if (!record || busy.value || failed.value || !allowed(kind)) return
  const session = user.token
  busy.value = true; actionFailed.value = false
  try {
    try { await confirmAction({ title: t(`networkDelivery.${kind === 'retry' ? 'retryConfirm' : `${kind}Confirm`}`), content: t(`networkDelivery.${kind === 'retry' ? 'retryHelp' : `${kind}Help`}`, { name: record.title || record.requestNo, count: record.deviceCount }), okText: t(`networkDelivery.${kind === 'retry' ? 'retryFailed' : kind}`) }) } catch { return }
    if (!props.visible || props.id !== record.id || user.token !== session || !allowed(kind)) return
    const response = kind === 'execute' ? await executeDelivery(record.id, record.version) : kind === 'cancel' ? await cancelDelivery(record.id, record.version) : await retryDelivery(record.id, record.version, retryRequestKey(record))
    if (session !== user.token || props.id !== record.id || !props.visible) return
    emit('changed')
    if (kind === 'retry') emit('open', response.data.id)
    else await refresh()
  } catch { if (session === user.token && props.visible) { actionFailed.value = true; await refresh() } } finally { busy.value = false }
}
</script>
