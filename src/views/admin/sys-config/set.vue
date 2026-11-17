<template>
  <PageContainer class="config-set" :title="$t('admin.sysConfig.set.sidebarTitle')" :description="$t('admin.sysConfig.set.basicDesc')">
    <template #actions>
      <a-button :loading="loading" @click="load">{{ $t('common.reset') }}</a-button>
      <a-button type="primary" :loading="saving" :disabled="loading" @click="submit">{{ $t('admin.sysConfig.set.save') }}</a-button>
    </template>

    <a-card :title="$t('admin.sysConfig.set.basicTitle')" class="config-section">
      <a-spin :loading="loading" class="config-set__body">
        <div class="config-set__logo">
          <div class="config-set__logo-preview">
            <img v-if="form.sys_app_logo" :src="form.sys_app_logo" :alt="$t('admin.sysConfig.set.logoName')">
            <span v-else><icon-image :size="22" />{{ $t('admin.sysConfig.set.logoEmpty') }}</span>
          </div>
          <div class="config-set__logo-meta">
            <strong>{{ $t('admin.sysConfig.set.logoName') }}</strong>
            <span>{{ $t('admin.sysConfig.set.logoHint') }}</span>
            <a-upload
              :headers="uploadHeaders"
              :action="uploadAction"
              :on-before-upload="beforeLogoUpload"
              :show-file-list="false"
              accept="image/png,image/jpeg"
              @success="onLogoUploaded"
            >
              <template #upload-button>
                <a-button size="small"><template #icon><icon-upload /></template>{{ $t('admin.sysConfig.set.upload') }}</a-button>
              </template>
            </a-upload>
          </div>
        </div>

        <a-form ref="formRef" :model="form" :rules="rules" layout="vertical" @submit-success="submit">
          <a-row :gutter="20">
            <a-col :xs="24" :sm="12">
              <a-form-item :label="$t('admin.sysConfig.set.appName')" field="sys_app_name">
                <a-input v-model="form.sys_app_name" :placeholder="$t('admin.sysConfig.set.appNamePlaceholder')" allow-clear />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12">
              <a-form-item :label="$t('admin.sysConfig.set.initPassword')" field="sys_user_initPassword">
                <a-input-password v-model="form.sys_user_initPassword" :placeholder="$t('admin.sysConfig.set.initPasswordPlaceholder')" allow-clear />
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </a-spin>
    </a-card>

    <!-- Saved on its own: the policy is a separate endpoint and takes effect at once. -->
    <a-card v-if="isAdmin">
      <RegistrationPolicy />
    </a-card>
  </PageContainer>
</template>

<script setup lang="ts">
/**
 * System settings: the application's name and logo, the initial password for
 * new users, and -- for administrators -- whether the public can register.
 *
 * The page used to carry an appearance section (skin and sidebar theme). Those
 * two keys were saved but nothing in either repository read them; the sidebar
 * surface is a per-user preference now. Whatever the server holds for them is
 * still loaded and sent back untouched, because the form round-trips every key
 * the response carries.
 */
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FileItem, FormInstance } from '@arco-design/web-vue'
import PageContainer from '@/components/PageContainer/index.vue'
import RegistrationPolicy from './registration-policy.vue'
import { getSetConfig, updateSetConfig } from '@/api/admin/sys-config'
import { useFormLocale } from '@/composables/useFormLocale'
import { useSystemStore } from '@/stores/system'
import { useUserStore } from '@/stores/user'
import { getToken } from '@/utils/auth'
import { msgError, msgSuccess } from '@/utils/message'
import type { FormRules } from '@/types/ui'

defineOptions({ name: 'SysConfigSet' })

/** Uploads larger than this are refused before any request is made. */
const LOGO_MAX_BYTES = 2 * 1024 * 1024

const { t } = useI18n()
const isAdmin = computed(() => useUserStore().roles.includes('admin'))

/** The keys this page edits. Others the server returns ride along unchanged. */
const defaults = () => ({ sys_app_name: '', sys_app_logo: '', sys_user_initPassword: '' })
type ConfigForm = ReturnType<typeof defaults> & Record<string, string>

const form = ref<ConfigForm>(defaults())
const formRef = ref<FormInstance>()
useFormLocale(formRef)
const loading = ref(false)
const saving = ref(false)

const rules = computed<FormRules>(() => ({
  sys_app_name: [{ required: true, message: t('admin.sysConfig.set.rules.appName') }],
  sys_user_initPassword: [{ required: true, message: t('admin.sysConfig.set.rules.initPassword') }]
}))

/** Rebuilds the form from the server, which is also what Reset means. */
const load = async() => {
  if (loading.value) return
  loading.value = true
  try {
    const response = await getSetConfig()
    form.value = { ...defaults(), ...(response.data ?? {}) }
    formRef.value?.clearValidate()
  } catch { /* The request client has reported it; the form keeps what it had. */ } finally {
    loading.value = false
  }
}

const submit = async() => {
  if (saving.value || !formRef.value || await formRef.value.validate()) return
  saving.value = true
  try {
    await updateSetConfig(Object.entries(form.value).map(([configKey, configValue]) => ({ configKey, configValue })))
    msgSuccess(t('admin.sysConfig.set.saveOk'))
    // The rail and the tab title read these from the store; update them without a reload.
    useSystemStore().setInfo({ sys_app_name: form.value.sys_app_name, sys_app_logo: form.value.sys_app_logo })
  } catch { /* Reported by the request client. */ } finally {
    saving.value = false
  }
}

const uploadHeaders = { Authorization: 'Bearer ' + getToken() }
const uploadAction = `${process.env.VUE_APP_BASE_API}/api/v1/public/uploadFile`

const beforeLogoUpload = (file: File) => {
  if (file.size < LOGO_MAX_BYTES) return true
  msgError(t('admin.sysConfig.set.logoTooLarge'))
  return false
}

const onLogoUploaded = (file: FileItem) => {
  const response = file.response
  if (response?.code === 200 && response.data?.full_path) form.value.sys_app_logo = process.env.VUE_APP_BASE_API + response.data.full_path
  else msgError(response?.msg || t('common.networkError'))
}

onMounted(load)
</script>

<style lang="scss" scoped>
.config-set__body { display: block; }

.config-set__logo {
  display: flex;
  align-items: center;
  gap: var(--motor-space-4);
  padding-bottom: var(--motor-space-4);
  margin-bottom: var(--motor-space-4);
  border-bottom: 1px solid var(--motor-border-soft);
}

.config-set__logo-preview {
  display: grid;
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  place-items: center;
  overflow: hidden;
  border: 1px dashed var(--motor-border);
  border-radius: var(--motor-radius-sm);
  background: var(--motor-surface-soft);
  color: var(--motor-text-3);
  font-size: var(--motor-font-size-11);

  img { width: 100%; height: 100%; object-fit: cover; }
  span { display: flex; flex-direction: column; align-items: center; gap: 4px; }
}

.config-set__logo-meta {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;

  strong { color: var(--motor-text-1); font-weight: 600; }
  span { margin-bottom: 4px; color: var(--motor-text-3); font-size: var(--motor-font-size-12); }
}
</style>
