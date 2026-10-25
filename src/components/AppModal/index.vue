<template>
  <a-modal
    :unmount-on-close="true"
    v-bind="$attrs"
    :visible="visible"
    :title="title"
    role="dialog"
    aria-modal="true"
    :aria-label="title"
    :data-dialog-focus="restoreFocus.id"
    @update:visible="$emit('update:visible', $event)"
    @open="restoreFocus.open"
    @close="restoreFocus"
  >
    <template v-for="(_, name) in $slots" #[name]="scope"><slot :name="name" v-bind="scope || {}" /></template>
  </a-modal>
</template>

<script setup lang="ts">
import { Modal as AModal } from '@arco-design/web-vue'
import { useDialogFocus } from '@/composables/useDialogFocus'
defineOptions({ name: 'AppModal', inheritAttrs: false })
const props = defineProps<{ visible: boolean, title?: string }>()
defineEmits<{ 'update:visible': [value: boolean] }>()
const restoreFocus = useDialogFocus(() => props.visible)
</script>
