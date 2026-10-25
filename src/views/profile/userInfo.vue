<template>
  <a-form ref="formRef" :model="userForm" :rules="rules" :disabled="saving" layout="vertical">
    <a-form-item :label="$t('profile.info.nickName')" field="nickName">
      <a-input v-model="userForm.nickName" />
    </a-form-item>
    <a-form-item :label="$t('profile.info.phone')" field="phone" :extra="$t('profile.info.phoneHint')">
      <a-input v-model="userForm.phone" maxlength="11" />
    </a-form-item>
    <a-form-item :label="$t('profile.info.email')" field="email">
      <a-input v-model="userForm.email" maxlength="50" />
    </a-form-item>
    <a-form-item :label="$t('profile.info.sex')">
      <a-radio-group v-model="userForm.sex">
        <a-radio value="0">{{ $t('profile.info.male') }}</a-radio>
        <a-radio value="1">{{ $t('profile.info.female') }}</a-radio>
      </a-radio-group>
    </a-form-item>
    <a-form-item>
      <a-space wrap>
        <a-button type="primary" :loading="saving" @click="submit">{{ $t('profile.save') }}</a-button>
        <a-button @click="close">{{ $t('profile.close') }}</a-button>
      </a-space>
    </a-form-item>
  </a-form>
</template>

<script setup lang="ts">
import { useFormLocale } from '@/composables/useFormLocale'

import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import type { FormInstance } from '@arco-design/web-vue'
import type { FormRules } from '@/types/ui'
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
import { updateUser } from '@/api/admin/sys-user'
import type { SysUser } from '@/types/admin'
const emit = defineEmits<{ saved: [user: SysUser] }>()
const props = defineProps<{ user: SysUser }>()
const userForm = ref({ ...props.user })
watch(() => props.user.avatar, avatar => { userForm.value.avatar = avatar })
const rules = computed<FormRules>(() => ({
  nickName: [{ required: true, message: t('profile.info.rules.nickName') }],
  email: [
    { required: true, message: t('profile.info.rules.emailRequired') },
    { type: 'email', message: t('profile.info.rules.emailFormat') }
  ],
  phone: [
    { required: true, message: t('profile.info.rules.phoneRequired') },
    { match: /^1[3-9]\d{9}$/, message: t('profile.info.rules.phoneFormat') }
  ]
}))
const save = () => updateUser(userForm.value)
const submit = async() => {
  if (saving.value || !formRef.value || await formRef.value.validate()) return
  saving.value = true
  try {
    const response = await save()
    emit('saved', { ...userForm.value })
    msgSuccess(response.msg)
  } catch {
    // The request interceptor already reports failures.
  } finally {
    saving.value = false
  }
}
</script>
