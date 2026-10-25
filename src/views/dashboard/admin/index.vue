<template>
  <div class="dashboard-editor-container">
    <a-row :gutter="12">
      <a-col :sm="24" :xs="24" :md="6" :xl="6" :lg="6" :style="{ marginBottom: '12px' }">
        <chart-card :title="$t('dashboard.sales.title')" total="￥126,560" color="#1677ff">
          <template #icon><i class="ri-money-dollar-circle-line" /></template>
          <template #action>
            <a-tooltip class="item" :content="$t('dashboard.metricHelp')" position="tl">
              <i class="ri-error-warning-line" />
            </a-tooltip>
          </template>
          <div>
            <trend flag="top" style="margin-right: 16px;" rate="12">
              <template #term><span>{{ $t('dashboard.sales.weekOnWeek') }}</span></template>
            </trend>
            <trend flag="bottom" rate="11">
              <template #term><span>{{ $t('dashboard.sales.dayOnDay') }}</span></template>
            </trend>
          </div>
          <template #footer>{{ $t('dashboard.sales.dailyAverage') }}<span>￥ 234.56</span></template>
        </chart-card>
      </a-col>

      <a-col :sm="24" :xs="24" :md="6" :xl="6" :lg="6" :style="{ marginBottom: '12px' }">
        <chart-card :title="$t('dashboard.visits.title')" :total="8846" color="#52c41a">
          <template #icon><i class="ri-group-line" /></template>
          <template #action>
            <a-tooltip class="item" :content="$t('dashboard.metricHelp')" position="tl">
              <i class="ri-error-warning-line" />
            </a-tooltip>
          </template>
          <div>
            <mini-area />
          </div>
          <template #footer>{{ $t('dashboard.visits.daily') }}<span>{{ '1234' }}</span></template>
        </chart-card>
      </a-col>

      <a-col :sm="24" :xs="24" :md="6" :xl="6" :lg="6" :style="{ marginBottom: '12px' }">
        <chart-card :title="$t('dashboard.payments.title')" :total="6560" color="#fa8c16">
          <template #icon><i class="ri-bank-card-line" /></template>
          <template #action>
            <a-tooltip class="item" :content="$t('dashboard.metricHelp')" position="tl">
              <i class="ri-error-warning-line" />
            </a-tooltip>
          </template>
          <div>
            <mini-bar />
          </div>
          <template #footer>{{ $t('dashboard.payments.conversion') }}<span>60%</span></template>
        </chart-card>
      </a-col>

      <a-col :sm="24" :xs="24" :md="6" :xl="6" :lg="6" :style="{ marginBottom: '12px' }">
        <chart-card :title="$t('dashboard.campaign.title')" total="78%" color="#722ed1">
          <template #icon><i class="ri-bar-chart-box-line" /></template>
          <template #action>
            <a-tooltip class="item" :content="$t('dashboard.metricHelp')" position="tl">
              <i class="ri-error-warning-line" />
            </a-tooltip>
          </template>
          <div>
            <mini-progress :target="80" :percent="(78) / 100" height="8px" />
          </div>
          <template #footer>
            <trend flag="top" style="margin-right: 8px;" rate="12">
              <template #term><span>{{ $t('dashboard.campaign.weekComparison') }}</span></template>
            </trend>
            <trend flag="bottom" rate="80">
              <template #term><span>{{ $t('dashboard.campaign.dayOverDay') }}</span></template>
            </trend>
          </template>
        </chart-card>
      </a-col>
    </a-row>

    <a-card :bordered="false" :body-style="{ padding: '0' }">
      <div class="salesCard">
        <AppTabs>
          <a-tab-pane :key="$t('dashboard.tabs.sales')" :title="$t('dashboard.tabs.sales')">
            <a-row>
              <a-col :xl="16" :lg="12" :md="12" :sm="24" :xs="24">
                <bar :list="barData" :title="$t('dashboard.charts.salesRanking')" />
              </a-col>
              <a-col :xl="8" :lg="12" :md="12" :sm="24" :xs="24">
                <rank-list :title="$t('dashboard.charts.storeRanking')" :list="rankList" />
              </a-col>
            </a-row>
          </a-tab-pane>
          <a-tab-pane :key="$t('dashboard.visits.title')" :title="$t('dashboard.visits.title')">
            <a-row>
              <a-col :xl="16" :lg="12" :md="12" :sm="24" :xs="24">
                <bar :list="barData2" :title="$t('dashboard.charts.salesTrend')" />
              </a-col>
              <a-col :xl="8" :lg="12" :md="12" :sm="24" :xs="24">
                <rank-list :title="$t('dashboard.charts.storeRanking')" :list="rankList" />
              </a-col>
            </a-row>
          </a-tab-pane>
        </AppTabs>
      </div>
    </a-card>
  </div>
</template>

<script>
import AppTabs from '@/components/AppTabs/index.vue'
import ChartCard from '@/components/ChartCard'
import Trend from '@/components/Trend'
import MiniArea from '@/components/MiniArea'
import MiniBar from '@/components/MiniBar'
import MiniProgress from '@/components/MiniProgress'
import RankList from '@/components/RankList/index'
import Bar from '@/components/Bar.vue'

/**
 * The demo figures, drawn once at module scope.
 *
 * Only the labels are translated, so the values stay out of the computed
 * properties below: rebuilding them there would reroll every bar and reorder
 * the ranking each time the language changed.
 */
const barValues = []
const barValues2 = []
for (let i = 0; i < 12; i += 1) {
  barValues.push(Math.floor(Math.random() * 1000) + 200)
  barValues2.push(Math.floor(Math.random() * 1000) + 200)
}

const rankTotals = []
for (let i = 0; i < 7; i++) {
  rankTotals.push(1234.56 - i * 100)
}

export default {
  name: 'DashboardAdmin',
  components: { AppTabs, ChartCard, Trend, MiniArea, MiniBar, MiniProgress, RankList, Bar },
  computed: {
    barData() {
      return barValues.map((y, i) => ({ x: this.$t('dashboard.charts.month', { n: i + 1 }), y }))
    },
    barData2() {
      return barValues2.map((y, i) => ({ x: this.$t('dashboard.charts.month', { n: i + 1 }), y }))
    },
    rankList() {
      return rankTotals.map((total, i) => ({ name: this.$t('dashboard.charts.store', { n: i + 1 }), total }))
    }
  }
}
</script>

<style lang="scss" scoped>
.dashboard-editor-container {
  padding: 12px;
  // The page's own plane, so it has to be the page's own colour. This was
  // #f0f2f5, which stayed light under the dark scheme and put every card on
  // this page on a white sheet.
  background-color: var(--ga-bg-body);
  position: relative;
}

:deep(.a-tabs__item) {
  padding-left: 16px !important;
  height: 50px;
  line-height: 50px;
}

@media (max-width: 1024px) {
  .chart-wrapper {
    padding: 8px;
  }
}
</style>
