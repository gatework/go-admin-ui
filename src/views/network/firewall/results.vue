<template>
  <section>
    <Notices :items="result.issues" /><a-alert
      v-if="!result.complete"
      type="warning"
    >{{ t('networkFirewall.partialResult') }}</a-alert><a-empty v-if="!result.items?.length" /><a-card
      v-for="(item, index) in result.items"
      :key="`${item.rowKey}-${item.instanceId}-${index}`"
      class="fw-section"
    >
      <div class="fw-section-title">
        <div>
          <h3>{{ item.rowKey }} · {{ item.instanceName || `#${item.instanceId}` }}</h3>
          <StateTag :value="item.status" />
        </div>
      </div><a-descriptions
        :column="narrow ? 1 : 2"
        bordered
      ><a-descriptions-item
        v-for="field in ['revision', 'scope', 'routingScope', 'fromZone', 'toZone', 'hitSide', 'basis'] as const"
        :key="field"
        :label="t(`networkFirewall.${field}`)"
      >{{ ['hitSide', 'basis'].includes(field) ? valueLabel(item[field]) : item[field] || '—' }}</a-descriptions-item><a-descriptions-item
        :label="t('networkFirewall.policyView')"
      >{{ valueLabel(item.policyView) }}</a-descriptions-item><a-descriptions-item :label="t('networkFirewall.packetStatus')">
        <StateTag :value="item.packetStatus || 'unknown'" />
      </a-descriptions-item></a-descriptions>
      <Notices :items="item.issues" />
      <AppTabs :default-active-key="'allowed'"><a-tab-pane
        v-for="partition in partitions"
        :key="partition"
        :title="`${t(`networkFirewall.${partition}`)} (${item[partition]?.length || 0})`"
      >
        <p
          v-if="partition !== 'original' && partition !== 'packetUnknown'"
          class="fw-muted"
        >{{ t('networkFirewall.policyViewHelp') }}</p>
        <Traffic :items="item[partition]" />
      </a-tab-pane><a-tab-pane
        key="trace"
        :title="t('networkFirewall.trace')"
      >
        <section
          v-for="trace in item.trace"
          :key="trace.id"
          class="fw-row"
        >
          <p><strong>{{ trace.name || trace.id }}</strong> · {{ trace.action }} · {{ t('networkFirewall.certain') }}:
            {{ yes(trace.certain) }}</p>
          <Traffic :items="trace.traffic" />
        </section>
      </a-tab-pane><a-tab-pane
        key="nat"
        :title="t('networkFirewall.nat')"
      >
        <section
          v-for="(nat, natIndex) in item.nat"
          :key="natIndex"
          class="fw-row"
        >
          <p><strong v-if="nat.id">{{ nat.id }} · </strong>{{ valueLabel(nat.kind) }} · {{ t('networkFirewall.certain') }}:
            {{ yes(nat.exact) }} · {{ t('networkFirewall.possibleAllocation') }}: {{ yes(nat.possibleAllocation) }}</p>
          <ol v-if="nat.steps?.length">
            <li
              v-for="(step, stepIndex) in nat.steps"
              :key="stepIndex"
            >{{ step.id }} · {{ valueLabel(step.kind) }} · {{ t(step.reverse ? 'networkFirewall.reverse' : 'networkFirewall.forward') }}
            </li>
          </ol>
          <h4>{{ t('networkFirewall.original') }}</h4>
          <Traffic :items="nat.original" />
          <h4>{{ t('networkFirewall.translated') }}</h4>
          <Traffic :items="nat.translated" />
        </section>
      </a-tab-pane></AppTabs>
    </a-card>
  </section>
</template>
<script setup lang="ts">
defineOptions({ name: 'FirewallResults' })
import { useI18n } from 'vue-i18n'
import { useNarrowScreen } from '@/composables/useNarrowScreen'
import AppTabs from '@/components/AppTabs/index.vue'
import type { AnalysisResult } from '@/types/firewall'
import Traffic from './traffic.vue'
import StateTag from './state-tag.vue'
import Notices from './notices.vue'
defineProps<{ result: AnalysisResult }>(); const { t, te } = useI18n(); const narrow = useNarrowScreen(); const yes = (value: boolean) => t(value ? 'networkFirewall.yes' : 'networkFirewall.no')
const valueLabel = (value: string) => te(`networkFirewall.values.${value}`) ? t(`networkFirewall.values.${value}`) : value || '—'
const partitions = ['allowed', 'denied', 'unmatched', 'unknown', 'original', 'packetUnknown'] as const
</script>
