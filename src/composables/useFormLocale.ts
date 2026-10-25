import { watch, nextTick, type Ref } from 'vue'
import type { FormInstance } from '@arco-design/web-vue'
import { i18n } from '@/lang'

/** Repaint existing errors after translations change, without validating untouched forms. */
export function useFormLocale(form: Ref<FormInstance | undefined>) {
  watch(i18n.global.locale, async() => {
    await nextTick()
    // Arco keeps the resolved validation text and exposes no touched-field getter.
    // Its public root tells us whether validation is already visible.
    const root = (form.value as (FormInstance & { $el?: HTMLElement }) | undefined)?.$el
    if (root?.querySelector?.('.arco-form-item-status-error')) await form.value?.validate()
  })
}
