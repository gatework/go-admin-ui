<template>
  <a-drawer
    :unmount-on-close="true"
    v-bind="$attrs"
    :width="resolvedWidth"
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
/**
 * Arco's drawer with a dialog name, focus restored to its opener, and a width
 * chosen by role instead of by number.
 *
 * `size` is the width on a wide screen; `width` gives an exact one for a drawer
 * the four sizes do not fit. Either way the drawer is the full viewport on a
 * phone, so no page has to ask how wide the screen is before opening one.
 */
import { computed } from 'vue'
import { Drawer as ADrawer } from '@arco-design/web-vue'
import { useDialogFocus } from '@/composables/useDialogFocus'
import { useNarrowScreen } from '@/composables/useNarrowScreen'

import { DRAWER_WIDTHS, type DrawerSize } from './sizes'

defineOptions({ name: 'AppDrawer', inheritAttrs: false })
const props = withDefaults(defineProps<{ visible: boolean, title?: string, mask?: boolean, size?: DrawerSize, width?: number | string }>(), { mask: true, title: undefined, size: 'md', width: undefined })
defineEmits<{ 'update:visible': [value: boolean] }>()

const narrow = useNarrowScreen()
const resolvedWidth = computed(() => narrow.value ? '100%' : props.width ?? DRAWER_WIDTHS[props.size])
const restoreFocus = useDialogFocus(() => props.visible, () => props.mask)
</script>
