<template>
  <AppModal
    :visible="form.visible"
    :title="title ?? form.title"
    :width="width"
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
  </AppModal>
</template>

<script setup lang="ts" generic="TModel extends object, TId">
/**
 * The create / edit dialog for a `useForm` session.
 *
 * Everything that was the same in every page's dialog is here: visibility, the
 * title for the current mode, the a-form wiring (ref, model, rules, disabled
 * while the record loads), reset on close, and the cancel / confirm footer with
 * its in-flight state. A page writes only its fields:
 *
 *   <FormModal :form="form">
 *     <a-form-item :label="$t('demo.name')" field="name">
 *       <a-input v-model="form.model.name" />
 *     </a-form-item>
 *   </FormModal>
 *
 * Other attributes land on the modal, so Arco's own props still work.
 */
import AppModal from '@/components/AppModal/index.vue'
import type { UseFormReturn } from '@/composables/useForm'

defineOptions({ name: 'FormModal', inheritAttrs: false })
withDefaults(defineProps<{
  form: UseFormReturn<TModel, TId>
  /** Overrides the title useForm derives from the mode. */
  title?: string
  width?: number | string
  layout?: 'vertical' | 'horizontal'
  /** Confirm button text, when "确定" does not say what will happen. */
  okText?: string
  /** Class for the inner a-form; other attributes land on the dialog itself. */
  formClass?: string
}>(), { formClass: undefined, title: undefined, width: 520, layout: 'vertical', okText: undefined })
</script>
