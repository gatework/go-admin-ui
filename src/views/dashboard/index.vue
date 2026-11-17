<template>
  <PageContainer class="overview" :title="t('dashboard.title')" :description="t('dashboard.description')">
    <template #actions>
      <a-button :loading="refreshing" @click="reload"><template #icon><icon-refresh /></template>{{ t('common.refresh') }}</a-button>
    </template>

    <a-result v-if="!modules.length" status="info" :title="t('dashboard.noModules')" :subtitle="t('dashboard.noModulesHelp')" />
    <template v-else>
      <StatStrip v-if="stats.length" :items="stats" />

      <div class="overview__panels">
        <a-card v-if="overview.fabric.available" :title="t('dashboard.fabric.title')" class="overview__panel">
          <template #extra><router-link class="link-type" :to="{ name: overview.fabric.route }">{{ t('dashboard.viewAll') }}</router-link></template>
          <PanelState :slice="overview.fabric" :empty="!overview.fabric.data?.regions.length" :empty-text="t('dashboard.fabric.empty')">
            <ul class="overview__list">
              <li v-for="region in overview.fabric.data?.regions.slice(0, PANEL_ROWS)" :key="region.id">
                <router-link class="overview__row" :to="{ name: overview.fabric.route, query: { fabric: region.id, tab: 'overview' }}">
                  <span class="overview__primary">{{ region.code }}</span>
                  <FabricState :value="region.state" />
                  <span class="overview__meta">{{ t('dashboard.fabric.coverage', { value: region.evidenceCoverage }) }}</span>
                  <span class="overview__meta" :class="{ 'is-warn': region.issueCount > 0 }">{{ t('dashboard.fabric.issues', { count: region.issueCount }) }}</span>
                </router-link>
              </li>
            </ul>
          </PanelState>
        </a-card>

        <a-card v-if="overview.delivery.available" :title="t('dashboard.delivery.title')" class="overview__panel">
          <template #extra><router-link class="link-type" :to="{ name: overview.delivery.route }">{{ t('dashboard.viewAll') }}</router-link></template>
          <PanelState :slice="overview.delivery" :empty="!overview.delivery.data?.recent.length" :empty-text="t('dashboard.delivery.empty')">
            <ul class="overview__list">
              <li v-for="order in overview.delivery.data?.recent" :key="order.id" class="overview__row">
                <span class="overview__primary" :title="order.title || order.requestNo">{{ order.title || order.requestNo }}</span>
                <StatusTag :value="order.status" namespace="networkDelivery.statuses" :tone="deliveryTone" />
                <span class="overview__meta">{{ t('dashboard.delivery.progress', { done: order.succeededCount, total: order.deviceCount }) }}</span>
                <span class="overview__meta"><DateCell :value="order.createdAt" /></span>
              </li>
            </ul>
          </PanelState>
        </a-card>
      </div>

      <section class="overview__modules" :aria-label="t('dashboard.modules')">
        <h2>{{ t('dashboard.modules') }}</h2>
        <div class="overview__module-grid">
          <router-link v-for="module in modules" :key="module.route" class="overview__module" :to="{ name: module.route }">
            <component :is="module.icon" class="overview__module-icon" />
            <span class="overview__module-copy">
              <strong>{{ t(module.title) }}</strong>
              <small>{{ t(module.description) }}</small>
            </span>
            <icon-right class="overview__module-caret" />
          </router-link>
        </div>
      </section>
    </template>
  </PageContainer>
</template>

<script setup lang="ts">
/**
 * The operations overview: what the network modules hold and what state they
 * are in, drawn only from endpoints those modules already expose.
 *
 * What appears follows the menu. A module this account cannot open is not
 * fetched and not drawn, so the page is as wide as the account's access and an
 * account with no network module sees a statement of that rather than zeros.
 */
import { computed, onMounted, ref, type Component } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { IconCommon, IconDesktop, IconMindMapping, IconSafe, IconSend, IconSwap, IconThunderbolt, IconWifi } from '@arco-design/web-vue/es/icon'
import DateCell from '@/components/DateCell/index.vue'
import PageContainer from '@/components/PageContainer/index.vue'
import StatStrip, { type StatItem } from '@/components/StatStrip/index.vue'
import StatusTag from '@/components/StatusTag/index.vue'
import FabricState from '@/views/network/fabric/state-tag.vue'
import { statusColors } from '@/views/network/delivery/presentation'
import { usePreferencesStore } from '@/stores/preferences'
import { preferenceTime } from '@/utils/preference-time'
import PanelState from './panel-state.vue'
import { useOverview, type Slice } from './use-overview'

defineOptions({ name: 'Dashboard' })

/** Rows a panel shows before "view all" takes over. */
const PANEL_ROWS = 6

interface ModuleEntry { route: string, title: string, description: string, icon: Component }
/** Every network module, in menu order. Titles and descriptions are the modules' own. */
const MODULES: ModuleEntry[] = [
  { route: 'NetworkDeviceManage', title: 'network.device.title', description: 'network.device.pageDescription', icon: IconDesktop },
  { route: 'NetworkCircuitManage', title: 'networkCircuit.title', description: 'networkCircuit.subtitle', icon: IconSwap },
  { route: 'NetworkFabricManage', title: 'networkFabric.title', description: 'networkFabric.description', icon: IconMindMapping },
  { route: 'NetworkWirelessManage', title: 'networkWireless.title', description: 'networkWireless.description', icon: IconWifi },
  { route: 'NetworkFirewallObjects', title: 'networkFirewall.title', description: 'networkFirewall.description', icon: IconSafe },
  { route: 'NetworkDeliveryManage', title: 'networkDelivery.title', description: 'networkDelivery.description', icon: IconSend },
  { route: 'NetworkDiagnostics', title: 'networkDiagnostics.title', description: 'networkDiagnostics.description', icon: IconThunderbolt }
]

const { t } = useI18n()
const router = useRouter()
const preferences = usePreferencesStore()
const { overview, refresh } = useOverview()
const refreshing = ref(false)

const modules = computed(() => MODULES.filter(module => router.hasRoute(module.route)))
const deliveryTone = (status: string) => statusColors[status as keyof typeof statusColors] ?? 'gray'

/** Fields every tile shares: where it links, and what it shows while loading or after failing. */
const tile = (key: string, slice: Slice<unknown>, label: string, icon: Component): StatItem => ({
  key,
  label,
  icon,
  to: { name: slice.route },
  loading: slice.loading && !slice.data,
  ...(slice.failed ? { hint: t('dashboard.unavailable'), tone: 'idle' as const } : {})
})

const stats = computed<StatItem[]>(() => {
  const items: StatItem[] = []
  const { device, circuit, fabric, wireless, delivery } = overview

  if (device.available) {
    const sync = device.data?.sync
    items.push({
      ...tile('device', device, t('dashboard.device.total'), IconDesktop),
      value: device.data?.total,
      ...(device.data ? { hint: t('dashboard.device.ungrouped', { count: device.data.ungrouped }) } : {})
    })
    items.push({
      ...tile('sync', device, t('dashboard.device.sync'), IconCommon),
      value: sync ? t(`dashboard.device.syncStates.${sync.configured ? sync.status : 'unconfigured'}`) : undefined,
      ...(sync
        ? {
          hint: sync.lastSuccessAt ? t('dashboard.device.lastSync', { time: preferenceTime(sync.lastSuccessAt, preferences.timeZone) ?? sync.lastSuccessAt }) : t('network.device.neverSynced'),
          tone: !sync.configured ? 'idle' as const : sync.status === 'failed' ? 'danger' as const : sync.status === 'running' ? 'info' as const : 'ok' as const
        }
        : {})
    })
  }
  if (circuit.available) {
    items.push({
      ...tile('circuit', circuit, t('dashboard.circuit.total'), IconSwap),
      value: circuit.data?.total,
      ...(circuit.data ? { hint: t('dashboard.circuit.monitored', { count: circuit.data.monitored }) } : {})
    })
  }
  if (fabric.available) {
    items.push({
      ...tile('fabric', fabric, t('dashboard.fabric.total'), IconMindMapping),
      value: fabric.data?.total,
      ...(fabric.data ? { hint: t('dashboard.fabric.withIssues', { count: fabric.data.withIssues }), ...(fabric.data.withIssues ? { tone: 'warn' as const } : {}) } : {})
    })
  }
  if (wireless.available) items.push({ ...tile('wireless', wireless, t('dashboard.wireless.controllers'), IconWifi), value: wireless.data?.controllers })
  if (delivery.available) items.push({ ...tile('delivery', delivery, t('dashboard.delivery.total'), IconSend), value: delivery.data?.total })
  return items
})

const reload = async() => {
  refreshing.value = true
  try { await refresh() } finally { refreshing.value = false }
}
onMounted(reload)
</script>

<style lang="scss" scoped>
.overview {
  &__panels {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr));
    gap: var(--motor-space-3);
    margin-top: var(--motor-space-3);
  }

  // Side by side, so the generic "card after card" top margin does not apply.
  &__panel { margin-top: 0; }

  &__list { padding: 0; margin: 0; list-style: none; }

  &__row {
    display: flex;
    min-height: 40px;
    align-items: center;
    gap: 12px;
    padding: 0 4px;
    border-bottom: 1px solid var(--motor-border-soft);
    color: inherit;
  }

  li:last-child > &__row,
  li:last-child#{&}__row { border-bottom: 0; }
  a#{&}__row:hover { background: var(--motor-surface-soft); }

  &__primary { min-width: 0; flex: 1; overflow: hidden; color: var(--motor-text-1); font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
  &__meta { flex-shrink: 0; color: var(--motor-text-3); font-size: var(--motor-font-size-12); font-variant-numeric: tabular-nums; &.is-warn { color: var(--motor-tone-warn); } }

  &__modules {
    margin-top: var(--motor-space-5);

    h2 { margin: 0 0 var(--motor-space-3); color: var(--motor-text-2); font-size: var(--motor-font-size-14); font-weight: 600; }
  }

  &__module-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: var(--motor-space-3); }

  &__module {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    border: 1px solid var(--motor-border-soft);
    border-radius: var(--motor-radius-sm);
    background: var(--motor-surface);
    color: inherit;
    transition: border-color var(--motor-duration), box-shadow var(--motor-duration);

    &:hover { border-color: var(--motor-primary); box-shadow: var(--motor-shadow-sm); }
  }

  &__module-icon { flex-shrink: 0; margin-top: 2px; color: var(--motor-primary); font-size: var(--motor-font-size-20); }
  &__module-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 4px; strong { color: var(--motor-text-1); font-weight: 600; } small { color: var(--motor-text-3); font-size: var(--motor-font-size-12); line-height: 1.6; } }
  &__module-caret { flex-shrink: 0; margin-top: 4px; color: var(--motor-text-3); }
}

@media (max-width: 767px) {
  .overview :deep(.stat-strip),
  .overview__panels,
  .overview__modules { padding-inline: 12px; }
  .overview__meta:last-child { display: none; }
}
</style>
