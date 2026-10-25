<template>
  <a-drawer
    role="dialog"
    aria-modal="true"
    :aria-label="$t('components.rightPanel.title')"
    :visible="modelValue"
    :title="$t('components.rightPanel.title')"
    :mask-closable="!clickNotClose"
    :footer="false"
    :esc-to-close="true"
    unmount-on-close
    :width="320"
    class="layout-settings-drawer"
    :data-dialog-focus="restoreFocus.id"
    @open="restoreFocus.open"
    @close="restoreFocus"
    @update:visible="$emit('update:modelValue', $event)"
  >
    <slot />
  </a-drawer>
</template>

<script setup lang="ts">
import { useDialogFocus } from '@/composables/useDialogFocus'
import { Drawer as ADrawer } from '@arco-design/web-vue'

defineOptions({ name: 'RightPanel' })
const props = withDefaults(defineProps<{ modelValue?: boolean, clickNotClose?: boolean }>(), {
  modelValue: false,
  clickNotClose: false
})
defineEmits<{ 'update:modelValue': [value: boolean] }>()
const restoreFocus = useDialogFocus(() => props.modelValue)
</script>

<style lang="scss">
.layout-settings-drawer .arco-drawer-close-btn { min-width: 44px; min-height: 44px; }
</style>
