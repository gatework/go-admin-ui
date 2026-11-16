<template>
  <section>
    <p class="fw-muted">{{ t('networkFirewall.protectionHelp') }}</p>
    <a-alert
      v-if="workspace.failed.value"
      type="warning"
    >{{ t('networkFirewall.loadFailed') }}</a-alert>
    <a-button
      :loading="workspace.loading.value"
      @click="load"
    >{{ t('networkFirewall.reload') }}</a-button>
    <a-button v-if="canEdit && settings && coverage.length" class="fw-infer-zones" :disabled="workspace.pending.value" @click="inferZones">{{ t('networkFirewall.online.inferZones') }}</a-button>
    <a-alert v-if="inferred" type="info">{{ t('networkFirewall.online.inferHelp') }}</a-alert>
    <a-form
      v-if="settings"
      :model="settings"
      :disabled="!canEdit || workspace.pending.value"
      layout="vertical"
    >
      <section
        v-for="(binding, index) in settings.scopes"
        :key="index"
        class="fw-binding"
      >
        <div class="fw-grid">
          <a-form-item :label="t('networkFirewall.routingScope')">
            <a-input v-model="binding.routingScope" />
          </a-form-item>
          <a-form-item :label="t('networkFirewall.domain')">
            <a-select v-model="binding.domainId">
              <a-option
                v-for="domain in options.domains"
                :key="domain.id"
                :value="domain.id"
              >{{ domain.name }}</a-option>
            </a-select>
          </a-form-item>
        </div>
        <a-button
          v-if="canEdit"
          type="text"
          status="danger"
          @click="settings.scopes.splice(index, 1)"
        >{{ t('networkFirewall.remove') }}</a-button>
      </section>
      <a-button
        v-if="canEdit"
        @click="settings.scopes.push({ routingScope: '', domainId: instance.domainId })"
      >{{ t('networkFirewall.addScope') }}</a-button>
      <section
        v-for="(binding, index) in settings.zones"
        :key="index"
        class="fw-binding"
      >
        <div class="fw-grid">
          <a-form-item :label="t('networkFirewall.zone')">
            <a-input
              v-model="binding.zone"
              :input-attrs="{ 'aria-label': `${t('networkFirewall.zone')} ${index + 1}` }"
            />
          </a-form-item>
          <a-form-item :label="t('networkFirewall.scope')">
            <a-input v-model="binding.scope" />
          </a-form-item>
          <a-form-item :label="t('networkFirewall.routingScope')">
            <a-input v-model="binding.routingScope" />
          </a-form-item>
        </div>
        <a-form-item :label="t('networkFirewall.domain')">
          <a-select v-model="binding.domainId">
            <a-option :value="0">{{ t('networkFirewall.inheritDomain') }}</a-option>
            <a-option
              v-for="domain in options.domains"
              :key="domain.id"
              :value="domain.id"
            >{{ domain.name }}</a-option>
          </a-select>
        </a-form-item>
        <a-checkbox v-model="binding.protected">{{ t('networkFirewall.protected') }}</a-checkbox>
        <a-form-item :label="t('networkFirewall.networks')">
          <a-textarea
            :model-value="binding.networks.join('\n')"
            @update:model-value="value => binding.networks = value.split(/\s+/).filter(Boolean)"
          />
        </a-form-item>
        <a-button
          v-if="canEdit"
          type="text"
          status="danger"
          @click="settings.zones.splice(index, 1)"
        >{{ t('networkFirewall.remove') }}</a-button>
      </section>
      <a-space
        v-if="canEdit"
        wrap
      >
        <a-button @click="settings.zones.push(newZoneBinding())">{{ t('networkFirewall.addZone') }}</a-button>
        <a-button
          type="primary"
          :loading="workspace.pending.value"
          @click="save"
        >{{ t('networkFirewall.saveSettings') }}</a-button>
      </a-space>
    </a-form>
    <section class="fw-section">
      <h2>{{ t('networkFirewall.coverage') }}</h2>
      <a-table
        :data="coverage"
        :pagination="false"
        :scroll="{ x: 640 }"
      >
        <template #columns>
          <a-table-column
            v-for="field in ['zone', 'scope', 'routingScope', 'network', 'origin', 'revision']"
            :key="field"
            :title="t(`networkFirewall.${field}`)"
            :data-index="field"
          >
            <template #cell="{ record }">{{ field === 'origin' ? valueLabel(record.origin) : record[field] }}</template>
          </a-table-column>
          <a-table-column :title="t('networkFirewall.known')">
            <template #cell="{ record }">{{ t(record.known ? 'networkFirewall.yes' : 'networkFirewall.no') }}</template>
          </a-table-column>
        </template>
      </a-table>
    </section>
  </section>
</template>
<script setup lang="ts">
defineOptions({ name: 'FirewallProtection' })
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getSettings, getCoverage, saveSettings } from '@/api/network/firewall'
import type { Coverage, Instance, Options, Settings } from '@/types/firewall'
import { newZoneBinding } from './presentation'
import { inferredBindings } from './collection'
import { useWorkspace } from './workspace'
const props = defineProps<{ instance: Instance, options: Options, canEdit: boolean }>(); const emit = defineEmits<{ saved: [] }>(); const { t, te } = useI18n(); const workspace = useWorkspace(); const settings = ref<Settings>(); const coverage = ref<Coverage[]>([])
const inferred = ref(false)
function inferZones() { if (!settings.value || !props.canEdit || !workspace.allowed('edit')) return; settings.value.zones = inferredBindings(coverage.value, settings.value.zones); inferred.value = true }
const valueLabel = (value: string) => te(`networkFirewall.values.${value}`) ? t(`networkFirewall.values.${value}`) : value
function load() { void workspace.read(async signal => Promise.all([getSettings(props.instance.id, signal), getCoverage(props.instance.id, signal)]), ([value, networks]) => { settings.value = value.data; coverage.value = networks.data }) }
function save() { if (!settings.value || !props.canEdit || !workspace.allowed('edit')) return; const copy: Settings = { version: settings.value.version, zones: settings.value.zones.map(item => ({ ...item, networks: [...item.networks] })), scopes: settings.value.scopes.map(item => ({ ...item })) }; void workspace.write(() => saveSettings(props.instance.id, copy), value => { settings.value = value.data; emit('saved'); load() }) }
onMounted(load)
</script>
