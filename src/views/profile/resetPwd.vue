<template>
  <a-form ref="formRef" :model="user" :rules="rules" :disabled="saving" layout="vertical">
    <a-form-item :label="$t('profile.password.old')" field="oldPassword">
      <a-input-password v-model="user.oldPassword" autocomplete="current-password" :placeholder="$t('profile.password.oldPlaceholder')" />
    </a-form-item>
    <a-form-item :label="$t('profile.password.new')" field="newPassword" :extra="$t('profile.password.hint')">
      <a-input-password v-model="user.newPassword" autocomplete="new-password" :placeholder="$t('profile.password.newPlaceholder')" />
    </a-form-item>
    <a-form-item :label="$t('profile.password.confirm')" field="confirmPassword">
      <a-input-password v-model="user.confirmPassword" autocomplete="new-password" :placeholder="$t('profile.password.confirmPlaceholder')" />
    </a-form-item>
    <a-form-item>
      <a-space wrap>
        <a-button type="primary" :loading="saving" @click="submit">{{ $t('profile.password.save') }}</a-button>
        <a-button @click="close">{{ $t('profile.close') }}</a-button>
      </a-space>
    </a-form-item>
  </a-form>
</template>

<script setup lang="ts">
import { useFormLocale } from '@/composables/useFormLocale'

import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import type { FormInstance } from '@arco-design/web-vue'
import type { FormRules } from '@/types/ui'
import { useUserStore } from '@/stores/user'
import { useTagsViewStore } from '@/stores/tagsView'
import { msgSuccess } from '@/utils/message'
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const formRef = ref<FormInstance>()
useFormLocale(formRef)
const saving = ref(false)
const close = () => {
  useTagsViewStore().delView(route)
  void router.push('/dashboard')
}
import { updateUserPwd } from '@/api/admin/sys-user'
const user = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })
const rules = computed<FormRules>(() => ({
  oldPassword: [{ required: true, message: t('profile.password.rules.oldRequired') }],
  newPassword: [
    { required: true, message: t('profile.password.rules.newRequired') },
    { minLength: 6, maxLength: 20, message: t('profile.password.rules.length') }
  ],
  confirmPassword: [
    { required: true, message: t('profile.password.rules.confirmRequired') },
    { validator: (value, callback) => callback(value === user.value.newPassword ? undefined : t('profile.password.rules.mismatch')) }
  ]
}))
const save = () => updateUserPwd(user.value.oldPassword, user.value.newPassword)
const submit = async() => {
  if (saving.value || !formRef.value || await formRef.value.validate()) return
  saving.value = true
  try {
    const response = await save()
    user.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
    formRef.value?.clearValidate()
    msgSuccess(response.msg)
    await useUserStore().resetToken()
    await router.replace('/login')
  } catch {
    // The request interceptor already reports failures.
  } finally {
    saving.value = false
  }
}
</script>
