<template>
  <AppDrawer
    :visible="form.visible"
    :title="title ?? form.title"
    :size="size"
    :mask-closable="false"
    v-bind="$attrs"
    @update:visible="open => open || form.close()"
    @close="form.reset"
  >
    <a-form :ref="form.bindFormRef" :model="form.model" :rules="form.rules" :layout="layout" :class="formClass" :disabled="form.loading" @submit-success="form.submit">
      <slot :model="form.model" :is-edit="form.isEdit" />
    </a-form>
    <template #footer>
      <slot name="footer">
        <a-button @click="form.close">{{ $t('common.dialogCancel') }}</a-button>
        <a-button type="primary" :loading="form.submitting" :disabled="form.loading" @click="form.submit">{{ okText ?? $t('common.dialogConfirm') }}</a-button>
      </slot>
    </template>
  </AppDrawer>
</template>

<script setup lang="ts" generic="TModel extends object, TId">
/**
 * FormModal's counterpart for forms too long for a dialog. Same contract: pass
 * a `useForm` session, write the fields in the default slot.
 */
import AppDrawer from '@/components/AppDrawer/index.vue'
import type { DrawerSize } from '@/components/AppDrawer/sizes'
import type { UseFormReturn } from '@/composables/useForm'

defineOptions({ name: 'FormDrawer', inheritAttrs: false })
withDefaults(defineProps<{
  form: UseFormReturn<TModel, TId>
  title?: string
  size?: DrawerSize
  layout?: 'vertical' | 'horizontal'
  okText?: string
  /** Class for the inner a-form; other attributes land on the dialog itself. */
  formClass?: string
}>(), { formClass: undefined, title: undefined, size: 'md', layout: 'vertical', okText: undefined })
</script>
