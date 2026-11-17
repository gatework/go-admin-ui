<template>
  <div v-if="external" :style="maskStyle" class="svg-external-icon svg-icon" />
  <svg v-else :class="['svg-icon', className]" aria-hidden="true">
    <use :href="`#icon-${iconClass}`" />
  </svg>
</template>

<script setup lang="ts">
/**
 * One icon from the sprite built out of src/icons/svg, by file name, or an
 * external image used as a mask so it still takes the text colour.
 */
import { computed } from 'vue'
import { isExternal } from '@/utils/validate'

defineOptions({ name: 'SvgIcon' })
const props = withDefaults(defineProps<{
  /** File name under src/icons/svg, without the extension; or a URL. */
  iconClass: string
  className?: string
}>(), { className: '' })

const external = computed(() => isExternal(props.iconClass))
const maskStyle = computed(() => {
  const mask = `url(${props.iconClass}) no-repeat 50% 50%`
  return { mask, '-webkit-mask': mask }
})
</script>

<style scoped>
.svg-icon {
  width: 1em;
  height: 1em;
  overflow: hidden;
  vertical-align: -0.15em;
  fill: currentColor;
}

.svg-external-icon {
  display: inline-block;
  background-color: currentColor;
  mask-size: cover !important;
}
</style>
