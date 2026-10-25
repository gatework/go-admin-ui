<template>
  <a-form ref="formRef" :model="model" :rules="rules" layout="vertical">
    <a-row>
      <a-col :xs="24" :sm="12">
        <a-form-item field="tableName">
          <template #label>
            <FieldLabel
              :label="$t('devTools.basicInfoForm.tableName')"
              :tip="$t('devTools.basicInfoForm.tableNameTip')"
            />
          </template>
          <a-input
            v-model="model.tableName"
            :placeholder="$t('devTools.basicInfoForm.tableNamePlaceholder')"
          />
        </a-form-item>
      </a-col>
      <a-col :xs="24" :sm="12">
        <a-form-item field="tableComment">
          <template #label>
            <FieldLabel
              :label="$t('devTools.basicInfoForm.tableComment')"
              :tip="$t('devTools.basicInfoForm.tableCommentTip')"
            />
          </template>
          <a-input
            v-model="model.tableComment"
            :placeholder="$t('devTools.basicInfoForm.tableCommentPlaceholder')"
          />
        </a-form-item>
      </a-col>
      <a-col :xs="24" :sm="12">
        <a-form-item field="className">
          <template #label>
            <FieldLabel
              :label="$t('devTools.basicInfoForm.className')"
              :tip="$t('devTools.basicInfoForm.classNameTip')"
            />
          </template>
          <a-input
            v-model="model.className"
            :placeholder="$t('devTools.basicInfoForm.classNamePlaceholder')"
          />
        </a-form-item>
      </a-col>
      <a-col :xs="24" :sm="12">
        <a-form-item :label="$t('devTools.basicInfoForm.functionAuthor')" field="functionAuthor">
          <a-input
            v-model="model.functionAuthor"
            :placeholder="$t('devTools.basicInfoForm.functionAuthorPlaceholder')"
          />
        </a-form-item>
      </a-col>
      <!-- <a-col :xs="24" :sm="12">
        <a-form-item field="isLogicalDelete">
          <template #label><FieldLabel label="是否逻辑删除" tip="目前只支持逻辑删除" /></template>
          <a-radio-group type="button" v-model="model.isLogicalDelete">
            <a-radio label="1">是</a-radio>
            <a-radio label="0">否</a-radio>
          </a-radio-group>

        </a-form-item>
      </a-col>
      <a-col :xs="24" :sm="12">
        <a-form-item v-if="model.isLogicalDelete == '1'" label="逻辑删除字段" field="logicalDeleteColumn">
          <a-input v-model="model.logicalDeleteColumn" placeholder="请输入" />
        </a-form-item>
      </a-col> -->
      <a-col :span="24">
        <a-form-item :label="$t('devTools.basicInfoForm.remark')" field="remark">
          <a-textarea v-model="model.remark" :rows="3" />
        </a-form-item>
      </a-col>
    </a-row>
  </a-form>
</template>
<script setup lang="ts">
import { useFormLocale } from '@/composables/useFormLocale'

import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FormInstance } from '@arco-design/web-vue'
import type { FormRules } from '@/types/ui'
import FieldLabel from '@/components/FieldLabel/index.vue'
import type { GenTable } from '@/api/tools/gen'

/**
 * The Basic Information tab.
 *
 * Holds the record through defineModel rather than copying a prop into local
 * state and emitting back. The previous version did the copy, but the parent
 * bound `:info` without listening for `update:info`, so every edit here was
 * dropped -- the parent read the values back out of the a-form instance's
 * `model` prop instead, which is why it worked at all.
 */
defineOptions({ name: 'BasicInfoForm' })

const { t } = useI18n()

const model = defineModel<GenTable>({ required: true })

const formRef = ref<FormInstance>()
useFormLocale(formRef)

/**
 * Rebuilt whenever the language changes.
 *
 * A plain object here is evaluated once, when the component is set up, so a
 * message already rendered under a field would keep the language it was built
 * in -- and this page is kept alive, so re-entering it does not re-run setup
 * either. a-form revalidates when its rules change (validateOnRuleChange),
 * which is what repaints a message that is already on screen. The template
 * unwraps the ref, so :rules="rules" is unchanged.
 */
const rules = computed<FormRules>(() => ({
  tableName: [
    { required: true, message: t('devTools.basicInfoForm.rules.tableName') },
    {
      match: /^[a-z._]*$/,
      message: t('devTools.basicInfoForm.rules.tableNamePattern')
    }
  ],
  tableComment: [
    { required: true, message: t('devTools.basicInfoForm.rules.tableComment') }
  ],
  className: [
    { required: true, message: t('devTools.basicInfoForm.rules.className') },
    {
      match: /^[A-Z][A-Za-z0-9]*$/,
      message: t('devTools.basicInfoForm.rules.classNamePattern')
    }
  ],
  functionAuthor: [
    { required: true, message: t('devTools.basicInfoForm.rules.functionAuthor') },
    {
      match: /^[A-Za-z]+$/,
      message: t('devTools.basicInfoForm.rules.functionAuthorPattern')
    }
  ]
}))

/** The parent validates both tabs before it submits. */
defineExpose({ validate: async() => Boolean(formRef.value) && !(await formRef.value?.validate()) })
</script>
