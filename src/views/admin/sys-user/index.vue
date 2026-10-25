<template>
  <PageContainer>
    <a-row :gutter="16">
      <!-- Department tree: clicking a node filters the list -->
      <a-col v-if="!narrow" :span="4" class="dept-pane">
        <!--
          On a phone the department pane and the search form used to push
          the first record off the first screen. Hidden
          there; the same filter is offered inside the search panel instead, so
          the phone has one place to filter from rather than two.
        -->
        <!--
          Its own card. The tree used to sit on the one PageContainer drew round
          the whole page; now that the list brings its own panels, a tree left
          bare would be the only thing on the page standing on the background.
        -->
        <a-card class="dept-card">
          <a-input
            v-model="deptName"
            :placeholder="$t('admin.sysUser.deptNamePlaceholder')"
            allow-clear
            class="dept-filter"
          />
          <a-tree

            class="dept-tree"
            :data="deptOptions"
            :field-names="{ key: 'id', title: 'label', children: 'children' }"
            :search-value="deptName"
            :filter-tree-node="filterDept"
            :selected-keys="deptFilter === undefined ? [] : [deptFilter]"
            :selectable="true"
            default-expand-all

            @select="handleDeptClick"
          />
        </a-card>
      </a-col>

      <a-col :span="narrow ? 24 : 20">
        <ProTable :table="table" selection row-key="userId" :actions-width="140">
          <template #search>
            <a-form-item v-if="narrow" :label="$t('admin.sysUser.dept')">
              <a-tree-select
                :model-value="deptFilter"
                :data="deptOptions"
                :field-names="{ key: 'id', title: 'label', children: 'children' }"

                allow-clear
                :placeholder="$t('admin.sysUser.deptPlaceholder')"
                @update:model-value="value => handleDeptFilter(typeof value === 'number' ? value : undefined)"
              />
            </a-form-item>
            <a-form-item :label="$t('admin.sysUser.username')">
              <a-input
                v-model="table.query.username"
                :placeholder="$t('admin.sysUser.usernamePlaceholder')"
                allow-clear
              />
            </a-form-item>
            <a-form-item :label="$t('admin.sysUser.phone')">
              <a-input
                v-model="table.query.phone"
                :placeholder="$t('admin.sysUser.phonePlaceholder')"
                allow-clear
              />
            </a-form-item>
            <a-form-item :label="$t('admin.sysUser.status')">
              <a-select
                v-model="table.query.status"
                :placeholder="$t('admin.sysUser.statusPlaceholder')"
                allow-clear
              >
                <a-option
                  v-for="item in sys_normal_disable"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </a-select>
            </a-form-item>
          </template>

          <template #toolbar>
            <a-button
              v-permisaction="['admin:sysUser:add']"
              type="primary"
              @click="handleAdd"
            >{{ $t('common.add') }}</a-button>
            <!-- Plain, not filled: these act on a selection and are usually
                 disabled, and a disabled filled button reads as broken rather
                 than as "pick a row first". See AGENTS.md. -->
            <a-button
              v-permisaction="['admin:sysUser:edit']"
              :disabled="table.single"
              @click="handleEditSelected"
            >{{ $t('common.edit') }}</a-button>
            <a-button
              v-permisaction="['admin:sysUser:remove']"
              status="danger"
              :disabled="table.multiple"
              @click="remove(table.selectedIds)"
            >{{ $t('common.delete') }}</a-button>
          </template>

          <!-- min-width, not width: width is rigid and overflows the container,
               min-width lets el-table fit and redistribute. See AGENTS.md. -->
          <a-table-column :title="$t('admin.sysUser.userId')" data-index="userId" :width="70" :sortable="{ sortDirections: ['ascend', 'descend'] }" />
          <a-table-column
            :title="$t('admin.sysUser.loginName')"
            data-index="username"
            :width="100"
            :sortable="{ sortDirections: ['ascend', 'descend'] }"
            ellipsis
            tooltip
          />
          <a-table-column
            :title="$t('admin.sysUser.nickNameColumn')"
            data-index="nickName"
            :width="85"
            ellipsis
            tooltip
          />
          <a-table-column
            :title="$t('admin.sysUser.dept')"
            data-index="dept.deptName"
            :width="85"
            ellipsis
            tooltip
          />
          <a-table-column :title="$t('admin.sysUser.phoneColumn')" data-index="phone" :width="110" />
          <a-table-column :title="$t('admin.sysUser.status')" data-index="status" :width="96" :sortable="{ sortDirections: ['ascend', 'descend'] }">
            <template #cell="{ record: row }">
              <a-switch
                v-model="row.status"
                checked-value="2"
                unchecked-value="1"
                @change="handleStatusChange(row)"
              />
            </template>
          </a-table-column>
          <a-table-column :title="$t('common.createdAt')" data-index="createdAt" :width="110" :sortable="{ sortDirections: ['ascend', 'descend'] }">
            <template #cell="{ record: row }"><DateCell :value="row.createdAt" /></template>
          </a-table-column>
          <template #actions="{ row }">
            <a-button
              v-permisaction="['admin:sysUser:edit']"

              type="text"
              @click="userForm.openEdit(row)"
            >{{ $t('common.edit') }}</a-button>
            <a-button
              v-if="row.userId !== 1"
              v-permisaction="['admin:sysUser:remove']"
              status="danger"
              type="text"
              @click="remove(row.userId)"
            >{{ $t('common.delete') }}</a-button>
            <!-- Icon rather than the words: this column is pinned, so its width
                 comes out of the columns that scroll past it. -->
            <a-button
              v-permisaction="['admin:sysUser:resetPassword']"

              class="row-icon-action"
              :title="$t('admin.sysUser.resetPasswordFor', { name: row.username })"
              type="text"
              @click="handleResetPwd(row)"
            >
              <icon-lock />
            </a-button>
          </template>
        </ProTable>
      </a-col>
    </a-row>

    <!-- Create / edit -->
    <AppModal
      v-model:visible="userForm.visible"
      :title="userForm.title"
      width="640px"
      :mask-closable="false"
      @close="userForm.reset"
    >
      <a-form
        :ref="userForm.bindFormRef"
        :disabled="userForm.loading"
        :model="userForm.model"
        :rules="userForm.rules"
        layout="vertical"
      >
        <a-row :gutter="16">
          <a-col :xs="24" :sm="12">
            <a-form-item :label="$t('admin.sysUser.nickName')" field="nickName">
              <a-input
                v-model="userForm.model.nickName"
                :placeholder="$t('admin.sysUser.nickNamePlaceholder')"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12">
            <a-form-item :label="$t('admin.sysUser.deptId')" field="deptId">
              <a-tree-select
                v-model="userForm.model.deptId"
                :data="deptOptions"
                :field-names="{ key: 'id', title: 'label', children: 'children' }"
                :placeholder="$t('admin.sysUser.deptIdPlaceholder')"

                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12">
            <a-form-item :label="$t('admin.sysUser.phone')" field="phone">
              <a-input
                v-model="userForm.model.phone"
                :placeholder="$t('admin.sysUser.phonePlaceholder')"
                maxlength="11"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12">
            <a-form-item :label="$t('admin.sysUser.email')" field="email">
              <a-input
                v-model="userForm.model.email"
                :placeholder="$t('admin.sysUser.emailPlaceholder')"
                maxlength="50"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12">
            <a-form-item :label="$t('admin.sysUser.username')" field="username">
              <a-input
                v-model="userForm.model.username"
                :placeholder="$t('admin.sysUser.usernamePlaceholder')"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12">
            <!-- Only on create: the edit endpoint does not take a password, and
                 a-form skips rules for items that are not rendered -->
            <a-form-item v-if="!userForm.isEdit" :label="$t('admin.sysUser.password')" field="password">
              <a-input-password
                v-model="userForm.model.password"
                :placeholder="$t('admin.sysUser.passwordPlaceholder')"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12">
            <a-form-item :label="$t('admin.sysUser.sex')" field="sex">
              <a-select
                v-model="userForm.model.sex"
                :placeholder="$t('common.selectPlaceholder')"
                style="width: 100%"
              >
                <a-option
                  v-for="item in sys_user_sex"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12">
            <a-form-item :label="$t('admin.sysUser.status')" field="status">
              <a-radio-group v-model="userForm.model.status">
                <a-radio
                  v-for="item in sys_normal_disable"
                  :key="item.value"
                  :value="item.value"
                >{{ item.label }}</a-radio>
              </a-radio-group>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12">
            <a-form-item :label="$t('admin.sysUser.post')" field="postId">
              <a-select
                v-model="userForm.model.postId"
                :placeholder="$t('common.selectPlaceholder')"
                style="width: 100%"
              >
                <a-option
                  v-for="item in postOptions"
                  :key="item.postId"
                  :label="item.postName"
                  :value="item.postId"
                  :disabled="item.status === '1'"
                />
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12">
            <a-form-item :label="$t('admin.sysUser.role')" field="roleId">
              <a-select
                v-model="userForm.model.roleId"
                :placeholder="$t('common.selectPlaceholder')"
                style="width: 100%"
              >
                <a-option
                  v-for="item in roleOptions"
                  :key="item.roleId"
                  :label="item.roleName"
                  :value="item.roleId"
                  :disabled="item.status === '1'"
                />
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item :label="$t('admin.sysUser.remark')" field="remark">
              <a-textarea
                v-model="userForm.model.remark"

                :placeholder="$t('admin.sysUser.remarkPlaceholder')"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
      <template #footer>
        <a-button @click="userForm.close">{{ $t('common.dialogCancel') }}</a-button>
        <a-button type="primary" :loading="userForm.submitting" @click="userForm.submit">
          {{ $t('common.dialogConfirm') }}
        </a-button>
      </template>
    </AppModal>

    <!-- Password reset: a second form on the same page, with its own model,
         its own validation and its own in-flight state -->
    <AppModal
      v-model:visible="passwordForm.visible"
      :title="$t('admin.sysUser.resetPassword')"
      width="420px"
      :mask-closable="false"
      @close="passwordForm.reset"
    >
      <a-form
        :ref="passwordForm.bindFormRef"
        :model="passwordForm.model"
        :rules="passwordForm.rules"
        layout="vertical"
      >
        <a-form-item :label="$t('admin.sysUser.user')">
          <span>{{ passwordForm.model.username }}</span>
        </a-form-item>
        <a-form-item :label="$t('admin.sysUser.newPassword')" field="password">
          <a-input-password
            v-model="passwordForm.model.password"
            :placeholder="$t('admin.sysUser.newPasswordPlaceholder')"

            @keyup.enter="passwordForm.submit"
          />
        </a-form-item>
      </a-form>
      <template #footer>
        <a-button @click="passwordForm.close">{{ $t('common.dialogCancel') }}</a-button>
        <a-button type="primary" :loading="passwordForm.submitting" @click="passwordForm.submit">
          {{ $t('admin.sysUser.resetPassword') }}
        </a-button>
      </template>
    </AppModal>
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNarrowScreen } from '@/composables/useNarrowScreen'
import { confirmAction } from '@/utils/modal'

import type { FormRules } from '@/types/ui'
import type { TreeNodeData } from '@arco-design/web-vue'

import AppModal from '@/components/AppModal/index.vue'
import PageContainer from '@/components/PageContainer/index.vue'
import ProTable from '@/components/ProTable/index.vue'
import DateCell from '@/components/DateCell/index.vue'
import { STATUS_NORMAL } from '@/api/status'
import { useTable, useForm, useDict, useRemove } from '@/composables'
import { msgSuccess } from '@/utils/message'

import {
  listUser, getUser, addUser, updateUser, delUser, resetUserPwd, changeUserStatus
} from '@/api/admin/sys-user'
import { listPost } from '@/api/admin/sys-post'
import { listRole } from '@/api/admin/sys-role'
import { treeselect } from '@/api/admin/sys-dept'
import { getConfigKey } from '@/api/admin/sys-config'

import type { DeptTreeNode, SysPost, SysRole, SysUser, SysUserQuery } from '@/types/admin'

// Must match the menu_name the backend serves, or keep-alive silently misses
defineOptions({ name: 'SysUserManage' })

const { t } = useI18n()

// ── The list ──────────────────────────────────────────────────────
const table = useTable<SysUser, SysUserQuery>({
  api: listUser,
  idKey: 'userId',
  defaultQuery: () => ({
    username: undefined,
    phone: undefined,
    status: undefined,
    deptId: undefined
  })
})

const { sys_normal_disable, sys_user_sex } = useDict('sys_normal_disable', 'sys_user_sex')

// ── Department tree ───────────────────────────────────────────────
const deptName = ref('')
/**
 * Exactly one department control is mounted at a time.
 *
 * v-if rather than a media query: CSS would leave both components alive, and
 * a-tree-select teleports its dropdown to the body regardless of whether the
 * field is visible -- so the page would carry two identical option lists and
 * "the 测试部 option" would match both.
 */
const narrow = useNarrowScreen()

/**
 * The narrow layout's stand-in for the department tree.
 *
 * query.deptId is stored as `/id/` -- the format the API expects -- so it is
 * unwrapped for the select and wrapped again on the way back. Sharing the query
 * key means the two controls stay in step: picking a department on a phone and
 * then rotating to a tablet shows the tree with the same node applied.
 */
const deptFilter = computed(() => {
  const raw = table.query.deptId
  if (!raw) return undefined
  const id = Number(String(raw).replace(/\//g, ''))
  return Number.isFinite(id) ? id : undefined
})

const handleDeptFilter = (id?: number) => {
  table.query.deptId = id ? `/${id}/` : undefined
  void table.search()
}
const deptOptions = ref<DeptTreeNode[]>([])
const filterDept = (node: TreeNodeData & { label?: string }) =>
  !deptName.value || String(node.label ?? '').includes(deptName.value)

const handleDeptClick = (keys: (string | number)[]) => {
  handleDeptFilter(keys.length ? Number(keys[0]) : undefined)
}

// ── Options for the form ──────────────────────────────────────────
// Fetched once on mount. The previous version reloaded both lists every time
// the dialog opened, so opening it ten times meant twenty requests for data
// that had not changed.
const postOptions = ref<SysPost[]>([])
const roleOptions = ref<SysRole[]>([])
const initPassword = ref('')

onMounted(async() => {
  const [depts, posts, roles, config] = await Promise.allSettled([
    treeselect(),
    listPost({ pageSize: 1000 }),
    listRole({ pageSize: 1000 }),
    getConfigKey('sys_user_initPassword')
  ])
  // allSettled, not all: one failing lookup must not leave the other three
  // unset. The interceptor has already reported whichever failed.
  if (depts.status === 'fulfilled') deptOptions.value = depts.value.data ?? []
  if (posts.status === 'fulfilled') postOptions.value = posts.value.data?.list ?? []
  if (roles.status === 'fulfilled') roleOptions.value = roles.value.data?.list ?? []
  if (config.status === 'fulfilled') initPassword.value = config.value.data?.configValue ?? ''
})

// ── Create / edit ─────────────────────────────────────────────────
/**
 * Rebuilt whenever the language changes.
 *
 * A plain object here is evaluated once, when the page is set up, and the page
 * is kept alive -- so a message already rendered under a field, 用户名称不能为空,
 * would keep that language after the reader switched. useForm unwraps the ref,
 * so :rules="userForm.rules" is unchanged.
 */
const userRules = computed<FormRules>(() => ({
  username: [{ required: true, message: t('admin.sysUser.rules.username') }],
  nickName: [{ required: true, message: t('admin.sysUser.rules.nickName') }],
  deptId: [{ required: true, message: t('admin.sysUser.rules.deptId') }],
  password: [{ required: true, message: t('admin.sysUser.rules.password') }],
  email: [
    { required: true, message: t('admin.sysUser.rules.email') },
    { type: 'email', message: t('admin.sysUser.rules.emailFormat') }
  ],
  phone: [
    { required: true, message: t('admin.sysUser.rules.phone') },
    { match: /^1[3-9]\d{9}$/, message: t('admin.sysUser.rules.phoneFormat') }
  ]
}))

const userForm = useForm<SysUser, number>({
  defaultModel: () => ({
    userId: undefined,
    deptId: undefined,
    username: undefined,
    nickName: undefined,
    password: undefined,
    phone: undefined,
    email: undefined,
    sex: undefined,
    status: STATUS_NORMAL,
    remark: undefined,
    postId: undefined,
    roleId: undefined
  }),
  idKey: 'userId',
  rules: userRules,
  api: { get: getUser, add: addUser, update: updateUser },
  // Computed, not `t(...)` directly: useForm reads the option on every render,
  // so a string resolved here once would pin the dialog to the language the
  // page was opened in.
  title: {
    create: computed(() => t('admin.sysUser.addTitle')),
    edit: computed(() => t('admin.sysUser.editTitle'))
  },
  onSuccess: () => table.getList()
})

const handleAdd = () => userForm.openCreate({ password: initPassword.value })

// Hands over the selected row rather than its id: openEdit reads the key off it
// either way, and the row is already typed as a SysUser.
const handleEditSelected = () => userForm.openEdit(table.selection[0])

// ── Password reset ────────────────────────────────────────────────
interface PasswordModel {
  userId?: number
  username?: string
  password: string
}

/** Computed for the same reason userRules is. */
const passwordRules = computed<FormRules>(() => ({
  password: [
    { required: true, message: t('admin.sysUser.rules.newPassword') },
    { minLength: 6, maxLength: 20, message: t('admin.sysUser.rules.passwordLength') }
  ]
}))

const passwordForm = useForm<PasswordModel>({
  defaultModel: () => ({ userId: undefined, username: undefined, password: '' }),
  rules: passwordRules,
  // Not a create/update pair, so it supplies its own handler. The old page used
  // ElMessageBox.prompt, which cannot validate a length or mask the input.
  submit: model => resetUserPwd(model.userId as number, model.password),
  // A function rather than a string: useForm keeps whatever it is given, and a
  // string would be resolved once, at setup.
  successMessage: () => t('admin.sysUser.resetOk')
})

const handleResetPwd = (row: SysUser) => {
  passwordForm.openCreate({ userId: row.userId, username: row.username })
}

// ── Row actions ───────────────────────────────────────────────────
const { remove } = useRemove({
  api: delUser,
  // The count is both a named value and the plural choice: Chinese needs one
  // form, English needs two, and passing it twice lets each pack decide.
  confirmText: count => t('admin.sysUser.removeConfirm', { count }, count),
  onSuccess: () => table.getList()
})

const handleStatusChange = async(row: SysUser) => {
  const enabling = row.status === '2'
  const revert = () => { row.status = enabling ? '1' : '2' }

  // Two whole sentences rather than a verb spliced into one: 启用/停用 is the
  // object of the Chinese sentence but the verb of the English one.
  const question = enabling
    ? t('admin.sysUser.enableConfirm', { name: row.username })
    : t('admin.sysUser.disableConfirm', { name: row.username })

  try {
    await confirmAction({ content: question, okText: enabling ? t('common.enable') : t('common.disable') })
  } catch {
    revert()
    return
  }

  try {
    await changeUserStatus(row)
    msgSuccess(enabling ? t('admin.sysUser.enableOk') : t('admin.sysUser.disableOk'))
  } catch {
    // The switch has already moved; put it back so it matches the server
    revert()
  }
}
</script>

<style lang="scss" scoped>
// The toggle exists only on the narrow layout; on a desktop the tree is a
// sidebar and needs no lid.

.dept-card {
  height: 100%;
}

.dept-filter {
  margin-bottom: 12px;
}

</style>
