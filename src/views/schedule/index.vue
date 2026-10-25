<template>
  <PageContainer>
    <ProTable :table="table" selection row-key="jobId" :actions-width="150">
      <template #search>
        <a-form-item :label="$t('schedule.name')">
          <a-input
            v-model="table.query.jobName"
            :placeholder="$t('schedule.namePlaceholder')"
            allow-clear
          />
        </a-form-item>
        <a-form-item :label="$t('schedule.jobGroup')">
          <a-select
            v-model="table.query.jobGroup"
            :placeholder="$t('schedule.jobGroup')"
            allow-clear
          >
            <a-option v-for="item in sys_job_group" :key="item.value" :label="item.label" :value="item.value" />
          </a-select>
        </a-form-item>
        <a-form-item :label="$t('schedule.status')">
          <a-select
            v-model="table.query.status"
            :placeholder="$t('schedule.statusPlaceholder')"
            allow-clear
          >
            <a-option v-for="item in sys_job_status" :key="item.value" :label="item.label" :value="item.value" />
          </a-select>
        </a-form-item>
      </template>

      <template #toolbar>
        <a-button v-permisaction="['job:sysJob:add']" type="primary" @click="form.openCreate()">
          {{ $t('common.add') }}
        </a-button>
        <a-button
          v-permisaction="['job:sysJob:remove']"
          status="danger"
          :disabled="table.multiple"
          @click="remove(table.selectedIds)"
        >{{ $t('common.delete') }}</a-button>
        <a-button v-permisaction="['job:sysJob:log']" @click="openLog">{{ $t('schedule.log') }}</a-button>
      </template>

      <a-table-column :title="$t('schedule.jobId')" data-index="jobId" :width="80" />
      <a-table-column :title="$t('schedule.name')" data-index="jobName" :width="140" ellipsis tooltip />
      <a-table-column :title="$t('schedule.group')" data-index="jobGroup" :width="90">
        <template #cell="{ record: row }">{{ dictLabel(sys_job_group, row.jobGroup) }}</template>
      </a-table-column>
      <a-table-column
        :title="$t('schedule.cronExpression')"
        data-index="cronExpression"
        :width="140"
        ellipsis
        tooltip
      />
      <a-table-column
        :title="$t('schedule.invokeTarget')"
        data-index="invokeTarget"
        :width="180"
        ellipsis
        tooltip
      >
        <template #cell="{ record: row }">
          <a-popover trigger="hover" position="top" :content-style="{ maxWidth: '320px' }"><template #content>
            <p class="peek-line">{{ $t('schedule.peekArgs', { value: row.args || $t('schedule.none') }) }}</p>
            <p class="peek-line">
              {{ $t('schedule.peekJobType', {
                value: Number(row.jobType) === 1 ? $t('schedule.jobTypeApi') : $t('schedule.jobTypeFunc')
              }) }}
            </p>
            <p class="peek-line">
              {{ $t('schedule.peekMisfire', { value: MISFIRE[Number(row.misfirePolicy)] ?? '-' }) }}
            </p>
            <p class="peek-line">
              {{ $t('schedule.peekConcurrent', {
                value: Number(row.concurrent) === 0 ? $t('schedule.allow') : $t('schedule.forbid')
              }) }}
            </p>
          </template><template #default><span>{{ row.invokeTarget }}</span></template>
          </a-popover>
        </template>
      </a-table-column>
      <a-table-column :title="$t('schedule.status')" data-index="status" :width="90">
        <template #cell="{ record: row }">
          <a-tag :color="Number(row.status) === 2 ? 'green' : 'red'">
            {{ dictLabel(sys_job_status, String(row.status)) }}
          </a-tag>
        </template>
      </a-table-column>

      <template #actions="{ row }">
        <a-button v-permisaction="['job:sysJob:edit']" type="text" @click="form.openEdit(row)">
          {{ $t('common.edit') }}
        </a-button>
        <!--
          entry_id is the handle cron gives a scheduled job, so zero means it is
          not running. A disabled job (status 1) can be neither started nor
          stopped, which is why both buttons check it.
        -->
        <a-button
          v-if="Number(row.entry_id) !== 0 && Number(row.status) !== 1"
          v-permisaction="['job:sysJob:remove']"

          type="text"
          @click="toggle(row, 'stop')"
        >{{ $t('schedule.stop') }}</a-button>
        <a-button
          v-else-if="Number(row.entry_id) === 0 && Number(row.status) !== 1"
          v-permisaction="['job:sysJob:start']"

          type="text"
          @click="toggle(row, 'start')"
        >{{ $t('schedule.start') }}</a-button>
        <!-- Icon rather than the words, per the two-button rule -->
        <a-button
          v-permisaction="['job:sysJob:remove']"
          status="danger"
          class="row-icon-action"
          :title="$t('schedule.deleteTitle', { name: row.jobName })"
          type="text"
          @click="remove(row.jobId)"
        >
          <icon-delete />
        </a-button>
      </template>
    </ProTable>

    <AppModal v-model:visible="form.visible" :title="form.title" width="700px" :mask-closable="false">
      <a-form :ref="form.bindFormRef" :model="form.model" :rules="form.rules" layout="vertical">
        <a-row :gutter="16">
          <a-col :xs="24" :sm="12">
            <a-form-item :label="$t('schedule.name')" field="jobName">
              <a-input v-model="form.model.jobName" :placeholder="$t('schedule.name')" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12">
            <a-form-item :label="$t('schedule.jobGroup')" field="jobGroup">
              <a-select
                v-model="form.model.jobGroup"
                :placeholder="$t('common.selectPlaceholder')"
                style="width: 100%"
              >
                <a-option v-for="item in sys_job_group" :key="item.value" :label="item.label" :value="item.value" />
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item field="invokeTarget">
              <template #label>
                <FieldLabel
                  :label="$t('schedule.invokeTarget')"
                  :tip="$t('schedule.invokeTargetTip')"
                />
              </template>
              <a-input v-model="form.model.invokeTarget" :placeholder="$t('schedule.invokeTarget')" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item field="args">
              <template #label>
                <FieldLabel
                  :label="$t('schedule.args')"
                  :tip="$t('schedule.argsTip')"
                />
              </template>
              <a-input v-model="form.model.args" :placeholder="$t('schedule.args')" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12">
            <a-form-item :label="$t('schedule.cronExpression')" field="cronExpression">
              <a-input v-model="form.model.cronExpression" :placeholder="$t('schedule.cronExpression')" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12">
            <a-form-item :label="$t('schedule.concurrent')" field="concurrent">
              <a-radio-group v-model="form.model.concurrent" type="button">
                <a-radio :value="0">{{ $t('schedule.allow') }}</a-radio>
                <a-radio :value="1">{{ $t('schedule.forbid') }}</a-radio>
              </a-radio-group>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12">
            <a-form-item :label="$t('schedule.jobType')" field="jobType">
              <a-radio-group v-model="form.model.jobType" type="button">
                <a-radio :value="1">{{ $t('schedule.jobTypeApi') }}</a-radio>
                <a-radio :value="2">{{ $t('schedule.jobTypeFunc') }}</a-radio>
              </a-radio-group>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12">
            <a-form-item :label="$t('schedule.status')" field="status">
              <a-select
                v-model="form.model.status"
                :placeholder="$t('common.selectPlaceholder')"
                style="width: 100%"
              >
                <a-option v-for="item in sys_job_status" :key="item.value" :label="item.label" :value="item.value" />
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item :label="$t('schedule.misfirePolicy')" field="misfirePolicy">
              <a-radio-group v-model="form.model.misfirePolicy" type="button">
                <a-radio v-for="(label, value) in MISFIRE" :key="value" :value="Number(value)">
                  {{ label }}
                </a-radio>
              </a-radio-group>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
      <template #footer>
        <a-button @click="form.close()">{{ $t('common.dialogCancel') }}</a-button>
        <a-button type="primary" :loading="form.submitting" @click="form.submit()">
          {{ $t('common.dialogConfirm') }}
        </a-button>
      </template>
    </AppModal>
  </PageContainer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { confirmAction } from '@/utils/modal'

import type { FormRules } from '@/types/ui'

import AppModal from '@/components/AppModal/index.vue'
import PageContainer from '@/components/PageContainer/index.vue'
import ProTable from '@/components/ProTable/index.vue'
import FieldLabel from '@/components/FieldLabel/index.vue'
import { STATUS_NORMAL } from '@/api/status'
import { useTable, useForm, useRemove, useDict, dictLabel } from '@/composables'
import { msgSuccess } from '@/utils/message'

import {
  listSysJob, getSysJobForForm, addSysJob, updateSysJob, delSysJob, removeJob, startJob
} from '@/api/job/sys-job'
import type { SysJob, SysJobQuery } from '@/types/admin'

// Must match the menu_name the backend serves, or keep-alive silently misses
defineOptions({ name: 'ScheduleManage' })

const { t } = useI18n()
const router = useRouter()
const { sys_job_group, sys_job_status } = useDict('sys_job_group', 'sys_job_status')

/**
 * What the scheduler does with a run it missed.
 *
 * Computed, not a plain object: the radio group and the hover card both read it
 * on every render, and a table already on screen has to follow a language
 * change without refetching.
 */
const MISFIRE = computed<Record<number, string>>(() => ({
  1: t('schedule.misfire.immediate'),
  2: t('schedule.misfire.once'),
  3: t('schedule.misfire.skip')
}))

const table = useTable<SysJob, SysJobQuery>({
  api: listSysJob,
  idKey: 'jobId',
  defaultQuery: () => ({ jobName: undefined, jobGroup: undefined, status: undefined })
})

/**
 * Rebuilt whenever the language changes.
 *
 * A plain object is evaluated once, at setup, so a message already rendered
 * under a field would keep the language the page was opened in -- and this page
 * is kept alive, so reopening the dialog does not re-run setup. useForm unwraps
 * the ref, so :rules="form.rules" is unchanged.
 */
const rules = computed<FormRules>(() => ({
  jobName: [{ required: true, message: t('schedule.rules.jobName') }],
  jobGroup: [{ required: true, message: t('schedule.rules.jobGroup') }],
  invokeTarget: [{ required: true, message: t('schedule.rules.invokeTarget') }],
  cronExpression: [{ required: true, message: t('schedule.rules.cronExpression') }]
}))

const form = useForm<SysJob, number>({
  defaultModel: () => ({
    jobId: undefined,
    jobName: undefined,
    jobGroup: 'DEFAULT',
    jobType: 2,
    cronExpression: undefined,
    invokeTarget: undefined,
    args: undefined,
    misfirePolicy: 1,
    concurrent: 0,
    status: STATUS_NORMAL
  }),
  idKey: 'jobId',
  rules,
  // Computed, not `t(...)` directly: useForm reads the option on every render,
  // so a string resolved here once would pin the dialog to the language the
  // page was opened in.
  title: {
    create: computed(() => t('schedule.addTitle')),
    edit: computed(() => t('schedule.editTitle'))
  },
  api: { get: getSysJobForForm, add: addSysJob, update: updateSysJob },
  onSuccess: () => table.getList()
})

const { remove } = useRemove({
  api: delSysJob,
  // A function, so the sentence is built when the dialog opens
  confirmText: count => t('schedule.deleteConfirm', { count }, count),
  onSuccess: () => table.getList()
})

/**
 * Start and stop share everything but a verb and an endpoint.
 *
 * `pending` covers the dialog rather than just the request: without it a
 * double-clicked button stacks two confirms and fires the job twice -- the
 * failure useRemove guards against, which a hand-rolled confirm has to guard
 * against too.
 */
let pending = false

const toggle = async(row: SysJob, action: 'start' | 'stop') => {
  if (pending) return
  pending = true
  // Two whole sentences rather than one with the verb interpolated. The verb
  // sits mid-sentence in Chinese and at the front in English, so a shared
  // template with a {verb} slot cannot be right in both. Both keys are spelled
  // out so tests/unit/lang/usage.spec.ts can see them.
  const question = action === 'start'
    ? t('schedule.startConfirm', { name: row.jobName })
    : t('schedule.stopConfirm', { name: row.jobName })
  try {
    await confirmAction({ content: question, okText: action === 'start' ? t('schedule.start') : t('schedule.stop') })
  } catch {
    pending = false
    return
  }
  try {
    const call = action === 'start' ? startJob : removeJob
    const response = await call(row.jobId as number)
    const done = action === 'start' ? t('schedule.startSuccess') : t('schedule.stopSuccess')
    // The one endpoint pair that keeps reading the server's message, unlike the
    // success toasts elsewhere. It answers with an empty msg when the job
    // actually started or stopped, so the translation below is what renders --
    // but a stop that times out answers 200 with 操作超时！, and that is the
    // only way the user hears about it. Replacing it with 停止成功 would turn a
    // self-contradictory toast into a lie. The backend reporting a timeout as
    // success is its own bug; until it is fixed, passing the message through is
    // the honest option.
    msgSuccess(response.msg || done)
    await table.getList()
  } catch {
    // Reported by the interceptor
  } finally {
    pending = false
  }
}

// The seed registers this route as JobLog; the previous version pushed
// 'job_log', which matches nothing, so the button navigated nowhere at all.
const openLog = () => router.push({ name: 'JobLog' })
</script>
