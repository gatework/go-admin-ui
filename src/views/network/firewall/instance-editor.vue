<template>
  <div><a-alert
    v-if="workspace.failed.value"
    type="warning"
  >{{ t('networkFirewall.loadFailed') }}</a-alert><a-form
    :ref="form.bindFormRef"
    :model="form.model"
    :rules="form.rules"
    layout="vertical"
    @submit-success="form.submit"
  >
    <AsideLayout v-if="!device" :title="t('network.device.groups.title')" :card="false" :width="220" collapse="stack">
      <template #aside><GroupPanel
        :data="groups"
        :selected="devices.query.groupId"
        :loading="workspace.loading.value"
        :failed="workspace.failed.value"
        read-only
        @select="selectGroup"
        @refresh="loadGroups"
      /></template>
      <ProTable
        :table="devices"
        :panels="false"
        row-key="id"
        :actions-width="90"
      ><template #search><a-form-item :label="t('networkFirewall.searchDevice')"><a-input
        v-model="devices.query.keyword"
        :input-attrs="{ 'aria-label': t('networkFirewall.searchDevice') }"
      /></a-form-item></template><a-table-column
        :title="t('networkFirewall.device')"
        data-index="name"
      /><a-table-column
        title="IP"
        data-index="ip"
      /><a-table-column
        :title="t('networkFirewall.vendor')"
        data-index="vendor"
      /><template #actions="{ row }"><a-button
        type="text"
        @click="choose(row)"
      >{{ t('networkFirewall.select') }}</a-button></template></ProTable>
    </AsideLayout><a-form-item
      field="deviceId"
      :label="t('networkFirewall.device')"
    ><a-input
      :model-value="selectedName"
      readonly
    /></a-form-item>
    <div class="fw-grid"><a-form-item
      field="vendor"
      :label="t('networkFirewall.vendor')"
    ><a-select
      v-model="form.model.vendor"
      :input-attrs="{ 'aria-label': t('networkFirewall.vendor') }"
    ><a-option
      v-for="vendor in options.vendors"
      :key="vendor"
      :value="vendor"
    >{{ vendor }}</a-option></a-select></a-form-item><a-form-item
      field="domainId"
      :label="t('networkFirewall.domain')"
    ><a-select v-model="form.model.domainId"><a-option
      v-for="domain in options.domains"
      :key="domain.id"
      :value="domain.id"
    >{{ domain.name }}</a-option></a-select></a-form-item><a-form-item :label="t('networkFirewall.mode')"><a-select
      v-model="form.model.mode"
    ><a-option value="routed">{{ t('networkFirewall.routed') }}</a-option><a-option
      value="transparent"
    >{{ t('networkFirewall.transparent') }}</a-option></a-select></a-form-item></div><a-form-item
      :label="t('networkFirewall.context')"
    ><a-input
      v-model="form.model.nativeContext"
      :input-attrs="{ 'aria-label': t('networkFirewall.context') }"
    /></a-form-item><p class="fw-muted">{{ t(form.model.vendor === 'fortinet' ? 'networkFirewall.online.vdomHelp' : 'networkFirewall.online.contextHelp') }}</p><a-button
      type="primary"
      :loading="form.submitting"
      html-type="submit"
    >{{ t('networkFirewall.save') }}</a-button>
  </a-form></div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useForm } from '@/composables/useForm'
import { useTable } from '@/composables/useTable'
import { listDeviceGroup } from '@/api/network/device'
import { addInstance, listFirewallDevices } from '@/api/network/firewall'
import type { DeviceGroupTree, DeviceQuery } from '@/types/network'
import type { FirewallDevice, Instance, InstanceInput, Options } from '@/types/firewall'
import AsideLayout from '@/components/AsideLayout/index.vue'
import GroupPanel from '../shared/group-panel.vue'
import ProTable from '@/components/ProTable/index.vue'
import { useWorkspace } from './workspace'
const props = defineProps<{ options: Options, device?: FirewallDevice }>(); const emit = defineEmits<{ saved: [value: Instance] }>(); const { t } = useI18n(); const workspace = useWorkspace()
const groups = ref<DeviceGroupTree>({ items: [], totalDeviceCount: 0, ungroupedDeviceCount: 0 }); const selectedName = ref('')
const devices = useTable<FirewallDevice, DeviceQuery>({ api: query => workspace.allowed('edit') ? workspace.guard(signal => listFirewallDevices(query, signal)) : Promise.reject(), defaultQuery: () => ({ keyword: '' }), idKey: 'id', pageSize: 5, immediate: !props.device })
const form = useForm<InstanceInput>({ defaultModel: () => ({ deviceId: 0, domainId: props.options.domains[0]?.id || 0, vendor: props.device?.connection.vendor || '', nativeContext: '', mode: 'routed' }), rules: computed(() => ({ deviceId: [{ validator: (value: number, callback: (error?: string) => void) => callback(value > 0 ? undefined : t('networkFirewall.chooseDevice')) }], vendor: [{ required: true, message: t('networkFirewall.vendor') }], domainId: [{ required: true, message: t('networkFirewall.domain') }] })), submit: async model => { if (!workspace.allowed('edit') || !workspace.current()) throw new Error('permission'); const result = await addInstance({ ...model }); if (workspace.current()) emit('saved', result.data) }, successMessage: null })
function choose(device: FirewallDevice) { form.model.deviceId = device.id; selectedName.value = `${device.name} · ${device.ip}`; form.model.vendor = device.connection.vendor; form.model.nativeContext = '' }

function selectGroup(groupId?: number) { devices.query.groupId = groupId; void devices.search() }
function loadGroups() { void workspace.read(signal => listDeviceGroup().then(value => { if (signal.aborted) throw new Error('aborted'); return value }), value => { groups.value = value.data }) }
onMounted(() => { if (props.device) choose(props.device); else loadGroups() })
</script>
