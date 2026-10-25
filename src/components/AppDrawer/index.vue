<template>
  <a-drawer
    :unmount-on-close="true"
    v-bind="$attrs"
    :visible="visible"
    :esc-to-close="true"
    :title="title"
    role="dialog"
    :aria-modal="mask ? true : undefined"
    :mask="mask"
    :aria-label="title"
    :data-dialog-focus="restoreFocus.id"
    @update:visible="$emit('update:visible', $event)"
    @open="restoreFocus.open"
    @close="restoreFocus"
  >
    <template v-for="(_, name) in $slots" #[name]="scope"><slot :name="name" v-bind="scope || {}" /></template>
  </a-drawer>
</template>

<script setup lang="ts">
import { Drawer as ADrawer } from '@arco-design/web-vue'
import { useDialogFocus } from '@/composables/useDialogFocus'
defineOptions({ name: 'AppDrawer', inheritAttrs: false })
const props = withDefaults(defineProps<{ visible: boolean, title?: string, mask?: boolean }>(), { mask: true })
defineEmits<{ 'update:visible': [value: boolean] }>()
const restoreFocus = useDialogFocus(() => props.visible, () => props.mask)
</script>
