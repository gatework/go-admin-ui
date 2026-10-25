<template>
  <a-form ref="formRef" :model="model" :rules="rules" layout="vertical">
    <a-row>
      <a-col :xs="24" :sm="12">
        <a-form-item field="tplCategory">
          <template #label>{{ $t('devTools.genInfoForm.tplCategory') }}</template>
          <a-select v-model="model.tplCategory">
            <a-option :label="$t('devTools.genInfoForm.tplCrud')" value="crud" />
            <!-- <a-option label="关系表（增删改查）" value="mcrud" />
            <a-option label="树表（增删改查）" value="tree" /> -->
          </a-select>
        </a-form-item>
      </a-col>

      <a-col :xs="24" :sm="12">
        <a-form-item field="packageName">
          <template #label>{{ $t('devTools.genInfoForm.packageName') }}
            <a-tooltip :content="$t('devTools.genInfoForm.packageNameTip')" position="top">
              <i class="ri-question-line" />
            </a-tooltip></template>
          <a-input v-model="model.packageName" />
        </a-form-item>
      </a-col>

      <!-- <a-col :xs="24" :sm="12">
        <a-form-item field="moduleFrontName">
          <template #label>前端文件名
            <a-tooltip content="前端项目文件名，例如 sys-user.js " position="top">
              <i class="ri-question-line" />
            </a-tooltip></template>
          <a-input v-model="model.moduleFrontName" />
        </a-form-item>
      </a-col> -->

      <a-col :xs="24" :sm="12">
        <a-form-item field="businessName">
          <template #label>{{ $t('devTools.genInfoForm.businessName') }}
            <a-tooltip :content="$t('devTools.genInfoForm.businessNameTip')" position="top">
              <i class="ri-question-line" />
            </a-tooltip></template>
          <a-input v-model="model.businessName" />
        </a-form-item>
      </a-col>

      <a-col :xs="24" :sm="12">
        <a-form-item field="functionName">
          <template #label>{{ $t('devTools.genInfoForm.functionName') }}
            <a-tooltip :content="$t('devTools.genInfoForm.functionNameTip')" position="top">
              <i class="ri-question-line" />
            </a-tooltip></template>
          <a-input v-model="model.functionName" />
        </a-form-item>
      </a-col>
      <a-col :xs="24" :sm="12">
        <a-form-item field="moduleName">
          <template #label>{{ $t('devTools.genInfoForm.moduleName') }}
            <a-tooltip :content="$t('devTools.genInfoForm.moduleNameTip')" position="top">
              <i class="ri-question-line" />
            </a-tooltip></template>
          <a-input v-model="model.moduleName">
            <template #prepend>api/{version}/</template>
            <template #append>...</template>
          </a-input>
        </a-form-item>
        <!-- <a-alert
          title="接口地址示例"
          description="[get]api/{version}/{接口路径} \r\n [post]"
          type="success"
          show-icon
        /> -->
      </a-col>
      <!-- <a-col :xs="24" :sm="12">
        <a-form-item field="isDataScope">
          <template #label>是否认证
            <a-tooltip content="是指是否使用用户和角色验证中间件" position="top">
              <i class="ri-question-line" />
            </a-tooltip></template>
          <a-select v-model="model.isAuth">
            <a-option label="true" value="1" />
            <a-option label="false" value="2" />
          </a-select>
        </a-form-item>
      </a-col> -->
      <!-- <a-col :xs="24" :sm="12">
        <a-form-item field="isDataScope">
          <template #label>数据权限
            <a-tooltip content="暂不支持" position="top">
              <i class="ri-question-line" />
            </a-tooltip></template>
          <a-select v-model="model.isDataScope" disabled>
            <a-option label="true" value="1" />
            <a-option label="false" value="2" />
          </a-select>
        </a-form-item>
      </a-col> -->
      <!-- <a-col :xs="24" :sm="12">
        <a-form-item field="isActions">
          <template #label>是否actions
            <a-tooltip content="系统通用增删改查中间件方法" position="top">
              <i class="ri-question-line" />
            </a-tooltip></template>
          <a-select v-model="model.isActions" disabled>
            <a-option label="false" value="2" />
          </a-select>
        </a-form-item>
      </a-col> -->
    </a-row>
  </a-form>
</template>
<script setup lang="ts">
import { useFormLocale } from '@/composables/useFormLocale'

import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FormInstance } from '@arco-design/web-vue'
import type { FormRules } from '@/types/ui'
import type { GenTable } from '@/api/tools/gen'

/**
 * The Generation Information tab. Same contract as BasicInfoForm; see it for
 * the why, including why `rules` is a computed.
 */
defineOptions({ name: 'GenInfoForm' })

const { t } = useI18n()

const model = defineModel<GenTable>({ required: true })

const formRef = ref<FormInstance>()
useFormLocale(formRef)

const rules = computed<FormRules>(() => ({
  tplCategory: [
    { required: true, message: t('devTools.genInfoForm.rules.tplCategory') }
  ],
  packageName: [
    { required: true, message: t('devTools.genInfoForm.rules.packageName') },
    {
      match: /^[a-z]*$/,
      message: t('devTools.genInfoForm.rules.packageNamePattern')
    }
  ],
  moduleName: [
    { required: true, message: t('devTools.genInfoForm.rules.moduleName') },
    {
      match: /^[a-z-]*[a-z]$/,
      message: t('devTools.genInfoForm.rules.moduleNamePattern')
    }
  ],
  businessName: [
    { required: true, message: t('devTools.genInfoForm.rules.businessName') },
    {
      match: /^[a-z][A-Za-z]+$/,
      message: t('devTools.genInfoForm.rules.businessNamePattern')
    }
  ],
  functionName: [
    { required: true, message: t('devTools.genInfoForm.rules.functionName') }
  ]
}))

defineExpose({ validate: async() => Boolean(formRef.value) && !(await formRef.value?.validate()) })
</script>
