<template>
  <PageContainer>
    <ProTable
      :table="table"
      selection
      row-key="id"
      :actions-width="90"
    >
      <template #search>
        <!--
          First, and two columns wide. A datetime range needs about 340px, half
          of a row; declaring it first is what keeps it on screen when the panel
          is collapsed, and on an audit log the time range is the filter people
          come here to use.
        -->
        <a-form-item :label="$t('admin.sysOperLog.operTime')" class="is-wide">
          <a-range-picker
            v-model="operatedBetween"
            show-time
            :placeholder="[$t('admin.sysOperLog.startDate'), $t('admin.sysOperLog.endDate')]"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </a-form-item>
        <a-form-item :label="$t('admin.sysOperLog.operUrl')">
          <a-input
            v-model="table.query.operUrl"
            :placeholder="$t('admin.sysOperLog.operUrlPlaceholder')"
            allow-clear
          />
        </a-form-item>
        <a-form-item :label="$t('admin.sysOperLog.status')">
          <a-select
            v-model="table.query.status"
            :placeholder="$t('admin.sysOperLog.statusPlaceholder')"
            allow-clear
          >
            <a-option
              v-for="item in sys_common_status"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </a-select>
        </a-form-item>
      </template>

      <template #toolbar>
        <a-button
          v-permisaction="['admin:sysOperLog:remove']"
          status="danger"
          :disabled="table.multiple"
          @click="remove(table.selectedIds)"
        >{{ $t('common.delete') }}</a-button>
        <a-button v-permisaction="['admin:sysOperLog:remove']" status="danger" @click="handleClean">
          {{ $t('admin.sysOperLog.clean') }}
        </a-button>
        <a-button v-permisaction="['admin:sysOperLog:export']" :loading="exporting" @click="handleExport">
          {{ $t('common.export') }}
        </a-button>
      </template>

      <a-table-column :title="$t('admin.sysOperLog.operId')" data-index="id" :width="80" />
      <a-table-column
        :title="$t('admin.sysOperLog.request')"
        data-index="operUrl"
        :width="220"
        ellipsis
        tooltip
      >
        <template #cell="{ record: row }">
          <a-popover trigger="hover" position="top">
            <span>
              <MethodTag :method="row.requestMethod" />
              {{ row.operUrl }}
            </span>
            <template #content>
              <p class="peek-line">{{ $t('admin.sysOperLog.peekHost', { value: row.operIp }) }}</p>
              <p class="peek-line">{{ $t('admin.sysOperLog.peekLocation', { value: row.operLocation || '-' }) }}</p>
              <p class="peek-line">{{ $t('admin.sysOperLog.peekLatency', { value: row.latencyTime || '-' }) }}</p>

            </template></a-popover>
        </template>
      </a-table-column>
      <a-table-column
        :title="$t('admin.sysOperLog.operName')"
        data-index="operName"
        :width="130"
        ellipsis
        tooltip
      />
      <a-table-column :title="$t('admin.sysOperLog.status')" data-index="status" :width="90">
        <template #cell="{ record: row }">
          <a-tag :color="Number(row.status) === 2 ? 'green' : 'red'">
            {{ dictLabel(sys_common_status, row.status) }}
          </a-tag>
        </template>
      </a-table-column>
      <!-- prop is createdAt because createdAtOrder is the only order key
           SysOperaLogOrder binds; see the same column on the login log page -->
      <a-table-column
        :title="$t('admin.sysOperLog.operDate')"
        data-index="createdAt"
        :width="150"
        :sortable="{ sortDirections: ['ascend', 'descend'], defaultSortOrder: 'descend' }"
      >
        <template #cell="{ record: row }"><DateCell :value="row.operTime" pattern="{y}-{m}-{d} {h}:{i}" /></template>
      </a-table-column>

      <template #actions="{ row }">
        <a-button v-permisaction="['admin:sysOperLog:query']" type="text" @click="openDetail(row)">
          {{ $t('admin.sysOperLog.detail') }}
        </a-button>
      </template>
    </ProTable>

    <AppModal
      v-model:visible="detailOpen"
      :title="$t('admin.sysOperLog.detailTitle')"
      width="720px"
      :mask-closable="false"
    >
      <a-descriptions :column="2" bordered>
        <a-descriptions-item :label="$t('admin.sysOperLog.detailUrl')" :span="2">
          {{ detail.operUrl }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('admin.sysOperLog.loginInfo')">
          {{ detail.operName }} / {{ detail.operIp }} / {{ detail.operLocation || '-' }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('admin.sysOperLog.requestMethod')">
          {{ detail.requestMethod }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('admin.sysOperLog.latency')">
          {{ detail.latencyTime || '-' }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('admin.sysOperLog.operTime')">
          {{ parseTime(detail.operTime) || '-' }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('admin.sysOperLog.module')">
          {{ detail.title || '-' }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('admin.sysOperLog.operStatus')">
          <a-tag :color="Number(detail.status) === 2 ? 'green' : 'red'">
            {{ dictLabel(sys_common_status, detail.status) }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item :label="$t('admin.sysOperLog.operParam')" :span="2">
          <pre class="log-payload">{{ detail.operParam || '-' }}</pre>
        </a-descriptions-item>
        <a-descriptions-item :label="$t('admin.sysOperLog.jsonResult')" :span="2">
          <pre class="log-payload">{{ detail.jsonResult || '-' }}</pre>
        </a-descriptions-item>
      </a-descriptions>
      <template #footer>
        <a-button @click="detailOpen = false">{{ $t('admin.sysOperLog.dialogClose') }}</a-button>
      </template>
    </AppModal>
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { confirmAction } from '@/utils/modal'

import AppModal from '@/components/AppModal/index.vue'
import PageContainer from '@/components/PageContainer/index.vue'
import ProTable from '@/components/ProTable/index.vue'
import DateCell from '@/components/DateCell/index.vue'
import MethodTag from '@/components/MethodTag/index.vue'
import { useTable, useRemove, useDict, useExport, dictLabel } from '@/composables'
import { msgSuccess } from '@/utils/message'
import { parseTime } from '@/utils/costum'

import { listSysOperlog, delSysOperlog, cleanOperlog } from '@/api/admin/sys-opera-log'
import type { SysOperaLog, SysOperaLogQuery } from '@/types/admin'

// Must match the menu_name the backend serves, or keep-alive silently misses
defineOptions({ name: 'OperLog' })

const { t } = useI18n()

// sys_oper_type has no column of its own -- the table shows 模块 instead --
// but the export has always carried the field, and carried it as the raw 1/2/3
// the backend stores. Fetched here so the sheet can say what the number means.
const { sys_common_status, sys_oper_type } = useDict('sys_common_status', 'sys_oper_type')

const table = useTable<SysOperaLog, SysOperaLogQuery>({
  api: listSysOperlog,
  idKey: 'id',
  defaultSort: { prop: 'createdAt', order: 'descending' },
  defaultQuery: () => ({ operUrl: undefined, status: undefined, beginTime: undefined, endTime: undefined })
})

/**
 * The date picker's own state, mirrored into the query as the two keys the
 * endpoint reads.
 *
 * The previous version routed this through a global addDateRange helper that
 * read `this.dateRange` rather than the argument it was handed. It worked only
 * as a component method, and four of its five callers had no date picker at
 * all, so all it did there was attach two empty strings. It is gone now.
 */
const operatedBetween = computed<[string, string] | undefined>({
  get: () => {
    const { beginTime, endTime } = table.query
    // The annotation is load-bearing: an array literal widens to string[],
    // which the picker's tuple-shaped model does not accept
    return beginTime && endTime ? [beginTime, endTime] as [string, string] : undefined
  },
  set: range => {
    if (table.query.beginTime === range?.[0] && table.query.endTime === range?.[1]) return
    table.query.beginTime = range?.[0]
    table.query.endTime = range?.[1]
    void table.search()
  }
})

const { remove } = useRemove({
  api: delSysOperlog,
  // The count is both a named value and the plural choice: Chinese needs one
  // form, English needs two, and passing it twice lets each pack decide.
  confirmText: count => t('admin.sysOperLog.removeConfirm', { count }, count),
  onSuccess: () => table.getList()
})

/**
 * Empties the whole log, which is why it asks separately from a row delete.
 *
 * `cleaning` covers the dialog, not just the request: without it two fast clicks
 * stack two confirms and send two DELETEs once both are accepted -- the same
 * failure useRemove guards against. It is deliberately not the button's
 * `:loading`, which would only cover the request.
 */
let cleaning = false

const handleClean = async() => {
  if (cleaning) return
  cleaning = true
  try {
    // Every string read here rather than once at setup, so the box follows the
    // language even after the page has been sitting open -- the same reason
    // useRemove resolves its own four inside the call.
    await confirmAction({ content: t('admin.sysOperLog.cleanConfirm'), okText: t('admin.sysOperLog.clean') })
  } catch {
    cleaning = false
    return
  }
  try {
    await cleanOperlog()
    msgSuccess(t('admin.sysOperLog.cleanOk'))
    // search, not getList: the log is empty now, so whatever page the user was
    // on no longer exists
    await table.search()
  } catch {
    // Reported by the interceptor
  } finally {
    cleaning = false
  }
}

const detailOpen = ref(false)
const detail = ref<SysOperaLog>({})

const openDetail = (row: SysOperaLog) => {
  detail.value = row
  detailOpen.value = true
}

const { exportExcel, exporting } = useExport()

// Built on each click rather than once, so the sheet is written in the
// language the reader is in when they ask for it.
const handleExport = () => exportExcel({
  header: [
    t('admin.sysOperLog.exportHeader.operId'),
    t('admin.sysOperLog.exportHeader.module'),
    t('admin.sysOperLog.exportHeader.businessType'),
    t('admin.sysOperLog.exportHeader.operName'),
    t('admin.sysOperLog.exportHeader.operIp'),
    t('admin.sysOperLog.exportHeader.operLocation'),
    t('admin.sysOperLog.exportHeader.requestMethod'),
    t('admin.sysOperLog.exportHeader.operUrl'),
    t('admin.sysOperLog.exportHeader.status'),
    t('admin.sysOperLog.exportHeader.operDate')
  ],
  fields: ['id', 'title', 'businessType', 'operName', 'operIp', 'operLocation', 'requestMethod', 'operUrl', 'status', 'operTime'],
  // Dictionary-backed columns are resolved here rather than written as the
  // codes they are stored as. The sheet used to say 1 and 2 in the two columns
  // the table renders as 正常/关闭 and 新增/修改 -- readable on screen,
  // meaningless in the file, and the file is the half that gets sent on.
  rows: table.rows.map(row => ({
    ...row,
    businessType: dictLabel(sys_oper_type.value, row.businessType),
    status: dictLabel(sys_common_status.value, row.status)
  })) as Array<Record<string, unknown>>,
  filename: t('admin.sysOperLog.exportFilename')
})
</script>

<style lang="scss" scoped>
.log-payload {
  margin: 0;
  max-height: 160px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
</style>
