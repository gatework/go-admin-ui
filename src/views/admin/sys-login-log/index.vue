<template>
  <PageContainer>
    <ProTable
      :table="table"
      selection
      row-key="id"
      :actions-width="90"
    >
      <template #search>
        <a-form-item :label="$t('admin.sysLoginLog.username')">
          <a-input
            v-model="table.query.username"
            :placeholder="$t('admin.sysLoginLog.usernamePlaceholder')"
            allow-clear
          />
        </a-form-item>
        <a-form-item :label="$t('admin.sysLoginLog.status')">
          <a-select
            v-model="table.query.status"
            :placeholder="$t('admin.sysLoginLog.statusPlaceholder')"
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
        <a-form-item :label="$t('admin.sysLoginLog.ipaddr')">
          <a-input
            v-model="table.query.ipaddr"
            :placeholder="$t('admin.sysLoginLog.ipaddrPlaceholder')"
            allow-clear
          />
        </a-form-item>
      </template>

      <template #toolbar>
        <a-button
          v-permisaction="['admin:sysLoginLog:remove']"
          status="danger"
          :disabled="table.multiple"
          @click="remove(table.selectedIds)"
        >{{ $t('common.delete') }}</a-button>
      </template>

      <a-table-column
        :title="$t('admin.sysLoginLog.username')"
        data-index="username"
        :width="110"
        ellipsis
        tooltip
      />
      <a-table-column
        :title="$t('admin.sysLoginLog.msg')"
        data-index="msg"
        :width="120"
        ellipsis
        tooltip
      />
      <a-table-column :title="$t('admin.sysLoginLog.status')" data-index="status" :width="90">
        <template #cell="{ record: row }">
          <a-tag :color="Number(row.status) === 2 ? 'green' : 'red'">
            {{ dictLabel(sys_common_status, row.status) }}
          </a-tag>
        </template>
      </a-table-column>
      <a-table-column :title="$t('admin.sysLoginLog.ipaddr')" data-index="ipaddr" :width="130">
        <template #cell="{ record: row }">
          <a-popover trigger="hover" position="top"><span>{{ row.ipaddr }}</span><template #content>
            <p class="peek-line">{{ $t('admin.sysLoginLog.peekLocation', { value: row.loginLocation || '-' }) }}</p>
            <p class="peek-line">{{ $t('admin.sysLoginLog.peekBrowser', { value: row.browser || '-' }) }}</p>
            <p class="peek-line">{{ $t('admin.sysLoginLog.peekOs', { value: row.os || '-' }) }}</p>
            <p class="peek-line">{{ $t('admin.sysLoginLog.peekPlatform', { value: row.platform || '-' }) }}</p>

          </template></a-popover>
        </template>
      </a-table-column>
      <!--
        prop is createdAt, not loginTime: createdAtOrder is the only order key
        SysLoginLogOrder binds, and useTable derives the key from the prop the
        header reports. Sorting on loginTime would send loginTimeOrder, which gin
        drops -- and useTable would have dropped createdAtOrder to make room,
        leaving the request with no ordering at all. min-width follows the
        measurement in CLAUDE.md: a sortable header plus `2026-08-01 14:00` needs
        about 141px, or the cells wrap.
      -->
      <a-table-column
        :title="$t('admin.sysLoginLog.loginTime')"
        data-index="createdAt"
        :width="150"
        :sortable="{ sortDirections: ['ascend', 'descend'], defaultSortOrder: 'descend' }"
      >
        <template #cell="{ record: row }"><DateCell :value="row.loginTime" pattern="{y}-{m}-{d} {h}:{i}" /></template>
      </a-table-column>

      <template #actions="{ row }">
        <a-button v-permisaction="['admin:sysLoginLog:remove']" status="danger" type="text" @click="remove(row.id)">
          {{ $t('common.delete') }}
        </a-button>
      </template>
    </ProTable>
  </PageContainer>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import PageContainer from '@/components/PageContainer/index.vue'
import ProTable from '@/components/ProTable/index.vue'
import DateCell from '@/components/DateCell/index.vue'
import { useTable, useRemove, useDict, dictLabel } from '@/composables'

import { listSysLoginlog, delSysLoginlog } from '@/api/admin/sys-login-log'
import type { SysLoginLog, SysLoginLogQuery } from '@/types/admin'

// Must match the menu_name the backend serves, or keep-alive silently misses
defineOptions({ name: 'SysLoginLogManage' })

const { t } = useI18n()

const { sys_common_status } = useDict('sys_common_status')

/**
 * An audit trail: read and delete, nothing writes it. No useForm here, which is
 * why this page is a third of the size of the ones that edit records.
 *
 * The previous version passed its query through a global addDateRange helper
 * that read `this.dateRange` rather than its own argument. This page has no date
 * picker at all, so all it contributed was an empty beginTime and endTime on
 * every request. The helper is gone now.
 */
const table = useTable<SysLoginLog, SysLoginLogQuery>({
  api: listSysLoginlog,
  idKey: 'id',
  defaultSort: { prop: 'createdAt', order: 'descending' },
  defaultQuery: () => ({ username: undefined, status: undefined, ipaddr: undefined })
})

const { remove } = useRemove({
  api: delSysLoginlog,
  // The count is both a named value and the plural choice: Chinese needs one
  // form, English needs two, and passing it twice lets each pack decide.
  confirmText: count => t('admin.sysLoginLog.removeConfirm', { count }, count),
  onSuccess: () => table.getList()
})
</script>
