<template>
  <a-tooltip :content="tooltip" :disabled="!tooltip" position="bottom">
    <a-button
      ref="button"
      v-bind="$attrs"
      :type="active ? 'primary' : 'text'"
      html-type="button"
      shape="square"
      class="header-action"
      :aria-label="ariaLabel || tooltip"
      :aria-pressed="active || undefined"
      :disabled="disabled"
      @click="$emit('click', $event)"
    >
      <template #icon><slot /></template>
    </a-button>
  </a-tooltip>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { Button as AButton } from '@arco-design/web-vue'

defineOptions({ name: 'HeaderIconButton', inheritAttrs: false })
withDefaults(defineProps<{
  tooltip?: string;
  ariaLabel?: string;
  active?: boolean;
  disabled?: boolean;
}>(), { tooltip: '', ariaLabel: '', active: false, disabled: false })
defineEmits<{ click: [event: MouseEvent] }>()
const button = ref<InstanceType<typeof AButton>>()
defineExpose({ focus: () => button.value?.$el.focus() })
</script>

<style scoped>
.header-action { flex-shrink: 0; }
</style>
